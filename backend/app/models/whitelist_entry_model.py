from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, UniqueConstraint
from datetime import datetime

if TYPE_CHECKING:
    pass


class WhitelistEntry(SQLModel, table=True):
    __tablename__ = "whitelist_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(sa_column=Column(String, nullable=False, unique=True, index=True))
    added_by_id: Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    added_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_whitelist_email"),
    )
