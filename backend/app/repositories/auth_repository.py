from typing import Optional

from sqlmodel import Session, select

from app.models.email_verification_token_model import EmailVerificationToken
from app.models.user_model import User


class AuthRepository:
    """Repository pour les opérations de données liées à l'authentification
    (credentials, tokens de vérification email). Périmètre distinct d'AccountRepository
    (profil/RGPD) : ici, tout ce qui concerne la création de compte et la connexion."""

    def __init__(self, session: Session):
        self.session = session

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.session.exec(select(User).where(User.email == email)).first()

    def get_user_by_id(self, user_id) -> Optional[User]:
        return self.session.get(User, user_id)

    def add_user(self, user: User) -> User:
        self.session.add(user)
        return user

    def get_verification_token(self, token: str) -> Optional[EmailVerificationToken]:
        return self.session.exec(
            select(EmailVerificationToken).where(EmailVerificationToken.token == token)
        ).first()

    def list_unused_verification_tokens(self, user_id: int) -> list:
        return self.session.exec(
            select(EmailVerificationToken).where(
                EmailVerificationToken.user_id == user_id,
                EmailVerificationToken.used == False,
            )
        ).all()

    def add_verification_token(self, token: EmailVerificationToken) -> EmailVerificationToken:
        self.session.add(token)
        return token

    def mark_verification_token_used(self, token: EmailVerificationToken) -> EmailVerificationToken:
        token.used = True
        self.session.add(token)
        return token

    def update_user(self, user: User) -> User:
        self.session.add(user)
        return user
