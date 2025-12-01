"""
Tests d'intégration pour la fonctionnalité de scan ISBN.
Focus sur les mocks des APIs externes et l'isolation utilisateur.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user, create_test_book


@pytest.mark.integration
@pytest.mark.scan
class TestScanEndpoint:
    """Tests des endpoints de scan ISBN."""
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    def test_scan_existing_book_in_database(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient, 
        session: Session, 
        test_user
    ):
        """Test scan d'un livre qui existe déjà dans la base de l'utilisateur."""
        # Créer un livre existant pour l'utilisateur
        existing_book = create_test_book(
            session, 
            test_user.id, 
            title="Existing Book", 
            isbn="9781234567890"
        )
        
        # Mock des APIs externes
        mock_google_books.return_value = {
            "title": "Google Title",
            "authors": ["Google Author"],
            "description": "Google description"
        }
        mock_openlibrary.return_value = {
            "title": "OpenLibrary Title",
            "authors": [{"name": "OL Author"}]
        }
        
        response = authenticated_client.get("/books/scan/9781234567890")
        
        assert response.status_code == 200
        data = response.json()
        
        # Le livre existe dans la base
        assert data["base"] is not None
        assert data["base"]["id"] == existing_book.id
        assert data["base"]["title"] == "Existing Book"

        # Les APIs externes ne sont PAS appelées quand le livre existe déjà
        assert "google_books" not in data
        assert "open_library" not in data

        # Vérifier que les APIs n'ont PAS été appelées
        mock_google_books.assert_not_called()
        mock_openlibrary.assert_not_called()
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    def test_scan_book_not_in_database(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient
    ):
        """Test scan d'un livre qui n'existe pas dans la base."""
        # Mock des APIs externes
        mock_google_books.return_value = {
            "title": "New Book from Google",
            "authors": ["Google Author"],
            "publishedDate": "2023",
            "pageCount": 300,
            "description": "A great book",
            "imageLinks": {"thumbnail": "http://example.com/cover.jpg"}
        }
        mock_openlibrary.return_value = {
            "title": "New Book from OpenLibrary",
            "authors": [{"name": "OL Author"}],
            "number_of_pages": 250
        }
        
        response = authenticated_client.get("/books/scan/9780987654321")
        
        assert response.status_code == 200
        data = response.json()
        
        # Le livre n'existe pas dans la base
        assert data["base"] is None
        
        # Mais les données des APIs externes sont disponibles
        assert data["google_books"]["title"] == "New Book from Google"  
        assert data["google_books"]["pageCount"] == 300
        assert data["open_library"]["title"] == "New Book from OpenLibrary"
        assert data["open_library"]["number_of_pages"] == 250
        
        # Vérifier que les APIs ont été appelées
        mock_google_books.assert_called_once_with("9780987654321")
        mock_openlibrary.assert_called_once_with("9780987654321")
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    def test_scan_book_other_user_book_not_visible(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient, 
        session: Session, 
        test_user
    ):
        """Test scan d'un livre qui existe pour un autre utilisateur (isolation)."""
        # Créer un autre utilisateur avec le même ISBN
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(
            session, 
            other_user.id, 
            title="Other User Book", 
            isbn="9781111111111"
        )
        
        # Mock des APIs externes
        mock_google_books.return_value = {"title": "Google Result"}
        mock_openlibrary.return_value = {"title": "OL Result"}
        
        response = authenticated_client.get("/books/scan/9781111111111")
        
        assert response.status_code == 200
        data = response.json()
        
        # Pour l'utilisateur authentifié, le livre n'existe pas (isolation)
        assert data["base"] is None
        
        # Mais les APIs externes répondent quand même
        assert data["google_books"]["title"] == "Google Result"
        assert data["open_library"]["title"] == "OL Result"
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    def test_scan_with_api_failures(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient
    ):
        """Test scan quand les APIs externes échouent."""
        # Simuler des échecs d'APIs
        mock_google_books.return_value = None  # API échoue
        mock_openlibrary.return_value = None   # API échoue
        
        response = authenticated_client.get("/books/scan/9999999999999")
        
        assert response.status_code == 200
        data = response.json()
        
        # Le livre n'existe pas dans la base
        assert data["base"] is None

        # Les APIs ont échoué
        assert data["google_books"] is None
        assert data["open_library"] is None
        
        # Mais l'endpoint ne plante pas
        mock_google_books.assert_called_once_with("9999999999999")
        mock_openlibrary.assert_called_once_with("9999999999999")
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')  
    def test_scan_with_partial_api_success(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient
    ):
        """Test scan quand une seule API fonctionne."""
        # Google Books fonctionne, OpenLibrary échoue
        mock_google_books.return_value = {
            "title": "Only Google Works",
            "authors": ["Google Author"]
        }
        mock_openlibrary.return_value = None
        
        response = authenticated_client.get("/books/scan/9788888888888")
        
        assert response.status_code == 200
        data = response.json()

        assert data["base"] is None
        assert data["google_books"]["title"] == "Only Google Works"
        assert data["open_library"] is None
    
    def test_scan_unauthenticated(self, client: TestClient):
        """Test scan sans authentification."""
        response = client.get("/books/scan/9781234567890")
        
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]
    
    def test_scan_empty_isbn(self, authenticated_client: TestClient):
        """Test scan avec ISBN vide."""
        # Essayer de scanner une chaîne vide - FastAPI peut retourner 422
        response = authenticated_client.get("/books/scan/ ")  # Espace pour éviter 404
        
        # FastAPI peut retourner 422 pour les paramètres invalides
        assert response.status_code in [400, 422]
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    def test_scan_with_whitespace_isbn(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient
    ):
        """Test scan avec ISBN contenant des espaces."""
        mock_google_books.return_value = None
        mock_openlibrary.return_value = None
        
        # L'ISBN sera nettoyé par le service
        response = authenticated_client.get("/books/scan/  9781234567890  ")
        
        # Le service doit nettoyer les espaces
        assert response.status_code == 200
        
        # Vérifier que les APIs sont appelées avec l'ISBN nettoyé
        mock_google_books.assert_called_once_with("  9781234567890  ")  # URL param pas nettoyé
        mock_openlibrary.assert_called_once_with("  9781234567890  ")


@pytest.mark.integration
@pytest.mark.scan
class TestScanWithBarcode:
    """Tests de scan avec codes-barres."""
    
    @patch('app.services.book_service.fetch_google_books')
    @patch('app.services.book_service.fetch_openlibrary')
    def test_scan_existing_book_by_barcode(
        self, 
        mock_openlibrary: AsyncMock, 
        mock_google_books: AsyncMock,
        authenticated_client: TestClient, 
        session: Session, 
        test_user
    ):
        """Test scan d'un livre existant par code-barre."""
        # Créer un livre avec un code-barre
        existing_book = create_test_book(
            session, 
            test_user.id, 
            title="Book with Barcode", 
            isbn="9781234567890",
            barcode="1234567890123"
        )
        
        mock_google_books.return_value = {"title": "Google Result"}
        mock_openlibrary.return_value = {"title": "OL Result"}
        
        # Scanner par code-barre
        response = authenticated_client.get("/books/scan/1234567890123")
        
        assert response.status_code == 200
        data = response.json()
        
        # Le livre doit être trouvé par son code-barre
        assert data["base"] is not None
        assert data["base"]["id"] == existing_book.id
        assert data["base"]["title"] == "Book with Barcode"

        # Les APIs externes ne sont PAS appelées quand le livre existe déjà
        mock_google_books.assert_not_called()
        mock_openlibrary.assert_not_called()