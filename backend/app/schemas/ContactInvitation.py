from typing import Optional
from sqlmodel import SQLModel
from datetime import datetime
from app.models.ContactInvitation import InvitationStatus


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
    message: Optional[str] = None


class ContactInvitationDecline(SQLModel):
    pass  # Pas de données nécessaires pour refuser
