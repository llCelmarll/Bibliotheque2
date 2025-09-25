from typing import Optional, List
from sqlmodel import SQLModel
from app.schemas.Author import AuthorRead
from app.schemas.Genre import GenreRead
from app.schemas.Publisher import PublisherRead

class BookBase(SQLModel):
    """Schéma de base pour les livres."""
    title: str
    isbn: Optional[str] = None
    published_date: Optional[str] = None
    page_count: Optional[int] = None

class BookCreate(BookBase):
    """Schéma pour la création de livres."""
    authors: List[str] = []
    genres: List[str] = []
    publisher: Optional[str] = None
    barcode: Optional[str] = None

class BookUpdate(SQLModel):
    """Schéma pour la mise à jour des livres."""
    title: Optional[str] = None
    isbn: Optional[str] = None
    published_date: Optional[str] = None
    page_count: Optional[int] = None
    barcode: Optional[str] = None
    authors: Optional[List[str]] = None
    genres: Optional[List[str]] = None
    publisher: Optional[str] = None
    

class BookRead(BookBase):
    """Schéma pour la lecture des livres."""
    id: int
    authors: List[AuthorRead] = []
    genres: List[GenreRead] = []
    publisher: Optional[PublisherRead] = None
