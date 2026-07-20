from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.services.auth_service import get_current_user
from app.models.user_model import User
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_notification_service(
    session: Session = Depends(get_session),
) -> NotificationService:
    return NotificationService(session)


@router.get("/counts")
async def get_notification_counts(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    """Retourne les compteurs de notifications en une seule requête (pour le polling)."""
    return service.get_counts(current_user.id)
