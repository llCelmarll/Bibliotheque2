from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.User import User

class Publisher(SQLModel, table=True):
    __tablename__ = "publishers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    # Propriétaire de l'éditeur
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    owner: Optional["User"] = Relationship()

    books: List["Book"] = Relationship(back_populates="publisher")

    # Contraintes d'unicité - un utilisateur ne peut pas avoir deux éditeurs avec le même nom
    __table_args__ = (
        UniqueConstraint("name", "owner_id", name="uq_publisher_name_owner"),
    )