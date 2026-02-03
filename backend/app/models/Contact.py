from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship, Column, String, DateTime, UniqueConstraint
from datetime import datetime

if TYPE_CHECKING:
    from app.models.Loan import Loan
    from app.models.BorrowedBook import BorrowedBook
    from app.models.User import User

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
    owner: Optional["User"] = Relationship(back_populates="contacts")

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
