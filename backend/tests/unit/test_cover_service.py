"""
Tests unitaires pour CoverService - Traitement et stockage des images de couverture.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock
from pathlib import Path
from fastapi import HTTPException
from PIL import Image

from app.services.cover_service import CoverService, ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE


def make_image_bytes(width: int, height: int, fmt: str = "JPEG") -> bytes:
    """Helper: crée une image Pillow en mémoire et retourne ses bytes."""
    img = Image.new("RGB", (width, height), color="red")
    buf = io.BytesIO()
    img.save(buf, fmt)
    return buf.getvalue()


def make_upload_file(content_type: str, contents: bytes) -> MagicMock:
    """Helper: crée un mock UploadFile avec read() async."""
    file = MagicMock()
    file.content_type = content_type
    file.read = AsyncMock(return_value=contents)
    return file


@pytest.fixture
def covers_dir(tmp_path):
    """Patche COVERS_DIR vers un dossier temporaire."""
    import app.services.cover_service as mod
    original = mod.COVERS_DIR
    test_dir = tmp_path / "covers"
    test_dir.mkdir()
    mod.COVERS_DIR = test_dir
    yield test_dir
    mod.COVERS_DIR = original


@pytest.mark.unit
class TestCoverServiceProcessAndSave:

    @pytest.mark.asyncio
    async def test_process_valid_jpeg(self, covers_dir):
        contents = make_image_bytes(1200, 1800, "JPEG")
        file = make_upload_file("image/jpeg", contents)

        result = await CoverService.process_and_save(42, file)

        assert result == "/covers/42.jpg"
        output_path = covers_dir / "42.jpg"
        assert output_path.exists()
        img = Image.open(output_path)
        assert img.width <= 600
        assert img.height <= 900

    @pytest.mark.asyncio
    async def test_process_valid_png(self, covers_dir):
        contents = make_image_bytes(800, 1200, "PNG")
        file = make_upload_file("image/png", contents)

        result = await CoverService.process_and_save(10, file)

        assert result == "/covers/10.jpg"
        img = Image.open(covers_dir / "10.jpg")
        assert img.format == "JPEG"

    @pytest.mark.asyncio
    async def test_process_valid_webp(self, covers_dir):
        contents = make_image_bytes(600, 900, "WEBP")
        file = make_upload_file("image/webp", contents)

        result = await CoverService.process_and_save(20, file)

        assert result == "/covers/20.jpg"
        assert (covers_dir / "20.jpg").exists()

    @pytest.mark.asyncio
    async def test_reject_unsupported_content_type(self, covers_dir):
        file = make_upload_file("application/pdf", b"fake pdf")

        with pytest.raises(HTTPException) as exc_info:
            await CoverService.process_and_save(1, file)

        assert exc_info.value.status_code == 400
        assert "Type de fichier non supporté" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_reject_text_plain(self, covers_dir):
        file = make_upload_file("text/plain", b"hello")

        with pytest.raises(HTTPException) as exc_info:
            await CoverService.process_and_save(1, file)

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_reject_file_too_large(self, covers_dir):
        huge_contents = b"x" * (MAX_FILE_SIZE + 1)
        file = make_upload_file("image/jpeg", huge_contents)

        with pytest.raises(HTTPException) as exc_info:
            await CoverService.process_and_save(1, file)

        assert exc_info.value.status_code == 400
        assert "trop volumineux" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_resize_preserves_aspect_ratio(self, covers_dir):
        contents = make_image_bytes(1200, 1200, "JPEG")
        file = make_upload_file("image/jpeg", contents)

        await CoverService.process_and_save(50, file)

        img = Image.open(covers_dir / "50.jpg")
        assert img.width == 600
        assert img.height == 600

    @pytest.mark.asyncio
    async def test_small_image_not_upscaled(self, covers_dir):
        contents = make_image_bytes(200, 300, "JPEG")
        file = make_upload_file("image/jpeg", contents)

        await CoverService.process_and_save(60, file)

        img = Image.open(covers_dir / "60.jpg")
        assert img.width == 200
        assert img.height == 300

    @pytest.mark.asyncio
    async def test_overwrites_existing_cover(self, covers_dir):
        contents1 = make_image_bytes(100, 150, "JPEG")
        contents2 = make_image_bytes(200, 300, "JPEG")

        await CoverService.process_and_save(70, make_upload_file("image/jpeg", contents1))
        await CoverService.process_and_save(70, make_upload_file("image/jpeg", contents2))

        img = Image.open(covers_dir / "70.jpg")
        assert img.width == 200
        assert img.height == 300

    @pytest.mark.asyncio
    async def test_reject_corrupted_data(self, covers_dir):
        file = make_upload_file("image/jpeg", b"not-an-image-at-all")

        with pytest.raises(HTTPException) as exc_info:
            await CoverService.process_and_save(1, file)

        assert exc_info.value.status_code == 400
        assert "Impossible de traiter" in exc_info.value.detail


@pytest.mark.unit
class TestCoverServiceDeleteFile:

    def test_delete_existing_file(self, covers_dir):
        cover_path = covers_dir / "42.jpg"
        cover_path.write_bytes(b"fake image")

        result = CoverService.delete_file(42)

        assert result is True
        assert not cover_path.exists()

    def test_delete_nonexistent_file(self, covers_dir):
        result = CoverService.delete_file(999)

        assert result is False

    def test_delete_preserves_other_files(self, covers_dir):
        (covers_dir / "1.jpg").write_bytes(b"img1")
        (covers_dir / "2.jpg").write_bytes(b"img2")

        CoverService.delete_file(1)

        assert not (covers_dir / "1.jpg").exists()
        assert (covers_dir / "2.jpg").exists()
