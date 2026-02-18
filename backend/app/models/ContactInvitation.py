from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, Relationship
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from app.models.User import User


class InvitationStatus(str, Enum):
    PENDING = "pending"      # En attente de réponse
    ACCEPTED = "accepted"    # Acceptée → contacts créés des deux côtés
    DECLINED = "declined"    # Refusée
    CANCELLED = "cancelled"  # Annulée par l'expéditeur


class ContactInvitation(SQLModel, table=True):
    __tablename__ = "contact_invitations"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Expéditeur (veut se connecter)
    sender_id: int = Field(foreign_key="users.id", index=True)
    sender: Optional["User"] = Relationship(
        back_populates="invitations_sent",
        sa_relationship_kwargs={"foreign_keys": "[ContactInvitation.sender_id]"}
    )

    # Destinataire
    recipient_id: int = Field(foreign_key="users.id", index=True)
    recipient: Optional["User"] = Relationship(
        back_populates="invitations_received",
        sa_relationship_kwargs={"foreign_keys": "[ContactInvitation.recipient_id]"}
    )

    status: InvitationStatus = Field(
        default=InvitationStatus.PENDING,
        sa_column=Column(String, nullable=False, index=True)
    )

    message: Optional[str] = Field(default=None, sa_column=Column(String, nullable=True))

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    responded_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
