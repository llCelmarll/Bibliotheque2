from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class RateLimitAttempt(SQLModel, table=True):
    __tablename__ = "rate_limit_attempts"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip: str = Field(index=True)
    endpoint: str = Field(index=True)
    attempted_at: datetime = Field(default_factory=datetime.utcnow)
