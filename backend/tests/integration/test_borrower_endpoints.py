"""
Tests d'intégration pour les endpoints de gestion des emprunteurs.
Focus sur l'isolation des données par utilisateur.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user
from app.models.Borrower import Borrower


def create_test_borrower(session: Session, owner_id: int, name: str = "Test Borrower", **kwargs) -> Borrower:
    """Helper pour créer un emprunteur de test."""
    borrower_data = {
        "name": name,
        "owner_id": owner_id,
        **kwargs
    }
    borrower = Borrower(**borrower_data)
    session.add(borrower)
    session.commit()
    session.refresh(borrower)
    return borrower


@pytest.mark.integration
@pytest.mark.borrowers
class TestBorrowerEndpoints:
    """Tests des endpoints de gestion des emprunteurs."""

    def test_create_borrower_success(self, authenticated_client: TestClient):
        """Test de création d'emprunteur réussie."""
        borrower_data = {
            "name": "Marie Dupont",
            "email": "marie@example.com",
            "phone": "0123456789",
            "notes": "Amie de confiance"
        }

        response = authenticated_client.post("/borrowers", json=borrower_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == borrower_data["name"]
        assert data["email"] == borrower_data["email"]
        assert data["phone"] == borrower_data["phone"]
        assert "id" in data
        assert "created_at" in data

    def test_create_borrower_duplicate_name(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création d'emprunteur avec nom existant (doit échouer)."""
        # Créer un emprunteur existant
        create_test_borrower(session, test_user.id, name="Jean Martin")

        # Essayer de créer un doublon
        borrower_data = {"name": "Jean Martin"}
        response = authenticated_client.post("/borrowers", json=borrower_data)

        assert response.status_code == 409
        assert "existe déjà" in response.json()["detail"]

    def test_create_borrower_unauthenticated(self, client: TestClient):
        """Test de création sans authentification."""
        borrower_data = {"name": "Test"}
        response = client.post("/borrowers", json=borrower_data)

        assert response.status_code == 403

    def test_get_borrowers(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération de tous les emprunteurs."""
        # Créer des emprunteurs pour l'utilisateur de test
        b1 = create_test_borrower(session, test_user.id, name="Borrower 1")
        b2 = create_test_borrower(session, test_user.id, name="Borrower 2")

        # Créer un emprunteur pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_borrower = create_test_borrower(session, other_user.id, name="Other Borrower")

        response = authenticated_client.get("/borrowers")

        assert response.status_code == 200
        borrowers = response.json()

        # Doit contenir seulement les emprunteurs de l'utilisateur authentifié
        assert len(borrowers) == 2
        names = [b["name"] for b in borrowers]
        assert "Borrower 1" in names
        assert "Borrower 2" in names
        assert "Other Borrower" not in names

    def test_get_borrower_by_id(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un emprunteur par ID."""
        borrower = create_test_borrower(session, test_user.id, name="My Borrower")

        response = authenticated_client.get(f"/borrowers/{borrower.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == borrower.id
        assert data["name"] == "My Borrower"

    def test_get_borrower_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un emprunteur d'un autre utilisateur (doit échouer)."""
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_borrower = create_test_borrower(session, other_user.id, name="Other Borrower")

        response = authenticated_client.get(f"/borrowers/{other_borrower.id}")

        assert response.status_code == 404
        assert "introuvable" in response.json()["detail"]

    def test_update_borrower(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un emprunteur."""
        borrower = create_test_borrower(session, test_user.id, name="Original Name")

        update_data = {
            "name": "Updated Name",
            "email": "updated@example.com"
        }

        response = authenticated_client.put(f"/borrowers/{borrower.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["email"] == "updated@example.com"

    def test_update_borrower_duplicate_name(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour avec un nom déjà existant."""
        b1 = create_test_borrower(session, test_user.id, name="Borrower 1")
        b2 = create_test_borrower(session, test_user.id, name="Borrower 2")

        # Essayer de renommer b2 avec le nom de b1
        update_data = {"name": "Borrower 1"}
        response = authenticated_client.put(f"/borrowers/{b2.id}", json=update_data)

        assert response.status_code == 409

    def test_delete_borrower(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un emprunteur."""
        borrower = create_test_borrower(session, test_user.id, name="To Delete")

        response = authenticated_client.delete(f"/borrowers/{borrower.id}")

        assert response.status_code == 204

        # Vérifier qu'il n'existe plus
        response = authenticated_client.get(f"/borrowers/{borrower.id}")
        assert response.status_code == 404

    def test_search_borrowers(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de recherche fuzzy d'emprunteurs."""
        create_test_borrower(session, test_user.id, name="Marie Dupont")
        create_test_borrower(session, test_user.id, name="Marc Durand")
        create_test_borrower(session, test_user.id, name="Sophie Martin")

        # Recherche par "Mar"
        response = authenticated_client.get("/borrowers/search?query=Mar")

        assert response.status_code == 200
        results = response.json()
        assert len(results) >= 2  # Marie et Marc
        names = [r["name"] for r in results]
        assert "Marie Dupont" in names
        assert "Marc Durand" in names
