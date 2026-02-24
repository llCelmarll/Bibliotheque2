"""
Tests d'intégration pour les endpoints de gestion de compte.
"""
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.PasswordResetToken import PasswordResetToken
from app.services.auth_service import hash_password
from tests.conftest import create_test_user


def create_reset_token(
    session: Session,
    user_id: int,
    *,
    used: bool = False,
    expired: bool = False,
) -> PasswordResetToken:
    """Helper : crée un token de reset en base."""
    token = PasswordResetToken(
        token=f"test-token-{user_id}-{used}-{expired}",
        user_id=user_id,
        expires_at=datetime.utcnow() + (timedelta(minutes=-1) if expired else timedelta(minutes=15)),
        used=used,
        created_at=datetime.utcnow(),
    )
    session.add(token)
    session.commit()
    session.refresh(token)
    return token


@pytest.mark.integration
class TestForgotPassword:
    """Tests de l'endpoint POST /account/forgot-password."""

    def test_existing_email_returns_generic_message(self, client: TestClient, session: Session):
        """Un email connu renvoie le message générique (HTTP 200)."""
        create_test_user(session, email="user@example.com")
        response = client.post("/account/forgot-password", json={"email": "user@example.com"})
        assert response.status_code == 200
        assert "lien" in response.json()["message"].lower()

    def test_unknown_email_returns_same_message(self, client: TestClient):
        """Un email inconnu renvoie le même message (anti-énumération)."""
        response = client.post("/account/forgot-password", json={"email": "unknown@example.com"})
        assert response.status_code == 200
        assert "lien" in response.json()["message"].lower()

    def test_creates_token_in_db(self, client: TestClient, session: Session):
        """Un token est bien créé en base pour un email existant."""
        user = create_test_user(session, email="user@example.com")
        client.post("/account/forgot-password", json={"email": "user@example.com"})
        token = session.exec(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
        ).first()
        assert token is not None
        assert token.used is False

    def test_previous_tokens_invalidated(self, client: TestClient, session: Session):
        """Les anciens tokens sont invalidés lors d'une nouvelle demande."""
        from app.utils.rate_limiter import rate_limiter
        rate_limiter.clear_attempts("testclient", "forgot-password")

        user = create_test_user(session, email="user@example.com")
        old_token = create_reset_token(session, user.id)

        client.post("/account/forgot-password", json={"email": "user@example.com"})

        session.refresh(old_token)
        assert old_token.used is True

    def test_rate_limit(self, client: TestClient):
        """Rate limit : 4e tentative retourne 429."""
        for _ in range(3):
            client.post("/account/forgot-password", json={"email": "x@example.com"})
        response = client.post("/account/forgot-password", json={"email": "x@example.com"})
        assert response.status_code == 429


@pytest.mark.integration
class TestResetPassword:
    """Tests de l'endpoint POST /account/reset-password."""

    def test_valid_token_changes_password(self, client: TestClient, session: Session):
        """Un token valide permet de changer le mot de passe."""
        user = create_test_user(session, email="user@example.com", hashed_password=hash_password("OldPass123"))
        token = create_reset_token(session, user.id)

        response = client.post("/account/reset-password", json={
            "token": token.token,
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })

        assert response.status_code == 200
        session.refresh(token)
        assert token.used is True

    def test_invalid_token_returns_400(self, client: TestClient):
        """Un token inconnu retourne 400."""
        response = client.post("/account/reset-password", json={
            "token": "invalid-token",
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })
        assert response.status_code == 400

    def test_expired_token_returns_400(self, client: TestClient, session: Session):
        """Un token expiré retourne 400."""
        user = create_test_user(session)
        token = create_reset_token(session, user.id, expired=True)

        response = client.post("/account/reset-password", json={
            "token": token.token,
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })
        assert response.status_code == 400
        assert "expiré" in response.json()["detail"]

    def test_already_used_token_returns_400(self, client: TestClient, session: Session):
        """Un token déjà utilisé retourne 400."""
        user = create_test_user(session)
        token = create_reset_token(session, user.id, used=True)

        response = client.post("/account/reset-password", json={
            "token": token.token,
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })
        assert response.status_code == 400
        assert "déjà été utilisé" in response.json()["detail"]

    def test_passwords_mismatch_returns_422(self, client: TestClient, session: Session):
        """Des mots de passe non identiques retournent 422."""
        user = create_test_user(session)
        token = create_reset_token(session, user.id)

        response = client.post("/account/reset-password", json={
            "token": token.token,
            "new_password": "NewPass456",
            "confirm_new_password": "Different789",
        })
        assert response.status_code == 422


