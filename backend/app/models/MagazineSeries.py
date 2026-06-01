from typing import Optional, List, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Column, String, Relationship, DateTime
from datetime import datetime

if TYPE_CHECKING:
    from app.models.User import User
    from app.models.MagazineIssue import MagazineIssue


class Periodicity(str, Enum):
    monthly = "monthly"
    weekly = "weekly"
    quarterly = "quarterly"
    irregular = "irregular"


class MagazineSeries(SQLModel, table=True):
    __tablename__ = "magazine_series"

    id: Optional[int] = Field(default=None, primary_key=True)

    title: str = Field(index=True)
    publisher: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    periodicity: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    cover_url: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    owner_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )

    issues: List["MagazineIssue"] = Relationship(
        back_populates="series",
        cascade_delete=True,
    )
