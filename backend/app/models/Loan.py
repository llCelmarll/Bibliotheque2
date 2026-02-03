from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, Relationship
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from app.models.Book import Book
    from app.models.User import User
    from app.models.Contact import Contact

class LoanStatus(str, Enum):
    """Statut d'un prêt"""
    ACTIVE = "active" # Prêt en cours
    RETURNED = "returned" # Livre retourné
    OVERDUE = "overdue" # Prêt en retard

class Loan(SQLModel, table=True):
    __tablename__ = "loans"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Relations
    book_id: int = Field(foreign_key="books.id", index=True)
    book: Optional["Book"] = Relationship(back_populates="loans")

    owner_id: int = Field(foreign_key="users.id", index=True)
    owner: Optional["User"] = Relationship(
        back_populates="loans_as_owner",
        sa_relationship_kwargs={"foreign_keys": "[Loan.owner_id]"}
    )

    contact_id: int = Field(foreign_key="contacts.id", index=True)
    contact: Optional["Contact"] = Relationship(back_populates="loans")

    # Dates et statut
    loan_date: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    due_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
    return_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )

    status: LoanStatus = Field(
        default=LoanStatus.ACTIVE,
        sa_column=Column(String, nullable=False)
    )

    #Notes
    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True)
    )

    # Calendar event ID for reminders
    calendar_event_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True)
    )
