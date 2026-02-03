from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.BorrowedBook import BorrowedBook, BorrowStatus
from app.repositories.borrowed_book_repository import BorrowedBookRepository
from app.repositories.book_repository import BookRepository
from app.repositories.contact_repository import ContactRepository
from app.services.contact_service import ContactService
from app.schemas.BorrowedBook import (
    BorrowedBookCreate, BorrowedBookRead, BorrowedBookUpdate,
    BorrowedBookReturn, BorrowedBookStats
)


class BorrowedBookService:
    """Service pour la logique métier des livres empruntés"""

    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.borrowed_book_repository = BorrowedBookRepository(session)
        self.book_repository = BookRepository(session)
        self.contact_repository = ContactRepository(session)
        self.contact_service = ContactService(session, user_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[BorrowedBookRead]:
        """Récupère tous les emprunts de l'utilisateur"""
        borrows = self.borrowed_book_repository.get_all(self.user_id, skip, limit)
        return [BorrowedBookRead.model_validate(b) for b in borrows]

    def get_active(self, skip: int = 0, limit: int = 100) -> List[BorrowedBookRead]:
        """Récupère tous les emprunts actifs de l'utilisateur"""
        borrows = self.borrowed_book_repository.get_active(self.user_id, skip, limit)
        # Mettre à jour le statut "overdue" si nécessaire
        self._update_overdue_status(borrows)
        return [BorrowedBookRead.model_validate(b) for b in borrows]

    def get_overdue(self, skip: int = 0, limit: int = 100) -> List[BorrowedBookRead]:
        """Récupère tous les emprunts en retard de l'utilisateur"""
        borrows = self.borrowed_book_repository.get_overdue(self.user_id, skip, limit)
        # Mettre à jour le statut "overdue" si nécessaire
        self._update_overdue_status(borrows)
        return [BorrowedBookRead.model_validate(b) for b in borrows]

    def create(self, borrow_data: BorrowedBookCreate) -> BorrowedBookRead:
        """Crée un nouveau emprunt"""
        # Valider le livre
        book = self.book_repository.get_by_id(borrow_data.book_id, self.user_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livre introuvable"
            )

        # Vérifier que le livre n'est pas déjà marqué comme emprunté
        active_borrow = self.borrowed_book_repository.get_active_borrow_for_book(
            borrow_data.book_id, self.user_id
        )
        if active_borrow:
            contact_name = active_borrow.contact.name if active_borrow.contact else active_borrow.borrowed_from
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ce livre est déjà marqué comme emprunté à {contact_name}"
            )

        # Résoudre le contact (ID, nom, ou objet)
        contact_id, contact_name = self._process_contact(borrow_data.contact)

        # Créer l'emprunt
        borrowed_book = BorrowedBook(
            book_id=borrow_data.book_id,
            user_id=self.user_id,
            contact_id=contact_id,
            borrowed_from=contact_name,  # Legacy field
            borrowed_date=borrow_data.borrowed_date or datetime.utcnow(),
            expected_return_date=borrow_data.expected_return_date,
            status=BorrowStatus.ACTIVE,
            notes=borrow_data.notes
        )

        borrowed_book = self.borrowed_book_repository.create(borrowed_book)
        return BorrowedBookRead.model_validate(borrowed_book)

    def get_by_id(self, borrow_id: int) -> BorrowedBookRead:
        """Récupère un emprunt par son ID"""
        borrowed_book = self.borrowed_book_repository.get_by_id(borrow_id, self.user_id)
        if not borrowed_book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunt introuvable"
            )

        # Mettre à jour le statut si en retard
        self._update_overdue_status([borrowed_book])

        return BorrowedBookRead.model_validate(borrowed_book)

    def update(self, borrow_id: int, borrow_data: BorrowedBookUpdate) -> BorrowedBookRead:
        """Met à jour un emprunt"""
        borrowed_book = self.borrowed_book_repository.get_by_id(borrow_id, self.user_id)
        if not borrowed_book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunt introuvable"
            )

        # Mettre à jour le contact si spécifié
        if borrow_data.contact is not None:
            contact_id, contact_name = self._process_contact(borrow_data.contact)
            borrowed_book.contact_id = contact_id
            borrowed_book.borrowed_from = contact_name

        if borrow_data.borrowed_date is not None:
            borrowed_book.borrowed_date = borrow_data.borrowed_date
        if borrow_data.expected_return_date is not None:
            borrowed_book.expected_return_date = borrow_data.expected_return_date
            # Recalculer le statut si l'emprunt n'est pas déjà retourné
            if borrowed_book.status != BorrowStatus.RETURNED:
                now = datetime.utcnow()
                if borrowed_book.expected_return_date < now:
                    borrowed_book.status = BorrowStatus.OVERDUE
                else:
                    borrowed_book.status = BorrowStatus.ACTIVE
        if borrow_data.actual_return_date is not None:
            borrowed_book.actual_return_date = borrow_data.actual_return_date
            # Si une date de retour est définie, marquer comme retourné
            if borrowed_book.status in [BorrowStatus.ACTIVE, BorrowStatus.OVERDUE]:
                borrowed_book.status = BorrowStatus.RETURNED
        if borrow_data.status is not None:
            borrowed_book.status = borrow_data.status
        if borrow_data.notes is not None:
            borrowed_book.notes = borrow_data.notes
        # Permettre de définir ou supprimer le calendar_event_id
        if borrow_data.calendar_event_id is not None or hasattr(borrow_data, 'calendar_event_id'):
            borrowed_book.calendar_event_id = borrow_data.calendar_event_id

        borrowed_book = self.borrowed_book_repository.update(borrowed_book)
        return BorrowedBookRead.model_validate(borrowed_book)

    def return_book(self, borrow_id: int, return_data: Optional[BorrowedBookReturn] = None) -> BorrowedBookRead:
        """Marque un emprunt comme retourné"""
        borrowed_book = self.borrowed_book_repository.get_by_id(borrow_id, self.user_id)
        if not borrowed_book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunt introuvable"
            )

        if borrowed_book.status == BorrowStatus.RETURNED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce livre a déjà été retourné"
            )

        # Définir la date de retour
        borrowed_book.actual_return_date = (
            return_data.actual_return_date if return_data and return_data.actual_return_date
            else datetime.utcnow()
        )
        borrowed_book.status = BorrowStatus.RETURNED

        borrowed_book = self.borrowed_book_repository.update(borrowed_book)
        return BorrowedBookRead.model_validate(borrowed_book)

    def delete(self, borrow_id: int) -> None:
        """Supprime un emprunt"""
        borrowed_book = self.borrowed_book_repository.get_by_id(borrow_id, self.user_id)
        if not borrowed_book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunt introuvable"
            )

        self.borrowed_book_repository.delete(borrowed_book)

    def get_by_contact(self, contact_id: int) -> List[BorrowedBookRead]:
        """Récupère l'historique des emprunts pour un contact"""
        contact = self.contact_repository.get_by_id(contact_id, self.user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact introuvable"
            )

        borrows = self.borrowed_book_repository.get_by_contact(contact_id, self.user_id)
        self._update_overdue_status(borrows)
        return [BorrowedBookRead.model_validate(b) for b in borrows]

    def get_by_book(self, book_id: int) -> List[BorrowedBookRead]:
        """Récupère l'historique des emprunts pour un livre"""
        book = self.book_repository.get_by_id(book_id, self.user_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livre introuvable"
            )

        borrows = self.borrowed_book_repository.get_by_book(book_id, self.user_id)
        return [BorrowedBookRead.model_validate(b) for b in borrows]

    def get_statistics(self) -> BorrowedBookStats:
        """Récupère les statistiques des emprunts"""
        total = self.borrowed_book_repository.count_by_user(self.user_id)
        active = self.borrowed_book_repository.count_active_by_user(self.user_id)
        overdue_borrows = self.borrowed_book_repository.get_overdue(self.user_id, skip=0, limit=1000)
        overdue = len(overdue_borrows)

        return BorrowedBookStats(
            total_borrowed=total,
            currently_borrowed=active,
            overdue=overdue,
            returned=total - active
        )

    def _process_contact(self, contact_input: int | str | Dict[str, Any]) -> tuple[int, str]:
        """
        Traite l'input contact et retourne (contact_id, contact_name).
        Accepte: int (ID), str (nom), ou Dict (objet avec name, email, etc.)
        """
        # Si c'est un ID
        if isinstance(contact_input, int):
            contact = self.contact_repository.get_by_id(contact_input, self.user_id)
            if not contact:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Contact introuvable"
                )
            return contact.id, contact.name

        # Si c'est un nom (string)
        if isinstance(contact_input, str):
            contact = self.contact_service.get_or_create_by_name(contact_input)
            return contact.id, contact.name

        # Si c'est un objet dict
        if isinstance(contact_input, dict):
            name = contact_input.get("name")
            if not name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Le nom du contact est requis"
                )

            # Vérifier si le contact existe déjà par nom
            existing = self.contact_repository.get_by_name(name, self.user_id)
            if existing:
                return existing.id, existing.name

            # Créer un nouveau contact avec toutes les infos
            from app.models.Contact import Contact
            new_contact = Contact(
                name=name,
                email=contact_input.get("email"),
                phone=contact_input.get("phone"),
                notes=contact_input.get("notes"),
                owner_id=self.user_id
            )
            contact = self.contact_repository.create(new_contact)
            return contact.id, contact.name

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format de contact invalide"
        )

    def _update_overdue_status(self, borrows: List[BorrowedBook]) -> None:
        """Met à jour le statut des emprunts en retard"""
        now = datetime.utcnow()
        for borrow in borrows:
            if (borrow.status == BorrowStatus.ACTIVE and
                borrow.expected_return_date and
                borrow.expected_return_date < now):
                borrow.status = BorrowStatus.OVERDUE
                self.borrowed_book_repository.update(borrow)
