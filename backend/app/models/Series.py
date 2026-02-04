from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, TYPE_CHECKING
from app.models.BookSeriesLink import BookSeriesLink

if TYPE_CHECKING:
    from app.models.User import User
    from app.models.Book import Book

class Series(SQLModel, table=True):
    __tablename__ = "series"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    # Propriétaire de la série
    owner_id: Optional[int] = Field(default=None, foreign_key="users.id")
    owner: Optional["User"] = Relationship()

    books: List["Book"] = Relationship(back_populates="series", link_model=BookSeriesLink)

    # Contraintes d'unicité
    __table_args__ = (
        UniqueConstraint("name", "owner_id", name="uq_series_name_owner"),
    )
