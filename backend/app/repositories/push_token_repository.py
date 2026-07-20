from datetime import datetime
from typing import List, Optional

from sqlmodel import Session, select

from app.models.user_push_token_model import UserPushToken


class PushTokenRepository:
    """Repository pour les opérations de données sur les tokens push (UserPushToken)."""

    def __init__(self, session: Session):
        self.session = session

    def get_by_token(self, token: str) -> Optional[UserPushToken]:
        return self.session.exec(
            select(UserPushToken).where(UserPushToken.token == token)
        ).first()

    def get_by_token_and_user(self, token: str, user_id: int) -> Optional[UserPushToken]:
        return self.session.exec(
            select(UserPushToken).where(
                UserPushToken.token == token,
                UserPushToken.user_id == user_id,
            )
        ).first()

    def get_all_for_user(self, user_id: int) -> List[UserPushToken]:
        return self.session.exec(
            select(UserPushToken).where(UserPushToken.user_id == user_id)
        ).all()

    def add_token(self, user_id: int, token: str, platform: Optional[str]) -> UserPushToken:
        push_token = UserPushToken(user_id=user_id, token=token, platform=platform)
        self.session.add(push_token)
        return push_token

    def update_token(self, existing: UserPushToken, user_id: int, platform: Optional[str]) -> UserPushToken:
        existing.user_id = user_id
        existing.platform = platform
        existing.updated_at = datetime.utcnow()
        self.session.add(existing)
        return existing

    def delete_token(self, token_obj: UserPushToken) -> None:
        self.session.delete(token_obj)
