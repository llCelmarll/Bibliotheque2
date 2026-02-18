from typing import Optional
from sqlmodel import SQLModel
from datetime import datetime
from app.models.UserLoanRequest import UserLoanRequestStatus
from app.schemas.Book import BookRead


class UserLoanRequestRead(SQLModel):
    """Schéma de lecture pour une demande de prêt inter-membres"""
    id: int
    requester_id: int
    requester_username: str
    lender_id: int
    lender_username: str
    book_id: int
    book: Optional[BookRead] = None
    status: UserLoanRequestStatus
    message: Optional[str] = None
    response_message: Optional[str] = None
    request_date: datetime
    response_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserLoanRequestCreate(SQLModel):
    """Schéma de création d'une demande de prêt.

    Le lender_id est déduit du propriétaire du livre (book_id).
    """
    book_id: int
    message: Optional[str] = None
    due_date: Optional[datetime] = None


class UserLoanRequestAccept(SQLModel):
    """Schéma pour accepter une demande (prêteur)"""
    response_message: Optional[str] = None
    due_date: Optional[datetime] = None


class UserLoanRequestDecline(SQLModel):
    """Schéma pour refuser une demande (prêteur)"""
    response_message: Optional[str] = None


class UserLoanRequestReturn(SQLModel):
    """Schéma pour marquer le livre comme retourné (prêteur)"""
    return_date: Optional[datetime] = None
