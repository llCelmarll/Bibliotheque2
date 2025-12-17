from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List, Optional

from app.models.Borrower import Borrower
from app.repositories.borrower_repository import BorrowerRepository
from app.repositories.loan_repository import LoanRepository
from app.schemas.Borrower import BorrowerCreate, BorrowerRead, BorrowerUpdate


class BorrowerService:
    """Service pour la logique métier des emprunteurs"""

    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.borrower_repository = BorrowerRepository(session)
        self.loan_repository = LoanRepository(session)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[BorrowerRead]:
        """Récupère tous les emprunteurs de l'utilisateur avec le nombre de prêts actifs"""
        borrowers = self.borrower_repository.get_all(self.user_id, skip, limit)

        result = []
        for borrower in borrowers:
            # Compter les prêts actifs (ACTIVE + OVERDUE) pour cet emprunteur
            active_loans = self.loan_repository.get_loans_by_borrower(borrower.id, self.user_id)
            active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

            borrower_dict = borrower.model_dump()
            borrower_dict['active_loans_count'] = active_count
            result.append(BorrowerRead(**borrower_dict))

        return result

    def create(self, borrower_data: BorrowerCreate) -> BorrowerRead:
        """Crée un nouvel emprunteur"""
        self._validate_borrower_create(borrower_data)

        borrower = Borrower(
            name=borrower_data.name,
            email=borrower_data.email,
            phone=borrower_data.phone,
            notes=borrower_data.notes,
            owner_id=self.user_id
        )

        borrower = self.borrower_repository.create(borrower)

        # Nouvel emprunteur = 0 prêts actifs
        borrower_dict = borrower.model_dump()
        borrower_dict['active_loans_count'] = 0
        return BorrowerRead(**borrower_dict)

    def get_by_id(self, borrower_id: int) -> BorrowerRead:
        """Récupère un emprunteur par son ID avec le nombre de prêts actifs"""
        borrower = self.borrower_repository.get_by_id(borrower_id, self.user_id)
        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunteur introuvable"
            )

        # Compter les prêts actifs (ACTIVE + OVERDUE) pour cet emprunteur
        active_loans = self.loan_repository.get_loans_by_borrower(borrower.id, self.user_id)
        active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

        borrower_dict = borrower.model_dump()
        borrower_dict['active_loans_count'] = active_count
        return BorrowerRead(**borrower_dict)

    def get_by_name(self, name: str) -> Optional[BorrowerRead]:
        """Récupère un emprunteur par son nom avec le nombre de prêts actifs"""
        borrower = self.borrower_repository.get_by_name(name, self.user_id)
        if borrower:
            # Compter les prêts actifs (ACTIVE + OVERDUE) pour cet emprunteur
            active_loans = self.loan_repository.get_loans_by_borrower(borrower.id, self.user_id)
            active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

            borrower_dict = borrower.model_dump()
            borrower_dict['active_loans_count'] = active_count
            return BorrowerRead(**borrower_dict)
        return None

    def get_or_create_by_name(self, name: str) -> BorrowerRead:
        """Récupère un emprunteur par son nom ou le crée s'il n'existe pas"""
        borrower = self.borrower_repository.get_by_name(name, self.user_id)

        if borrower:
            # Compter les prêts actifs (ACTIVE + OVERDUE) pour cet emprunteur
            active_loans = self.loan_repository.get_loans_by_borrower(borrower.id, self.user_id)
            active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

            borrower_dict = borrower.model_dump()
            borrower_dict['active_loans_count'] = active_count
            return BorrowerRead(**borrower_dict)

        # Créer un nouvel emprunteur (0 prêts actifs par défaut)
        new_borrower = Borrower(
            name=name,
            owner_id=self.user_id
        )
        borrower = self.borrower_repository.create(new_borrower)
        borrower_dict = borrower.model_dump()
        borrower_dict['active_loans_count'] = 0
        return BorrowerRead(**borrower_dict)

    def update(self, borrower_id: int, borrower_data: BorrowerUpdate) -> BorrowerRead:
        """Met à jour un emprunteur"""
        borrower = self.borrower_repository.get_by_id(borrower_id, self.user_id)
        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunteur introuvable"
            )

        # Valider le nom si modifié
        if borrower_data.name and borrower_data.name != borrower.name:
            self._validate_name_unique(borrower_data.name, borrower_id)

        # Mettre à jour les champs
        if borrower_data.name is not None:
            borrower.name = borrower_data.name
        if borrower_data.email is not None:
            borrower.email = borrower_data.email
        if borrower_data.phone is not None:
            borrower.phone = borrower_data.phone
        if borrower_data.notes is not None:
            borrower.notes = borrower_data.notes

        borrower = self.borrower_repository.update(borrower)

        # Compter les prêts actifs (ACTIVE + OVERDUE) pour cet emprunteur
        active_loans = self.loan_repository.get_loans_by_borrower(borrower.id, self.user_id)
        active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

        borrower_dict = borrower.model_dump()
        borrower_dict['active_loans_count'] = active_count
        return BorrowerRead(**borrower_dict)

    def delete(self, borrower_id: int) -> None:
        """Supprime un emprunteur"""
        borrower = self.borrower_repository.get_by_id(borrower_id, self.user_id)
        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunteur introuvable"
            )

        # Vérifier s'il a des prêts actifs (ACTIVE + OVERDUE)
        active_loans = self.loan_repository.get_loans_by_borrower(borrower_id, self.user_id)
        active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

        if active_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer un emprunteur avec des prêts actifs"
            )

        self.borrower_repository.delete(borrower)

    def search_fuzzy(self, query: str, limit: int = 10) -> List[BorrowerRead]:
        """Recherche fuzzy d'emprunteurs avec le nombre de prêts actifs"""
        borrowers = self.borrower_repository.search_fuzzy(query, self.user_id, limit)

        result = []
        for borrower in borrowers:
            # Compter les prêts actifs (ACTIVE + OVERDUE) pour cet emprunteur
            active_loans = self.loan_repository.get_loans_by_borrower(borrower.id, self.user_id)
            active_count = sum(1 for loan in active_loans if loan.status in ['active', 'overdue'])

            borrower_dict = borrower.model_dump()
            borrower_dict['active_loans_count'] = active_count
            result.append(BorrowerRead(**borrower_dict))

        return result

    def _validate_borrower_create(self, borrower_data: BorrowerCreate) -> None:
        """Valide la création d'un emprunteur"""
        existing_borrower = self.borrower_repository.get_by_name(borrower_data.name, self.user_id)
        if existing_borrower:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un emprunteur avec ce nom existe déjà"
            )

    def _validate_name_unique(self, name: str, exclude_id: int) -> None:
        """Vérifie que le nom est unique (sauf pour l'emprunteur exclu)"""
        existing_borrower = self.borrower_repository.get_by_name(name, self.user_id)
        if existing_borrower and existing_borrower.id != exclude_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un emprunteur avec ce nom existe déjà"
            )
