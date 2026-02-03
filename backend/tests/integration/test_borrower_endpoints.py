"""
Tests d'intégration pour les endpoints de gestion des contacts.
Focus sur l'isolation des données par utilisateur.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user
from app.models.Contact import Contact


def create_test_contact(session: Session, owner_id: int, name: str = "Test Contact", **kwargs) -> Contact:
    """Helper pour créer un contact de test."""
    contact_data = {
        "name": name,
        "owner_id": owner_id,
        **kwargs
    }
    contact = Contact(**contact_data)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@pytest.mark.integration
@pytest.mark.contacts
class TestContactEndpoints:
    """Tests des endpoints de gestion des contacts."""

    def test_create_contact_success(self, authenticated_client: TestClient):
        """Test de création de contact réussie."""
        contact_data = {
            "name": "Marie Dupont",
            "email": "marie@example.com",
            "phone": "0123456789",
            "notes": "Amie de confiance"
        }

        response = authenticated_client.post("/contacts", json=contact_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == contact_data["name"]
        assert data["email"] == contact_data["email"]
        assert data["phone"] == contact_data["phone"]
        assert "id" in data
        assert "created_at" in data

    def test_create_contact_duplicate_name(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création de contact avec nom existant (doit échouer)."""
        # Créer un contact existant
        create_test_contact(session, test_user.id, name="Jean Martin")

        # Essayer de créer un doublon
        contact_data = {"name": "Jean Martin"}
        response = authenticated_client.post("/contacts", json=contact_data)

        assert response.status_code == 409
        assert "existe déjà" in response.json()["detail"]

    def test_create_contact_unauthenticated(self, client: TestClient):
        """Test de création sans authentification."""
        contact_data = {"name": "Test"}
        response = client.post("/contacts", json=contact_data)

        assert response.status_code == 403

    def test_get_contacts(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération de tous les contacts."""
        # Créer des contacts pour l'utilisateur de test
        b1 = create_test_contact(session, test_user.id, name="Contact 1")
        b2 = create_test_contact(session, test_user.id, name="Contact 2")

        # Créer un contact pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_contact = create_test_contact(session, other_user.id, name="Other Contact")

        response = authenticated_client.get("/contacts")

        assert response.status_code == 200
        contacts = response.json()

        # Doit contenir seulement les contacts de l'utilisateur authentifié
        assert len(contacts) == 2
        names = [b["name"] for b in contacts]
        assert "Contact 1" in names
        assert "Contact 2" in names
        assert "Other Contact" not in names

    def test_get_contact_by_id(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un contact par ID."""
        contact = create_test_contact(session, test_user.id, name="My Contact")

        response = authenticated_client.get(f"/contacts/{contact.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == contact.id
        assert data["name"] == "My Contact"

    def test_get_contact_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un contact d'un autre utilisateur (doit échouer)."""
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_contact = create_test_contact(session, other_user.id, name="Other Contact")

        response = authenticated_client.get(f"/contacts/{other_contact.id}")

        assert response.status_code == 404
        assert "introuvable" in response.json()["detail"]

    def test_update_contact(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un contact."""
        contact = create_test_contact(session, test_user.id, name="Original Name")

        update_data = {
            "name": "Updated Name",
            "email": "updated@example.com"
        }

        response = authenticated_client.put(f"/contacts/{contact.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["email"] == "updated@example.com"

    def test_update_contact_duplicate_name(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour avec un nom déjà existant."""
        b1 = create_test_contact(session, test_user.id, name="Contact 1")
        b2 = create_test_contact(session, test_user.id, name="Contact 2")

        # Essayer de renommer b2 avec le nom de b1
        update_data = {"name": "Contact 1"}
        response = authenticated_client.put(f"/contacts/{b2.id}", json=update_data)

        assert response.status_code == 409

    def test_delete_contact(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un contact."""
        contact = create_test_contact(session, test_user.id, name="To Delete")

        response = authenticated_client.delete(f"/contacts/{contact.id}")

        assert response.status_code == 204

        # Vérifier qu'il n'existe plus
        response = authenticated_client.get(f"/contacts/{contact.id}")
        assert response.status_code == 404

    def test_search_contacts(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de recherche fuzzy de contacts."""
        create_test_contact(session, test_user.id, name="Marie Dupont")
        create_test_contact(session, test_user.id, name="Marc Durand")
        create_test_contact(session, test_user.id, name="Sophie Martin")

        # Recherche par "Mar"
        response = authenticated_client.get("/contacts/search?query=Mar")

        assert response.status_code == 200
        results = response.json()
        assert len(results) >= 2  # Marie et Marc
        names = [r["name"] for r in results]
        assert "Marie Dupont" in names
        assert "Marc Durand" in names
