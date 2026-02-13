"""
Tests unitaires pour BookService - Méthodes de gestion des couvertures.
upload_cover(), delete_cover(), et nettoyage cover dans delete_book().
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from sqlmodel import Session
from fastapi import HTTPException

from app.services.book_service import BookService
from app.models.Book import Book


@pytest.mark.unit
@pytest.mark.books
class TestBookServiceUploadCover:

    @pytest.fixture
    def mock_session(self):
        return Mock(spec=Session)

    @pytest.fixture
    def book_service(self, mock_session, test_user):
        service = BookService(mock_session, user_id=test_user.id)
        service.book_repository = Mock()
        return service

    @pytest.mark.asyncio
    async def test_upload_success(self, book_service, mock_session, test_user):
        book = Book(id=1, title="Test", owner_id=test_user.id, cover_url=None)
        book_service.book_repository.get_by_id.return_value = book

        with patch("app.services.cover_service.CoverService.process_and_save",
                    new_callable=AsyncMock, return_value="/covers/1.jpg"):
            result = await book_service.upload_cover(1, MagicMock())

        assert result == "/covers/1.jpg"
        assert book.cover_url == "/covers/1.jpg"
        mock_session.commit.assert_called()

    @pytest.mark.asyncio
    async def test_upload_book_not_found(self, book_service):
        book_service.book_repository.get_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await book_service.upload_cover(999, MagicMock())

        assert exc_info.value.status_code == 404
        assert "Livre introuvable" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_upload_replaces_existing(self, book_service, test_user):
        book = Book(id=1, title="Test", owner_id=test_user.id,
                    cover_url="https://old.com/cover.jpg")
        book_service.book_repository.get_by_id.return_value = book

        with patch("app.services.cover_service.CoverService.process_and_save",
                    new_callable=AsyncMock, return_value="/covers/1.jpg"):
            await book_service.upload_cover(1, MagicMock())

        assert book.cover_url == "/covers/1.jpg"


@pytest.mark.unit
@pytest.mark.books
class TestBookServiceDeleteCover:

    @pytest.fixture
    def mock_session(self):
        return Mock(spec=Session)

    @pytest.fixture
    def book_service(self, mock_session, test_user):
        service = BookService(mock_session, user_id=test_user.id)
        service.book_repository = Mock()
        return service

    def test_delete_local_cover(self, book_service, mock_session, test_user):
        book = Book(id=1, title="Test", owner_id=test_user.id,
                    cover_url="/covers/1.jpg")
        book_service.book_repository.get_by_id.return_value = book

        with patch("app.services.cover_service.CoverService.delete_file",
                    return_value=True):
            book_service.delete_cover(1)

        assert book.cover_url is None
        mock_session.commit.assert_called()

    def test_delete_external_url_not_cleared(self, book_service, mock_session, test_user):
        book = Book(id=1, title="Test", owner_id=test_user.id,
                    cover_url="https://books.google.com/cover.jpg")
        book_service.book_repository.get_by_id.return_value = book

        with patch("app.services.cover_service.CoverService.delete_file",
                    return_value=False):
            book_service.delete_cover(1)

        assert book.cover_url == "https://books.google.com/cover.jpg"
        mock_session.commit.assert_not_called()

    def test_delete_cover_book_not_found(self, book_service):
        book_service.book_repository.get_by_id.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            book_service.delete_cover(999)

        assert exc_info.value.status_code == 404


@pytest.mark.unit
@pytest.mark.books
class TestBookServiceDeleteBookCoverCleanup:

    @pytest.fixture
    def mock_session(self):
        return Mock(spec=Session)

    @pytest.fixture
    def book_service(self, mock_session, test_user):
        service = BookService(mock_session, user_id=test_user.id)
        service.book_repository = Mock()
        return service

    def test_delete_book_calls_cover_delete(self, book_service, mock_session, test_user):
        book = Book(id=1, title="Test", owner_id=test_user.id)
        book_service.book_repository.get_by_id.return_value = book

        with patch("app.services.cover_service.CoverService.delete_file") as mock_delete:
            book_service.delete_book(1)

        mock_delete.assert_called_once_with(1)
        mock_session.delete.assert_called_once_with(book)
        mock_session.commit.assert_called()

    def test_delete_book_not_found(self, book_service):
        book_service.book_repository.get_by_id.return_value = None

        with patch("app.services.cover_service.CoverService.delete_file") as mock_delete:
            with pytest.raises(HTTPException) as exc_info:
                book_service.delete_book(999)

        assert exc_info.value.status_code == 404
        mock_delete.assert_not_called()
