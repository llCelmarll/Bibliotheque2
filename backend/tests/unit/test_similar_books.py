"""
Tests unitaires pour la fonctionnalité de détection de livres similaires.
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from sqlmodel import Session
from datetime import datetime

from app.services.book_service import BookService
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher


@pytest.mark.unit
@pytest.mark.books
class TestSimilarBooksDetection:
    """Tests pour la détection de livres similaires lors du scan."""

    @pytest.fixture
    def mock_session(self):
        """Mock de la session de base de données."""
        return Mock(spec=Session)

    @pytest.fixture
    def book_service(self, mock_session, test_user):
        """Instance de BookService avec session mockée."""
        return BookService(mock_session, user_id=test_user.id)

    @pytest.mark.asyncio
    async def test_scan_book_with_similar_book_found(self, book_service: BookService, test_user):
        """Test de scan d'un ISBN avec un livre similaire trouvé (même titre, ISBN différent)."""
        scanned_isbn = "9782226257017"  # ISBN scanné
        existing_isbn = "9782226257012"  # ISBN existant dans la DB

        # Mock du livre similaire existant dans la DB
        similar_book = Book(
            id=1,
            title="Sapiens",
            isbn=existing_isbn,
            owner_id=test_user.id,
            created_at=datetime.now()
        )
        similar_book.authors = [Author(id=1, name="Yuval Noah Harari")]
        similar_book.publisher = Publisher(id=1, name="Albin Michel")
        similar_book.genres = []

        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None  # Livre pas trouvé avec cet ISBN
        book_service.book_repository.search_title_match.return_value = [similar_book]  # Mais livre similaire trouvé

        # Mock des APIs externes
        with patch('app.services.book_service.fetch_google_books', new_callable=AsyncMock) as mock_google:
            with patch('app.services.book_service.fetch_openlibrary', new_callable=AsyncMock) as mock_openlibrary:
                mock_google.return_value = ({
                    'title': 'Sapiens : une brève histoire de l\'humanité',
                    'authors': ['Yuval Noah Harari'],
                    'publisher': 'Albin Michel'
                }, None)
                mock_openlibrary.return_value = ({}, None)

                result = await book_service.scan_book(scanned_isbn)

        # Vérifications
        assert result['base'] is None  # Le livre scanné n'existe pas
        assert 'title_match' in result
        assert len(result['title_match']) == 1
        assert result['title_match'][0]['isbn'] == existing_isbn
        assert result['title_match'][0]['title'] == "Sapiens"

        # Vérifier que search_title_match a été appelé avec le bon titre et ISBN
        book_service.book_repository.search_title_match.assert_called_once_with(
            'Sapiens : une brève histoire de l\'humanité',
            scanned_isbn,
            test_user.id
        )

    @pytest.mark.asyncio
    async def test_scan_book_no_similar_books(self, book_service: BookService, test_user):
        """Test de scan d'un ISBN sans livres similaires trouvés."""
        scanned_isbn = "9782226257017"

        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None
        book_service.book_repository.search_title_match.return_value = []  # Aucun livre similaire

        # Mock des APIs externes
        with patch('app.services.book_service.fetch_google_books', new_callable=AsyncMock) as mock_google:
            with patch('app.services.book_service.fetch_openlibrary', new_callable=AsyncMock) as mock_openlibrary:
                mock_google.return_value = ({
                    'title': 'Unique Book Title',
                    'authors': ['Unknown Author']
                }, None)
                mock_openlibrary.return_value = ({}, None)

                result = await book_service.scan_book(scanned_isbn)

        # Vérifications
        assert result['base'] is None
        assert 'title_match' in result
        assert len(result['title_match']) == 0

    @pytest.mark.asyncio
    async def test_scan_book_existing_isbn(self, book_service: BookService, test_user):
        """Test de scan d'un ISBN qui existe déjà (pas de recherche de similaires)."""
        existing_isbn = "9782226257012"

        # Mock du livre existant
        existing_book = Book(
            id=1,
            title="Sapiens",
            isbn=existing_isbn,
            owner_id=test_user.id
        )
        existing_book.authors = [Author(id=1, name="Yuval Noah Harari")]
        existing_book.publisher = None
        existing_book.genres = []

        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = existing_book

        # Mock des APIs externes
        with patch('app.services.book_service.fetch_google_books', new_callable=AsyncMock) as mock_google:
            with patch('app.services.book_service.fetch_openlibrary', new_callable=AsyncMock) as mock_openlibrary:
                mock_google.return_value = ({'title': 'Sapiens'}, None)
                mock_openlibrary.return_value = ({}, None)

                result = await book_service.scan_book(existing_isbn)

        # Vérifications
        assert result['base'] is not None
        assert result['base']['id'] == 1
        assert result['base']['isbn'] == existing_isbn

        # search_title_match ne devrait PAS être appelé si le livre existe déjà
        book_service.book_repository.search_title_match.assert_not_called()

    @pytest.mark.asyncio
    async def test_scan_book_multiple_similar_books(self, book_service: BookService, test_user):
        """Test de scan avec plusieurs livres similaires trouvés (plusieurs éditions)."""
        scanned_isbn = "9782226257017"

        # Mock de plusieurs livres similaires
        similar_books = [
            Book(id=1, title="Sapiens", isbn="9782226257012", owner_id=test_user.id, created_at=datetime.now()),
            Book(id=2, title="Sapiens", isbn="9782253257332", owner_id=test_user.id, created_at=datetime.now()),
            Book(id=3, title="Sapiens : Une brève histoire", isbn="9780062316097", owner_id=test_user.id, created_at=datetime.now())
        ]

        for book in similar_books:
            book.authors = [Author(id=1, name="Yuval Noah Harari")]
            book.publisher = None
            book.genres = []

        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None
        book_service.book_repository.search_title_match.return_value = similar_books

        # Mock des APIs externes
        with patch('app.services.book_service.fetch_google_books', new_callable=AsyncMock) as mock_google:
            with patch('app.services.book_service.fetch_openlibrary', new_callable=AsyncMock) as mock_openlibrary:
                mock_google.return_value = ({'title': 'Sapiens', 'authors': ['Yuval Noah Harari']}, None)
                mock_openlibrary.return_value = ({}, None)

                result = await book_service.scan_book(scanned_isbn)

        # Vérifications
        assert result['base'] is None
        assert 'title_match' in result
        assert len(result['title_match']) == 3

        # Vérifier que tous les livres similaires sont retournés
        isbns = [book['isbn'] for book in result['title_match']]
        assert "9782226257012" in isbns
        assert "9782253257332" in isbns
        assert "9780062316097" in isbns

    @pytest.mark.asyncio
    async def test_scan_book_no_title_from_apis(self, book_service: BookService, test_user):
        """Test de scan quand les APIs ne retournent pas de titre (pas de recherche possible)."""
        scanned_isbn = "9999999999999"

        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None

        # Mock des APIs externes qui ne retournent pas de titre
        with patch('app.services.book_service.fetch_google_books', new_callable=AsyncMock) as mock_google:
            with patch('app.services.book_service.fetch_openlibrary', new_callable=AsyncMock) as mock_openlibrary:
                mock_google.return_value = ({}, None)  # Pas de données
                mock_openlibrary.return_value = ({}, None)  # Pas de données

                result = await book_service.scan_book(scanned_isbn)

        # Vérifications
        assert result['base'] is None
        # search_title_match ne devrait PAS être appelé car pas de titre disponible
        book_service.book_repository.search_title_match.assert_not_called()

    @pytest.mark.asyncio
    async def test_scan_book_title_from_openlibrary_fallback(self, book_service: BookService, test_user):
        """Test de scan avec fallback sur OpenLibrary si Google Books échoue."""
        scanned_isbn = "9782226257017"

        similar_book = Book(
            id=1,
            title="Test Book",
            isbn="9782226257012",
            owner_id=test_user.id,
            created_at=datetime.now()
        )
        similar_book.authors = []
        similar_book.publisher = None
        similar_book.genres = []

        # Mock du repository
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_isbn_or_barcode.return_value = None
        book_service.book_repository.search_title_match.return_value = [similar_book]

        # Mock des APIs : Google Books vide, OpenLibrary avec données
        with patch('app.services.book_service.fetch_google_books', new_callable=AsyncMock) as mock_google:
            with patch('app.services.book_service.fetch_openlibrary', new_callable=AsyncMock) as mock_openlibrary:
                mock_google.return_value = ({}, None)  # Pas de données Google
                mock_openlibrary.return_value = ({
                    'title': 'Test Book',  # Titre depuis OpenLibrary
                    'authors': ['Test Author']
                }, None)

                result = await book_service.scan_book(scanned_isbn)

        # Vérifications
        assert 'title_match' in result
        assert len(result['title_match']) == 1

        # Vérifier que le titre d'OpenLibrary a été utilisé
        book_service.book_repository.search_title_match.assert_called_once_with(
            'Test Book',
            scanned_isbn,
            test_user.id
        )


