from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.db import get_session
from app.services.auth_service import get_current_user
from app.models.user_model import User
from app.schemas.book_schemas import BookRead
from app.services.user_search_service import LibraryPage, UserSearchResult, UserSearchService


router = APIRouter(prefix="/users", tags=["users"])


def get_user_search_service(
    session: Session = Depends(get_session),
) -> UserSearchService:
    return UserSearchService(session)


@router.get("/search", response_model=List[UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=2, description="Nom d'utilisateur à rechercher"),
    current_user: User = Depends(get_current_user),
    service: UserSearchService = Depends(get_user_search_service),
):
    """Recherche d'utilisateurs par nom d'utilisateur (insensible à la casse).
    Ne retourne que l'id et le username — jamais l'email."""
    return service.search_users(q, current_user.id)


@router.get("/{user_id}/library", response_model=LibraryPage)
async def get_user_library(
    user_id: int,
    # Recherche simple
    search: Optional[str] = Query(None, description="Recherche dans titre, auteur, isbn"),
    # Critères avancés
    title: Optional[str] = Query(None),
    author: Optional[str] = Query(None),
    publisher: Optional[str] = Query(None),
    genre: Optional[str] = Query(None),
    isbn: Optional[str] = Query(None),
    year_min: Optional[int] = Query(None),
    year_max: Optional[int] = Query(None),
    page_min: Optional[int] = Query(None),
    page_max: Optional[int] = Query(None),
    # Tri et pagination
    sort_by: str = Query("title", description="Champ de tri : title, author, publisher, genre, published_date, page_count"),
    sort_order: str = Query("asc", description="asc ou desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    service: UserSearchService = Depends(get_user_search_service),
):
    """Bibliothèque partagée d'un autre utilisateur (lecture seule, paginée).

    Accessible uniquement si l'utilisateur cible a un contact avec :
    - linked_user_id = current_user.id
    - library_shared = True
    """
    return service.get_shared_library(
        user_id, current_user.id, search, title, author, publisher, genre, isbn,
        year_min, year_max, page_min, page_max, sort_by, sort_order, skip, limit,
    )


@router.get("/{user_id}/library/{book_id}", response_model=BookRead)
async def get_shared_book(
    user_id: int,
    book_id: int,
    current_user: User = Depends(get_current_user),
    service: UserSearchService = Depends(get_user_search_service),
):
    """Détail d'un livre dans la bibliothèque partagée d'un autre utilisateur."""
    return service.get_shared_book(user_id, book_id, current_user.id)
