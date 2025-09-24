from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from app.models import BookAuthorLink

class Author(SQLModel, table=True):
    __tablename__ = "authors"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    books: List["Book"] = Relationship(back_populates="authors", link_model=BookAuthorLink)