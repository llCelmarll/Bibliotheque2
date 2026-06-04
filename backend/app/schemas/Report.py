from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.Report import ReportTargetType, ReportReason, ReportStatus


class ReportCreate(BaseModel):
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    description: Optional[str] = None


class ReportRead(BaseModel):
    id: int
    reporter_id: int
    target_type: ReportTargetType
    target_id: int
    reason: ReportReason
    description: Optional[str]
    status: ReportStatus
    moderator_id: Optional[int]
    moderator_note: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ReportResolve(BaseModel):
    status: ReportStatus  # resolved | rejected
    moderator_note: Optional[str] = None
