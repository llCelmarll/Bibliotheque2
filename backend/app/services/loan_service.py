from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.Loan import Loan, LoanStatus
from app.repositories.loan_repository import LoanRepository
from app.repositories.book_repository import BookRepository
from app.repositories.borrower_repository import BorrowerRepository
from app.schemas.Loan import LoanCreate, LoanRead, LoanUpdate, LoanReturn
from app.services.borrower_service import BorrowerService


class LoanService:
    """Service pour la logique métier des prêts"""

    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.loan_repository = LoanRepository(session)
        self.book_repository = BookRepository(session)
        self.borrower_repository = BorrowerRepository(session)
        self.borrower_service = BorrowerService(session, user_id)

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

        # Vérifier que le livre n'est pas déjà prêté
        active_loan = self.loan_repository.get_active_loan_for_book(loan_data.book_id, self.user_id)
        if active_loan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ce livre est déjà prêté à {active_loan.borrower.name}"
            )

        # Vérifier que le livre n'a pas d'historique d'emprunt (même retourné)
        # Un livre emprunté (même retourné) ne fait plus partie de votre bibliothèque
        from app.repositories.borrowed_book_repository import BorrowedBookRepository
        borrowed_book_repo = BorrowedBookRepository(self.session)

        # D'abord vérifier s'il y a un emprunt actif
        active_borrow = borrowed_book_repo.get_active_borrow_for_book(
            loan_data.book_id, self.user_id
        )
        if active_borrow:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible de prêter un livre que vous avez emprunté à {active_borrow.borrowed_from}. Veuillez d'abord le retourner."
            )

        # Ensuite vérifier s'il y a un historique d'emprunts (même retournés)
        all_borrows = borrowed_book_repo.get_by_book(loan_data.book_id, self.user_id)
        if all_borrows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de prêter un livre que vous avez emprunté (même si vous l'avez retourné). Ce livre ne fait plus partie de votre bibliothèque."
            )

        # Traiter l'emprunteur (ID, nom, ou objet)
        borrower_id = self._process_borrower(loan_data.borrower)

        # Créer le prêt
        loan = Loan(
            book_id=loan_data.book_id,
            borrower_id=borrower_id,
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
        if loan_data.due_date is not None:
            loan.due_date = loan_data.due_date
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

    def get_loans_by_borrower(self, borrower_id: int) -> List[LoanRead]:
        """Récupère l'historique des prêts pour un emprunteur"""
        borrower = self.borrower_repository.get_by_id(borrower_id, self.user_id)
        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunteur introuvable"
            )

        loans = self.loan_repository.get_loans_by_borrower(borrower_id, self.user_id)
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

    def _process_borrower(self, borrower_input: int | str | Dict[str, Any]) -> int:
        """
        Traite l'input borrower et retourne l'ID.
        Accepte: int (ID), str (nom), ou Dict (objet avec name, email, etc.)
        """
        # Si c'est un ID
        if isinstance(borrower_input, int):
            borrower = self.borrower_repository.get_by_id(borrower_input, self.user_id)
            if not borrower:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Emprunteur introuvable"
                )
            return borrower.id

        # Si c'est un nom (string)
        if isinstance(borrower_input, str):
            borrower = self.borrower_service.get_or_create_by_name(borrower_input)
            return borrower.id

        # Si c'est un objet dict
        if isinstance(borrower_input, dict):
            name = borrower_input.get("name")
            if not name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Le nom de l'emprunteur est requis"
                )

            # Vérifier si l'emprunteur existe déjà par nom
            existing = self.borrower_repository.get_by_name(name, self.user_id)
            if existing:
                return existing.id

            # Créer un nouvel emprunteur avec toutes les infos
            from app.models.Borrower import Borrower
            new_borrower = Borrower(
                name=name,
                email=borrower_input.get("email"),
                phone=borrower_input.get("phone"),
                notes=borrower_input.get("notes"),
                owner_id=self.user_id
            )
            borrower = self.borrower_repository.create(new_borrower)
            return borrower.id

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d'emprunteur invalide"
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
