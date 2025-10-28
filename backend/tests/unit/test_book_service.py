"""
Tests unitaires pour le service BookService - Tests de recherche uniquement.
Les tests CRUD complets sont dans tests/integration/test_book_endpoints.py
"""
import pytest
from unittest.mock import Mock
from sqlmodel import Session

from app.services.book_service import BookService
from app.models.Book import Book


@pytest.mark.unit
@pytest.mark.books
class TestBookService:
    """Tests unitaires pour BookService - Recherche seulement."""
    
    @pytest.fixture
    def mock_session(self):
        """Mock de la session de base de données."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def book_service(self, mock_session, test_user):
        """Instance de BookService avec session mockée."""
        return BookService(mock_session, user_id=test_user.id)

    def test_search_books_with_query(self, book_service: BookService, mock_session, test_user):
        """Test de recherche de livres avec une requête."""
        from app.schemas.Book import BookSearchParams
        
        # Mock des résultats de recherche
        search_results = [
            Book(id=1, title="Python Programming", owner_id=test_user.id),
            Book(id=2, title="Python Advanced", owner_id=test_user.id)
        ]
        
        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.search_books.return_value = search_results
        
        params = BookSearchParams(search="Python")
        result = book_service.search_books(params)
        
        assert len(result) == 2
        assert all("Python" in book.title for book in result)
    
    def test_search_books_empty_query(self, book_service: BookService, mock_session, test_user):
        """Test de recherche avec requête vide."""
        from app.schemas.Book import BookSearchParams
        
        # Mock du repository - retourne tous les livres de l'utilisateur
        user_books = [
            Book(id=1, title="Book 1", owner_id=test_user.id),
            Book(id=2, title="Book 2", owner_id=test_user.id)
        ]
        
        book_service.book_repository = Mock()
        book_service.book_repository.search_books.return_value = user_books
        
        params = BookSearchParams(search="")  # Requête vide
        result = book_service.search_books(params)
        
        # Avec une requête vide, retourne tous les livres de l'utilisateur
        assert len(result) == 2
    
    def test_search_books_no_results(self, book_service: BookService, mock_session, test_user):
        """Test de recherche sans résultats."""
        from app.schemas.Book import BookSearchParams
        
        # Mock du repository - aucun résultat
        book_service.book_repository = Mock()
        book_service.book_repository.search_books.return_value = []
        
        params = BookSearchParams(search="NonExistentBook")
        result = book_service.search_books(params)
        
        assert len(result) == 0
    
    def test_search_books_all_user_books(self, book_service: BookService, mock_session, test_user):
        """Test de récupération de tous les livres de l'utilisateur."""
        from app.schemas.Book import BookSearchParams
        
        # Mock du repository
        user_books = [
            Book(id=1, title="Book 1", owner_id=test_user.id),
            Book(id=2, title="Book 2", owner_id=test_user.id),
            Book(id=3, title="Book 3", owner_id=test_user.id)
        ]
        
        book_service.book_repository = Mock()
        book_service.book_repository.search_books.return_value = user_books
        
        params = BookSearchParams()  # Pas de critères de recherche
        result = book_service.search_books(params)
        
        # Retourne tous les livres de l'utilisateur
        assert len(result) == 3
        assert all(book.owner_id == test_user.id for book in result)