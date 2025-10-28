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
            "password": "testpassword123",
            "confirm_password": "testpassword123"
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
            "password": "testpassword123",
            "confirm_password": "testpassword123"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "Un compte avec cet email existe déjà" in response.json()["detail"]
    
    def test_login_success(self, client: TestClient, session: Session):
        """Test de connexion réussie."""
        # Créer un utilisateur de test
        password = "testpassword123"
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


@pytest.mark.unit
@pytest.mark.auth
class TestAuthService:
    """Tests unitaires du service d'authentification."""
    
    def test_password_hashing(self):
        """Test du hachage de mot de passe."""
        password = "testpassword123"
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