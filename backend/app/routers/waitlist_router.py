from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlmodel import Session
from app.db import get_session
from app.models.waitlist_entry_model import WaitlistStatus
from app.models.user_model import User
from app.schemas.waitlist_schemas import WaitlistEntryCreate, WaitlistEntryRead, WaitlistEntryUpdateStatus
from app.services.auth_service import get_current_admin_user_sync as get_current_admin_user
from app.services.email_service import email_notification_service
from app.services.waitlist_service import WaitlistService
from app.utils.rate_limiter import rate_limiter

router = APIRouter(tags=["waitlist"])


def get_waitlist_service(
    session: Session = Depends(get_session),
) -> WaitlistService:
    return WaitlistService(session)


# ── Endpoint public ──────────────────────────────────────────────────────────

@router.post("/waitlist", response_model=WaitlistEntryRead, status_code=status.HTTP_201_CREATED)
async def join_waitlist(
    data: WaitlistEntryCreate,
    request: Request,
    session: Session = Depends(get_session),
    service: WaitlistService = Depends(get_waitlist_service),
):
    client_ip = email_notification_service.get_client_ip(request)
    rate_limiter.check_and_record(
        client_ip, "waitlist", max_attempts=3, window_minutes=60, session=session
    )

    return await service.join(data)


# ── Endpoints admin ──────────────────────────────────────────────────────────

@router.get("/admin/waitlist", response_model=List[WaitlistEntryRead])
def list_waitlist(
    search: Optional[str] = Query(None),
    status_filter: Optional[WaitlistStatus] = Query(None, alias="status"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_admin_user),
    service: WaitlistService = Depends(get_waitlist_service),
):
    return service.list_entries(search, status_filter, offset, limit)


@router.delete("/admin/waitlist/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_waitlist_entry(
    entry_id: int,
    current_user: User = Depends(get_current_admin_user),
    service: WaitlistService = Depends(get_waitlist_service),
):
    service.delete(entry_id)


@router.patch("/admin/waitlist/{entry_id}", response_model=WaitlistEntryRead)
async def update_waitlist_status(
    entry_id: int,
    data: WaitlistEntryUpdateStatus,
    current_user: User = Depends(get_current_admin_user),
    service: WaitlistService = Depends(get_waitlist_service),
):
    return await service.update_status(entry_id, data.status, current_user.id)
