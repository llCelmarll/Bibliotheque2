import re
import threading
import uuid
import time
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Callable, Dict, Any

from app.schemas.book_schemas import BookCreate

logger = logging.getLogger(__name__)


# ── Helpers module-level ─────────────────────────────────────────────────────

def _extract_id(detail: str) -> int:
    m = re.search(r'\(ID:\s*(\d+)\)', detail)
    return int(m.group(1)) if m else -1


def _get_book_for_conflict(session, book_id: int, user_id: int):
    from app.repositories.book_repository import BookRepository
    return BookRepository(session).get_by_id(book_id, user_id)


def _normalize_name(name: str) -> str:
    parts = name.lower().replace(',', '').split()
    return ' '.join(sorted(parts))

def _names_are_similar(a: str, b: str) -> bool:
    return _normalize_name(a) == _normalize_name(b)

def _lists_are_equivalent(existing_items, csv_items) -> bool:
    def to_names(items):
        return {_normalize_name(
            i if isinstance(i, str) else getattr(i, 'name', str(i))
        ) for i in items}
    return to_names(existing_items) == to_names(csv_items)


def _compute_divergent_fields(existing, csv_book) -> dict:
    """Retourne {field: {"existing": val, "csv": val}} pour les champs où les deux ont une valeur mais elles diffèrent."""
    result = {}

    for f in ('subtitle', 'published_date', 'page_count', 'cover_url'):
        csv_val = getattr(csv_book, f, None)
        ex_val  = getattr(existing, f, None)
        if csv_val and ex_val and str(csv_val).strip() != str(ex_val).strip():
            result[f] = {"existing": ex_val, "csv": csv_val}

    csv_rating = getattr(csv_book, 'rating', None)
    ex_rating  = getattr(existing, 'rating', None)
    if csv_rating and ex_rating and csv_rating != ex_rating:
        result['rating'] = {"existing": ex_rating, "csv": csv_rating}

    csv_pub = getattr(csv_book, 'publisher', None)
    ex_pub  = getattr(existing, 'publisher', None)
    if csv_pub and ex_pub:
        csv_name = csv_pub if isinstance(csv_pub, str) else getattr(csv_pub, 'name', str(csv_pub))
        ex_name  = ex_pub.name if hasattr(ex_pub, 'name') else str(ex_pub)
        if not _names_are_similar(csv_name, ex_name):
            result['publisher'] = {"existing": ex_name, "csv": csv_name}

    ex_authors  = getattr(existing, 'authors', [])
    csv_authors = getattr(csv_book, 'authors', [])
    if ex_authors and csv_authors and not _lists_are_equivalent(ex_authors, csv_authors):
        result['authors'] = {
            "existing": [getattr(a, 'name', str(a)) for a in ex_authors],
            "csv": [a if isinstance(a, str) else getattr(a, 'name', str(a)) for a in csv_authors],
        }

    ex_genres  = getattr(existing, 'genres', [])
    csv_genres = getattr(csv_book, 'genres', [])
    if ex_genres and csv_genres and not _lists_are_equivalent(ex_genres, csv_genres):
        result['genres'] = {
            "existing": [getattr(g, 'name', str(g)) for g in ex_genres],
            "csv": [g if isinstance(g, str) else getattr(g, 'name', str(g)) for g in csv_genres],
        }

    return result


def _compute_missing_fields(existing, csv_book) -> dict:
    result = {}
    for f in ('cover_url', 'subtitle', 'published_date', 'page_count', 'notes', 'rating'):
        csv_val = getattr(csv_book, f, None)
        ex_val  = getattr(existing, f, None)
        if csv_val is not None and csv_val != '' and (ex_val is None or ex_val == ''):
            result[f] = csv_val
    if not getattr(existing, 'authors', []) and getattr(csv_book, 'authors', []):
        result['authors'] = [
            a if isinstance(a, str) else getattr(a, 'name', str(a))
            for a in csv_book.authors
        ]
    if not getattr(existing, 'genres', []) and getattr(csv_book, 'genres', []):
        result['genres'] = [
            g if isinstance(g, str) else getattr(g, 'name', str(g))
            for g in csv_book.genres
        ]
    if not getattr(existing, 'publisher', None) and getattr(csv_book, 'publisher', None):
        result['publisher'] = csv_book.publisher
    if not getattr(existing, 'series', []) and getattr(csv_book, 'series', []):
        result['series'] = csv_book.series
    return result


class JobStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    PAUSED    = "paused"
    CANCELLED = "cancelled"
    DONE      = "done"
    ERROR     = "error"


