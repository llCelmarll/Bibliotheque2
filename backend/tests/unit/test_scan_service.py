"""
Tests unitaires pour la logique de scan dans BookService.
Focus sur la logique métier sans dépendances externes.
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from sqlmodel import Session

from app.services.book_service import BookService
from app.models.Book import Book
from tests.conftest import create_test_user


@pytest.mark.unit
@pytest.mark.scan
class TestBookServiceScan:
    """Tests unitaires pour la méthode scan_book du BookService."""
    
    @pytest.fixture
    def mock_session(self):
        """Mock de la session de base de données."""
        return Mock(spec=Session)
    
    @pytest.fixture
    def book_service(self, mock_session, test_user):
        """Instance de BookService avec session mockée."""
        return BookService(mock_session, user_id=test_user.id)
    
    @pytest.mark.asyncio
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    async def test_scan_existing_book(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        book_service: BookService, 
        test_user
    ):
        """Test scan d'un livre existant dans la base."""
        # Mock du livre existant
        existing_book = Book(
            id=1,
            title="Existing Book",
            isbn="9781234567890",
            owner_id=test_user.id,
            authors=[],
            genres=[],
            publisher=None
        )
        
        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = existing_book
        
        # Mock des APIs externes (retournent des tuples (data, error))
        mock_google_books.return_value = ({"title": "Google Title"}, None)
        mock_openlibrary.return_value = ({"title": "OL Title"}, None)
        
        result = await book_service.scan_book("9781234567890")

        # Vérifications
        assert result["base"] is not None
        assert result["base"]["id"] == 1
        assert result["base"]["title"] == "Existing Book"

        # Les APIs ne sont PAS appelées quand le livre existe déjà
        assert "google_books" not in result
        assert "open_library" not in result

        mock_google_books.assert_not_called()
        mock_openlibrary.assert_not_called()
        book_service.book_repository.get_by_isbn_or_barcode.assert_called_once_with("9781234567890", test_user.id)
    
    @pytest.mark.asyncio
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary') 
    async def test_scan_non_existing_book(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        book_service: BookService,
        test_user
    ):
        """Test scan d'un livre qui n'existe pas dans la base."""
        # Mock du repository - livre non trouvé
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None
        book_service.book_repository.search_title_match.return_value = []  # Pas de livres similaires

        # Mock des APIs externes (retournent des tuples (data, error))
        mock_google_books.return_value = ({
            "title": "New Book",
            "authors": ["New Author"],
            "pageCount": 300
        }, None)
        mock_openlibrary.return_value = ({
            "title": "New Book OL",
            "number_of_pages": 250
        }, None)
        
        result = await book_service.scan_book("9780987654321")
        
        # Vérifications
        assert result["base"] is None
        assert result["google_books"]["title"] == "New Book"
        assert result["google_books"]["pageCount"] == 300
        assert result["open_library"]["title"] == "New Book OL"
        assert result["open_library"]["number_of_pages"] == 250
        
        # Vérifier les appels
        mock_google_books.assert_called_once_with("9780987654321")
        mock_openlibrary.assert_called_once_with("9780987654321")
        book_service.book_repository.get_by_isbn_or_barcode.assert_called_once_with("9780987654321", test_user.id)
    
    @pytest.mark.asyncio
    async def test_scan_empty_isbn(self, book_service: BookService):
        """Test scan avec ISBN vide."""
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await book_service.scan_book("")
        
        assert exc_info.value.status_code == 400
        assert "ne peut pas être vide" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_scan_whitespace_isbn(self, book_service: BookService):
        """Test scan avec ISBN contenant seulement des espaces."""
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await book_service.scan_book("   ")
        
        assert exc_info.value.status_code == 400
        assert "ne peut pas être vide" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_scan_none_isbn(self, book_service: BookService):
        """Test scan avec ISBN None."""
        from fastapi import HTTPException
        
        with pytest.raises(HTTPException) as exc_info:
            await book_service.scan_book(None)
        
        assert exc_info.value.status_code == 400
        assert "ne peut pas être vide" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    async def test_scan_with_api_failures(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        book_service: BookService
    ):
        """Test scan quand toutes les APIs externes échouent."""
        # Mock du repository - livre non trouvé
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None
        book_service.book_repository.search_title_match.return_value = []

        # Simuler l'échec des APIs (retournent des tuples (None, error))
        mock_google_books.return_value = (None, "Google Books indisponible")
        mock_openlibrary.return_value = (None, "OpenLibrary indisponible")

        result = await book_service.scan_book("9999999999999")

        # Le scan ne doit pas planter même si les APIs échouent
        assert result["base"] is None
        assert result["google_books"] is None
        assert result["open_library"] is None
        
        # Vérifier que les APIs ont été appelées
        mock_google_books.assert_called_once_with("9999999999999")
        mock_openlibrary.assert_called_once_with("9999999999999")
    
    @pytest.mark.asyncio
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    async def test_scan_with_partial_api_success(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        book_service: BookService
    ):
        """Test scan quand une seule API fonctionne."""
        # Mock du repository - livre non trouvé
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None
        book_service.book_repository.search_title_match.return_value = []

        # Google fonctionne, OpenLibrary échoue
        mock_google_books.return_value = ({
            "title": "Only Google Works",
            "authors": ["Google Author"]
        }, None)
        mock_openlibrary.return_value = (None, "OpenLibrary indisponible")

        result = await book_service.scan_book("9788888888888")

        assert result["base"] is None
        assert result["google_books"]["title"] == "Only Google Works"
        assert result["open_library"] is None
    
    @pytest.mark.asyncio
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    async def test_scan_by_barcode(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        book_service: BookService,
        test_user
    ):
        """Test scan par code-barre."""
        # Mock du livre trouvé par code-barre
        existing_book = Book(
            id=2,
            title="Book with Barcode",
            isbn="9781234567890",
            barcode="1234567890123",
            owner_id=test_user.id,
            authors=[],
            genres=[],
            publisher=None
        )
        
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = existing_book
        
        mock_google_books.return_value = ({"title": "Google"}, None)
        mock_openlibrary.return_value = ({"title": "OL"}, None)
        
        result = await book_service.scan_book("1234567890123")
        
        # Le livre doit être trouvé par son code-barre
        assert result["base"] is not None
        assert result["base"]["id"] == 2
        assert result["base"]["title"] == "Book with Barcode"
        assert result["base"]["barcode"] == "1234567890123"

        # Les APIs ne sont PAS appelées quand le livre existe déjà
        mock_google_books.assert_not_called()
        mock_openlibrary.assert_not_called()

        # Vérifier que la recherche s'est faite avec le code-barre
        book_service.book_repository.get_by_isbn_or_barcode.assert_called_once_with("1234567890123", test_user.id)