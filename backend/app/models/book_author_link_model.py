from sqlmodel import SQLModel, Field
from typing import Optional

class BookAuthorLink(SQLModel, table=True):
    __tablename__ = "book_author_link"

    book_id: Optional[int] = Field(default=None, foreign_key="books.id", primary_key=True)
    author_id: Optional[int] = Field(default=None, foreign_key="authors.id", primary_key=True)