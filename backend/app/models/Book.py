import datetime as dt
from typing import Optional, List
from sqlmodel import Field, SQLModel, Column, String, UniqueConstraint, Relationship
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink

class Book(SQLModel, table=True):
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Informations bibliographiques
    title: str = Field(index=True)
    isbn: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True, index=True))

    published_date: Optional[int] = None
    page_count: Optional[int] = None

    # Identification physique
    barcode: str = Field(default=None)  # Code-barres
    
    # Relations
    authors: List["Author"] = Relationship(back_populates="books", link_model=BookAuthorLink)
    publisher_id: Optional[int] = Field(default=None, foreign_key="publishers.id")
    publisher: Optional["Publisher"] = Relationship(back_populates="books")
    genre_id: Optional[int] = Field(default=None, foreign_key="genres.id")
    genre: Optional["Genre"] = Relationship(back_populates="books", link_model=BookGenreLink)

    # Contraintes d'unicité
    __table_args__ = (
        UniqueConstraint("title", "isbn", name="uq_title_isbn"),
)