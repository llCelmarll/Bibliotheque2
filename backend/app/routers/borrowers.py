from sqlmodel import Session
from fastapi import APIRouter, Depends, Query
from typing import List

from app.schemas.Borrower import BorrowerRead, BorrowerCreate, BorrowerUpdate
from app.services.borrower_service import BorrowerService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.db import get_session


router = APIRouter(
    prefix="/borrowers",
    tags=["borrowers"]
)


def get_borrower_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> BorrowerService:
    return BorrowerService(session, current_user.id)


@router.get("", response_model=List[BorrowerRead])
async def get_borrowers(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    borrower_service: BorrowerService = Depends(get_borrower_service)
):
    """Récupère tous les emprunteurs de l'utilisateur"""
    return borrower_service.get_all(skip, limit)


@router.get("/search", response_model=List[BorrowerRead])
async def search_borrowers(
    query: str = Query(..., min_length=1, description="Terme de recherche"),
    limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
    borrower_service: BorrowerService = Depends(get_borrower_service)
):
    """Recherche fuzzy d'emprunteurs par nom"""
    return borrower_service.search_fuzzy(query, limit)


@router.get("/{borrower_id}", response_model=BorrowerRead)
async def get_borrower_by_id(
    borrower_id: int,
    borrower_service: BorrowerService = Depends(get_borrower_service)
):
    """Récupère un emprunteur par son ID"""
    return borrower_service.get_by_id(borrower_id)


@router.post("", response_model=BorrowerRead, status_code=201)
async def create_borrower(
    borrower: BorrowerCreate,
    borrower_service: BorrowerService = Depends(get_borrower_service)
):
    """Crée un nouvel emprunteur"""
    return borrower_service.create(borrower)


@router.put("/{borrower_id}", response_model=BorrowerRead)
async def update_borrower(
    borrower_id: int,
    borrower: BorrowerUpdate,
    borrower_service: BorrowerService = Depends(get_borrower_service)
):
    """Met à jour un emprunteur"""
    return borrower_service.update(borrower_id, borrower)


@router.delete("/{borrower_id}", status_code=204)
async def delete_borrower(
    borrower_id: int,
    borrower_service: BorrowerService = Depends(get_borrower_service)
):
    """Supprime un emprunteur (impossible s'il a des prêts actifs)"""
    borrower_service.delete(borrower_id)
    return None
