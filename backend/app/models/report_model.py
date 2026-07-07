from typing import Optional, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Column, String, DateTime, Relationship
from datetime import datetime

if TYPE_CHECKING:
    from app.models.user_model import User


class ReportTargetType(str, Enum):
    book = "book"
    note = "note"
    user = "user"


class ReportReason(str, Enum):
    inappropriate = "inappropriate"
    spam = "spam"
    wrong_info = "wrong_info"
    other = "other"


class ReportStatus(str, Enum):
    pending = "pending"
    resolved = "resolved"
    rejected = "rejected"


class Report(SQLModel, table=True):
    __tablename__ = "reports"

    id: Optional[int] = Field(default=None, primary_key=True)

    reporter_id: int = Field(foreign_key="users.id", index=True)
    reporter: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Report.reporter_id]", "lazy": "select"}
    )

    target_type: ReportTargetType = Field(sa_column=Column(String, nullable=False, index=True))
    target_id: int = Field(index=True)

    reason: ReportReason = Field(sa_column=Column(String, nullable=False))
    description: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    status: ReportStatus = Field(
        default=ReportStatus.pending,
        sa_column=Column(String, nullable=False, index=True, server_default="pending")
    )

    moderator_id: Optional[int] = Field(default=None, foreign_key="users.id", nullable=True)
    moderator: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Report.moderator_id]", "lazy": "select"}
    )
    moderator_note: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    resolved_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime, nullable=True))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
