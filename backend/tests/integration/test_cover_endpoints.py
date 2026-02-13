"""
Tests d'intégration pour les endpoints de gestion des couvertures.
POST /books/{id}/cover et DELETE /books/{id}/cover.
"""
import io
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user, create_test_book


@pytest.mark.integration
@pytest.mark.books
class TestCoverUploadEndpoint:

    def test_upload_cover_success(self, authenticated_client: TestClient, session: Session, test_user):
        book = create_test_book(session, test_user.id, title="Upload Test")

        with patch("app.services.cover_service.CoverService.process_and_save",
                    new_callable=AsyncMock,
                    return_value=f"/covers/{book.id}.jpg"):
            response = authenticated_client.post(
                f"/books/{book.id}/cover",
                files={"file": ("cover.jpg", b"fake-jpeg-bytes", "image/jpeg")}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["cover_url"] == f"/covers/{book.id}.jpg"
        assert "message" in data

    def test_upload_cover_unauthenticated(self, client: TestClient):
        response = client.post(
            "/books/1/cover",
            files={"file": ("cover.jpg", b"fake", "image/jpeg")}
        )

        assert response.status_code == 403

    def test_upload_cover_book_not_found(self, authenticated_client: TestClient):
        response = authenticated_client.post(
            "/books/99999/cover",
            files={"file": ("cover.jpg", b"fake", "image/jpeg")}
        )

        assert response.status_code == 404

    def test_upload_cover_not_owner(self, authenticated_client: TestClient, session: Session):
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book", isbn="9999999999999")

        response = authenticated_client.post(
            f"/books/{other_book.id}/cover",
            files={"file": ("cover.jpg", b"fake", "image/jpeg")}
        )

        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.books
class TestCoverDeleteEndpoint:

    def test_delete_cover_success(self, authenticated_client: TestClient, session: Session, test_user):
        book = create_test_book(session, test_user.id, title="Delete Cover Test")
        book.cover_url = f"/covers/{book.id}.jpg"
        session.commit()

        with patch("app.services.cover_service.CoverService.delete_file", return_value=True):
            response = authenticated_client.delete(f"/books/{book.id}/cover")

        assert response.status_code == 200
        assert "message" in response.json()

    def test_delete_cover_unauthenticated(self, client: TestClient):
        response = client.delete("/books/1/cover")

        assert response.status_code == 403

    def test_delete_cover_not_owner(self, authenticated_client: TestClient, session: Session):
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book", isbn="8888888888888")

        with patch("app.services.cover_service.CoverService.delete_file"):
            response = authenticated_client.delete(f"/books/{other_book.id}/cover")

        assert response.status_code == 404

    def test_delete_cover_book_not_found(self, authenticated_client: TestClient):
        with patch("app.services.cover_service.CoverService.delete_file"):
            response = authenticated_client.delete("/books/99999/cover")

        assert response.status_code == 404
