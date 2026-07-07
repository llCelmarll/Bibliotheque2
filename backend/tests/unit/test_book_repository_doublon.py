"""
Tests unitaires pour BookRepository.get_by_title_isbn_owner() :
- Doublon avec ISBN
- Doublon sans ISBN (fix NULL != NULL en SQL)
- Même titre, ISBNs différents → pas de doublon
- Isolation entre utilisateurs
"""
import pytest
from sqlmodel import Session

from app.models.book_model import Book
from app.repositories.book_repository import BookRepository
from tests.conftest import create_test_book


@pytest.mark.unit
class TestGetByTitleIsbnOwner:

    def test_doublon_avec_isbn(self, session: Session, test_user):
        create_test_book(session, test_user.id, "Dune", isbn="9782266211222")
        repo = BookRepository(session)
        result = repo.get_by_title_isbn_owner("Dune", "9782266211222", test_user.id)
        assert result is not None
        assert result.title == "Dune"

    def test_pas_de_doublon_isbn_different(self, session: Session, test_user):
        create_test_book(session, test_user.id, "Dune", isbn="9782266211222")
        repo = BookRepository(session)
        result = repo.get_by_title_isbn_owner("Dune", "9782266233200", test_user.id)
        assert result is None

    def test_doublon_sans_isbn(self, session: Session, test_user):
        # Crée un livre sans ISBN en DB
        book = Book(title="Le Petit Prince", isbn=None, owner_id=test_user.id)
        session.add(book)
        session.commit()

        repo = BookRepository(session)
        result = repo.get_by_title_isbn_owner("Le Petit Prince", None, test_user.id)
        assert result is not None
        assert result.title == "Le Petit Prince"

    def test_doublon_sans_isbn_chaine_vide(self, session: Session, test_user):
        # ISBN stocké comme chaîne vide
        book = Book(title="Le Petit Prince", isbn="", owner_id=test_user.id)
        session.add(book)
        session.commit()

        repo = BookRepository(session)
        result = repo.get_by_title_isbn_owner("Le Petit Prince", "", test_user.id)
        assert result is not None

    def test_pas_de_doublon_titre_different(self, session: Session, test_user):
        create_test_book(session, test_user.id, "Dune", isbn="9782266211222")
        repo = BookRepository(session)
        result = repo.get_by_title_isbn_owner("Fondation", "9782266211222", test_user.id)
        assert result is None

    def test_isolation_entre_utilisateurs(self, session: Session, test_user, second_user):
        create_test_book(session, test_user.id, "Dune", isbn="9782266211222")
        repo = BookRepository(session)
        # Le livre appartient à test_user, pas à second_user
        result = repo.get_by_title_isbn_owner("Dune", "9782266211222", second_user.id)
        assert result is None

    def test_retourne_none_si_inexistant(self, session: Session, test_user):
        repo = BookRepository(session)
        result = repo.get_by_title_isbn_owner("Inexistant", "0000000000000", test_user.id)
        assert result is None
