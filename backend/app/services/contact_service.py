from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List, Optional

from app.models.Contact import Contact
from app.repositories.contact_repository import ContactRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.borrowed_book_repository import BorrowedBookRepository
from app.schemas.Contact import ContactCreate, ContactRead, ContactUpdate


class ContactService:
    """Service pour la logique métier des contacts"""

    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.contact_repository = ContactRepository(session)
        self.loan_repository = LoanRepository(session)
        self.borrowed_book_repository = BorrowedBookRepository(session)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[ContactRead]:
        """Récupère tous les contacts de l'utilisateur avec le nombre de prêts et emprunts actifs"""
        contacts = self.contact_repository.get_all(self.user_id, skip, limit)

        result = []
        for contact in contacts:
            result.append(self._to_contact_read(contact))

        return result

    def create(self, contact_data: ContactCreate) -> ContactRead:
        """Crée un nouveau contact"""
        self._validate_contact_create(contact_data)

        contact = Contact(
            name=contact_data.name,
            email=contact_data.email,
            phone=contact_data.phone,
            notes=contact_data.notes,
            owner_id=self.user_id
        )

        contact = self.contact_repository.create(contact)

        contact_dict = contact.model_dump()
        contact_dict['active_loans_count'] = 0
        contact_dict['active_borrows_count'] = 0
        return ContactRead(**contact_dict)

    def get_by_id(self, contact_id: int) -> ContactRead:
        """Récupère un contact par son ID avec le nombre de prêts et emprunts actifs"""
        contact = self.contact_repository.get_by_id(contact_id, self.user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact introuvable"
            )

        return self._to_contact_read(contact)

    def get_by_name(self, name: str) -> Optional[ContactRead]:
        """Récupère un contact par son nom"""
        contact = self.contact_repository.get_by_name(name, self.user_id)
        if contact:
            return self._to_contact_read(contact)
        return None

    def get_or_create_by_name(self, name: str) -> ContactRead:
        """Récupère un contact par son nom ou le crée s'il n'existe pas"""
        contact = self.contact_repository.get_by_name(name, self.user_id)

        if contact:
            return self._to_contact_read(contact)

        # Créer un nouveau contact
        new_contact = Contact(
            name=name,
            owner_id=self.user_id
        )
        contact = self.contact_repository.create(new_contact)
        contact_dict = contact.model_dump()
        contact_dict['active_loans_count'] = 0
        contact_dict['active_borrows_count'] = 0
        return ContactRead(**contact_dict)

    def update(self, contact_id: int, contact_data: ContactUpdate) -> ContactRead:
        """Met à jour un contact"""
        contact = self.contact_repository.get_by_id(contact_id, self.user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact introuvable"
            )

        # Valider le nom si modifié
        if contact_data.name and contact_data.name != contact.name:
            self._validate_name_unique(contact_data.name, contact_id)

        # Mettre à jour les champs
        if contact_data.name is not None:
            contact.name = contact_data.name
        if contact_data.email is not None:
            contact.email = contact_data.email
        if contact_data.phone is not None:
            contact.phone = contact_data.phone
        if contact_data.notes is not None:
            contact.notes = contact_data.notes

        contact = self.contact_repository.update(contact)

        return self._to_contact_read(contact)

    def delete(self, contact_id: int) -> None:
        """Supprime un contact"""
        contact = self.contact_repository.get_by_id(contact_id, self.user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact introuvable"
            )

        # Vérifier s'il a des prêts actifs
        active_loans = self.loan_repository.get_loans_by_contact(contact_id, self.user_id)
        active_loans_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

        if active_loans_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer un contact avec des prêts actifs"
            )

        # Vérifier s'il a des emprunts actifs
        contact_borrows = self.borrowed_book_repository.get_by_contact(contact_id, self.user_id)
        active_borrows_count = sum(
            1 for b in contact_borrows if b.status in ['active', 'overdue']
        )

        if active_borrows_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer un contact avec des emprunts actifs"
            )

        self.contact_repository.delete(contact)

    def search_fuzzy(self, query: str, limit: int = 10) -> List[ContactRead]:
        """Recherche fuzzy de contacts avec le nombre de prêts et emprunts actifs"""
        contacts = self.contact_repository.search_fuzzy(query, self.user_id, limit)

        result = []
        for contact in contacts:
            result.append(self._to_contact_read(contact))

        return result

    def _to_contact_read(self, contact: Contact) -> ContactRead:
        """Convertit un Contact en ContactRead avec les compteurs"""
        # Compter les prêts actifs
        active_loans = self.loan_repository.get_loans_by_contact(contact.id, self.user_id)
        active_loans_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

        # Compter les emprunts actifs
        contact_borrows = self.borrowed_book_repository.get_by_contact(contact.id, self.user_id)
        active_borrows_count = sum(
            1 for b in contact_borrows if b.status in ['active', 'overdue']
        )

        contact_dict = contact.model_dump()
        contact_dict['active_loans_count'] = active_loans_count
        contact_dict['active_borrows_count'] = active_borrows_count
        return ContactRead(**contact_dict)

    def _validate_contact_create(self, contact_data: ContactCreate) -> None:
        """Valide la création d'un contact"""
        existing_contact = self.contact_repository.get_by_name(contact_data.name, self.user_id)
        if existing_contact:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un contact avec ce nom existe déjà"
            )

    def _validate_name_unique(self, name: str, exclude_id: int) -> None:
        """Vérifie que le nom est unique (sauf pour le contact exclu)"""
        existing_contact = self.contact_repository.get_by_name(name, self.user_id)
        if existing_contact and existing_contact.id != exclude_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un contact avec ce nom existe déjà"
            )
