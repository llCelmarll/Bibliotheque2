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

        # Mock du borrowed_book repository
        book_service.borrowed_book_repository = Mock()
        book_service.borrowed_book_repository.get_active_borrow_for_book.return_value = None
        book_service.borrowed_book_repository.get_by_book.return_value = []

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

        # Mock du borrowed_book repository
        book_service.borrowed_book_repository = Mock()
        book_service.borrowed_book_repository.get_active_borrow_for_book.return_value = None
        book_service.borrowed_book_repository.get_by_book.return_value = []

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

        # Mock du borrowed_book repository
        book_service.borrowed_book_repository = Mock()
        book_service.borrowed_book_repository.get_active_borrow_for_book.return_value = None
        book_service.borrowed_book_repository.get_by_book.return_value = []

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

        # Mock du borrowed_book repository
        book_service.borrowed_book_repository = Mock()
        book_service.borrowed_book_repository.get_active_borrow_for_book.return_value = None
        book_service.borrowed_book_repository.get_by_book.return_value = []

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


@pytest.mark.unit
@pytest.mark.books
class TestBookServiceRatingAndNotes:
    """Tests unitaires pour la validation et la mise à jour de rating et notes."""

    @pytest.fixture
    def mock_session(self):
        """Mock de la session de base de données."""
        session = Mock(spec=Session)
        session.commit = Mock()
        session.add = Mock()
        session.flush = Mock()
        session.refresh = Mock()
        return session

    @pytest.fixture
    def book_service(self, mock_session, test_user):
        """Instance de BookService avec session mockée."""
        return BookService(mock_session, user_id=test_user.id)

    def test_validate_rating_valid_values(self, book_service: BookService):
        """Test que _validate_rating accepte les valeurs 0 à 5."""
        for value in [0, 1, 2, 3, 4, 5, None]:
            try:
                book_service._validate_rating(value)
            except Exception:
                pytest.fail(f"_validate_rating devrait accepter {value}")

    def test_validate_rating_invalid_too_high(self, book_service: BookService):
        """Test que _validate_rating rejette rating > 5."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            book_service._validate_rating(6)
        assert exc_info.value.status_code == 400
        assert "0 et 5" in exc_info.value.detail

    def test_validate_rating_invalid_negative(self, book_service: BookService):
        """Test que _validate_rating rejette rating < 0."""
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            book_service._validate_rating(-1)
        assert exc_info.value.status_code == 400
        assert "0 et 5" in exc_info.value.detail

    def test_update_book_with_rating_and_notes(self, book_service: BookService, mock_session, test_user):
        """Test de mise à jour partielle avec rating et notes."""
        from app.schemas.Book import BookUpdate

        existing_book = Book(
            id=1, title="Existing Book", isbn="9781234567890",
            owner_id=test_user.id, rating=None, notes=None
        )
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_id.return_value = existing_book

        update_data = BookUpdate(rating=4, notes="Super livre!")
        result = book_service.update_book(1, update_data)

        assert existing_book.rating == 4
        assert existing_book.notes == "Super livre!"
        mock_session.commit.assert_called()


@pytest.mark.unit
@pytest.mark.books
class TestBookServiceExternalData:
    """Tests pour la récupération des données externes (Google Books, Open Library)."""

    import asyncio as _asyncio

    @pytest.fixture
    def mock_session(self):
        return Mock(spec=Session)

    @pytest.fixture
    def book_service(self, mock_session, test_user):
        return BookService(mock_session, user_id=test_user.id)

    def _make_book_service_with_mocks(self, book_service, test_user):
        """Configure les mocks communs sur book_service."""
        fake_book = Book(id=1, title="Test Book", isbn="9781234567890", owner_id=test_user.id)
        book_service.book_repository = Mock()
        book_service.book_repository.get_by_id.return_value = fake_book
        book_service.loan_repository = Mock()
        book_service.loan_repository.get_active_loan_for_book.return_value = None
        book_service.borrowed_book_repository = Mock()
        book_service.borrowed_book_repository.get_active_borrow_for_book.return_value = None
        book_service.borrowed_book_repository.get_by_book.return_value = []
        return book_service

    def test_get_book_by_id_google_books_is_dict_not_tuple(self, book_service, test_user):
        """Vérifie que google_books est le dict, pas le tuple (data, error)."""
        import asyncio
        from unittest.mock import AsyncMock, patch

        google_data = {"title": "Test Book", "authors": ["Author"]}
        self._make_book_service_with_mocks(book_service, test_user)

        with patch("app.services.book_service.fetch_google_books", new=AsyncMock(return_value=(google_data, None))), \
             patch("app.services.book_service.fetch_openlibrary", new=AsyncMock(return_value=(None, None))):
            result = asyncio.run(book_service.get_book_by_id(1))

        assert result["google_books"] == google_data
        assert isinstance(result["google_books"], dict), "google_books doit être un dict, pas un tuple"

    def test_get_book_by_id_open_library_is_dict_not_tuple(self, book_service, test_user):
        """Vérifie que open_library est le dict, pas le tuple (data, error)."""
        import asyncio
        from unittest.mock import AsyncMock, patch

        openlibrary_data = {"title": "Test Book", "publishers": ["Publisher"]}
        self._make_book_service_with_mocks(book_service, test_user)

        with patch("app.services.book_service.fetch_google_books", new=AsyncMock(return_value=(None, None))), \
             patch("app.services.book_service.fetch_openlibrary", new=AsyncMock(return_value=(openlibrary_data, None))):
            result = asyncio.run(book_service.get_book_by_id(1))

        assert result["open_library"] == openlibrary_data
        assert isinstance(result["open_library"], dict), "open_library doit être un dict, pas un tuple"

    def test_get_book_by_id_external_api_error_returns_none(self, book_service, test_user):
        """Vérifie que si l'API externe échoue, la valeur est None (pas une erreur)."""
        import asyncio
        from unittest.mock import AsyncMock, patch

        self._make_book_service_with_mocks(book_service, test_user)

        with patch("app.services.book_service.fetch_google_books", new=AsyncMock(return_value=(None, "API error"))), \
             patch("app.services.book_service.fetch_openlibrary", new=AsyncMock(return_value=(None, "Timeout"))):
            result = asyncio.run(book_service.get_book_by_id(1))

        assert result["google_books"] is None
        assert result["open_library"] is None


