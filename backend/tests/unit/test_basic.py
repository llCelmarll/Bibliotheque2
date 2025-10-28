"""
Tests de base pour vérifier la configuration pytest.
"""
import pytest
from sqlmodel import Session
from fastapi.testclient import TestClient

from app.models.User import User


@pytest.mark.unit
def test_pytest_working():
    """Test basique pour vérifier que pytest fonctionne."""
    assert True


@pytest.mark.unit 
def test_database_fixture(session: Session):
    """Test pour vérifier que la fixture de base de données fonctionne."""
    assert session is not None
    
    # Test basique d'insertion
    user = User(
        email="test@example.com",
        username="testuser", 
        hashed_password="hashedpassword",
        is_active=True
    )
    session.add(user)
    session.commit()
    
    # Vérifier que l'utilisateur a été créé
    assert user.id is not None


@pytest.mark.unit
def test_client_fixture(client: TestClient):
    """Test pour vérifier que la fixture client fonctionne."""
    assert client is not None
    
    # Test de l'endpoint de santé (s'il existe)
    # Sinon, tester un endpoint qui existe
    response = client.get("/")
    # Le code de retour dépend de votre configuration
    assert response.status_code in [200, 404]  # 404 si pas de route racine définie