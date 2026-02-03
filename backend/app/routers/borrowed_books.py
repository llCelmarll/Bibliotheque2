from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status, Body
from sqlmodel import Session

from app.db import get_session
from app.services.borrowed_book_service import BorrowedBookService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.schemas.BorrowedBook import (
    BorrowedBookRead, BorrowedBookCreate, BorrowedBookUpdate,
    BorrowedBookReturn, BorrowedBookStats
)


router = APIRouter(prefix="/borrowed-books", tags=["borrowed-books"])


def get_borrowed_book_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> BorrowedBookService:
    """Dependency injection pour le service des livres empruntés avec utilisateur authentifié"""
    return BorrowedBookService(session, user_id=current_user.id)


# ================================
# CRUD ENDPOINTS
# ================================

@router.get("", response_model=List[BorrowedBookRead])
async def get_borrowed_books(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Récupère tous les livres empruntés de l'utilisateur"""
    return service.get_all(skip, limit)


@router.get("/active", response_model=List[BorrowedBookRead])
async def get_active_borrowed_books(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Récupère tous les livres actuellement empruntés (actifs et en retard)"""
    return service.get_active(skip, limit)


@router.get("/overdue", response_model=List[BorrowedBookRead])
async def get_overdue_borrowed_books(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Récupère tous les livres empruntés en retard"""
    return service.get_overdue(skip, limit)


@router.get("/statistics", response_model=BorrowedBookStats)
async def get_borrowed_books_statistics(
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """
    Récupère les statistiques des livres empruntés.

    Retourne:
        - total_borrowed: Nombre total de livres empruntés
        - currently_borrowed: Nombre de livres actuellement empruntés
        - overdue: Nombre de livres en retard
        - returned: Nombre de livres retournés
    """
    return service.get_statistics()


@router.get("/by-contact/{contact_id}", response_model=List[BorrowedBookRead])
async def get_borrowed_books_by_contact(
    contact_id: int,
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Récupère l'historique des emprunts pour un contact spécifique"""
    return service.get_by_contact(contact_id)


@router.get("/by-book/{book_id}", response_model=List[BorrowedBookRead])
async def get_borrowed_books_by_book(
    book_id: int,
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Récupère l'historique des emprunts pour un livre spécifique"""
    return service.get_by_book(book_id)


@router.get("/{borrow_id}", response_model=BorrowedBookRead)
async def get_borrowed_book_by_id(
    borrow_id: int,
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Récupère un emprunt par son ID"""
    return service.get_by_id(borrow_id)


@router.post("", response_model=BorrowedBookRead, status_code=status.HTTP_201_CREATED)
async def create_borrowed_book(
    borrow: BorrowedBookCreate,
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """
    Crée un nouvel enregistrement de livre emprunté.

    Exemple:
        {
            "book_id": 1,
            "borrowed_from": "Jean Dupont",
            "borrowed_date": "2024-01-15T10:00:00",
            "expected_return_date": "2024-02-15T10:00:00",
            "notes": "Emprunté lors d'un café"
        }
    """
    return service.create(borrow)


@router.put("/{borrow_id}", response_model=BorrowedBookRead)
async def update_borrowed_book(
    borrow_id: int,
    borrow: BorrowedBookUpdate,
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Met à jour un enregistrement d'emprunt (dates, source, statut, notes, calendar_event_id)"""
    return service.update(borrow_id, borrow)


@router.put("/{borrow_id}/return", response_model=BorrowedBookRead)
async def return_borrowed_book(
    borrow_id: int,
    return_data: Optional[BorrowedBookReturn] = Body(None),
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """
    Marque un livre emprunté comme retourné.

    Si actual_return_date n'est pas fournie, utilise la date/heure actuelle.
    """
    return service.return_book(borrow_id, return_data)


@router.delete("/{borrow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_borrowed_book(
    borrow_id: int,
    service: BorrowedBookService = Depends(get_borrowed_book_service)
):
    """Supprime un enregistrement d'emprunt"""
    service.delete(borrow_id)
    return None


# ================================
# HEALTH CHECK
# ================================

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint pour vérifier que l'API des livres empruntés fonctionne"""
    return {"status": "healthy", "service": "borrowed-books"}
