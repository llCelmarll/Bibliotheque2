from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.Loan import Loan, LoanStatus
from app.repositories.loan_repository import LoanRepository
from app.repositories.book_repository import BookRepository
from app.repositories.contact_repository import ContactRepository
from app.schemas.Loan import LoanCreate, LoanRead, LoanUpdate, LoanReturn
from app.services.contact_service import ContactService


class LoanService:
    """Service pour la logique métier des prêts"""

    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.loan_repository = LoanRepository(session)
        self.book_repository = BookRepository(session)
        self.contact_repository = ContactRepository(session)
        self.contact_service = ContactService(session, user_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[LoanRead]:
        """Récupère tous les prêts de l'utilisateur"""
        loans = self.loan_repository.get_all(self.user_id, skip, limit)
        return [LoanRead.model_validate(loan) for loan in loans]

    def get_active_loans(self, skip: int = 0, limit: int = 100) -> List[LoanRead]:
        """Récupère tous les prêts actifs de l'utilisateur"""
        loans = self.loan_repository.get_active_loans(self.user_id, skip, limit)
        # Mettre à jour le statut "overdue" si nécessaire
        self._update_overdue_status(loans)
        return [LoanRead.model_validate(loan) for loan in loans]

    def get_overdue_loans(self, skip: int = 0, limit: int = 100) -> List[LoanRead]:
        """Récupère tous les prêts en retard de l'utilisateur"""
        loans = self.loan_repository.get_overdue_loans(self.user_id, skip, limit)
        # Mettre à jour le statut "overdue" si nécessaire
        self._update_overdue_status(loans)
        return [LoanRead.model_validate(loan) for loan in loans]

    def create(self, loan_data: LoanCreate) -> LoanRead:
        """Crée un nouveau prêt"""
        # Valider le livre
        book = self.book_repository.get_by_id(loan_data.book_id, self.user_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livre introuvable"
            )

        # Vérifier qu'il n'y a pas de prêt inter-membres actif (ACCEPTED) pour ce livre
        from app.repositories.user_loan_request_repository import UserLoanRequestRepository
        user_loan_req_repo = UserLoanRequestRepository(self.session)
        active_user_loan = user_loan_req_repo.get_active_request_for_book(loan_data.book_id)
        if active_user_loan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce livre est déjà prêté à un autre membre via une demande inter-membres"
            )

        # Vérifier que le livre n'est pas déjà prêté
        active_loan = self.loan_repository.get_active_loan_for_book(loan_data.book_id, self.user_id)
        if active_loan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ce livre est déjà prêté à {active_loan.contact.name}"
            )

        # Vérifier que le livre n'a pas d'historique d'emprunt (même retourné)
        from app.repositories.borrowed_book_repository import BorrowedBookRepository
        borrowed_book_repo = BorrowedBookRepository(self.session)

        # D'abord vérifier s'il y a un emprunt actif
        active_borrow = borrowed_book_repo.get_active_borrow_for_book(
            loan_data.book_id, self.user_id
        )
        if active_borrow:
            contact_name = active_borrow.contact.name if active_borrow.contact else active_borrow.borrowed_from
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible de prêter un livre que vous avez emprunté à {contact_name}. Veuillez d'abord le retourner."
            )

        # Ensuite vérifier s'il y a un historique d'emprunts (même retournés)
        all_borrows = borrowed_book_repo.get_by_book(loan_data.book_id, self.user_id)
        if all_borrows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de prêter un livre que vous avez emprunté (même si vous l'avez retourné). Ce livre ne fait plus partie de votre bibliothèque."
            )

        # Traiter le contact (ID, nom, ou objet)
        contact_id = self._process_contact(loan_data.contact)

        # Créer le prêt
        loan = Loan(
            book_id=loan_data.book_id,
            contact_id=contact_id,
            owner_id=self.user_id,
            loan_date=loan_data.loan_date or datetime.utcnow(),
            due_date=loan_data.due_date,
            status=LoanStatus.ACTIVE,
            notes=loan_data.notes
        )

        loan = self.loan_repository.create(loan)
        return LoanRead.model_validate(loan)

    def get_by_id(self, loan_id: int) -> LoanRead:
        """Récupère un prêt par son ID"""
        loan = self.loan_repository.get_by_id(loan_id, self.user_id)
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prêt introuvable"
            )

        # Mettre à jour le statut si en retard
        self._update_overdue_status([loan])

        return LoanRead.model_validate(loan)

    def update(self, loan_id: int, loan_data: LoanUpdate) -> LoanRead:
        """Met à jour un prêt"""
        loan = self.loan_repository.get_by_id(loan_id, self.user_id)
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prêt introuvable"
            )

        # Mettre à jour les champs
        if loan_data.loan_date is not None:
            loan.loan_date = loan_data.loan_date
        if loan_data.due_date is not None:
            loan.due_date = loan_data.due_date
            # Recalculer le statut si le prêt n'est pas déjà retourné
            if loan.status != LoanStatus.RETURNED:
                now = datetime.utcnow()
                if loan.due_date < now:
                    loan.status = LoanStatus.OVERDUE
                else:
                    loan.status = LoanStatus.ACTIVE
        if loan_data.return_date is not None:
            loan.return_date = loan_data.return_date
            # Si une date de retour est définie, marquer comme retourné
            if loan.status == LoanStatus.ACTIVE or loan.status == LoanStatus.OVERDUE:
                loan.status = LoanStatus.RETURNED
        if loan_data.status is not None:
            loan.status = loan_data.status
        if loan_data.notes is not None:
            loan.notes = loan_data.notes
        # Permettre de définir ou supprimer le calendar_event_id
        if loan_data.calendar_event_id is not None or hasattr(loan_data, 'calendar_event_id'):
            loan.calendar_event_id = loan_data.calendar_event_id

        loan = self.loan_repository.update(loan)
        return LoanRead.model_validate(loan)

    def return_loan(self, loan_id: int, return_data: Optional[LoanReturn] = None) -> LoanRead:
        """Marque un prêt comme retourné"""
        loan = self.loan_repository.get_by_id(loan_id, self.user_id)
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prêt introuvable"
            )

        if loan.status == LoanStatus.RETURNED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce livre a déjà été retourné"
            )

        # Définir la date de retour
        loan.return_date = return_data.return_date if return_data and return_data.return_date else datetime.utcnow()
        loan.status = LoanStatus.RETURNED

        loan = self.loan_repository.update(loan)
        return LoanRead.model_validate(loan)

    def delete(self, loan_id: int) -> None:
        """Supprime un prêt"""
        loan = self.loan_repository.get_by_id(loan_id, self.user_id)
        if not loan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prêt introuvable"
            )

        self.loan_repository.delete(loan)

    def get_loans_by_book(self, book_id: int) -> List[LoanRead]:
        """Récupère l'historique des prêts pour un livre"""
        book = self.book_repository.get_by_id(book_id, self.user_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livre introuvable"
            )

        loans = self.loan_repository.get_loans_by_book(book_id, self.user_id)
        return [LoanRead.model_validate(loan) for loan in loans]

    def get_loans_by_contact(self, contact_id: int) -> List[LoanRead]:
        """Récupère l'historique des prêts pour un contact"""
        contact = self.contact_repository.get_by_id(contact_id, self.user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact introuvable"
            )

        loans = self.loan_repository.get_loans_by_contact(contact_id, self.user_id)
        return [LoanRead.model_validate(loan) for loan in loans]

    def get_statistics(self) -> Dict[str, Any]:
        """Récupère les statistiques des prêts"""
        total = self.loan_repository.count_by_owner(self.user_id)
        active = self.loan_repository.count_active_by_owner(self.user_id)
        overdue_loans = self.loan_repository.get_overdue_loans(self.user_id, skip=0, limit=1000)
        overdue = len(overdue_loans)

        return {
            "total_loans": total,
            "active_loans": active,
            "overdue_loans": overdue,
            "returned_loans": total - active
        }

    def _process_contact(self, contact_input: int | str | Dict[str, Any]) -> int:
        """
        Traite l'input contact et retourne l'ID.
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
            return contact.id

        # Si c'est un nom (string)
        if isinstance(contact_input, str):
            contact = self.contact_service.get_or_create_by_name(contact_input)
            return contact.id

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
                return existing.id

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
            return contact.id

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format de contact invalide"
        )

    def _update_overdue_status(self, loans: List[Loan]) -> None:
        """Met à jour le statut des prêts en retard"""
        now = datetime.utcnow()
        for loan in loans:
            if (loan.status == LoanStatus.ACTIVE and
                loan.due_date and
                loan.due_date < now):
                loan.status = LoanStatus.OVERDUE
                self.loan_repository.update(loan)