@dataclass
class ImportJob:
    job_id: str
    user_id: int
    books: List[BookCreate]
    skip_errors: bool
    populate_covers: bool
    status: JobStatus = JobStatus.PENDING
    current: int = 0        # index 0-based du livre en cours de traitement
    total: int = 0
    success: int = 0
    failed: int = 0
    errors: List[Dict[str, Any]] = field(default_factory=list)
    conflicts: List[Dict[str, Any]] = field(default_factory=list)
    skipped: int = 0
    auto_completed: int = 0
    current_book: str = ""
    created_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    # threading primitives (non sérialisables)
    _pause_event: threading.Event = field(default_factory=threading.Event)
    _cancel_flag: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock)
    _thread: Optional[threading.Thread] = None
    # callbacks SSE — appelés par le thread de fond à chaque changement d'état
    _subscribers: List[Callable[[Dict], None]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status,
            "current": self.current,
            "total": self.total,
            "success": self.success,
            "failed": self.failed,
            "skipped": self.skipped,
            "auto_completed": self.auto_completed,
            "current_book": self.current_book,
            "errors": self.errors,
            "conflicts": self.conflicts,
            "conflicts_count": len(self.conflicts),
            "done": self.status in (JobStatus.DONE, JobStatus.CANCELLED, JobStatus.ERROR),
        }


