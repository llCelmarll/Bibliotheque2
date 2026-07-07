from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Column, String


class UserPushToken(SQLModel, table=True):
    __tablename__ = "user_push_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    token: str = Field(sa_column=Column(String, nullable=False, unique=True))
    platform: Optional[str] = Field(default=None)  # "ios" | "android"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