# ---------------------------------------------------------------------------
# _validate_book_data
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.books
class TestBookServiceValidateBookData:

    @pytest.fixture
    def svc(self):
        from unittest.mock import Mock
        from sqlmodel import Session
        return BookService(Mock(spec=Session), user_id=1)

    def _book_create(self, **kwargs):
        from app.schemas.Book import BookCreate
        defaults = {"title": "Valid Title"}
        defaults.update(kwargs)
        return BookCreate(**defaults)

    def test_empty_title_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_book_data(self._book_create(title="   "))
        assert exc.value.status_code == 400

    def test_isbn_wrong_length_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_book_data(self._book_create(isbn="12345"))
        assert exc.value.status_code == 400

    def test_isbn_10_valid(self, svc):
        svc._validate_book_data(self._book_create(isbn="1234567890"))

    def test_isbn_13_valid(self, svc):
        svc._validate_book_data(self._book_create(isbn="1234567890123"))

    def test_isbn_with_dashes_valid(self, svc):
        svc._validate_book_data(self._book_create(isbn="978-3-16-148410-0"))  # 13 digits

    def test_published_date_empty_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_book_data(self._book_create(published_date="   "))
        assert exc.value.status_code == 400

    def test_published_date_free_text_valid(self, svc):
        svc._validate_book_data(self._book_create(published_date="circa 1850"))

    def test_page_count_negative_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_book_data(self._book_create(page_count=-1))
        assert exc.value.status_code == 400

    def test_rating_above_5_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_book_data(self._book_create(rating=6))
        assert exc.value.status_code == 400

    def test_rating_zero_valid(self, svc):
        svc._validate_book_data(self._book_create(rating=0))

    def test_rating_5_valid(self, svc):
        svc._validate_book_data(self._book_create(rating=5))


