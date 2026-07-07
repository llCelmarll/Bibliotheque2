from sqlmodel import SQLModel, Field
from typing import Optional

class BookGenreLink(SQLModel, table=True):
    __tablename__ = "book_genre_link"

    book_id: Optional[int] = Field(default=None, foreign_key="books.id", primary_key=True)
    genre_id: Optional[int] = Field(default=None, foreign_key="genres.id", primary_key=True)