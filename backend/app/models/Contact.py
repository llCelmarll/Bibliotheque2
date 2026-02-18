from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship, Column, String, DateTime, Boolean, UniqueConstraint
from datetime import datetime

if TYPE_CHECKING:
    from app.models.Loan import Loan
    from app.models.BorrowedBook import BorrowedBook
    from app.models.User import User
    from app.models.UserLoanRequest import UserLoanRequest

class Contact(SQLModel, table=True):
    __tablename__ = "contacts"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Informations sur le contact
    name: str = Field(sa_column=Column(String, nullable=False, index=True))
    email: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    phone: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    notes: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    # Propriétaire du contact
    owner_id: int = Field(foreign_key="users.id", index=True)
    owner: Optional["User"] = Relationship(
        back_populates="contacts",
        sa_relationship_kwargs={"foreign_keys": "[Contact.owner_id]"}
    )

    # Lien optionnel vers un utilisateur de l'app
    linked_user_id: Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    linked_user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Contact.linked_user_id]"}
    )
    library_shared: bool = Field(default=False, sa_column=Column(Boolean, nullable=False))

    # Relations
    loans: List["Loan"] = Relationship(back_populates="contact")
    borrowed_books: List["BorrowedBook"] = Relationship(back_populates="contact")

    # Timestamp
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )

    # Contraintes d'unicité - un utilisateur ne peut pas avoir deux contacts avec le même nom
    __table_args__ = (
        UniqueConstraint("name", "owner_id", name="uq_contact_name_owner"),
    )
