from typing import List, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from app.repositories.user_repository import UserRepository
from app.schemas.book_schemas import AuthorRead, BookRead, CurrentLoanRead, GenreRead, PublisherRead


class UserSearchResult(BaseModel):
    id: int
    username: str


class LibraryPage(BaseModel):
    total: int
    items: List[BookRead]


class UserSearchService:
    def __init__(self, session: Session):
        self.session = session
        self.user_repository = UserRepository(session)

    def search_users(self, q: str, current_user_id: int) -> List[UserSearchResult]:
        """Recherche d'utilisateurs par nom d'utilisateur (insensible à la casse).
        Ne retourne que l'id et le username — jamais l'email."""
        users = self.user_repository.search_active_users(current_user_id)
        # Filtre Python pour ILIKE portable
        results = [
            UserSearchResult(id=u.id, username=u.username)
            for u in users
            if q.lower() in u.username.lower()
        ]
        return results[:20]

    def get_shared_library(
        self,
        owner_id: int,
        viewer_user_id: int,
        search: Optional[str],
        title: Optional[str],
        author: Optional[str],
        publisher: Optional[str],
        genre: Optional[str],
        isbn: Optional[str],
        year_min: Optional[int],
        year_max: Optional[int],
        page_min: Optional[int],
        page_max: Optional[int],
        sort_by: str,
        sort_order: str,
        skip: int,
        limit: int,
    ) -> LibraryPage:
        """Bibliothèque partagée d'un autre utilisateur (lecture seule, paginée).

        Accessible uniquement si l'utilisateur cible a un contact avec :
        - linked_user_id = viewer_user_id
        - library_shared = True
        """
        if owner_id == viewer_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Utilisez GET /books pour votre propre bibliothèque"
            )

        contact = self.user_repository.find_shared_contact(owner_id, viewer_user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cet utilisateur n'a pas partagé sa bibliothèque avec vous"
            )

        books, total = self.user_repository.search_shared_library(
            owner_id, search, title, author, publisher, genre, isbn,
            year_min, year_max, page_min, page_max, sort_by, sort_order, skip, limit,
        )

        items = [self._to_masked_book_read(book) for book in books]
        return LibraryPage(total=total, items=items)

    def get_shared_book(self, owner_id: int, book_id: int, viewer_user_id: int) -> BookRead:
        """Détail d'un livre dans la bibliothèque partagée d'un autre utilisateur."""
        if owner_id == viewer_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Utilisez GET /books/{book_id} pour vos propres livres"
            )

        contact = self.user_repository.find_shared_contact(owner_id, viewer_user_id)
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cet utilisateur n'a pas partagé sa bibliothèque avec vous"
            )

        book = self.user_repository.get_shared_book_detail(owner_id, book_id)
        if not book:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Livre introuvable"
            )

        from app.models.loan_model import LoanStatus

        active_loan = None
        if book.loans:
            active_loan = next(
                (l for l in book.loans if l.status in [LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
                None
            )

        return BookRead(
            id=book.id,
            title=book.title,
            isbn=book.isbn,
            published_date=book.published_date,
            page_count=book.page_count,
            barcode=None,
            cover_url=book.cover_url,
            reading_status=None,
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
            current_loan=CurrentLoanRead.model_validate(active_loan) if active_loan else None,
        )

    @staticmethod
    def _to_masked_book_read(book) -> BookRead:
        return BookRead(
            id=book.id,
            title=book.title,
            isbn=book.isbn,
            published_date=book.published_date,
            page_count=book.page_count,
            barcode=None,
            cover_url=book.cover_url,
            reading_status=None,
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
        )
