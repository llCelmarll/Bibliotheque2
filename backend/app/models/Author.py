from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, ForwardRef

from app.models.BookAuthorLink import BookAuthorLink

Book = ForwardRef("Book")

class Author(SQLModel, table=True):
    __tablename__ = "authors"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    books: List["Book"] = Relationship(back_populates="authors", link_model=BookAuthorLink)

    # Contrainte d'unicité globale sur le nom
    __table_args__ = (
        UniqueConstraint("name", name="uq_author_name"),
    )