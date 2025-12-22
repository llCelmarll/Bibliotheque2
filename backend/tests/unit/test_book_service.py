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

        # Mock du loan repository
        book_service.loan_repository = Mock()
        book_service.loan_repository.get_active_loan_for_book.return_value = None

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

        # Mock du loan repository
        book_service.loan_repository = Mock()
        book_service.loan_repository.get_active_loan_for_book.return_value = None

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

        # Mock du loan repository
        book_service.loan_repository = Mock()
        book_service.loan_repository.get_active_loan_for_book.return_value = None

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

        # Mock du loan repository
        book_service.loan_repository = Mock()
        book_service.loan_repository.get_active_loan_for_book.return_value = None

        params = BookSearchParams()  # Pas de critères de recherche
        result = book_service.search_books(params)

        # Retourne tous les livres de l'utilisateur
        assert len(result) == 3
        # BookRead objects don't have owner_id, but all books come from the user's repository
        assert all(hasattr(book, 'id') and book.id in [1, 2, 3] for book in result)


@pytest.mark.unit
@pytest.mark.books
class TestBookBulkImport:
    """Tests unitaires pour l'import en masse de livres."""
    
    @pytest.fixture
    def mock_session(self):
        """Mock de la session de base de données."""
        session = Mock(spec=Session)
        session.commit = Mock()
        session.rollback = Mock()
        session.add = Mock()
        session.flush = Mock()
        return session
    
    @pytest.fixture
    def book_service(self, mock_session, test_user):
        """Instance de BookService avec session mockée."""
        return BookService(mock_session, user_id=test_user.id)
    
    def test_bulk_create_books_atomic_success(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse en mode atomique - succès."""
        from app.schemas.Book import BookCreate
        
        # Mock de create_book pour qu'il réussisse
        books_data = [
            BookCreate(title="Book 1", isbn="1234567890"),
            BookCreate(title="Book 2", isbn="0987654321"),
            BookCreate(title="Book 3", isbn="1111111111")
        ]
        
        created_books = [
            Book(id=1, title="Book 1", isbn="1234567890", owner_id=test_user.id),
            Book(id=2, title="Book 2", isbn="0987654321", owner_id=test_user.id),
            Book(id=3, title="Book 3", isbn="1111111111", owner_id=test_user.id)
        ]
        
        # Mock de create_book
        book_service.create_book = Mock(side_effect=created_books)
        
        result = book_service.bulk_create_books(books_data, skip_errors=False)
        
        assert result["success"] == 3
        assert result["failed"] == 0
        assert result["total"] == 3
        assert len(result["created"]) == 3
        assert len(result["errors"]) == 0
    
    def test_bulk_create_books_atomic_failure(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse en mode atomique - échec."""
        from app.schemas.Book import BookCreate
        from fastapi import HTTPException
        
        books_data = [
            BookCreate(title="Book 1", isbn="1234567890"),
            BookCreate(title="Book 2", isbn="0987654321"),
            BookCreate(title="Book 3", isbn="1111111111")
        ]
        
        # Mock de create_book qui échoue au 2ème livre
        def mock_create(book_data):
            if book_data.title == "Book 2":
                raise HTTPException(status_code=400, detail="ISBN déjà existant")
            return Book(id=1, title=book_data.title, isbn=book_data.isbn, owner_id=test_user.id)
        
        book_service.create_book = Mock(side_effect=mock_create)
        
        # En mode atomique, une erreur doit lever une exception
        with pytest.raises(HTTPException) as exc_info:
            book_service.bulk_create_books(books_data, skip_errors=False)
        
        assert "Erreur lors de la création en lot" in str(exc_info.value.detail)
        mock_session.rollback.assert_called_once()
    
    def test_bulk_create_books_skip_errors_success(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse avec skip_errors=True - tous réussissent."""
        from app.schemas.Book import BookCreate
        
        books_data = [
            BookCreate(title="Book 1", isbn="1234567890"),
            BookCreate(title="Book 2", isbn="0987654321"),
            BookCreate(title="Book 3", isbn="1111111111")
        ]
        
        created_books = [
            Book(id=1, title="Book 1", isbn="1234567890", owner_id=test_user.id),
            Book(id=2, title="Book 2", isbn="0987654321", owner_id=test_user.id),
            Book(id=3, title="Book 3", isbn="1111111111", owner_id=test_user.id)
        ]
        
        book_service.create_book = Mock(side_effect=created_books)
        
        result = book_service.bulk_create_books(books_data, skip_errors=True)
        
        assert result["success"] == 3
        assert result["failed"] == 0
        assert result["total"] == 3
        assert len(result["created"]) == 3
        assert len(result["errors"]) == 0
    
    def test_bulk_create_books_skip_errors_partial(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse avec skip_errors=True - succès partiel."""
        from app.schemas.Book import BookCreate
        from fastapi import HTTPException
        
        books_data = [
            BookCreate(title="Book 1", isbn="1234567890"),
            BookCreate(title="Book 2", isbn="0987654321"),  # Va échouer
            BookCreate(title="Book 3", isbn="1111111111"),
            BookCreate(title="Book 4", isbn="2222222222")   # Va échouer
        ]
        
        def mock_create(book_data):
            if book_data.title in ["Book 2", "Book 4"]:
                raise HTTPException(status_code=400, detail=f"{book_data.title} - ISBN invalide")
            return Book(id=1, title=book_data.title, isbn=book_data.isbn, owner_id=test_user.id)
        
        book_service.create_book = Mock(side_effect=mock_create)
        
        result = book_service.bulk_create_books(books_data, skip_errors=True)
        
        assert result["success"] == 2
        assert result["failed"] == 2
        assert result["total"] == 4
        assert len(result["created"]) == 2
        assert len(result["errors"]) == 2
        
        # Vérifier les détails des erreurs
        assert result["errors"][0]["line"] == 2
        assert result["errors"][0]["title"] == "Book 2"
        assert result["errors"][1]["line"] == 4
        assert result["errors"][1]["title"] == "Book 4"
        
        # Vérifier que rollback a été appelé pour chaque erreur
        assert mock_session.rollback.call_count == 2
    
    def test_bulk_create_books_skip_errors_all_fail(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse avec skip_errors=True - tous échouent."""
        from app.schemas.Book import BookCreate
        from fastapi import HTTPException
        
        books_data = [
            BookCreate(title="Book 1", isbn="1234567890"),
            BookCreate(title="Book 2", isbn="0987654321"),
            BookCreate(title="Book 3", isbn="1111111111")
        ]
        
        # Tous les create_book échouent
        book_service.create_book = Mock(
            side_effect=HTTPException(status_code=400, detail="Erreur de validation")
        )
        
        result = book_service.bulk_create_books(books_data, skip_errors=True)
        
        assert result["success"] == 0
        assert result["failed"] == 3
        assert result["total"] == 3
        assert len(result["created"]) == 0
        assert len(result["errors"]) == 3
        
        # Vérifier que toutes les erreurs ont été enregistrées
        for idx, error in enumerate(result["errors"]):
            assert error["line"] == idx + 1
            assert "Book" in error["title"]
    
    def test_bulk_create_books_empty_list(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse avec liste vide."""
        from app.schemas.Book import BookCreate
        
        books_data = []
        
        result = book_service.bulk_create_books(books_data, skip_errors=False)
        
        assert result["success"] == 0
        assert result["failed"] == 0
        assert result["total"] == 0
        assert len(result["created"]) == 0
        assert len(result["errors"]) == 0
    
    def test_bulk_create_books_with_authors_and_genres(self, book_service: BookService, mock_session, test_user):
        """Test de création en masse avec auteurs et genres."""
        from app.schemas.Book import BookCreate
        
        books_data = [
            BookCreate(
                title="Book 1",
                isbn="1234567890",
                authors=["Author 1", "Author 2"],
                genres=["Genre 1"]
            ),
            BookCreate(
                title="Book 2",
                isbn="0987654321",
                authors=["Author 3"],
                genres=["Genre 1", "Genre 2"]
            )
        ]
        
        created_books = [
            Book(id=1, title="Book 1", isbn="1234567890", owner_id=test_user.id),
            Book(id=2, title="Book 2", isbn="0987654321", owner_id=test_user.id)
        ]
        
        book_service.create_book = Mock(side_effect=created_books)
        
        result = book_service.bulk_create_books(books_data, skip_errors=True)
        
        assert result["success"] == 2
        assert result["failed"] == 0
        assert book_service.create_book.call_count == 2