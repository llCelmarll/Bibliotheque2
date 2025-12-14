from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Relationship, Column, String, DateTime, UniqueConstraint
from datetime import datetime

if TYPE_CHECKING:
    from app.models.Loan import Loan
    from app.models.User import User

class Borrower(SQLModel, table=True):
    __tablename__ = "borrowers"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Informations sur l'emprunteur
    name: str = Field(sa_column=Column(String, nullable=False, index=True))
    email: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    phone: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    notes: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    # Propriétaire de l'emprunteur
    owner_id: int = Field(foreign_key="users.id", index=True)
    owner: Optional["User"] = Relationship(back_populates="borrowers")

    # Relations
    loans: List["Loan"] = Relationship(back_populates="borrower")

    # Timestamp
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )

    # Contraintes d'unicité - un utilisateur ne peut pas avoir deux emprunteurs avec le même nom
    __table_args__ = (
        UniqueConstraint("name", "owner_id", name="uq_borrower_name_owner"),
    )