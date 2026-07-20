from typing import List, Optional

from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, select

from app.models.contact_invitation_model import ContactInvitation, InvitationStatus
from app.models.contact_model import Contact
from app.models.user_model import User


class ContactInvitationRepository:
    """Repository pour les opérations de données sur les invitations de contact."""

    def __init__(self, session: Session):
        self.session = session

    def get_by_id_with_relations(self, inv_id: int) -> Optional[ContactInvitation]:
        return self.session.exec(
            select(ContactInvitation)
            .where(ContactInvitation.id == inv_id)
            .options(
                selectinload(ContactInvitation.sender),
                selectinload(ContactInvitation.recipient),
            )
        ).first()

    def list_received_pending(self, recipient_id: int) -> List[ContactInvitation]:
        return self.session.exec(
            select(ContactInvitation)
            .where(
                ContactInvitation.recipient_id == recipient_id,
                ContactInvitation.status == InvitationStatus.PENDING,
            )
            .options(
                selectinload(ContactInvitation.sender),
                selectinload(ContactInvitation.recipient),
            )
            .order_by(ContactInvitation.created_at.desc())
        ).all()

    def list_sent_active(self, sender_id: int) -> List[ContactInvitation]:
        return self.session.exec(
            select(ContactInvitation)
            .where(
                ContactInvitation.sender_id == sender_id,
                ContactInvitation.status != InvitationStatus.CANCELLED,
            )
            .options(
                selectinload(ContactInvitation.sender),
                selectinload(ContactInvitation.recipient),
            )
            .order_by(ContactInvitation.created_at.desc())
        ).all()

    def count_pending_received(self, recipient_id: int) -> int:
        return self.session.exec(
            select(func.count(ContactInvitation.id)).where(
                ContactInvitation.recipient_id == recipient_id,
                ContactInvitation.status == InvitationStatus.PENDING,
            )
        ).one()

    def find_pending_between(self, user_a_id: int, user_b_id: int) -> Optional[ContactInvitation]:
        return self.session.exec(
            select(ContactInvitation).where(
                ContactInvitation.status == InvitationStatus.PENDING,
                (
                    (ContactInvitation.sender_id == user_a_id) &
                    (ContactInvitation.recipient_id == user_b_id)
                ) | (
                    (ContactInvitation.sender_id == user_b_id) &
                    (ContactInvitation.recipient_id == user_a_id)
                )
            )
        ).first()

    def find_linked_contact(self, owner_id: int, linked_user_id: int) -> Optional[Contact]:
        return self.session.exec(
            select(Contact).where(
                Contact.owner_id == owner_id,
                Contact.linked_user_id == linked_user_id,
            )
        ).first()

    def get_active_user_by_id(self, user_id: int) -> Optional[User]:
        return self.session.exec(
            select(User).where(User.id == user_id, User.is_active == True)
        ).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        return self.session.exec(select(User).where(User.id == user_id)).first()

    def find_contact_by_linked_user(self, owner_id: int, linked_user_id: int) -> Optional[Contact]:
        return self.session.exec(
            select(Contact).where(
                Contact.owner_id == owner_id,
                Contact.linked_user_id == linked_user_id,
            )
        ).first()

    def find_contact_by_email(self, owner_id: int, email: str) -> Optional[Contact]:
        return self.session.exec(
            select(Contact).where(
                Contact.owner_id == owner_id,
                Contact.email == email,
            )
        ).first()

    def find_contact_by_name(self, owner_id: int, name: str) -> Optional[Contact]:
        return self.session.exec(
            select(Contact).where(
                Contact.owner_id == owner_id,
                Contact.name == name,
            )
        ).first()

    def update_contact_link(self, contact: Contact, linked_user_id: int) -> Contact:
        contact.linked_user_id = linked_user_id
        self.session.add(contact)
        return contact

    def add_contact(self, contact: Contact) -> Contact:
        self.session.add(contact)
        return contact

    def update_invitation_status(
        self,
        inv: ContactInvitation,
        status: InvitationStatus,
        responded_at=None,
    ) -> ContactInvitation:
        inv.status = status
        if responded_at is not None:
            inv.responded_at = responded_at
        self.session.add(inv)
        return inv

    def add_invitation(self, inv: ContactInvitation) -> ContactInvitation:
        self.session.add(inv)
        return inv
