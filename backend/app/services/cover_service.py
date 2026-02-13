import io
from pathlib import Path

from fastapi import UploadFile, HTTPException
from PIL import Image
from app.config import COVERS_DIR
MAX_SIZE = (600, 900)
JPEG_QUALITY = 85
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


class CoverService:
    """Service pour le traitement et stockage des images de couverture"""

    @staticmethod
    def _ensure_covers_dir():
        COVERS_DIR.mkdir(parents=True, exist_ok=True)

    @staticmethod
    async def process_and_save(book_id: int, file: UploadFile) -> str:
        """
        Traite et sauvegarde une image de couverture.
        Redimensionne à max 600x900, compresse en JPEG qualité 85.
        Retourne le chemin relatif pour cover_url.
        """
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Type de fichier non supporté: {file.content_type}. "
                       f"Formats acceptés: JPEG, PNG, WebP, GIF"
            )

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Fichier trop volumineux (max 15 MB)"
            )

        try:
            img = Image.open(io.BytesIO(contents))
            img = img.convert("RGB")
            img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)

            CoverService._ensure_covers_dir()
            output_path = COVERS_DIR / f"{book_id}.jpg"
            img.save(output_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Impossible de traiter l'image: {str(e)}"
            )

        return f"/covers/{book_id}.jpg"

    @staticmethod
    def delete_file(book_id: int) -> bool:
        """Supprime le fichier de couverture. Retourne True si supprimé."""
        cover_path = COVERS_DIR / f"{book_id}.jpg"
        if cover_path.exists():
            cover_path.unlink()
            return True
        return False
