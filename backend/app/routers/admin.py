from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from sqlalchemy import func
from app.db import engine
from app.models.User import User
from app.models.Book import Book
from app.models.Loan import Loan, LoanStatus
from app.models.Report import Report, ReportStatus
from app.models.AuditLog import AuditLog
from app.models.WhitelistEntry import WhitelistEntry
from app.schemas.Admin import (
    AdminStats, AdminUserRead, AdminUserUpdate,
    WhitelistEntryRead, WhitelistEntryCreate, AuditLogRead,
)
from app.services.auth_service import get_current_moderator_user_sync as get_current_moderator_user, get_current_admin_user_sync as get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Stats ---

@router.get("/stats", response_model=AdminStats)
def get_stats(current_user: User = Depends(get_current_moderator_user)):
    with Session(engine) as session:
        total_users = session.scalar(select(func.count(User.id)))
        active_users = session.scalar(select(func.count(User.id)).where(User.is_active == True))
        total_books = session.scalar(select(func.count(Book.id)))
        active_loans = session.scalar(select(func.count(Loan.id)).where(Loan.status == LoanStatus.ACTIVE))
        pending_reports = session.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.pending))
        whitelist_count = session.scalar(select(func.count(WhitelistEntry.id)))
    return AdminStats(
        total_users=total_users,
        active_users=active_users,
        total_books=total_books,
        active_loans=active_loans,
        pending_reports=pending_reports,
        whitelist_count=whitelist_count,
    )


# --- Users ---

@router.get("/users", response_model=List[AdminUserRead])
def list_users(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_moderator_user),
):
    with Session(engine) as session:
        query = select(User)
        if search:
            query = query.where(
                (User.email.ilike(f"%{search}%")) | (User.username.ilike(f"%{search}%"))
            )
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if role:
            query = query.where(User.role == role)
        query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
        return session.exec(query).all()


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    current_user: User = Depends(get_current_moderator_user),
):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre compte depuis l'admin")
        if data.role is not None and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Seul un administrateur peut modifier les rôles")

        audit_detail = {}
        if data.is_active is not None:
            audit_detail["is_active"] = {"before": user.is_active, "after": data.is_active}
            user.is_active = data.is_active
        if data.role is not None:
            audit_detail["role"] = {"before": user.role, "after": data.role}
            user.role = data.role

        action = "suspend_user" if data.is_active is False else "change_role" if data.role else "update_user"
        audit = AuditLog(actor_id=current_user.id, action=action, target_type="user", target_id=user_id, detail=audit_detail)
        session.add(user)
        session.add(audit)
        session.commit()
        session.refresh(user)
        return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: User = Depends(get_current_admin_user)):
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
        audit = AuditLog(actor_id=current_user.id, action="delete_user", target_type="user", target_id=user_id, detail={"email": user.email, "username": user.username})
        session.add(audit)
        session.delete(user)
        session.commit()


# --- Whitelist ---

@router.get("/whitelist", response_model=List[WhitelistEntryRead])
def list_whitelist(current_user: User = Depends(get_current_admin_user)):
    with Session(engine) as session:
        return session.exec(select(WhitelistEntry).order_by(WhitelistEntry.added_at.desc())).all()


@router.post("/whitelist", response_model=WhitelistEntryRead, status_code=status.HTTP_201_CREATED)
def add_to_whitelist(data: WhitelistEntryCreate, current_user: User = Depends(get_current_admin_user)):
    with Session(engine) as session:
        existing = session.exec(select(WhitelistEntry).where(WhitelistEntry.email == data.email.lower())).first()
        if existing:
            raise HTTPException(status_code=409, detail="Cet email est déjà dans la whitelist")
        entry = WhitelistEntry(email=data.email.lower(), added_by_id=current_user.id)
        audit = AuditLog(actor_id=current_user.id, action="whitelist_add", target_type="whitelist", detail={"email": data.email.lower()})
        session.add(entry)
        session.add(audit)
        session.commit()
        session.refresh(entry)
        return entry


@router.delete("/whitelist/{email}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_whitelist(email: str, current_user: User = Depends(get_current_admin_user)):
    with Session(engine) as session:
        entry = session.exec(select(WhitelistEntry).where(WhitelistEntry.email == email.lower())).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Email introuvable dans la whitelist")
        audit = AuditLog(actor_id=current_user.id, action="whitelist_remove", target_type="whitelist", detail={"email": email.lower()})
        session.add(audit)
        session.delete(entry)
        session.commit()


# --- Audit log ---

@router.get("/audit-log", response_model=List[AuditLogRead])
def get_audit_log(
    action: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_admin_user),
):
    with Session(engine) as session:
        query = select(AuditLog)
        if action:
            query = query.where(AuditLog.action == action)
        query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        return session.exec(query).all()
