from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Column, String, UniqueConstraint, Relationship, DateTime
from datetime import datetime

if TYPE_CHECKING:
    from app.models.Book import Book
    from app.models.Loan import Loan
    from app.models.Contact import Contact
    from app.models.BorrowedBook import BorrowedBook
    from app.models.UserLoanRequest import UserLoanRequest
    from app.models.ContactInvitation import ContactInvitation

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Authentification
    email: str = Field(sa_column=Column(String, nullable=False, unique=True, index=True))
    username: str = Field(sa_column=Column(String, nullable=False))
    hashed_password: str = Field(sa_column=Column(String, nullable=False))

    # État du compte
    is_active: bool = Field(default=True)

    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )

    # Relations
    books: List["Book"] = Relationship(back_populates="owner")
    loans_as_owner: List["Loan"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"foreign_keys": "Loan.owner_id"}
    )
    contacts: List["Contact"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"foreign_keys": "Contact.owner_id"}
    )
    borrowed_books: List["BorrowedBook"] = Relationship(back_populates="user")
    loan_requests_as_requester: List["UserLoanRequest"] = Relationship(
        back_populates="requester",
        sa_relationship_kwargs={"foreign_keys": "UserLoanRequest.requester_id"}
    )
    loan_requests_as_lender: List["UserLoanRequest"] = Relationship(
        back_populates="lender",
        sa_relationship_kwargs={"foreign_keys": "UserLoanRequest.lender_id"}
    )
    invitations_sent: List["ContactInvitation"] = Relationship(
        back_populates="sender",
        sa_relationship_kwargs={"foreign_keys": "ContactInvitation.sender_id"}
    )
    invitations_received: List["ContactInvitation"] = Relationship(
        back_populates="recipient",
        sa_relationship_kwargs={"foreign_keys": "ContactInvitation.recipient_id"}
    )

    # Contraintes
    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
    )
