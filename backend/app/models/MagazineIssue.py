from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import Text, UniqueConstraint
from sqlmodel import SQLModel, Field, Column, String, Boolean, Relationship, DateTime
from datetime import datetime

if TYPE_CHECKING:
    from app.models.MagazineSeries import MagazineSeries
    from app.models.MagazineLoan import MagazineLoan


class MagazineIssue(SQLModel, table=True):
    __tablename__ = "magazine_issues"

    id: Optional[int] = Field(default=None, primary_key=True)

    series_id: int = Field(foreign_key="magazine_series.id", index=True)
    series: Optional["MagazineSeries"] = Relationship(back_populates="issues")

    issue_number: Optional[int] = Field(default=None, index=True)
    title: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    published_date: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    cover_url: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    owner_id: Optional[int] = Field(default=None, foreign_key="users.id", index=True)

    is_read: Optional[bool] = Field(default=None, sa_column=Column(Boolean, nullable=True))
    read_date: Optional[datetime] = Field(default=None, sa_column=Column(DateTime, nullable=True))

    rating: Optional[int] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text(), nullable=True))

    is_lendable: bool = Field(default=True, sa_column=Column(Boolean, nullable=False, server_default="true"))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )

    loans: List["MagazineLoan"] = Relationship(
        back_populates="issue",
        cascade_delete=True,
    )

    __table_args__ = (
        UniqueConstraint("series_id", "issue_number", "owner_id", name="uq_series_issue_owner"),
    )