# ---------------------------------------------------------------------------
# _validate_pagination / _validate_date_range / _validate_page_range
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.books
class TestBookServiceValidatePaginationAndRanges:

    @pytest.fixture
    def svc(self):
        from unittest.mock import Mock
        from sqlmodel import Session
        return BookService(Mock(spec=Session), user_id=1)

    def test_validate_pagination_negative_skip_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_pagination(-1, 10)
        assert exc.value.status_code == 400

    def test_validate_pagination_zero_limit_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_pagination(0, 0)
        assert exc.value.status_code == 400

    def test_validate_pagination_limit_too_high_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_pagination(0, 1001)
        assert exc.value.status_code == 400

    def test_validate_pagination_valid(self, svc):
        svc._validate_pagination(0, 100)

    def test_validate_date_range_min_greater_than_max_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_date_range(2020, 2010)
        assert exc.value.status_code == 400

    def test_validate_date_range_equal_years_valid(self, svc):
        svc._validate_date_range(2020, 2020)

    def test_validate_date_range_none_values_valid(self, svc):
        svc._validate_date_range(None, None)

    def test_validate_page_range_min_greater_than_max_raises_400(self, svc):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            svc._validate_page_range(200, 100)
        assert exc.value.status_code == 400

    def test_validate_page_range_valid(self, svc):
        svc._validate_page_range(10, 500)