@pytest.mark.integration
class TestChangePassword:
    """Tests de l'endpoint POST /account/change-password."""

    def test_success(self, authenticated_client: TestClient):
        """Changement de mot de passe réussi."""
        response = authenticated_client.post("/account/change-password", json={
            "current_password": "testpassword123",
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })
        assert response.status_code == 200

    def test_wrong_current_password(self, authenticated_client: TestClient):
        """Mauvais mot de passe actuel retourne 400."""
        response = authenticated_client.post("/account/change-password", json={
            "current_password": "wrongpassword",
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"]

    def test_same_password_returns_400(self, client: TestClient, session: Session):
        """Même mot de passe fort retourne 400."""
        from app.main import app as main_app
        from app.services.auth_service import get_current_user

        password = "StrongPass123"
        user = create_test_user(session, hashed_password=hash_password(password))

        def get_test_user():
            return user

        main_app.dependency_overrides[get_current_user] = get_test_user

        response = client.post("/account/change-password", json={
            "current_password": password,
            "new_password": password,
            "confirm_new_password": password,
        })

        main_app.dependency_overrides.pop(get_current_user, None)
        assert response.status_code == 400
        assert "différent" in response.json()["detail"]

    def test_unauthenticated_returns_403(self, client: TestClient):
        """Sans token retourne 403."""
        response = client.post("/account/change-password", json={
            "current_password": "old",
            "new_password": "NewPass456",
            "confirm_new_password": "NewPass456",
        })
        assert response.status_code == 403


@pytest.mark.integration
class TestUpdateProfile:
    """Tests de l'endpoint PATCH /account/profile."""

    def test_update_username(self, authenticated_client: TestClient, session: Session):
        """Changement de username réussi."""
        response = authenticated_client.patch("/account/profile", json={"username": "nouveau_nom"})
        assert response.status_code == 200
        assert response.json()["username"] == "nouveau_nom"

    def test_username_too_short_returns_400(self, authenticated_client: TestClient):
        """Username trop court retourne 400."""
        response = authenticated_client.patch("/account/profile", json={"username": "ab"})
        assert response.status_code == 400

    def test_email_not_whitelisted_returns_403(self, authenticated_client: TestClient):
        """Email non whitelisté retourne 403."""
        response = authenticated_client.patch("/account/profile", json={"email": "not-allowed@other.com"})
        assert response.status_code == 403

    def test_no_fields_returns_400(self, authenticated_client: TestClient):
        """Aucun champ fourni retourne 400."""
        response = authenticated_client.patch("/account/profile", json={})
        assert response.status_code == 400

    def test_unauthenticated_returns_403(self, client: TestClient):
        """Sans token retourne 403."""
        response = client.patch("/account/profile", json={"username": "test"})
        assert response.status_code == 403


@pytest.mark.integration
class TestDeleteAccount:
    """Tests de l'endpoint DELETE /account/."""

    def test_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Suppression de compte réussie."""
        response = authenticated_client.request("DELETE", "/account/", json={
            "password": "testpassword123",
            "confirmation": "SUPPRIMER",
        })
        assert response.status_code == 200
        from app.models.User import User
        user = session.get(User, test_user.id)
        assert user is None

    def test_wrong_password_returns_400(self, authenticated_client: TestClient):
        """Mauvais mot de passe retourne 400."""
        response = authenticated_client.request("DELETE", "/account/", json={
            "password": "wrongpassword",
            "confirmation": "SUPPRIMER",
        })
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"]

    def test_wrong_confirmation_returns_400(self, authenticated_client: TestClient):
        """Mauvais mot de confirmation retourne 400."""
        response = authenticated_client.request("DELETE", "/account/", json={
            "password": "testpassword123",
            "confirmation": "supprimer",
        })
        assert response.status_code == 400
        assert "SUPPRIMER" in response.json()["detail"]

    def test_unauthenticated_returns_403(self, client: TestClient):
        """Sans token retourne 403."""
        response = client.request("DELETE", "/account/", json={
            "password": "test",
            "confirmation": "SUPPRIMER",
        })
        assert response.status_code == 403
