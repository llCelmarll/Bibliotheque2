"""
Tests d'intégration pour les endpoints de gestion des couvertures.
POST /books/{id}/cover et DELETE /books/{id}/cover.
"""
import io
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlmodel import Session
from PIL import Image

from tests.conftest import create_test_user, create_test_book


def make_image_bytes(width: int, height: int, fmt: str = "JPEG") -> bytes:
    img = Image.new("RGB", (width, height), color="blue")
    buf = io.BytesIO()
    img.save(buf, fmt)
    return buf.getvalue()


@pytest.fixture
def covers_dir(tmp_path):
    """Patche COVERS_DIR vers un dossier temporaire pour les tests d'intégration.
    Patche aussi le StaticFiles mount de l'app pour servir depuis ce dossier."""
    import app.services.cover_service as mod
    import app.config as cfg
    from app.main import app
    from fastapi.staticfiles import StaticFiles

    original_mod = mod.COVERS_DIR
    original_cfg = cfg.COVERS_DIR
    test_dir = tmp_path / "covers"
    test_dir.mkdir()
    mod.COVERS_DIR = test_dir
    cfg.COVERS_DIR = test_dir

    # Remplacer le StaticFiles mount pour pointer vers le dossier temporaire
    router = app.router
    original_routes = list(router.routes)
    router.routes = [r for r in router.routes if not (hasattr(r, 'name') and r.name == 'covers')]
    app.mount("/covers", StaticFiles(directory=str(test_dir)), name="covers")

    yield test_dir

    mod.COVERS_DIR = original_mod
    cfg.COVERS_DIR = original_cfg
    router.routes = original_routes


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

    def test_upload_real_jpeg_updates_cover_url_and_creates_file(
        self, authenticated_client: TestClient, session: Session, test_user, covers_dir
    ):
        """Upload réel sans mock : cover_url mis à jour en base et fichier physique créé."""
        book = create_test_book(session, test_user.id, title="Real Upload")
        img_bytes = make_image_bytes(300, 450, "JPEG")

        response = authenticated_client.post(
            f"/books/{book.id}/cover",
            files={"file": ("cover.jpg", img_bytes, "image/jpeg")}
        )

        assert response.status_code == 200
        assert response.json()["cover_url"] == f"/covers/{book.id}.jpg"
        session.refresh(book)
        assert book.cover_url == f"/covers/{book.id}.jpg"
        assert (covers_dir / f"{book.id}.jpg").exists()

    def test_upload_oversized_file_rejected(
        self, authenticated_client: TestClient, session: Session, test_user
    ):
        """Fichier > 15 MB rejeté avec 400 avant traitement PIL."""
        book = create_test_book(session, test_user.id, title="Oversized")
        huge = b"x" * (15 * 1024 * 1024 + 1)

        response = authenticated_client.post(
            f"/books/{book.id}/cover",
            files={"file": ("cover.jpg", huge, "image/jpeg")}
        )

        assert response.status_code == 400
        assert "trop volumineux" in response.json()["detail"]


@pytest.mark.integration
@pytest.mark.books
class TestCoverServing:
    """Vérifie que GET /covers/{id}.jpg sert bien le fichier après upload.
    Régression : root_path="/api" dans FastAPI montait StaticFiles sur /api/covers
    au lieu de /covers, rendant les covers inaccessibles en production (nginx rewrite
    strip le préfixe /api/ avant de proxifier vers le backend).
    """

    def test_cover_served_at_covers_path(
        self, authenticated_client: TestClient, session: Session, test_user, covers_dir
    ):
        """Après upload, GET /covers/{id}.jpg doit retourner 200, pas 404."""
        book = create_test_book(session, test_user.id, title="Serve Test")
        img_bytes = make_image_bytes(300, 450, "JPEG")

        upload = authenticated_client.post(
            f"/books/{book.id}/cover",
            files={"file": ("cover.jpg", img_bytes, "image/jpeg")}
        )
        assert upload.status_code == 200

        cover_url = upload.json()["cover_url"]  # ex: /covers/42.jpg
        response = authenticated_client.get(cover_url)
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("image/")

    def test_cover_not_served_under_api_prefix(
        self, authenticated_client: TestClient, session: Session, test_user, covers_dir
    ):
        """GET /api/covers/{id}.jpg doit retourner 404 : StaticFiles est sur /covers,
        pas /api/covers. En production nginx strip /api/ avant de proxifier."""
        book = create_test_book(session, test_user.id, title="Prefix Test")
        img_bytes = make_image_bytes(300, 450, "JPEG")

        upload = authenticated_client.post(
            f"/books/{book.id}/cover",
            files={"file": ("cover.jpg", img_bytes, "image/jpeg")}
        )
        assert upload.status_code == 200

        response = authenticated_client.get(f"/api/covers/{book.id}.jpg")
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
