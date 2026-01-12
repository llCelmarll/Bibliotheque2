"""
Tests pour le filtrage des livres retournés dans le repository.
"""
import pytest
from datetime import datetime, timedelta
from sqlmodel import Session

from app.models.User import User
from app.models.Book import Book
from app.models.BorrowedBook import BorrowStatus
from app.repositories.book_repository import BookRepository
from app.schemas.Book import BookSearchParams, BookAdvancedSearchParams
from tests.conftest import create_test_book, create_test_borrowed_book


@pytest.mark.unit
class TestBookRepositoryFiltering:
    """Tests du filtrage des livres retournés dans le repository."""

    def test_search_excludes_returned_books(self, session: Session, test_user: User):
        """Test que search_books exclut les livres avec status RETURNED."""
        repo = BookRepository(session)

        # Créer 3 livres pour l'utilisateur
        book_no_borrow = create_test_book(session, test_user.id, "Livre Normal", "1111111111111")
        book_active_borrow = create_test_book(session, test_user.id, "Livre Emprunté Actif", "2222222222222")
        book_returned_borrow = create_test_book(session, test_user.id, "Livre Emprunté Retourné", "3333333333333")

        # Créer un emprunt actif pour le deuxième livre
        create_test_borrowed_book(
            session,
            book_id=book_active_borrow.id,
            user_id=test_user.id,
            borrowed_from="Active Source",
            status=BorrowStatus.ACTIVE
        )

        # Créer un emprunt retourné pour le troisième livre
        create_test_borrowed_book(
            session,
            book_id=book_returned_borrow.id,
            user_id=test_user.id,
            borrowed_from="Returned Source",
            status=BorrowStatus.RETURNED
        )

        # Rechercher les livres
        params = BookSearchParams(search=None, skip=0, limit=100)
        results = repo.search_books(params, user_id=test_user.id)
        result_ids = [book.id for book in results]

        # Vérifications
        assert book_no_borrow.id in result_ids, "Livre sans emprunt doit être visible"
        assert book_active_borrow.id in result_ids, "Livre avec emprunt actif doit être visible"
        assert book_returned_borrow.id not in result_ids, "Livre avec emprunt retourné NE doit PAS être visible"

    def test_advanced_search_excludes_returned_books(self, session: Session, test_user: User):
        """Test que advanced_search_books exclut les livres avec status RETURNED."""
        repo = BookRepository(session)

        # Créer 2 livres
        book_active = create_test_book(session, test_user.id, "Active Book", "4444444444444")
        book_returned = create_test_book(session, test_user.id, "Returned Book", "5555555555555")

        # Emprunts
        create_test_borrowed_book(
            session,
            book_id=book_active.id,
            user_id=test_user.id,
            status=BorrowStatus.ACTIVE
        )

        create_test_borrowed_book(
            session,
            book_id=book_returned.id,
            user_id=test_user.id,
            status=BorrowStatus.RETURNED
        )

        # Recherche avancée
        params = BookAdvancedSearchParams(skip=0, limit=100)
        results = repo.advanced_search_books(params, user_id=test_user.id)
        result_ids = [book.id for book in results]

        assert book_active.id in result_ids
        assert book_returned.id not in result_ids

    def test_statistics_exclude_returned_books(self, session: Session, test_user: User):
        """Test que get_statistics exclut les livres avec status RETURNED."""
        repo = BookRepository(session)

        # Créer 3 livres
        book1 = create_test_book(session, test_user.id, "Book 1", "1111111111111")
        book2 = create_test_book(session, test_user.id, "Book 2", "2222222222222")
        book3 = create_test_book(session, test_user.id, "Book 3", "3333333333333")

        # book1: pas d'emprunt (doit compter)
        # book2: emprunt actif (doit compter)
        # book3: emprunt retourné (NE doit PAS compter)

        create_test_borrowed_book(
            session,
            book_id=book2.id,
            user_id=test_user.id,
            status=BorrowStatus.ACTIVE
        )

        create_test_borrowed_book(
            session,
            book_id=book3.id,
            user_id=test_user.id,
            status=BorrowStatus.RETURNED
        )

        # Récupérer les stats
        stats = repo.get_statistics(user_id=test_user.id)

        # On s'attend à 2 livres (book1 + book2), pas book3
        assert stats["total_books"] == 2, f"Expected 2 books, got {stats['total_books']}"

    def test_overdue_status_visible(self, session: Session, test_user: User):
        """Test que les livres avec status OVERDUE restent visibles."""
        repo = BookRepository(session)

        # Créer un livre avec emprunt en retard
        book_overdue = create_test_book(session, test_user.id, "Overdue Book", "6666666666666")

        create_test_borrowed_book(
            session,
            book_id=book_overdue.id,
            user_id=test_user.id,
            borrowed_from="Overdue Source",
            status=BorrowStatus.OVERDUE
        )

        # Rechercher
        params = BookSearchParams(search=None, skip=0, limit=100)
        results = repo.search_books(params, user_id=test_user.id)
        result_ids = [book.id for book in results]

        assert book_overdue.id in result_ids, "Livre avec emprunt en retard doit être visible"

    def test_no_user_id_shows_all_books(self, session: Session, test_user: User):
        """Test que sans user_id, tous les livres sont visibles (pas de filtrage)."""
        repo = BookRepository(session)

        # Créer un livre avec emprunt retourné
        book = create_test_book(session, test_user.id, "Book", "7777777777777")
        create_test_borrowed_book(
            session,
            book_id=book.id,
            user_id=test_user.id,
            status=BorrowStatus.RETURNED
        )

        # Rechercher SANS user_id
        params = BookSearchParams(search=None, skip=0, limit=100)
        results = repo.search_books(params, user_id=None)

        # Le livre devrait être visible car pas de filtrage par utilisateur
        # (Dans un contexte admin par exemple)
        result_ids = [b.id for b in results]
        assert book.id in result_ids, "Sans user_id, tous les livres doivent être visibles"

    def test_get_by_id_always_returns_book(self, session: Session, test_user: User):
        """Test que get_by_id retourne le livre même s'il est retourné."""
        repo = BookRepository(session)

        # Créer un livre retourné
        book = create_test_book(session, test_user.id, "Returned Book", "8888888888888")
        create_test_borrowed_book(
            session,
            book_id=book.id,
            user_id=test_user.id,
            status=BorrowStatus.RETURNED
        )

        # get_by_id ne doit PAS filtrer
        result = repo.get_by_id(book.id, user_id=test_user.id)

        assert result is not None, "get_by_id doit retourner le livre même s'il est retourné"
        assert result.id == book.id

    def test_multiple_borrows_latest_status_counts(self, session: Session, test_user: User):
        """Test qu'avec plusieurs emprunts, seul le dernier statut compte."""
        repo = BookRepository(session)

        # Créer un livre
        book = create_test_book(session, test_user.id, "Multi Borrow Book", "9999999999999")

        # Premier emprunt (retourné)
        borrow1 = create_test_borrowed_book(
            session,
            book_id=book.id,
            user_id=test_user.id,
            borrowed_from="First Source",
            status=BorrowStatus.RETURNED
        )

        # Deuxième emprunt (actif)
        borrow2 = create_test_borrowed_book(
            session,
            book_id=book.id,
            user_id=test_user.id,
            borrowed_from="Second Source",
            status=BorrowStatus.ACTIVE
        )

        # Le livre devrait être visible car il y a un emprunt actif
        params = BookSearchParams(search=None, skip=0, limit=100)
        results = repo.search_books(params, user_id=test_user.id)
        result_ids = [b.id for b in results]

        assert book.id in result_ids, "Livre doit être visible car il a un emprunt actif"
