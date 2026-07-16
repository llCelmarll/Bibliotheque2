from typing import Any, Dict

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.user_model import User
from app.repositories.push_token_repository import PushTokenRepository


class PushTokenService:
    def __init__(self, session: Session):
        self.session = session
        self.push_token_repository = PushTokenRepository(session)

    def register_token(self, user_id: int, token: str, platform: str | None) -> Dict[str, str]:
        """Enregistre ou met à jour un token push Expo pour l'utilisateur courant."""
        if not token.startswith("ExponentPushToken["):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token push invalide — doit commencer par ExponentPushToken["
            )

        existing = self.push_token_repository.get_by_token(token)
        if existing:
            self.push_token_repository.update_token(existing, user_id, platform)
        else:
            self.push_token_repository.add_token(user_id, token, platform)

        self.session.commit()
        return {"status": "ok"}

    def get_prefs(self, user: User) -> Dict[str, Any]:
        """Récupère les préférences de notifications push de l'utilisateur."""
        return {"prefs": user.push_prefs or {}}

    def update_prefs(self, user: User, prefs: dict) -> Dict[str, str]:
        """Met à jour les préférences de notifications push de l'utilisateur."""
        user.push_prefs = prefs
        self.session.add(user)
        self.session.commit()
        return {"status": "ok"}

    def unregister_token(self, token: str, user_id: int) -> None:
        """Supprime un token push (appelé au logout)."""
        existing = self.push_token_repository.get_by_token_and_user(token, user_id)
        if existing:
            self.push_token_repository.delete_token(existing)
            self.session.commit()
