from typing import Optional
from pydantic import Field
from sqlmodel import SQLModel
from datetime import datetime
from app.models.contact_invitation_model import InvitationStatus


class ContactInvitationRead(SQLModel):
    id: int
    sender_id: int
    sender_username: str
    recipient_id: int
    recipient_username: str
    status: InvitationStatus
    message: Optional[str] = None
    created_at: datetime
    responded_at: Optional[datetime] = None


class ContactInvitationCreate(SQLModel):
    recipient_id: int
    message: Optional[str] = Field(default=None, max_length=1000)


class ContactInvitationDecline(SQLModel):
    pass  # Pas de données nécessaires pour refuser
