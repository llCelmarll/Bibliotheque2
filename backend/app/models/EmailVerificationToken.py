from typing import Optional
from sqlmodel import Field, SQLModel, Column, String, DateTime, Boolean
from datetime import datetime


class EmailVerificationToken(SQLModel, table=True):
    __tablename__ = "email_verification_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(
        sa_column=Column(String, nullable=False, unique=True, index=True)
    )
    user_id: int = Field(foreign_key="users.id", index=True)
    expires_at: datetime = Field(sa_column=Column(DateTime, nullable=False))
    used: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
