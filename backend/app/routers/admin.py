from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from sqlalchemy import func
from app.db import get_session
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
from app.schemas.Book import BookRead, BookAdvancedSearchParams
from app.schemas.Other import SortBy, SortOrder
from app.services.auth_service import get_current_moderator_user_sync as get_current_moderator_user, get_current_admin_user_sync as get_current_admin_user
from app.services.book_service import BookService
from app.repositories.book_repository import BookRepository

router = APIRouter(prefix="/admin", tags=["admin"])


# --- Stats ---

@router.get("/stats", response_model=AdminStats)
def get_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_moderator_user),
):
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
    limit: int = Query(50, ge=1, le=1000),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_moderator_user),
):
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


@router.get("/users/{user_id}/loans")
def get_user_loans(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_moderator_user),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    query = (
        select(Loan)
        .where(Loan.owner_id == user_id)
        .order_by(Loan.loan_date.desc())
        .limit(limit)
    )
    loans = session.exec(query).all()
    result = []
    for loan in loans:
        book = session.get(Book, loan.book_id) if loan.book_id else None
        result.append({
            "id": loan.id,
            "status": loan.status,
            "loan_date": loan.loan_date,
            "due_date": loan.due_date,
            "return_date": loan.return_date,
            "book": {"id": book.id, "title": book.title, "authors": [{"name": a.name} for a in book.authors]} if book else None,
            "contact": {"name": loan.contact.name} if loan.contact else None,
        })
    return result


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_moderator_user),
):
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
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
):
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
def list_whitelist(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
):
    return session.exec(select(WhitelistEntry).order_by(WhitelistEntry.added_at.desc())).all()


@router.post("/whitelist", response_model=WhitelistEntryRead, status_code=status.HTTP_201_CREATED)
def add_to_whitelist(
    data: WhitelistEntryCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
):
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
def remove_from_whitelist(
    email: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_admin_user),
):
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
    limit: int = Query(50, ge=1, le=1000),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_moderator_user),
):
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    return session.exec(query).all()


@router.get("/books", response_model=List[BookRead])
def admin_list_books(
    owner_id: Optional[int] = Query(None, description="Filtrer par propriétaire"),
    title: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    publisher: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    isbn: Optional[str] = Query(None),
    reading_status: Optional[str] = Query(None),
    rating_min: Optional[int] = Query(None, ge=0, le=5),
    year_min: Optional[int] = Query(None, ge=0),
    year_max: Optional[int] = Query(None, ge=0),
    sort_by: SortBy = Query(SortBy.created_at),
    sort_order: SortOrder = Query(SortOrder.desc),
    limit: int = Query(10000, ge=1, le=10000),
    skip: int = Query(0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_moderator_user),
):
    from app.schemas.Book import ReadingStatus
    params = BookAdvancedSearchParams(
        owner_id=owner_id,
        title=title,
        author=author,
        publisher=publisher,
        genre=genre,
        isbn=isbn,
        reading_status=ReadingStatus(reading_status) if reading_status else None,
        rating_min=rating_min,
        year_min=year_min,
        year_max=year_max,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        skip=skip,
    )
    repo = BookRepository(session)
    books = repo.advanced_search_books(params, user_id=None)
    service = BookService(session, user_id=owner_id)
    return [service._enrich_book_read(b) for b in books]
