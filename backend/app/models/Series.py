from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, TYPE_CHECKING
from app.models.BookSeriesLink import BookSeriesLink

if TYPE_CHECKING:
    from app.models.Book import Book

class Series(SQLModel, table=True):
    __tablename__ = "series"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    books: List["Book"] = Relationship(back_populates="series", link_model=BookSeriesLink)

    # Contrainte d'unicité globale sur le nom
    __table_args__ = (
        UniqueConstraint("name", name="uq_series_name"),
    )
