from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db import get_session
from app.services.auth_service import get_current_user
from app.models.User import User
from app.models.Contact import Contact
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.schemas.Book import BookRead, AuthorRead, PublisherRead, GenreRead


router = APIRouter(prefix="/users", tags=["users"])


class UserSearchResult(BaseModel):
    id: int
    username: str


@router.get("/search", response_model=List[UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=2, description="Nom d'utilisateur à rechercher"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Recherche d'utilisateurs par nom d'utilisateur (insensible à la casse).
    Ne retourne que l'id et le username — jamais l'email."""
    search_pattern = f"%{q.lower()}%"
    users = session.exec(
        select(User).where(
            User.is_active == True,
            User.id != current_user.id,
        )
    ).all()
    # Filtre Python pour ILIKE portable
    results = [
        UserSearchResult(id=u.id, username=u.username)
        for u in users
        if q.lower() in u.username.lower()
    ]
    return results[:20]


class LibraryPage(BaseModel):
    total: int
    items: List[BookRead]


@router.get("/{user_id}/library", response_model=LibraryPage)
async def get_user_library(
    user_id: int,
    search: Optional[str] = Query(None, description="Recherche dans titre, auteur, isbn"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Bibliothèque partagée d'un autre utilisateur (lecture seule, paginée).

    Accessible uniquement si l'utilisateur cible a un contact avec :
    - linked_user_id = current_user.id
    - library_shared = True
    """
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Utilisez GET /books pour votre propre bibliothèque"
        )

    # Vérifier que le prêteur a partagé sa bibliothèque avec le demandeur
    contact = session.exec(
        select(Contact).where(
            Contact.owner_id == user_id,
            Contact.linked_user_id == current_user.id,
            Contact.library_shared == True,
        )
    ).first()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cet utilisateur n'a pas partagé sa bibliothèque avec vous"
        )

    # Construction de la requête de base
    stmt = (
        select(Book)
        .where(Book.owner_id == user_id, Book.is_lendable == True)
        .options(
            selectinload(Book.authors),
            selectinload(Book.publisher),
            selectinload(Book.genres),
        )
    )

    # Recherche simple sur titre / auteur / isbn
    if search:
        pattern = f"%{search.lower()}%"
        stmt = (
            stmt
            .outerjoin(Book.authors)
            .where(
                or_(
                    func.lower(Book.title).like(pattern),
                    func.lower(Book.isbn).like(pattern),
                    func.lower(Author.name).like(pattern),
                )
            )
            .distinct()
        )

    # Compter le total avant pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = session.exec(count_stmt).one()

    # Appliquer tri + pagination
    books = session.exec(
        stmt.order_by(Book.title).offset(skip).limit(limit)
    ).all()

    # Construire BookRead en masquant les données personnelles
    items = []
    for book in books:
        items.append(BookRead(
            id=book.id,
            title=book.title,
            isbn=book.isbn,
            published_date=book.published_date,
            page_count=book.page_count,
            barcode=None,
            cover_url=book.cover_url,
            is_read=None,
            read_date=None,
            rating=None,
            notes=None,
            is_lendable=book.is_lendable,
            created_at=book.created_at,
            updated_at=book.updated_at,
            authors=[AuthorRead.model_validate(a) for a in getattr(book, 'authors', [])],
            publisher=PublisherRead.model_validate(book.publisher) if book.publisher else None,
            genres=[GenreRead.model_validate(g) for g in getattr(book, 'genres', [])],
            series=[],
        ))

    return LibraryPage(total=total, items=items)
