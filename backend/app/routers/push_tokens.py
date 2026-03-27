from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db import get_session
from app.models.UserPushToken import UserPushToken
from app.services.auth_service import get_current_user
from app.models.User import User

router = APIRouter(prefix="/push-tokens", tags=["push-notifications"])


class PushTokenRegister(BaseModel):
    token: str
    platform: Optional[str] = None  # "ios" | "android"


@router.post("", status_code=201)
async def register_push_token(
    data: PushTokenRegister,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Enregistre ou met à jour un token push Expo pour l'utilisateur courant."""
    if not data.token.startswith("ExponentPushToken["):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token push invalide — doit commencer par ExponentPushToken["
        )

    existing = session.exec(
        select(UserPushToken).where(UserPushToken.token == data.token)
    ).first()

    if existing:
        existing.user_id = current_user.id
        existing.platform = data.platform
        existing.updated_at = datetime.utcnow()
        session.add(existing)
    else:
        push_token = UserPushToken(
            user_id=current_user.id,
            token=data.token,
            platform=data.platform,
        )
        session.add(push_token)

    session.commit()
    return {"status": "ok"}


class PushPrefsUpdate(BaseModel):
    prefs: dict  # {"contact_invitation": true, "loan_request": false, ...}


@router.get("/prefs", status_code=200)
async def get_push_prefs(
    current_user: User = Depends(get_current_user),
):
    """Récupère les préférences de notifications push de l'utilisateur."""
    return {"prefs": current_user.push_prefs or {}}


@router.put("/prefs", status_code=200)
async def update_push_prefs(
    data: PushPrefsUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Met à jour les préférences de notifications push de l'utilisateur."""
    current_user.push_prefs = data.prefs
    session.add(current_user)
    session.commit()
    return {"status": "ok"}


@router.delete("/{token}", status_code=204)
async def unregister_push_token(
    token: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Supprime un token push (appelé au logout)."""
    existing = session.exec(
        select(UserPushToken).where(
            UserPushToken.token == token,
            UserPushToken.user_id == current_user.id,
        )
    ).first()

    if existing:
        session.delete(existing)
        session.commit()
