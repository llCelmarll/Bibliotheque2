from typing import Optional, List
from sqlmodel import SQLModel
from app.schemas.Author import AuthorRead
from app.schemas.Genre import GenreRead
from app.schemas.Publisher import PublisherRead

class BookRead(SQLModel):
    id: int
    title: str
    isbn: Optional[str] = None
    publisher_date: Optional[str] = None
    page_count: Optional[int] = None
    barcode: Optional[str] = None
    lended: bool = False
    lended_to: Optional[str] = None
    lended_date: Optional[str] = None

    # Relations
    authors: List[AuthorRead] = []
    genres: List[GenreRead] = []
    publisher: Optional[PublisherRead] = None