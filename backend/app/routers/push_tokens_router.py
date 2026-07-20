from fastapi import APIRouter, Depends
from sqlmodel import Session
from pydantic import BaseModel
from typing import Optional

from app.db import get_session
from app.services.auth_service import get_current_user
from app.models.user_model import User
from app.services.push_token_service import PushTokenService

router = APIRouter(prefix="/push-tokens", tags=["push-notifications"])


def get_push_token_service(
    session: Session = Depends(get_session),
) -> PushTokenService:
    return PushTokenService(session)


class PushTokenRegister(BaseModel):
    token: str
    platform: Optional[str] = None  # "ios" | "android"


@router.post("", status_code=201)
async def register_push_token(
    data: PushTokenRegister,
    current_user: User = Depends(get_current_user),
    service: PushTokenService = Depends(get_push_token_service),
):
    """Enregistre ou met à jour un token push Expo pour l'utilisateur courant."""
    return service.register_token(current_user.id, data.token, data.platform)


class PushPrefsUpdate(BaseModel):
    prefs: dict  # {"contact_invitation": true, "loan_request": false, ...}


@router.get("/prefs", status_code=200)
async def get_push_prefs(
    current_user: User = Depends(get_current_user),
    service: PushTokenService = Depends(get_push_token_service),
):
    """Récupère les préférences de notifications push de l'utilisateur."""
    return service.get_prefs(current_user)


@router.put("/prefs", status_code=200)
async def update_push_prefs(
    data: PushPrefsUpdate,
    current_user: User = Depends(get_current_user),
    service: PushTokenService = Depends(get_push_token_service),
):
    """Met à jour les préférences de notifications push de l'utilisateur."""
    return service.update_prefs(current_user, data.prefs)


@router.delete("/{token}", status_code=204)
async def unregister_push_token(
    token: str,
    current_user: User = Depends(get_current_user),
    service: PushTokenService = Depends(get_push_token_service),
):
    """Supprime un token push (appelé au logout)."""
    service.unregister_token(token, current_user.id)