# ---------------------------------------------------------------------------
# _validate_filters
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.books
class TestBookServiceValidateFilters:

    def _svc(self, session):
        return BookService(session, user_id=1)

    def test_validate_filters_none_is_valid(self, session):
        svc = self._svc(session)
        svc._validate_filters(None)

    def test_validate_filters_empty_list_is_valid(self, session):
        svc = self._svc(session)
        svc._validate_filters([])

    def test_validate_filters_duplicate_type_raises_400(self, session):
        from fastapi import HTTPException
        from app.schemas.Other import Filter, FilterType
        from app.models.Author import Author
        author = Author(name="Dup Author")
        session.add(author)
        session.commit()
        svc = self._svc(session)
        filters = [
            Filter(type=FilterType.AUTHOR, id=author.id),
            Filter(type=FilterType.AUTHOR, id=author.id),
        ]
        with pytest.raises(HTTPException) as exc:
            svc._validate_filters(filters)
        assert exc.value.status_code == 400

    def test_validate_filters_invalid_id_zero_raises_400(self, session):
        from fastapi import HTTPException
        from app.schemas.Other import Filter, FilterType
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._validate_filters([Filter(type=FilterType.AUTHOR, id=0)])
        assert exc.value.status_code == 400

    def test_validate_filters_author_not_found_raises_400(self, session):
        from fastapi import HTTPException
        from app.schemas.Other import Filter, FilterType
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._validate_filters([Filter(type=FilterType.AUTHOR, id=99999)])
        assert exc.value.status_code == 400

    def test_validate_filters_publisher_not_found_raises_400(self, session):
        from fastapi import HTTPException
        from app.schemas.Other import Filter, FilterType
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._validate_filters([Filter(type=FilterType.PUBLISHER, id=99999)])
        assert exc.value.status_code == 400

    def test_validate_filters_genre_not_found_raises_400(self, session):
        from fastapi import HTTPException
        from app.schemas.Other import Filter, FilterType
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._validate_filters([Filter(type=FilterType.GENRE, id=99999)])
        assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# _process_authors_for_book / _process_publisher_for_book / _process_series_for_book
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.books
class TestBookServiceProcessEntities:

    def _svc(self, session):
        return BookService(session, user_id=1)

    def _new_book(self, session, owner_id=1):
        from tests.conftest import create_test_user
        from app.models.Book import Book
        book = Book(title="Test Book", owner_id=owner_id)
        session.add(book)
        session.commit()
        session.refresh(book)
        return book

    # --- Authors ---

    def test_process_authors_by_int_id_existing(self, session, test_user):
        from app.models.Author import Author
        author = Author(name="Existing Author")
        session.add(author)
        session.commit()
        session.refresh(author)
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_authors_for_book(book, [author.id])
        assert any(a.id == author.id for a in book.authors)

    def test_process_authors_by_int_id_not_found_raises_400(self, session, test_user):
        from fastapi import HTTPException
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._process_authors_for_book(book, [99999])
        assert exc.value.status_code == 400

    def test_process_authors_by_str_creates_new(self, session, test_user):
        from app.models.Author import Author
        from sqlmodel import select
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_authors_for_book(book, ["Brand New Author"])
        found = session.exec(select(Author).where(Author.name == "Brand New Author")).first()
        assert found is not None

    def test_process_authors_by_str_reuses_existing(self, session, test_user):
        from app.models.Author import Author
        from sqlmodel import select
        author = Author(name="Reuse Author")
        session.add(author)
        session.commit()
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_authors_for_book(book, ["Reuse Author"])
        count = len(session.exec(select(Author).where(Author.name == "Reuse Author")).all())
        assert count == 1

    def test_process_authors_by_dict_with_id(self, session, test_user):
        from app.models.Author import Author
        author = Author(name="Dict Author")
        session.add(author)
        session.commit()
        session.refresh(author)
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_authors_for_book(book, [{"id": author.id, "name": "Dict Author"}])
        assert any(a.id == author.id for a in book.authors)

    def test_process_authors_by_dict_exists_true_no_id_raises_400(self, session, test_user):
        from fastapi import HTTPException
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._process_authors_for_book(book, [{"exists": True, "name": "Ghost"}])
        assert exc.value.status_code == 400

    # --- Publisher ---

    def test_process_publisher_by_int_id(self, session):
        from app.models.Publisher import Publisher
        pub = Publisher(name="Test Pub")
        session.add(pub)
        session.commit()
        session.refresh(pub)
        svc = self._svc(session)
        result = svc._process_publisher_for_book(pub.id)
        assert result == pub.id

    def test_process_publisher_by_int_id_not_found_raises_400(self, session):
        from fastapi import HTTPException
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._process_publisher_for_book(99999)
        assert exc.value.status_code == 400

    def test_process_publisher_by_str_creates_new(self, session):
        from app.models.Publisher import Publisher
        from sqlmodel import select
        svc = self._svc(session)
        result = svc._process_publisher_for_book("New Publisher")
        found = session.exec(select(Publisher).where(Publisher.name == "New Publisher")).first()
        assert found is not None
        assert result == found.id

    def test_process_publisher_by_str_reuses_existing(self, session):
        from app.models.Publisher import Publisher
        from sqlmodel import select
        pub = Publisher(name="Existing Pub")
        session.add(pub)
        session.commit()
        svc = self._svc(session)
        svc._process_publisher_for_book("Existing Pub")
        count = len(session.exec(select(Publisher).where(Publisher.name == "Existing Pub")).all())
        assert count == 1

    def test_process_publisher_by_dict_with_id(self, session):
        from app.models.Publisher import Publisher
        pub = Publisher(name="Dict Pub")
        session.add(pub)
        session.commit()
        session.refresh(pub)
        svc = self._svc(session)
        result = svc._process_publisher_for_book({"id": pub.id, "name": "Dict Pub"})
        assert result == pub.id

    def test_process_publisher_by_dict_exists_true_no_id_raises_400(self, session):
        from fastapi import HTTPException
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._process_publisher_for_book({"exists": True, "name": "Ghost Pub"})
        assert exc.value.status_code == 400

    # --- Series ---

    def test_process_series_by_int_id(self, session, test_user):
        from app.models.Series import Series
        series = Series(name="Existing Series")
        session.add(series)
        session.commit()
        session.refresh(series)
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_series_for_book(book, [series.id])
        from app.models.BookSeriesLink import BookSeriesLink
        from sqlmodel import select
        link = session.exec(select(BookSeriesLink).where(BookSeriesLink.book_id == book.id)).first()
        assert link is not None

    def test_process_series_by_int_id_not_found_raises_400(self, session, test_user):
        from fastapi import HTTPException
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._process_series_for_book(book, [99999])
        assert exc.value.status_code == 400

    def test_process_series_by_str_creates_link(self, session, test_user):
        from app.models.Series import Series
        from app.models.BookSeriesLink import BookSeriesLink
        from sqlmodel import select
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_series_for_book(book, ["New Series Name"])
        series = session.exec(select(Series).where(Series.name == "New Series Name")).first()
        assert series is not None
        link = session.exec(
            select(BookSeriesLink).where(BookSeriesLink.book_id == book.id, BookSeriesLink.series_id == series.id)
        ).first()
        assert link is not None

    def test_process_series_by_dict_with_id_and_volume(self, session, test_user):
        from app.models.Series import Series
        from app.models.BookSeriesLink import BookSeriesLink
        from sqlmodel import select
        series = Series(name="Volume Series")
        session.add(series)
        session.commit()
        session.refresh(series)
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_series_for_book(book, [{"id": series.id, "volume_number": 3}])
        link = session.exec(
            select(BookSeriesLink).where(BookSeriesLink.book_id == book.id)
        ).first()
        assert link is not None
        assert link.volume_number == 3

    def test_process_series_by_dict_exists_no_id_raises_400(self, session, test_user):
        from fastapi import HTTPException
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        with pytest.raises(HTTPException) as exc:
            svc._process_series_for_book(book, [{"exists": True, "name": "Ghost Series"}])
        assert exc.value.status_code == 400

    def test_process_series_by_dict_name_creates_link(self, session, test_user):
        from app.models.Series import Series
        from sqlmodel import select
        book = self._new_book(session, owner_id=test_user.id)
        svc = self._svc(session)
        svc._process_series_for_book(book, [{"name": "Dict Named Series"}])
        series = session.exec(select(Series).where(Series.name == "Dict Named Series")).first()
        assert series is not None


