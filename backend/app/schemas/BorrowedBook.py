from typing import Optional, Dict, Any
from sqlmodel import SQLModel
from datetime import datetime
from app.models.BorrowedBook import BorrowStatus
from app.schemas.Contact import ContactRead


class BorrowedBookRead(SQLModel):
    """Schema for reading a borrowed book record"""
    id: int
    book_id: int
    book: Optional["BookRead"] = None
    contact_id: Optional[int] = None
    contact: Optional[ContactRead] = None
    borrowed_from: str  # Legacy, gardé pour rétrocompatibilité
    borrowed_date: datetime
    expected_return_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    status: BorrowStatus
    notes: Optional[str] = None
    calendar_event_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class BorrowedBookCreate(SQLModel):
    """Schema for creating a borrowed book record.

    Le champ contact accepte plusieurs formats :
    - int : ID d'un contact existant
    - str : Nom d'un contact (sera créé s'il n'existe pas)
    - dict : Objet avec 'name' et optionnellement 'email', 'phone', 'notes'
    """
    book_id: int
    contact: int | str | Dict[str, Any]
    borrowed_date: Optional[datetime] = None  # Defaults to now
    expected_return_date: Optional[datetime] = None
    notes: Optional[str] = None


class BorrowedBookUpdate(SQLModel):
    """Schema for updating a borrowed book record"""
    contact: Optional[int | str | Dict[str, Any]] = None
    borrowed_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    actual_return_date: Optional[datetime] = None
    status: Optional[BorrowStatus] = None
    notes: Optional[str] = None
    calendar_event_id: Optional[str] = None


class BorrowedBookReturn(SQLModel):
    """Simplified schema for marking a borrowed book as returned"""
    actual_return_date: Optional[datetime] = None  # Defaults to now


class BorrowedBookStats(SQLModel):
    """Statistics for borrowed books"""
    total_borrowed: int
    currently_borrowed: int
    overdue: int
    returned: int


# Import BookRead at the end to avoid circular imports
from app.schemas.Book import BookRead
BorrowedBookRead.model_rebuild()