@pytest.mark.unit
@pytest.mark.books
class TestRepositorySearchTitleMatch:
    """Tests pour la méthode search_title_match du repository."""

    def test_search_title_match_loads_relations(self, session: Session, test_user):
        """Test que search_title_match charge bien les auteurs, éditeur et genres."""
        from app.repositories.book_repository import BookRepository

        # Créer un livre avec ses relations
        author = Author(name="Test Author")
        publisher = Publisher(name="Test Publisher")
        session.add(author)
        session.add(publisher)
        session.commit()

        book = Book(
            title="Test Book",
            isbn="1111111111111",
            owner_id=test_user.id,
            publisher_id=publisher.id
        )
        book.authors.append(author)
        session.add(book)
        session.commit()

        # Test de la recherche
        repo = BookRepository(session)
        results = repo.search_title_match("Test Book", "9999999999999", test_user.id)

        assert len(results) == 1
        found_book = results[0]

        # Vérifier que les relations sont chargées (pas de lazy loading)
        assert hasattr(found_book, 'authors')
        assert len(found_book.authors) == 1
        assert found_book.authors[0].name == "Test Author"

        assert hasattr(found_book, 'publisher')
        assert found_book.publisher is not None
        assert found_book.publisher.name == "Test Publisher"

    def test_search_title_match_excludes_same_isbn(self, session: Session, test_user):
        """Test que search_title_match exclut le livre avec le même ISBN."""
        from app.repositories.book_repository import BookRepository

        # Créer deux livres avec le même titre mais ISBN différents
        book1 = Book(title="Same Title", isbn="1111111111111", owner_id=test_user.id)
        book2 = Book(title="Same Title", isbn="2222222222222", owner_id=test_user.id)
        session.add(book1)
        session.add(book2)
        session.commit()

        # Rechercher en excluant book1
        repo = BookRepository(session)
        results = repo.search_title_match("Same Title", "1111111111111", test_user.id)

        # Doit retourner seulement book2
        assert len(results) == 1
        assert results[0].isbn == "2222222222222"

    def test_search_title_match_user_isolation(self, session: Session, test_user):
        """Test que search_title_match respecte l'isolation par utilisateur."""
        from app.repositories.book_repository import BookRepository
        from tests.conftest import create_test_user

        # Créer un autre utilisateur
        other_user = create_test_user(session, email="other@example.com", username="otheruser")

        # Créer des livres pour chaque utilisateur
        book1 = Book(title="Shared Title", isbn="1111111111111", owner_id=test_user.id)
        book2 = Book(title="Shared Title", isbn="2222222222222", owner_id=other_user.id)
        session.add(book1)
        session.add(book2)
        session.commit()

        # Rechercher pour test_user
        repo = BookRepository(session)
        results = repo.search_title_match("Shared Title", "9999999999999", test_user.id)

        # Doit retourner seulement le livre de test_user
        assert len(results) == 1
        assert results[0].id == book1.id
        assert results[0].owner_id == test_user.id
