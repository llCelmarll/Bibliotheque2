from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user_model import UserRole


class AdminStats(BaseModel):
    total_users: int
    active_users: int
    total_books: int
    active_loans: int
    pending_reports: int
    whitelist_count: int
    pending_waitlist: int


class AdminUserRead(BaseModel):
    id: int
    email: str
    username: str
    role: str
    is_active: bool
    email_verified_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class WhitelistEntryRead(BaseModel):
    id: int
    email: str
    added_by_id: Optional[int]
    added_at: datetime

    class Config:
        from_attributes = True


class WhitelistEntryCreate(BaseModel):
    email: EmailStr


class AuditLogRead(BaseModel):
    id: int
    actor_id: int
    action: str
    target_type: Optional[str]
    target_id: Optional[int]
    detail: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class MergeEntitiesRequest(BaseModel):
    source_id: int
    target_id: int


class ContactStaffMessage(BaseModel):
    subject: str
    message: str
