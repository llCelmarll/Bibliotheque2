"""
Tests d'intégration pour l'authentification.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.services.auth_service import hash_password, verify_password, AuthService
from tests.conftest import create_test_user


@pytest.mark.integration
@pytest.mark.auth
class TestAuthEndpoints:
    """Tests des endpoints d'authentification."""
    
    def test_register_user_success(self, client: TestClient, session: Session):
        """Test d'inscription réussie."""
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "TestPassword123",
            "confirm_password": "TestPassword123",
            "consent_accepted": True,
            "consent_version": "2026-07",
        }

        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "token" in data
        assert data["user"]["email"] == user_data["email"]
        assert data["user"]["username"] == user_data["username"]
        assert "id" in data["user"]
        assert "hashed_password" not in data["user"]  # Ne doit pas retourner le mot de passe
    
    def test_register_user_duplicate_email(self, client: TestClient, session: Session):
        """Test d'inscription avec email existant."""
        # Créer un utilisateur existant
        existing_user = create_test_user(session, email="test@example.com")
        
        user_data = {
            "email": "test@example.com",  # Même email
            "username": "differentuser",
            "password": "TestPassword123",
            "confirm_password": "TestPassword123",
            "consent_accepted": True,
            "consent_version": "2026-07",
        }

        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "Un compte avec cette adresse email existe déjà" in response.json()["detail"]
    
    def test_login_success(self, client: TestClient, session: Session):
        """Test de connexion réussie."""
        # Créer un utilisateur de test
        password = "TestPassword123"
        user = create_test_user(
            session, 
            email="test@example.com",
            hashed_password=hash_password(password)
        )
        
        login_data = {
            "username": "test@example.com",  # FastAPI OAuth2 utilise "username" pour l'email
            "password": password
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, client: TestClient, session: Session):
        """Test de connexion avec des identifiants invalides."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 401
        assert "Email ou mot de passe incorrect" in response.json()["detail"]
    
    def test_login_wrong_password(self, client: TestClient, session: Session):
        """Test de connexion avec mauvais mot de passe."""
        # Créer un utilisateur de test
        user = create_test_user(
            session, 
            email="test@example.com",
            hashed_password=hash_password("correctpassword")
        )
        
        login_data = {
            "username": "test@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 401
        assert "Email ou mot de passe incorrect" in response.json()["detail"]
    
    def test_protected_endpoint_without_token(self, client: TestClient):
        """Test d'accès à un endpoint protégé sans token."""
        response = client.get("/books/")  # Endpoint protégé
        
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]
    
    def test_protected_endpoint_with_valid_token(self, authenticated_client: TestClient):
        """Test d'accès à un endpoint protégé avec token valide."""
        response = authenticated_client.get("/books/")
        
        # Doit passer l'authentification (peut retourner 200 avec liste vide)
        assert response.status_code == 200


@pytest.mark.integration
@pytest.mark.auth
class TestConsentEndpoints:
    """Tests du système de versioning et suivi du consentement CGU."""

    def test_register_without_consent_rejected(self, client: TestClient, session: Session):
        """Inscription sans consentement → 422."""
        user_data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "TestPassword123",
            "confirm_password": "TestPassword123",
            "consent_accepted": False,
            "consent_version": "2026-07",
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422

    def test_register_with_consent_stores_version(self, client: TestClient, session: Session):
        """Inscription avec consentement → consent_version stockée en base."""
        from sqlmodel import select
        from app.models.User import User

        user_data = {
            "email": "consent@example.com",
            "username": "consentuser",
            "password": "TestPassword123",
            "confirm_password": "TestPassword123",
            "consent_accepted": True,
            "consent_version": "2026-07",
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 200

        user = session.exec(select(User).where(User.email == "consent@example.com")).first()
        assert user is not None
        assert user.consent_version == "2026-07"
        assert user.consent_accepted_at is not None

    def test_login_requires_consent_when_null(self, client: TestClient, session: Session):
        """Utilisateur sans consent_version → requires_consent_update: true."""
        from datetime import datetime
        password = "TestPassword123"
        create_test_user(
            session,
            email="noversion@example.com",
            hashed_password=hash_password(password),
            consent_version=None,
        )
        response = client.post("/auth/login", data={
            "username": "noversion@example.com",
            "password": password,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["requires_consent_update"] is True

    def test_login_requires_consent_when_outdated(self, client: TestClient, session: Session):
        """Utilisateur avec version obsolète → requires_consent_update: true."""
        password = "TestPassword123"
        create_test_user(
            session,
            email="outdated@example.com",
            hashed_password=hash_password(password),
            consent_version="2025-01",
        )
        response = client.post("/auth/login", data={
            "username": "outdated@example.com",
            "password": password,
        })
        assert response.status_code == 200
        assert response.json()["requires_consent_update"] is True

    def test_login_no_consent_update_when_current(self, client: TestClient, session: Session):
        """Utilisateur avec version à jour → requires_consent_update: false."""
        from app.config import CGU_VERSION
        password = "TestPassword123"
        create_test_user(
            session,
            email="current@example.com",
            hashed_password=hash_password(password),
            consent_version=CGU_VERSION,
        )
        response = client.post("/auth/login", data={
            "username": "current@example.com",
            "password": password,
        })
        assert response.status_code == 200
        assert response.json()["requires_consent_update"] is False

    def test_update_consent_stores_version(self, client: TestClient, session: Session, test_user):
        """POST /auth/consent met à jour consent_version en base."""
        from sqlmodel import select
        from app.models.User import User
        from app.config import CGU_VERSION

        # Obtenir un token valide
        login_resp = client.post("/auth/login", data={
            "username": test_user.email,
            "password": "testpassword123",
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]

        response = client.post("/auth/consent", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["consent_version"] == CGU_VERSION

        session.refresh(test_user)
        assert test_user.consent_version == CGU_VERSION
        assert test_user.consent_accepted_at is not None


@pytest.mark.unit
@pytest.mark.auth
class TestAuthService:
    """Tests unitaires du service d'authentification."""
    
    def test_password_hashing(self):
        """Test du hachage de mot de passe."""
        password = "TestPassword123"
        hashed = hash_password(password)
        
        assert hashed != password  # Le mot de passe est bien haché
        assert verify_password(password, hashed)  # La vérification fonctionne
        assert not verify_password("wrongpassword", hashed)  # Mauvais mot de passe rejeté
    
    def test_create_access_token(self, session: Session):
        """Test de création de token d'accès."""
        auth_service = AuthService(session)
        user_data = {"sub": "test@example.com", "user_id": 1}
        token = auth_service.create_access_token(data=user_data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0