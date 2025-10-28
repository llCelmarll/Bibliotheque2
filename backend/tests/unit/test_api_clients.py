"""
Tests unitaires pour les clients d'APIs externes.
Mock des requêtes HTTP pour tester la logique de parsing.
"""
import pytest
from unittest.mock import AsyncMock, Mock, patch
import httpx
from app.clients.google_books import fetch_google_books
from app.clients.openlibrary import fetch_openlibrary


@pytest.mark.unit
@pytest.mark.scan
class TestGoogleBooksClient:
    """Tests pour le client Google Books API."""
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_google_books_success(self, mock_get: AsyncMock):
        """Test de récupération réussie depuis Google Books."""
        # Mock de la réponse HTTP
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "items": [
                {
                    "volumeInfo": {
                        "title": "Test Book",
                        "authors": ["Test Author"],
                        "publishedDate": "2023",
                        "pageCount": 300,
                        "description": "A test book",
                        "industryIdentifiers": [
                            {"type": "ISBN_13", "identifier": "9781234567890"}
                        ],
                        "imageLinks": {
                            "thumbnail": "http://example.com/cover.jpg"
                        }
                    }
                }
            ]
        }
        mock_get.return_value = mock_response
        
        result = await fetch_google_books("9781234567890")
        
        assert result is not None
        assert result["title"] == "Test Book"
        assert result["authors"] == ["Test Author"]
        assert result["publishedDate"] == "2023"
        assert result["pageCount"] == 300
        assert result["description"] == "A test book"
        
        # Vérifier que l'URL est correcte
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert "isbn:9781234567890" in str(call_args)
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_google_books_no_results(self, mock_get: AsyncMock):
        """Test quand Google Books ne trouve aucun résultat."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"items": []}  # Pas de résultats
        mock_get.return_value = mock_response
        
        result = await fetch_google_books("9999999999999")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_google_books_no_items_key(self, mock_get: AsyncMock):
        """Test quand Google Books retourne une réponse sans 'items'."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}  # Pas de clé 'items'
        mock_get.return_value = mock_response
        
        result = await fetch_google_books("9999999999999")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_google_books_http_error(self, mock_get: AsyncMock):
        """Test quand Google Books retourne une erreur HTTP."""
        mock_response = AsyncMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        result = await fetch_google_books("9781234567890")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_google_books_timeout(self, mock_get: AsyncMock):
        """Test quand Google Books timeout."""
        mock_get.side_effect = httpx.ConnectTimeout("Connection timeout")
        
        result = await fetch_google_books("9781234567890")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_google_books_request_error(self, mock_get: AsyncMock):
        """Test quand il y a une erreur de requête."""
        mock_get.side_effect = httpx.RequestError("Network error")
        
        result = await fetch_google_books("9781234567890")
        
        assert result is None


@pytest.mark.unit
@pytest.mark.scan  
class TestOpenLibraryClient:
    """Tests pour le client OpenLibrary API."""
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_openlibrary_success(self, mock_get: AsyncMock):
        """Test de récupération réussie depuis OpenLibrary."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "title": "Test Book from OL",
            "authors": [
                {"name": "Test Author 1"},
                {"name": "Test Author 2"}
            ],
            "publishers": ["Test Publisher"],
            "publish_date": "2023",  
            "number_of_pages": 250,
            "subjects": ["Fiction", "Adventure"],
            "covers": [12345678]
        }
        mock_get.return_value = mock_response
        
        result = await fetch_openlibrary("9781234567890")
        
        assert result is not None
        assert result["title"] == "Test Book from OL"
        assert len(result["authors"]) == 2
        assert result["authors"][0]["name"] == "Test Author 1"
        assert result["publishers"] == ["Test Publisher"]
        assert result["number_of_pages"] == 250
        
        # Vérifier l'URL appelée
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert "/isbn/9781234567890.json" in str(call_args)
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_openlibrary_not_found(self, mock_get: AsyncMock):
        """Test quand OpenLibrary ne trouve pas le livre."""
        mock_response = AsyncMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        result = await fetch_openlibrary("9999999999999")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_openlibrary_server_error(self, mock_get: AsyncMock):
        """Test quand OpenLibrary retourne une erreur serveur."""
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_get.return_value = mock_response
        
        result = await fetch_openlibrary("9781234567890")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_openlibrary_timeout(self, mock_get: AsyncMock):
        """Test quand OpenLibrary timeout."""
        mock_get.side_effect = httpx.ReadTimeout("Read timeout")
        
        result = await fetch_openlibrary("9781234567890")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')  
    async def test_fetch_openlibrary_connection_error(self, mock_get: AsyncMock):
        """Test quand il y a une erreur de connexion."""
        mock_get.side_effect = httpx.ConnectTimeout("Connection failed")
        
        result = await fetch_openlibrary("9781234567890")
        
        assert result is None
    
    @pytest.mark.asyncio
    @patch('httpx.AsyncClient.get')
    async def test_fetch_openlibrary_minimal_data(self, mock_get: AsyncMock):
        """Test avec des données minimales d'OpenLibrary."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "title": "Minimal Book"
            # Pas d'autres champs
        }
        mock_get.return_value = mock_response
        
        result = await fetch_openlibrary("9781234567890")
        
        assert result is not None
        assert result["title"] == "Minimal Book"
        # Les autres champs peuvent être absents, c'est OK