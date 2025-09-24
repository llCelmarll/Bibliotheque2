from sqlmodel import SQLModel, Field
from typing import Optional

class BookAuthorLink(SQLModel, table=True):
    __tablename__ = "book_author_link"

    book_id: Optional[int] = Field(default=None, foreign_key="book.id", primary_key=True)
    author_id: Optional[int] = Field(default=None, foreign_key="author.id", primary_key=True)