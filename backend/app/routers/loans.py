from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.db import get_session
from app.services.loan_service import LoanService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.schemas.Loan import LoanRead, LoanCreate, LoanUpdate, LoanReturn


router = APIRouter(prefix="/loans", tags=["loans"])


def get_loan_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> LoanService:
    """Dependency injection pour le service des prêts avec utilisateur authentifié"""
    return LoanService(session, user_id=current_user.id)


# ================================
# CRUD ENDPOINTS
# ================================

@router.get("", response_model=List[LoanRead])
async def get_loans(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    service: LoanService = Depends(get_loan_service)
):
    """Récupère tous les prêts de l'utilisateur"""
    return service.get_all(skip, limit)


@router.get("/active", response_model=List[LoanRead])
async def get_active_loans(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    service: LoanService = Depends(get_loan_service)
):
    """Récupère tous les prêts actifs (en cours)"""
    return service.get_active_loans(skip, limit)


@router.get("/overdue", response_model=List[LoanRead])
async def get_overdue_loans(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    service: LoanService = Depends(get_loan_service)
):
    """Récupère tous les prêts en retard"""
    return service.get_overdue_loans(skip, limit)


@router.get("/statistics", response_model=Dict[str, Any])
async def get_loan_statistics(
    service: LoanService = Depends(get_loan_service)
):
    """
    Récupère les statistiques des prêts.

    Retourne:
        - total_loans: Nombre total de prêts
        - active_loans: Nombre de prêts actifs
        - overdue_loans: Nombre de prêts en retard
        - returned_loans: Nombre de prêts retournés
    """
    return service.get_statistics()


@router.get("/by-book/{book_id}", response_model=List[LoanRead])
async def get_loans_by_book(
    book_id: int,
    service: LoanService = Depends(get_loan_service)
):
    """Récupère l'historique des prêts pour un livre spécifique"""
    return service.get_loans_by_book(book_id)


@router.get("/by-borrower/{borrower_id}", response_model=List[LoanRead])
async def get_loans_by_borrower(
    borrower_id: int,
    service: LoanService = Depends(get_loan_service)
):
    """Récupère l'historique des prêts pour un emprunteur spécifique"""
    return service.get_loans_by_borrower(borrower_id)


@router.get("/{loan_id}", response_model=LoanRead)
async def get_loan_by_id(
    loan_id: int,
    service: LoanService = Depends(get_loan_service)
):
    """Récupère un prêt par son ID"""
    return service.get_by_id(loan_id)


@router.post("", response_model=LoanRead, status_code=status.HTTP_201_CREATED)
async def create_loan(
    loan: LoanCreate,
    service: LoanService = Depends(get_loan_service)
):
    """
    Crée un nouveau prêt.

    Le champ 'borrower' accepte plusieurs formats:
    - int: ID d'un emprunteur existant
    - str: Nom d'un emprunteur (sera créé s'il n'existe pas)
    - dict: Objet avec 'name' (requis) et optionnellement 'email', 'phone', 'notes'

    Exemples:
        {"book_id": 1, "borrower": 5}
        {"book_id": 1, "borrower": "Marie Dupont"}
        {"book_id": 1, "borrower": {"name": "Jean Martin", "email": "jean@example.com"}}
    """
    return service.create(loan)


@router.put("/{loan_id}", response_model=LoanRead)
async def update_loan(
    loan_id: int,
    loan: LoanUpdate,
    service: LoanService = Depends(get_loan_service)
):
    """Met à jour un prêt (dates, statut, notes, calendar_event_id)"""
    return service.update(loan_id, loan)


@router.put("/{loan_id}/return", response_model=LoanRead)
async def return_loan(
    loan_id: int,
    return_data: LoanReturn = None,
    service: LoanService = Depends(get_loan_service)
):
    """
    Marque un prêt comme retourné.

    Si return_date n'est pas fournie, utilise la date/heure actuelle.
    """
    return service.return_loan(loan_id, return_data)


@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_loan(
    loan_id: int,
    service: LoanService = Depends(get_loan_service)
):
    """Supprime un prêt"""
    service.delete(loan_id)
    return None


# ================================
# HEALTH CHECK
# ================================

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint pour vérifier que l'API des prêts fonctionne"""
    return {"status": "healthy", "service": "loans"}
