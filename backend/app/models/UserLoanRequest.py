from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, Relationship
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from app.models.Book import Book
    from app.models.User import User


class UserLoanRequestStatus(str, Enum):
    """Statut d'une demande de prêt inter-membres"""
    PENDING = "pending"       # En attente de réponse du prêteur
    ACCEPTED = "accepted"     # Accepté, livre en cours de prêt
    DECLINED = "declined"     # Refusé par le prêteur
    CANCELLED = "cancelled"   # Annulé par le demandeur
    RETURNED = "returned"     # Livre retourné


class UserLoanRequest(SQLModel, table=True):
    __tablename__ = "user_loan_requests"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Demandeur (veut emprunter le livre)
    requester_id: int = Field(foreign_key="users.id", index=True)
    requester: Optional["User"] = Relationship(
        back_populates="loan_requests_as_requester",
        sa_relationship_kwargs={"foreign_keys": "[UserLoanRequest.requester_id]"}
    )

    # Prêteur (propriétaire du livre)
    lender_id: int = Field(foreign_key="users.id", index=True)
    lender: Optional["User"] = Relationship(
        back_populates="loan_requests_as_lender",
        sa_relationship_kwargs={"foreign_keys": "[UserLoanRequest.lender_id]"}
    )

    # Livre demandé
    book_id: int = Field(foreign_key="books.id", index=True)
    book: Optional["Book"] = Relationship(back_populates="user_loan_requests")

    # Statut
    status: UserLoanRequestStatus = Field(
        default=UserLoanRequestStatus.PENDING,
        sa_column=Column(String, nullable=False, index=True)
    )

    # Messages
    message: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True)
    )
    response_message: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True)
    )

    # Dates
    request_date: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    response_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
    due_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
    return_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
