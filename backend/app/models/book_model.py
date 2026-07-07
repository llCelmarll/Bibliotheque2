import datetime as dt
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Text
from sqlmodel import Field, SQLModel, Column, String, Boolean, UniqueConstraint, Relationship, DateTime
from app.models.book_author_link_model import BookAuthorLink
from app.models.book_genre_link_model import BookGenreLink
from app.models.book_series_link_model import BookSeriesLink
from datetime import datetime

if TYPE_CHECKING:
    from app.models.user_model import User
    from app.models.author_model import Author
    from app.models.publisher_model import Publisher
    from app.models.genre_model import Genre
    from app.models.series_model import Series
    from app.models.loan_model import Loan
    from app.models.borrowed_book_model import BorrowedBook
    from app.models.user_loan_request_model import UserLoanRequest

class Book(SQLModel, table=True):
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Informations bibliographiques
    title: str = Field(index=True)
    subtitle: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    isbn: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True, index=True))

    published_date: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    page_count: Optional[int] = None

    # Identification physique
    barcode: str = Field(default=None, sa_column=Column(String, nullable=True, index=True))  # Code-barres

    # Relations
    authors: List["Author"] = Relationship(back_populates="books", link_model=BookAuthorLink)
    publisher_id: Optional[int] = Field(default=None, foreign_key="publishers.id")
    publisher: Optional["Publisher"] = Relationship(back_populates="books")
    genre_id: Optional[int] = Field(default=None, foreign_key="genres.id")
    genres: List["Genre"] = Relationship(back_populates="books", link_model=BookGenreLink)
    series: List["Series"] = Relationship(back_populates="books", link_model=BookSeriesLink)
    
    # Propriétaire du livre
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    owner: Optional["User"] = Relationship(back_populates="books")

    # Prêts
    loans: List["Loan"] = Relationship(
        back_populates="book",
        cascade_delete=True
    )

    # Emprunts (livres empruntés par l'utilisateur)
    borrows: List["BorrowedBook"] = Relationship(
        back_populates="book",
        cascade_delete=True
    )

    # Disponibilité au prêt inter-membres
    is_lendable: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="true"))

    # Demandes de prêt inter-membres
    user_loan_requests: List["UserLoanRequest"] = Relationship(back_populates="book")

    # Couverture du livre
    cover_url: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    # Statut de lecture (None = non renseigné, "lu", "non_lu", "in_progress")
    reading_status: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    read_date: Optional[datetime] = Field(default=None, sa_column=Column(DateTime, nullable=True))

    # Notation (0-5, 0 = non renseigné) et notes personnelles
    rating: Optional[int] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text(), nullable=True))

    # Champs de timestamp
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: Optional[datetime] = Field(
        default= None,
        sa_column=Column(DateTime, nullable=True, onupdate=datetime.utcnow),
    )


    # Contraintes d'unicité - un utilisateur ne peut pas avoir deux livres identiques
    __table_args__ = (
        UniqueConstraint("title", "isbn", "owner_id", name="uq_title_isbn_owner"),
    )

