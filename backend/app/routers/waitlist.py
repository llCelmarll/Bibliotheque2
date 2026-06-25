from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, select
from app.db import get_session
from app.models.WaitlistEntry import WaitlistEntry, WaitlistStatus
from app.models.User import User
from app.schemas.Waitlist import WaitlistEntryCreate, WaitlistEntryRead, WaitlistEntryUpdateStatus
from app.services.auth_service import get_current_admin_user_sync as get_current_admin_user
from app.services.email_service import email_notification_service
from app.utils.rate_limiter import rate_limiter

router = APIRouter(tags=["waitlist"])


# ── Endpoint public ──────────────────────────────────────────────────────────

@router.post("/waitlist", response_model=WaitlistEntryRead, status_code=status.HTTP_201_CREATED)
async def join_waitlist(
    data: WaitlistEntryCreate,
    request: Request,
    session: Session = Depends(get_session),
):
    client_ip = email_notification_service.get_client_ip(request)
    rate_limiter.check_and_record(
        client_ip, "waitlist", max_attempts=3, window_minutes=60, session=session
    )

    existing = session.exec(
        select(WaitlistEntry).where(WaitlistEntry.email == data.email.lower())
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet email est déjà sur la liste d'attente.",
        )

    entry = WaitlistEntry(
        email=data.email.lower(),
        name=data.name.strip(),
        message=data.message.strip() if data.message else None,
        referred_by=data.referred_by.strip() if data.referred_by else None,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    await email_notification_service.send_waitlist_confirmation(entry.email, entry.name)
    await email_notification_service.send_waitlist_admin_notification(
        entry.name, entry.email, entry.message, entry.referred_by
    )

    return entry


# ── Endpoints admin ──────────────────────────────────────────────────────────

@router.get("/admin/waitlist", response_model=List[WaitlistEntryRead])
def list_waitlist(
    search: Optional[str] = Query(None),
    status_filter: Optional[WaitlistStatus] = Query(None, alias="status"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
):
    query = select(WaitlistEntry)
    if search:
        query = query.where(
            (WaitlistEntry.email.ilike(f"%{search}%"))
            | (WaitlistEntry.name.ilike(f"%{search}%"))
        )
    if status_filter:
        query = query.where(WaitlistEntry.status == status_filter)
    query = query.order_by(WaitlistEntry.created_at.desc()).offset(offset).limit(limit)
    return session.exec(query).all()


@router.patch("/admin/waitlist/{entry_id}", response_model=WaitlistEntryRead)
async def update_waitlist_status(
    entry_id: int,
    data: WaitlistEntryUpdateStatus,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
):
    entry = session.get(WaitlistEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée introuvable.")

    entry.status = data.status
    session.add(entry)
    session.commit()
    session.refresh(entry)

    if data.status == WaitlistStatus.invited:
        await email_notification_service.send_waitlist_invitation(entry.email, entry.name)

    return entry
