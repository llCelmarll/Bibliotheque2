from typing import Optional
from sqlmodel import SQLModel

class BookRead(SQLModel):
    id: int
    title: str
    isbn: Optional[str] = None
    authors: Optional[str] = None
    publisher: Optional[str] = None
    publisher_date: Optional[str] = None
    genre: Optional[str] = None
    page_count: Optional[int] = None
    barcode: Optional[str] = None
    lended: bool = False
    lended_to: Optional[str] = None
    lended_date: Optional[str] = None