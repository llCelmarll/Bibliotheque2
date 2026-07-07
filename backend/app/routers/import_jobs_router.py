import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.db import get_session
from app.models.user_model import User
from app.schemas.book_schemas import BookCreate
from app.services.auth_service import get_current_user
from app.services.import_job_service import import_job_manager, JobStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/books/import", tags=["books"])


# ── Helpers ─────────────────────────────────────────────────────────────────

async def _sse_generator(job_id: str, user_id: int):
    """Générateur SSE : stream les événements du job via asyncio.Queue."""
    job = import_job_manager.get_job(job_id, user_id)

    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def on_event(data: dict):
        # Appelé depuis le thread de fond — on schedule dans la boucle event loop
        loop.call_soon_threadsafe(queue.put_nowait, data)

    import_job_manager.subscribe(job, on_event)

    # Émettre l'état courant immédiatement (utile en cas de reconnexion)
    yield f"data: {json.dumps(job.to_dict())}\n\n"

    try:
        terminal = {JobStatus.DONE, JobStatus.CANCELLED, JobStatus.ERROR}

        # Si le job est déjà terminé, on s'arrête
        if job.status in terminal:
            return

        while True:
            try:
                data = await asyncio.wait_for(queue.get(), timeout=25.0)
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("done") or data.get("status") in ("done", "cancelled", "error"):
                    return
            except asyncio.TimeoutError:
                # Heartbeat pour maintenir la connexion ouverte
                yield "data: {\"heartbeat\": true}\n\n"
                # Vérifier si le job est terminé (au cas où on aurait raté un event)
                if job.status in terminal:
                    yield f"data: {json.dumps(job.to_dict())}\n\n"
                    return
    finally:
        import_job_manager.unsubscribe(job, on_event)


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/active")
def get_active_job(
    current_user: User = Depends(get_current_user),
):
    """Retourne le job actif de l'utilisateur, s'il en a un (utile au chargement de la page)."""
    job = import_job_manager.get_active_job_for_user(current_user.id)
    if not job:
        return None
    return job.to_dict()


@router.post("/start")
def start_import(
    books_data: List[BookCreate],
    skip_errors: bool = Query(True),
    populate_covers: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    """Démarre un job d'import en arrière-plan. Retourne immédiatement le job_id."""
    job = import_job_manager.create_job(
        user_id=current_user.id,
        books=books_data,
        skip_errors=skip_errors,
        populate_covers=populate_covers,
    )
    import_job_manager.start_job(job)
    logger.info("Import job started via API: %s (user=%s)", job.job_id, current_user.id)
    return {"job_id": job.job_id, "total": job.total}


@router.get("/{job_id}/stream")
async def stream_import(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """SSE : stream la progression du job en temps réel. Reconnexion possible."""
    return StreamingResponse(
        _sse_generator(job_id, current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Expose-Headers": "Content-Type",
        },
    )


@router.get("/{job_id}/status")
def get_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retourne l'état courant du job (utile après reconnexion)."""
    job = import_job_manager.get_job(job_id, current_user.id)
    return job.to_dict()


@router.post("/{job_id}/pause")
def pause_import(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Met le job en pause après le livre en cours."""
    job = import_job_manager.get_job(job_id, current_user.id)
    import_job_manager.pause_job(job)
    return {"status": "paused"}


@router.post("/{job_id}/resume")
def resume_import(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Reprend un job en pause."""
    job = import_job_manager.get_job(job_id, current_user.id)
    import_job_manager.resume_job(job)
    return {"status": "running"}


@router.post("/{job_id}/cancel")
def cancel_import(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Annule le job. Les livres déjà importés restent en base."""
    job = import_job_manager.get_job(job_id, current_user.id)
    import_job_manager.cancel_job(job)
    return {"status": "cancelled"}


class ConflictResolutionItem(BaseModel):
    existing_book_id: int
    fields: Optional[Dict[str, Any]] = None  # None = ignorer ce conflit


class ConflictResolutionBatch(BaseModel):
    resolutions: List[ConflictResolutionItem]


@router.post("/{job_id}/resolve-conflicts")
def resolve_conflicts(
    job_id: str,
    batch: ConflictResolutionBatch,
    current_user: User = Depends(get_current_user),
):
    """Applique les résolutions de conflits après la fin du job (peut être appelé après DONE)."""
    job = import_job_manager.get_job(job_id, current_user.id)
    result = import_job_manager.apply_conflict_resolutions(
        job, [r.model_dump() for r in batch.resolutions]
    )
    return result
