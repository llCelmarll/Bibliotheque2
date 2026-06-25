from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.WaitlistEntry import WaitlistStatus


class WaitlistEntryCreate(BaseModel):
    email: EmailStr
    name: str
    message: Optional[str] = None
    referred_by: Optional[str] = None


class WaitlistEntryRead(BaseModel):
    id: int
    email: str
    name: str
    message: Optional[str]
    referred_by: Optional[str]
    status: WaitlistStatus
    created_at: datetime

    class Config:
        from_attributes = True


class WaitlistEntryUpdateStatus(BaseModel):
    status: WaitlistStatus
