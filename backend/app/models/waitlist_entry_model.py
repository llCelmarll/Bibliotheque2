from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field, Column, String, DateTime, Text
from datetime import datetime


class WaitlistStatus(str, Enum):
    pending = "pending"
    invited = "invited"
    rejected = "rejected"


class WaitlistEntry(SQLModel, table=True):
    __tablename__ = "waitlist_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(sa_column=Column(String, nullable=False, unique=True, index=True))
    name: str = Field(sa_column=Column(String, nullable=False))
    message: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    referred_by: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    status: WaitlistStatus = Field(
        default=WaitlistStatus.pending,
        sa_column=Column(String, nullable=False, index=True, server_default="pending"),
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
