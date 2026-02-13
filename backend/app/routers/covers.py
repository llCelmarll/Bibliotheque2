from fastapi import APIRouter, Depends, UploadFile, File
from sqlmodel import Session
from app.db import get_session
from app.services.auth_service import get_current_user
from app.services.book_service import BookService
from app.models.User import User

router = APIRouter(prefix="/books", tags=["covers"])


def get_book_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> BookService:
    return BookService(session, user_id=current_user.id)


@router.post("/{book_id}/cover")
async def upload_cover(
    book_id: int,
    file: UploadFile = File(...),
    book_service: BookService = Depends(get_book_service),
):
    """
    Upload ou remplace la couverture d'un livre.
    Accepte JPEG, PNG, WebP, GIF. Max 15 MB.
    L'image est redimensionnée à max 600x900 et compressée en JPEG.
    """
    cover_url = await book_service.upload_cover(book_id, file)
    return {"cover_url": cover_url, "message": "Couverture mise à jour"}


@router.delete("/{book_id}/cover")
def delete_cover(
    book_id: int,
    book_service: BookService = Depends(get_book_service),
):
    """Supprime la couverture d'un livre."""
    book_service.delete_cover(book_id)
    return {"message": "Couverture supprimée"}
