from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, Relationship
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from app.models.Book import Book
    from app.models.User import User


class BorrowStatus(str, Enum):
    """Status of a borrowed book"""
    ACTIVE = "active"
    RETURNED = "returned"
    OVERDUE = "overdue"


class BorrowedBook(SQLModel, table=True):
    """Model for tracking books borrowed by the user from external sources"""
    __tablename__ = "borrowed_books"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Relations
    book_id: int = Field(foreign_key="books.id", index=True)
    book: Optional["Book"] = Relationship(back_populates="borrows")

    user_id: int = Field(foreign_key="users.id", index=True)
    user: Optional["User"] = Relationship(back_populates="borrowed_books")

    # Source information
    borrowed_from: str = Field(
        sa_column=Column(String, nullable=False, index=True)
    )  # e.g., "Jean", "Municipal Library"

    # Date tracking
    borrowed_date: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    expected_return_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
    actual_return_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )

    # Status
    status: BorrowStatus = Field(
        default=BorrowStatus.ACTIVE,
        sa_column=Column(String, nullable=False)
    )

    # Optional notes
    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True)
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True, onupdate=datetime.utcnow),
    )