class ImportJobManager:
    """Gestionnaire singleton de jobs d'import en mémoire."""

    def __init__(self):
        self._jobs: Dict[str, ImportJob] = {}
        self._lock = threading.Lock()
        # Thread de nettoyage : supprime les jobs terminés après 1h
        t = threading.Thread(target=self._cleanup_loop, daemon=True)
        t.start()

    # ── Création / accès ────────────────────────────────────────────────────

    def create_job(
        self,
        user_id: int,
        books: List[BookCreate],
        skip_errors: bool = True,
        populate_covers: bool = False,
    ) -> ImportJob:
        with self._lock:
            # Refuser si un job actif existe déjà pour cet user
            for job in self._jobs.values():
                if job.user_id == user_id and job.status in (JobStatus.RUNNING, JobStatus.PAUSED):
                    from fastapi import HTTPException
                    raise HTTPException(
                        status_code=409,
                        detail="Un import est déjà en cours. Annulez-le avant d'en lancer un nouveau.",
                    )

            job_id = str(uuid.uuid4())
            job = ImportJob(
                job_id=job_id,
                user_id=user_id,
                books=books,
                skip_errors=skip_errors,
                populate_covers=populate_covers,
                total=len(books),
            )
            job._pause_event.set()  # non-bloquant par défaut
            self._jobs[job_id] = job
            logger.info("Import job created: %s (user=%s, total=%d)", job_id, user_id, len(books))
            return job

    def get_job(self, job_id: str, user_id: int) -> ImportJob:
        from fastapi import HTTPException
        job = self._jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job d'import introuvable")
        if job.user_id != user_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        return job

    def get_active_job_for_user(self, user_id: int) -> Optional[ImportJob]:
        for job in self._jobs.values():
            if job.user_id == user_id and job.status in (JobStatus.RUNNING, JobStatus.PAUSED):
                return job
        return None

    # ── Contrôle ────────────────────────────────────────────────────────────

    def start_job(self, job: ImportJob) -> None:
        t = threading.Thread(target=self._run, args=(job,), daemon=True)
        job._thread = t
        t.start()

    def pause_job(self, job: ImportJob) -> None:
        from fastapi import HTTPException
        if job.status != JobStatus.RUNNING:
            raise HTTPException(status_code=400, detail="Le job n'est pas en cours d'exécution")
        job._pause_event.clear()  # bloque le thread au prochain checkpoint
        job.status = JobStatus.PAUSED
        self._notify(job)

    def resume_job(self, job: ImportJob) -> None:
        from fastapi import HTTPException
        if job.status != JobStatus.PAUSED:
            raise HTTPException(status_code=400, detail="Le job n'est pas en pause")
        job.status = JobStatus.RUNNING
        job._pause_event.set()  # débloque le thread
        self._notify(job)

    def cancel_job(self, job: ImportJob) -> None:
        from fastapi import HTTPException
        if job.status in (JobStatus.DONE, JobStatus.CANCELLED, JobStatus.ERROR):
            raise HTTPException(status_code=400, detail="Le job est déjà terminé")
        job._cancel_flag = True
        job._pause_event.set()  # débloque si en pause pour qu'il puisse voir le flag

    def apply_conflict_resolutions(self, job: ImportJob, resolutions: List[dict]) -> dict:
        """Applique les résolutions de conflits après la fin du job."""
        from app.db import engine
        from sqlmodel import Session
        from app.services.book_service import BookService

        applied = 0
        skipped = 0
        with Session(engine) as session:
            svc = BookService(session, user_id=job.user_id)
            for r in resolutions:
                fields = r.get("fields")
                if fields:
                    try:
                        svc.patch_missing_fields(r["existing_book_id"], fields)
                        applied += 1
                    except Exception as e:
                        logger.warning("patch_missing_fields failed for book %d: %s", r["existing_book_id"], e)
                        skipped += 1
                else:
                    skipped += 1
        return {"applied": applied, "skipped": skipped}

    # ── SSE subscribers ─────────────────────────────────────────────────────

    def subscribe(self, job: ImportJob, callback: Callable[[Dict], None]) -> None:
        with job._lock:
            job._subscribers.append(callback)

    def unsubscribe(self, job: ImportJob, callback: Callable[[Dict], None]) -> None:
        with job._lock:
            try:
                job._subscribers.remove(callback)
            except ValueError:
                pass

    def _notify(self, job: ImportJob) -> None:
        data = job.to_dict()
        with job._lock:
            subscribers = list(job._subscribers)
        for cb in subscribers:
            try:
                cb(data)
            except Exception:
                pass

    # ── Thread de fond ───────────────────────────────────────────────────────

    def _run(self, job: ImportJob) -> None:
        from app.db import engine
        from sqlmodel import Session
        from app.services.book_service import BookService

        logger.info("Import job started: %s", job.job_id)
        job.status = JobStatus.RUNNING
        self._notify(job)

        try:
            with Session(engine) as session:
                svc = BookService(session, user_id=job.user_id)

                for i in range(job.current, job.total):
                    # Vérifier annulation
                    if job._cancel_flag:
                        job.status = JobStatus.CANCELLED
                        job.finished_at = time.time()
                        self._notify(job)
                        logger.info("Import job cancelled: %s (at book %d/%d)", job.job_id, i, job.total)
                        return

                    # Attendre si en pause (bloquant jusqu'à resume ou cancel)
                    job._pause_event.wait()

                    # Re-vérifier annulation après déblocage de la pause
                    if job._cancel_flag:
                        job.status = JobStatus.CANCELLED
                        job.finished_at = time.time()
                        self._notify(job)
                        return

                    book_data = job.books[i]
                    job.current = i + 1  # 1-based pour l'affichage
                    job.current_book = book_data.title or "Sans titre"
                    self._notify(job)

                    # Enrichissement couverture (blocking I/O — acceptable dans un thread)
                    if job.populate_covers and not getattr(book_data, "cover_url", None) and getattr(book_data, "isbn", None):
                        try:
                            cover = svc._find_cover_url_sync(book_data.isbn)
                            if cover:
                                book_data.cover_url = cover
                        except Exception:
                            pass
                        time.sleep(0.5)  # rate limiting Google Books

                    # Création du livre
                    try:
                        svc.create_book(book_data)
                        job.success += 1
                    except Exception as e:
                        detail = getattr(e, 'detail', str(e))
                        if getattr(e, 'status_code', None) == 400 and "existe déjà" in detail:
                            existing_id = _extract_id(detail)
                            existing = _get_book_for_conflict(session, existing_id, job.user_id)

                            if existing is None:
                                job.failed += 1
                                job.errors.append({
                                    "line": i + 1,
                                    "title": book_data.title,
                                    "isbn": getattr(book_data, "isbn", "") or "",
                                    "error": detail,
                                })
                            else:
                                # Couverture automatique
                                if job.populate_covers and not existing.cover_url and getattr(book_data, 'cover_url', None):
                                    try:
                                        svc.patch_missing_fields(existing_id, {"cover_url": book_data.cover_url})
                                        job.auto_completed += 1
                                        job.success += 1
                                    except Exception as patch_err:
                                        logger.warning("Auto-cover patch failed for book %d: %s", existing_id, patch_err)
                                        job.skipped += 1
                                else:
                                    missing   = _compute_missing_fields(existing, book_data)
                                    divergent = _compute_divergent_fields(existing, book_data)
                                    if not missing and not divergent:
                                        job.skipped += 1
                                    else:
                                        job.conflicts.append({
                                            "line": i + 1,
                                            "existing_book_id": existing_id,
                                            "title": book_data.title,
                                            "missing_fields": missing,
                                            "divergent_fields": divergent,
                                        })
                        else:
                            job.failed += 1
                            job.errors.append({
                                "line": i + 1,
                                "title": book_data.title,
                                "isbn": getattr(book_data, "isbn", "") or "",
                                "error": str(e),
                            })
                            logger.warning("Import job %s: error on book %d: %s", job.job_id, i + 1, e)
                            if not job.skip_errors:
                                job.status = JobStatus.ERROR
                                job.finished_at = time.time()
                                self._notify(job)
                                return

                    self._notify(job)

        except Exception as e:
            logger.error("Import job %s: fatal error: %s", job.job_id, e)
            job.status = JobStatus.ERROR
            job.finished_at = time.time()
            self._notify(job)
            return

        job.status = JobStatus.DONE
        job.finished_at = time.time()
        self._notify(job)
        logger.info(
            "Import job done: %s (success=%d, failed=%d)",
            job.job_id, job.success, job.failed,
        )

    # ── Nettoyage ────────────────────────────────────────────────────────────

    def _cleanup_loop(self) -> None:
        while True:
            time.sleep(300)  # vérification toutes les 5 minutes
            now = time.time()
            with self._lock:
                to_delete = [
                    jid for jid, job in self._jobs.items()
                    if job.status in (JobStatus.DONE, JobStatus.CANCELLED, JobStatus.ERROR)
                    and job.finished_at is not None
                    and now - job.finished_at > 3600  # 1h
                ]
                for jid in to_delete:
                    del self._jobs[jid]
                    logger.debug("Import job cleaned up: %s", jid)


# Singleton — instancié une fois au démarrage
import_job_manager = ImportJobManager()
