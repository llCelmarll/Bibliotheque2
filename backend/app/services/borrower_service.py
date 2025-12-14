from fastapi import HTTPException, status
from sqlmodel import Session
from typing import List, Optional

from app.models.Borrower import Borrower
from app.repositories.borrower_repository import BorrowerRepository
from app.schemas.Borrower import BorrowerCreate, BorrowerRead, BorrowerUpdate


class BorrowerService:
    """Service pour la logique métier des emprunteurs"""

    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.borrower_repository = BorrowerRepository(session)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[BorrowerRead]:
        """Récupère tous les emprunteurs de l'utilisateur"""
        borrowers = self.borrower_repository.get_all(self.user_id, skip, limit)
        return [BorrowerRead.model_validate(borrower) for borrower in borrowers]

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
        return BorrowerRead.model_validate(borrower)

    def get_by_id(self, borrower_id: int) -> BorrowerRead:
        """Récupère un emprunteur par son ID"""
        borrower = self.borrower_repository.get_by_id(borrower_id, self.user_id)
        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunteur introuvable"
            )
        return BorrowerRead.model_validate(borrower)

    def get_by_name(self, name: str) -> Optional[BorrowerRead]:
        """Récupère un emprunteur par son nom"""
        borrower = self.borrower_repository.get_by_name(name, self.user_id)
        if borrower:
            return BorrowerRead.model_validate(borrower)
        return None

    def get_or_create_by_name(self, name: str) -> BorrowerRead:
        """Récupère un emprunteur par son nom ou le crée s'il n'existe pas"""
        borrower = self.borrower_repository.get_by_name(name, self.user_id)

        if borrower:
            return BorrowerRead.model_validate(borrower)

        # Créer un nouvel emprunteur
        new_borrower = Borrower(
            name=name,
            owner_id=self.user_id
        )
        borrower = self.borrower_repository.create(new_borrower)
        return BorrowerRead.model_validate(borrower)

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
        return BorrowerRead.model_validate(borrower)

    def delete(self, borrower_id: int) -> None:
        """Supprime un emprunteur"""
        borrower = self.borrower_repository.get_by_id(borrower_id, self.user_id)
        if not borrower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Emprunteur introuvable"
            )

        # Vérifier s'il a des prêts actifs
        from app.repositories.loan_repository import LoanRepository
        loan_repo = LoanRepository(self.session)
        active_loan = loan_repo.get_active_loan_for_book(borrower_id, self.user_id)

        if active_loan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de supprimer un emprunteur avec des prêts actifs"
            )

        self.borrower_repository.delete(borrower)

    def search_fuzzy(self, query: str, limit: int = 10) -> List[BorrowerRead]:
        """Recherche fuzzy d'emprunteurs"""
        borrowers = self.borrower_repository.search_fuzzy(query, self.user_id, limit)
        return [BorrowerRead.model_validate(borrower) for borrower in borrowers]

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
