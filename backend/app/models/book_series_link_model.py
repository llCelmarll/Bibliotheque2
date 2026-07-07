from sqlmodel import SQLModel, Field
from typing import Optional

class BookSeriesLink(SQLModel, table=True):
    __tablename__ = "book_series_link"

    book_id: Optional[int] = Field(default=None, foreign_key="books.id", primary_key=True)
    series_id: Optional[int] = Field(default=None, foreign_key="series.id", primary_key=True)
    volume_number: Optional[int] = Field(default=None)
