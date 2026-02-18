import datetime as dt
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Text
from sqlmodel import Field, SQLModel, Column, String, Boolean, UniqueConstraint, Relationship, DateTime
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink
from app.models.BookSeriesLink import BookSeriesLink
from datetime import datetime

if TYPE_CHECKING:
    from app.models.User import User
    from app.models.Author import Author
    from app.models.Publisher import Publisher
    from app.models.Genre import Genre
    from app.models.Series import Series
    from app.models.Loan import Loan
    from app.models.BorrowedBook import BorrowedBook
    from app.models.UserLoanRequest import UserLoanRequest

class Book(SQLModel, table=True):
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Informations bibliographiques
    title: str = Field(index=True)
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

    # Statut de lecture (None = non renseigné, True = lu, False = non lu)
    is_read: Optional[bool] = Field(default=None, sa_column=Column(Boolean, nullable=True))
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

