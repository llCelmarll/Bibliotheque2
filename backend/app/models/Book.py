import datetime as dt
from typing import Optional
from sqlmodel import Field, SQLModel, Column, String, UniqueConstraint

class Book(SQLModel, table=True):
    __tablename__ = "books"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Informations bibliographiques
    title: str = Field(index=True)
    isbn: Optional[str] = Field(default=None,  sa_column=Column(String, nullable=True, index=True))

    authors: Optional[str] = None
    publisher: Optional[str] = None
    published_date: Optional[dt.date] = None
    genre: Optional[str] = None
    page_count: Optional[int] = None

    # Identification physique
    barcode: str = Field(default=None)  # Code-barres
    #Prêt
    lended: bool = Field(default=False)
    lended_to: Optional[str] = None         #Nom ou identifiant de l'emprunteur
    lended_date: Optional[dt.date] = None 
    return_date: Optional[dt.date] = None

    # Contraintes d'unicité
    __table_args__ = (
        UniqueConstraint("title", "isbn", name="uq_title_isbn"),
)