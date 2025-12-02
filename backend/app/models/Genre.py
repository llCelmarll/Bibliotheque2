from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, TYPE_CHECKING
from app.models.BookGenreLink import BookGenreLink

if TYPE_CHECKING:
    from app.models.User import User

class Genre(SQLModel, table=True):
    __tablename__ = "genres"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    # Propriétaire du genre
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    owner: Optional["User"] = Relationship()

    books: List["Book"] = Relationship(back_populates="genres", link_model=BookGenreLink)

    # Contraintes d'unicité - un utilisateur ne peut pas avoir deux genres avec le même nom
    __table_args__ = (
        UniqueConstraint("name", "owner_id", name="uq_genre_name_owner"),
    )