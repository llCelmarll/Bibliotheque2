from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from typing import List
from datetime import datetime

from app.models.ContactInvitation import ContactInvitation, InvitationStatus
from app.models.Contact import Contact
from app.models.User import User
from app.schemas.ContactInvitation import ContactInvitationRead, ContactInvitationCreate


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

    def _load(self, inv_id: int) -> ContactInvitation:
        from sqlalchemy.orm import selectinload
        inv = self.session.exec(
            select(ContactInvitation)
            .where(ContactInvitation.id == inv_id)
            .options(
                selectinload(ContactInvitation.sender),
                selectinload(ContactInvitation.recipient),
            )
        ).first()
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation introuvable")
        return inv

    def get_received(self) -> List[ContactInvitationRead]:
        """Invitations reçues (en attente)"""
        from sqlalchemy.orm import selectinload
        invs = self.session.exec(
            select(ContactInvitation)
            .where(
                ContactInvitation.recipient_id == self.current_user_id,
                ContactInvitation.status == InvitationStatus.PENDING,
            )
            .options(
                selectinload(ContactInvitation.sender),
                selectinload(ContactInvitation.recipient),
            )
            .order_by(ContactInvitation.created_at.desc())
        ).all()
        return [_to_read(i) for i in invs]

    def get_sent(self) -> List[ContactInvitationRead]:
        """Invitations envoyées"""
        from sqlalchemy.orm import selectinload
        invs = self.session.exec(
            select(ContactInvitation)
            .where(
                ContactInvitation.sender_id == self.current_user_id,
                ContactInvitation.status != InvitationStatus.CANCELLED,
            )
            .options(
                selectinload(ContactInvitation.sender),
                selectinload(ContactInvitation.recipient),
            )
            .order_by(ContactInvitation.created_at.desc())
        ).all()
        return [_to_read(i) for i in invs]

    def get_pending_received_count(self) -> int:
        result = self.session.exec(
            select(func.count(ContactInvitation.id)).where(
                ContactInvitation.recipient_id == self.current_user_id,
                ContactInvitation.status == InvitationStatus.PENDING,
            )
        ).one()
        return result

    def send(self, data: ContactInvitationCreate) -> ContactInvitationRead:
        if data.recipient_id == self.current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas vous inviter vous-même"
            )

        # Vérifier que le destinataire existe
        recipient = self.session.exec(
            select(User).where(User.id == data.recipient_id, User.is_active == True)
        ).first()
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")

        # Vérifier qu'une invitation PENDING n'existe pas déjà dans un sens ou l'autre
        existing = self.session.exec(
            select(ContactInvitation).where(
                ContactInvitation.status == InvitationStatus.PENDING,
                (
                    (ContactInvitation.sender_id == self.current_user_id) &
                    (ContactInvitation.recipient_id == data.recipient_id)
                ) | (
                    (ContactInvitation.sender_id == data.recipient_id) &
                    (ContactInvitation.recipient_id == self.current_user_id)
                )
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Une invitation est déjà en attente entre vous et cet utilisateur"
            )

        # Vérifier qu'ils ne sont pas déjà connectés (contact lié existe des deux côtés)
        already_linked = self.session.exec(
            select(Contact).where(
                Contact.owner_id == self.current_user_id,
                Contact.linked_user_id == data.recipient_id,
            )
        ).first()
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
        self.session.add(inv)
        self.session.commit()
        self.session.refresh(inv)
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
        sender = self.session.exec(select(User).where(User.id == inv.sender_id)).first()
        recipient = self.session.exec(select(User).where(User.id == inv.recipient_id)).first()

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

        inv.status = InvitationStatus.ACCEPTED
        inv.responded_at = datetime.utcnow()
        self.session.add(inv)
        self.session.commit()
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

        inv.status = InvitationStatus.DECLINED
        inv.responded_at = datetime.utcnow()
        self.session.add(inv)
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

        inv.status = InvitationStatus.CANCELLED
        self.session.add(inv)
        self.session.commit()
        return _to_read(self._load(inv.id))

    def _get_or_create_linked_contact(self, owner_id: int, linked_user: User) -> Contact:
        """Crée ou met à jour un contact lié à un utilisateur.
        Si un contact avec ce nom existe, on lui attache le linked_user_id.
        Sinon on crée un nouveau contact avec le username comme nom."""
        # Chercher par linked_user_id d'abord
        existing = self.session.exec(
            select(Contact).where(
                Contact.owner_id == owner_id,
                Contact.linked_user_id == linked_user.id,
            )
        ).first()
        if existing:
            return existing

        # Chercher par email si disponible
        if linked_user.email:
            by_email = self.session.exec(
                select(Contact).where(
                    Contact.owner_id == owner_id,
                    Contact.email == linked_user.email,
                )
            ).first()
            if by_email:
                by_email.linked_user_id = linked_user.id
                self.session.add(by_email)
                self.session.commit()
                return by_email

        # Chercher par username (nom du contact)
        by_name = self.session.exec(
            select(Contact).where(
                Contact.owner_id == owner_id,
                Contact.name == linked_user.username,
            )
        ).first()
        if by_name:
            by_name.linked_user_id = linked_user.id
            self.session.add(by_name)
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
        self.session.add(contact)
        self.session.commit()
        return contact
