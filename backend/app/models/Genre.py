from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, ForwardRef
from app.models.BookGenreLink import BookGenreLink

Book = ForwardRef("Book")

class Genre(SQLModel, table=True):
    __tablename__ = "genres"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    books: List["Book"] = Relationship(back_populates="genres", link_model=BookGenreLink)

    # Contrainte d'unicité globale sur le nom
    __table_args__ = (
        UniqueConstraint("name", name="uq_genre_name"),
    )