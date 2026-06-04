from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, JSON, Relationship
from datetime import datetime

if TYPE_CHECKING:
    from app.models.User import User


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)

    actor_id: int = Field(foreign_key="users.id", index=True)
    actor: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[AuditLog.actor_id]", "lazy": "select"}
    )

    # suspend_user | delete_user | resolve_report | reject_report |
    # merge_entity | change_role | whitelist_add | whitelist_remove
    action: str = Field(sa_column=Column(String, nullable=False, index=True))

    target_type: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))
    target_id: Optional[int] = Field(default=None, nullable=True)

    detail: Optional[dict] = Field(default=None, sa_column=Column(JSON, nullable=True))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