# ---------------------------------------------------------------------------
# get_books_by_author / publisher / genre
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.books
class TestBookServiceGetByCategory:

    @pytest.fixture
    def mock_session(self):
        return Mock(spec=Session)

    @pytest.fixture
    def svc(self, mock_session, test_user):
        return BookService(mock_session, user_id=test_user.id)

    def test_get_books_by_author_not_found_raises_404(self, svc, mock_session):
        from fastapi import HTTPException
        mock_session.get.return_value = None
        with pytest.raises(HTTPException) as exc:
            svc.get_books_by_author(99999)
        assert exc.value.status_code == 404

    def test_get_books_by_author_returns_empty_list(self, svc, mock_session):
        from app.models.Author import Author
        author = Author(id=1, name="Test Author")
        author.books = []
        mock_session.get.return_value = author
        result = svc.get_books_by_author(1)
        assert result == []

    def test_get_books_by_publisher_not_found_raises_404(self, svc, mock_session):
        from fastapi import HTTPException
        mock_session.get.return_value = None
        with pytest.raises(HTTPException) as exc:
            svc.get_books_by_publisher(99999)
        assert exc.value.status_code == 404

    def test_get_books_by_publisher_returns_books(self, svc, mock_session, test_user):
        from unittest.mock import MagicMock
        from app.models.Publisher import Publisher
        publisher = Publisher(id=1, name="Test Pub")
        publisher.books = []
        mock_session.get.return_value = publisher
        result = svc.get_books_by_publisher(1)
        assert isinstance(result, list)

    def test_get_books_by_genre_not_found_raises_404(self, svc, mock_session):
        from fastapi import HTTPException
        mock_session.get.return_value = None
        with pytest.raises(HTTPException) as exc:
            svc.get_books_by_genre(99999)
        assert exc.value.status_code == 404

    def test_get_books_by_genre_returns_books(self, svc, mock_session, test_user):
        from app.models.Genre import Genre
        genre = Genre(id=1, name="Test Genre")
        genre.books = []
        mock_session.get.return_value = genre
        result = svc.get_books_by_genre(1)
        assert isinstance(result, list)