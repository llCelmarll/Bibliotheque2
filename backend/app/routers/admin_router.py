from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session
from app.db import get_session
from app.models.user_model import User
from app.schemas.admin_schemas import (
    AdminStats, AdminUserRead, AdminUserUpdate,
    WhitelistEntryRead, WhitelistEntryCreate, AuditLogRead,
)
from app.schemas.book_schemas import BookRead, BookAdvancedSearchParams
from app.schemas.other_schemas import SortBy, SortOrder
from app.services.admin_service import AdminService
from app.services.auth_service import get_current_moderator_user_sync as get_current_moderator_user, get_current_admin_user_sync as get_current_admin_user
from app.services.book_service import BookService
from app.repositories.book_repository import BookRepository

router = APIRouter(prefix="/admin", tags=["admin"])


def get_admin_service(
    session: Session = Depends(get_session),
) -> AdminService:
    return AdminService(session)


# --- Stats ---

@router.get("/stats", response_model=AdminStats)
def get_stats(
    current_user: User = Depends(get_current_moderator_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.get_stats()


# --- Users ---

@router.get("/users", response_model=List[AdminUserRead])
def list_users(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    current_user: User = Depends(get_current_moderator_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.list_users(search, is_active, role, offset, limit)


@router.get("/users/{user_id}/loans")
def get_user_loans(
    user_id: int,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_moderator_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.get_user_loans(user_id, limit)


@router.patch("/users/{user_id}", response_model=AdminUserRead)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    current_user: User = Depends(get_current_moderator_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.update_user(user_id, data, current_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    service.delete_user(user_id, current_user)


# --- Whitelist ---

@router.get("/whitelist", response_model=List[WhitelistEntryRead])
def list_whitelist(
    current_user: User = Depends(get_current_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.list_whitelist()


@router.post("/whitelist", response_model=WhitelistEntryRead, status_code=status.HTTP_201_CREATED)
def add_to_whitelist(
    data: WhitelistEntryCreate,
    current_user: User = Depends(get_current_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.add_to_whitelist(data, current_user)


@router.delete("/whitelist/{email}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_whitelist(
    email: str,
    current_user: User = Depends(get_current_admin_user),
    service: AdminService = Depends(get_admin_service),
):
    service.remove_from_whitelist(email, current_user)


# --- Audit log ---

@router.get("/audit-log", response_model=List[AuditLogRead])
def get_audit_log(
    action: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=1000),
    current_user: User = Depends(get_current_moderator_user),
    service: AdminService = Depends(get_admin_service),
):
    return service.get_audit_log(action, offset, limit)


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
    from app.schemas.book_schemas import ReadingStatus
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
