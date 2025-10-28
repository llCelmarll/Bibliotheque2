"""
Tests unitaires pour le service BookService.
Focus sur la logique métier et l'isolation des données.
"""
import pytest
from unittest.mock import Mock, AsyncMock
from sqlmodel import Session

from app.services.book_service import BookService
from app.models.Book import Book
from app.schemas.Book import BookCreate, BookUpdate
from tests.conftest import create_test_user, create_test_book


@pytest.mark.unit
@pytest.mark.books
class TestBookService:
    """Tests unitaires pour BookService."""
    
    @pytest.fixture
    def mock_session(self):
        """Mock de la session de base de données."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def book_service(self, mock_session, test_user):
        """Instance de BookService avec session mockée."""
        return BookService(mock_session, user_id=test_user.id)
    
    def test_create_book_success(self, book_service: BookService, mock_session, test_user):
        """Test de création de livre réussie."""
        book_data = BookCreate(
            title="Test Book",
            isbn="9781234567890",
            authors=["Test Author"],
            publisher="Test Publisher"
        )
        
        # Mock du comportement de la session
        mock_session.add = Mock()
        mock_session.commit = Mock()
        mock_session.refresh = Mock()
        
        # Mock de la vérification d'existence
        mock_session.exec = Mock()
        mock_session.exec.return_value.first.return_value = None  # Livre n'existe pas
        
        result = book_service.create_book(book_data)
        
        # Vérifications
        assert isinstance(result, Book)
        assert result.title == "Test Book"
        assert result.isbn == "9781234567890"
        assert result.owner_id == test_user.id
        
        # Vérifier que les méthodes de session ont été appelées
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()
    
    def test_create_book_duplicate_for_user(self, book_service: BookService, mock_session, test_user):
        """Test de création de livre en double pour le même utilisateur."""
        book_data = BookCreate(
            title="Duplicate Book",
            isbn="9781234567890"
        )
        
        # Mock : livre existe déjà pour cet utilisateur
        existing_book = Book(
            title="Duplicate Book",
            isbn="9781234567890",
            owner_id=test_user.id
        )
        mock_session.exec = Mock()
        mock_session.exec.return_value.first.return_value = existing_book
        
        with pytest.raises(ValueError, match="existe déjà dans votre bibliothèque"):
            book_service.create_book(book_data)
        
        # Ne doit pas essayer d'ajouter le livre
        mock_session.add.assert_not_called()
    
    def test_search_books_all_user_books(self, book_service: BookService, mock_session, test_user):
        """Test de récupération de tous les livres d'un utilisateur via search_books sans filtre."""
        from app.schemas.Book import BookSearchParams
        
        # Mock des livres de l'utilisateur
        user_books = [
            Book(id=1, title="Book 1", owner_id=test_user.id),
            Book(id=2, title="Book 2", owner_id=test_user.id)
        ]
        
        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.search_books.return_value = user_books
        
        params = BookSearchParams(skip=0, limit=100)
        result = book_service.search_books(params)
        
        assert len(result) == 2
        assert result[0].title == "Book 1"
        assert result[1].title == "Book 2"
        
        # Vérifier que le repository a été appelé
        book_service.book_repository.search_books.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_book_by_id_owner(self, book_service: BookService, mock_session, test_user):
        """Test de récupération d'un livre par ID (propriétaire)."""
        book = Book(id=1, title="My Book", owner_id=test_user.id)
        
        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_book_by_id.return_value = book
        
        result = await book_service.get_book_by_id(1)
        
        assert result is not None
        assert "base" in result  # Structure enrichie
        assert result["base"]["id"] == 1
        assert result["base"]["title"] == "My Book"
    
    @pytest.mark.asyncio
    async def test_get_book_by_id_not_owner(self, book_service: BookService, mock_session, test_user):
        """Test de récupération d'un livre par ID (pas le propriétaire)."""
        # Mock du repository - livre introuvable car pas le bon propriétaire
        book_service.book_repository = Mock()
        book_service.book_repository.get_book_by_id.return_value = None
        
        # Devrait lever une HTTPException
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await book_service.get_book_by_id(999)
        
        assert exc_info.value.status_code == 404
        assert "Livre introuvable" in str(exc_info.value.detail)
    
    def test_update_book_success(self, book_service: BookService, mock_session, test_user):
        """Test de mise à jour de livre réussie."""
        existing_book = Book(id=1, title="Original Title", owner_id=test_user.id)
        update_data = BookUpdate(title="Updated Title", page_count=500)
        
        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_book_by_id.return_value = existing_book
        mock_session.commit = Mock()
        mock_session.refresh = Mock()
        
        result = book_service.update_book(1, update_data)
        
        assert result is not None
        assert result.title == "Updated Title"
        assert result.page_count == 500
        assert result.owner_id == test_user.id
        
        mock_session.commit.assert_called_once()
        mock_session.refresh.assert_called_once()
    
    def test_update_book_not_found(self, book_service: BookService, mock_session, test_user):
        """Test de mise à jour d'un livre introuvable."""
        update_data = BookUpdate(title="Updated Title")
        
        # Mock du repository - livre introuvable
        book_service.book_repository = Mock()
        book_service.book_repository.get_book_by_id.return_value = None
        
        # Devrait lever une HTTPException
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            book_service.update_book(999, update_data)
        
        assert exc_info.value.status_code == 404
        assert "Livre introuvable" in str(exc_info.value.detail)
        mock_session.commit.assert_not_called()
    
    def test_delete_book_success(self, book_service: BookService, mock_session, test_user):
        """Test de suppression de livre réussie."""
        existing_book = Book(id=1, title="Book to Delete", owner_id=test_user.id)
        
        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_book_by_id.return_value = existing_book
        mock_session.delete = Mock()
        mock_session.commit = Mock()
        
        # delete_book retourne None, pas bool
        book_service.delete_book(1)
        
        mock_session.delete.assert_called_once_with(existing_book)
        mock_session.commit.assert_called_once()
    
    def test_delete_book_not_found(self, book_service: BookService, mock_session, test_user):
        """Test de suppression d'un livre introuvable."""
        # Mock du repository - livre introuvable
        book_service.book_repository = Mock()
        book_service.book_repository.get_book_by_id.return_value = None
        
        # Devrait lever une HTTPException
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            book_service.delete_book(999)
        
        assert exc_info.value.status_code == 404
        assert "Livre introuvable" in str(exc_info.value.detail)
        mock_session.delete.assert_not_called()
        mock_session.commit.assert_not_called()
    
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
        
        params = BookSearchParams(search="NonexistentBook")
        result = book_service.search_books(params)
        
        assert result == []