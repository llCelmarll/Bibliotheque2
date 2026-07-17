import asyncio
from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List
from datetime import datetime

from app.models.contact_invitation_model import ContactInvitation, InvitationStatus
from app.models.contact_model import Contact
from app.models.user_model import User
from app.repositories.contact_invitation_repository import ContactInvitationRepository
from app.schemas.contact_invitation_schemas import ContactInvitationRead, ContactInvitationCreate
from app.services.push_notification_service import push_notification_service


def _fire_push(session: Session, user_id: int, title: str, body: str, notification_type: str = None):
    """Lance un envoi push en fire-and-forget depuis un contexte synchrone."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            data = {"type": notification_type} if notification_type else None
            loop.create_task(push_notification_service.send_to_user(session, user_id, title, body, data=data))
    except Exception:
        pass


def _to_read(inv: ContactInvitation) -> ContactInvitationRead:
    return ContactInvitationRead(
        id=inv.id,
        sender_id=inv.sender_id,
        sender_username=inv.sender.username if inv.sender else str(inv.sender_id),
        recipient_id=inv.recipient_id,
        recipient_username=inv.recipient.username if inv.recipient else str(inv.recipient_id),
        status=inv.status,
        message=inv.message,
        created_at=inv.created_at,
        responded_at=inv.responded_at,
    )


class ContactInvitationService:

    def __init__(self, session: Session, current_user_id: int):
        self.session = session
        self.current_user_id = current_user_id
        self.contact_invitation_repository = ContactInvitationRepository(session)

    def _load(self, inv_id: int) -> ContactInvitation:
        inv = self.contact_invitation_repository.get_by_id_with_relations(inv_id)
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation introuvable")
        return inv

    def get_received(self) -> List[ContactInvitationRead]:
        """Invitations reçues (en attente)"""
        invs = self.contact_invitation_repository.list_received_pending(self.current_user_id)
        return [_to_read(i) for i in invs]

    def get_sent(self) -> List[ContactInvitationRead]:
        """Invitations envoyées"""
        invs = self.contact_invitation_repository.list_sent_active(self.current_user_id)
        return [_to_read(i) for i in invs]

    def get_pending_received_count(self) -> int:
        return self.contact_invitation_repository.count_pending_received(self.current_user_id)

    def send(self, data: ContactInvitationCreate) -> ContactInvitationRead:
        if data.recipient_id == self.current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas vous inviter vous-même"
            )

        # Vérifier que le destinataire existe
        recipient = self.contact_invitation_repository.get_active_user_by_id(data.recipient_id)
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

        # Vérifier qu'une invitation PENDING n'existe pas déjà dans un sens ou l'autre
        existing = self.contact_invitation_repository.find_pending_between(
            self.current_user_id, data.recipient_id
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Une invitation est déjà en attente entre vous et cet utilisateur"
            )

        # Vérifier qu'ils ne sont pas déjà connectés (contact lié existe des deux côtés)
        already_linked = self.contact_invitation_repository.find_linked_contact(
            self.current_user_id, data.recipient_id
        )
        if already_linked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vous êtes déjà connecté avec cet utilisateur"
            )

        inv = ContactInvitation(
            sender_id=self.current_user_id,
            recipient_id=data.recipient_id,
            status=InvitationStatus.PENDING,
            message=data.message,
            created_at=datetime.utcnow(),
        )
        self.contact_invitation_repository.add_invitation(inv)
        self.session.commit()
        self.session.refresh(inv)
        sender = self.contact_invitation_repository.get_user_by_id(self.current_user_id)
        sender_name = sender.username if sender else "Quelqu'un"
        _fire_push(self.session, data.recipient_id, "Nouvelle invitation", f"{sender_name} vous a envoyé une invitation de contact", notification_type="contact_invitation")
        return _to_read(self._load(inv.id))

    def accept(self, inv_id: int) -> ContactInvitationRead:
        inv = self._load(inv_id)

        if inv.recipient_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous n'êtes pas le destinataire")

        if inv.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible d'accepter une invitation en statut '{inv.status}'"
            )

        # Créer le contact des deux côtés avec linked_user_id
        sender = self.contact_invitation_repository.get_user_by_id(inv.sender_id)
        recipient = self.contact_invitation_repository.get_user_by_id(inv.recipient_id)

        # Contact chez le destinataire → pointe vers l'expéditeur
        self._get_or_create_linked_contact(
            owner_id=inv.recipient_id,
            linked_user=sender,
        )
        # Contact chez l'expéditeur → pointe vers le destinataire
        self._get_or_create_linked_contact(
            owner_id=inv.sender_id,
            linked_user=recipient,
        )

        self.contact_invitation_repository.update_invitation_status(
            inv, InvitationStatus.ACCEPTED, responded_at=datetime.utcnow()
        )
        self.session.commit()
        acceptor_name = recipient.username if recipient else "Quelqu'un"
        _fire_push(self.session, inv.sender_id, "Invitation acceptée", f"{acceptor_name} a accepté votre invitation", notification_type="contact_accepted")
        return _to_read(self._load(inv.id))

    def decline(self, inv_id: int) -> ContactInvitationRead:
        inv = self._load(inv_id)

        if inv.recipient_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous n'êtes pas le destinataire")

        if inv.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible de refuser une invitation en statut '{inv.status}'"
            )

        self.contact_invitation_repository.update_invitation_status(
            inv, InvitationStatus.DECLINED, responded_at=datetime.utcnow()
        )
        self.session.commit()
        return _to_read(self._load(inv.id))

    def cancel(self, inv_id: int) -> ContactInvitationRead:
        inv = self._load(inv_id)

        if inv.sender_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous n'êtes pas l'expéditeur")

        if inv.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible d'annuler une invitation en statut '{inv.status}'"
            )

        self.contact_invitation_repository.update_invitation_status(inv, InvitationStatus.CANCELLED)
        self.session.commit()
        return _to_read(self._load(inv.id))

    def _get_or_create_linked_contact(self, owner_id: int, linked_user: User) -> Contact:
        """Crée ou met à jour un contact lié à un utilisateur.
        Si un contact avec ce nom existe, on lui attache le linked_user_id.
        Sinon on crée un nouveau contact avec le username comme nom."""
        # Chercher par linked_user_id d'abord
        existing = self.contact_invitation_repository.find_contact_by_linked_user(owner_id, linked_user.id)
        if existing:
            return existing

        # Chercher par email si disponible
        if linked_user.email:
            by_email = self.contact_invitation_repository.find_contact_by_email(owner_id, linked_user.email)
            if by_email:
                self.contact_invitation_repository.update_contact_link(by_email, linked_user.id)
                self.session.commit()
                return by_email

        # Chercher par username (nom du contact)
        by_name = self.contact_invitation_repository.find_contact_by_name(owner_id, linked_user.username)
        if by_name:
            self.contact_invitation_repository.update_contact_link(by_name, linked_user.id)
            self.session.commit()
            return by_name

        # Créer un nouveau contact
        contact = Contact(
            owner_id=owner_id,
            name=linked_user.username,
            email=linked_user.email,
            linked_user_id=linked_user.id,
            library_shared=False,
        )
        self.contact_invitation_repository.add_contact(contact)
        self.session.commit()
        return contact
