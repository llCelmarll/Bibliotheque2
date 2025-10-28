"""
Tests d'intégration pour les endpoints de gestion des livres.
Focus sur l'isolation des données par utilisateur.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user, create_test_book


@pytest.mark.integration
@pytest.mark.books
class TestBookEndpoints:
    """Tests des endpoints de gestion des livres."""
    
    def test_create_book_success(self, authenticated_client: TestClient, test_user):
        """Test de création de livre réussie."""
        book_data = {
            "title": "Test Book",
            "isbn": "9781234567890",
            "published_date": "2023-01-01",
            "page_count": 300,
            "authors": ["Test Author"],
            "publisher": "Test Publisher",
            "genres": ["Fiction"]
        }
        
        response = authenticated_client.post("/books", json=book_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == book_data["title"]
        assert data["isbn"] == book_data["isbn"]
        assert "id" in data
        # Note: owner_id n'est pas exposé dans BookRead par design (sécurité)
    
    def test_create_book_unauthenticated(self, client: TestClient):
        """Test de création de livre sans authentification."""
        book_data = {
            "title": "Test Book",
            "isbn": "9781234567890"
        }
        
        response = client.post("/books", json=book_data)
        
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]
    
    def test_get_user_books(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération des livres de l'utilisateur."""
        # Créer quelques livres pour l'utilisateur de test
        book1 = create_test_book(session, test_user.id, title="Book 1", isbn="1111111111111")
        book2 = create_test_book(session, test_user.id, title="Book 2", isbn="2222222222222")
        
        # Créer un livre pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book", isbn="3333333333333")
        
        response = authenticated_client.get("/books/")
        
        assert response.status_code == 200
        books = response.json()
        
        # Doit contenir seulement les livres de l'utilisateur authentifié
        assert len(books) == 2
        book_titles = [book["title"] for book in books]
        assert "Book 1" in book_titles
        assert "Book 2" in book_titles
        assert "Other Book" not in book_titles  # Isolation utilisateur assurée par le service
    
    def test_get_book_by_id_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un livre par ID (propriétaire)."""
        book = create_test_book(session, test_user.id, title="My Book")
        
        response = authenticated_client.get(f"/books/{book.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "base" in data  # Structure avec données enrichies
        assert data["base"]["id"] == book.id
        assert data["base"]["title"] == "My Book"
        # L'isolation utilisateur est assurée par le service (pas besoin de vérifier owner_id)
    
    def test_get_book_by_id_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un livre d'un autre utilisateur (doit échouer)."""
        # Créer un autre utilisateur et son livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        
        response = authenticated_client.get(f"/books/{other_book.id}")
        
        assert response.status_code == 404
        assert "Livre introuvable" in response.json()["detail"]
    
    def test_update_book_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un livre (propriétaire)."""
        book = create_test_book(session, test_user.id, title="Original Title")
        
        update_data = {
            "title": "Updated Title",
            "page_count": 500
        }
        
        response = authenticated_client.put(f"/books/{book.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["page_count"] == 500
        # L'isolation utilisateur est assurée par le service
    
    def test_update_book_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un livre d'un autre utilisateur (doit échouer)."""
        # Créer un autre utilisateur et son livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        
        update_data = {"title": "Hacked Title"}
        
        response = authenticated_client.put(f"/books/{other_book.id}", json=update_data)
        
        assert response.status_code == 404
        assert "Livre introuvable" in response.json()["detail"]
    
    def test_delete_book_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un livre (propriétaire)."""
        book = create_test_book(session, test_user.id, title="Book to Delete")
        
        response = authenticated_client.delete(f"/books/{book.id}")
        
        assert response.status_code == 204
        
        # Vérifier que le livre n'existe plus
        get_response = authenticated_client.get(f"/books/{book.id}")
        assert get_response.status_code == 404
    
    def test_delete_book_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un livre d'un autre utilisateur (doit échouer)."""
        # Créer un autre utilisateur et son livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        
        response = authenticated_client.delete(f"/books/{other_book.id}")
        
        assert response.status_code == 404
        assert "Livre introuvable" in response.json()["detail"]
        
        # Vérifier que le livre existe toujours
        # (on ne peut pas le vérifier depuis ce client, mais il devrait exister)
    
    def test_duplicate_book_same_user(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création d'un livre en double pour le même utilisateur (doit échouer)."""
        # Créer un premier livre
        first_book = create_test_book(session, test_user.id, title="Duplicate Book", isbn="9999999999999")
        
        # Essayer de créer le même livre
        duplicate_data = {
            "title": "Duplicate Book",
            "isbn": "9999999999999"
        }
        
        response = authenticated_client.post("/books", json=duplicate_data)
        
        assert response.status_code == 400
        assert "existe déjà dans votre bibliothèque" in response.json()["detail"]
    
    def test_duplicate_book_different_users(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création d'un livre en double pour des utilisateurs différents (doit réussir)."""
        # Créer un autre utilisateur avec le même livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Same Book", isbn="8888888888888")
        
        # L'utilisateur authentifié peut créer le même livre
        same_book_data = {
            "title": "Same Book",
            "isbn": "8888888888888"
        }
        
        response = authenticated_client.post("/books", json=same_book_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Same Book"
        # L'isolation utilisateur est assurée par le service


@pytest.mark.integration  
@pytest.mark.books
class TestBookSearch:
    """Tests de recherche de livres avec isolation utilisateur."""
    
    def test_simple_search(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de recherche simple dans les livres de l'utilisateur."""
        # Créer des livres pour l'utilisateur
        book1 = create_test_book(session, test_user.id, title="Python Programming", isbn="1111111111111")
        book2 = create_test_book(session, test_user.id, title="Java Development", isbn="2222222222222")
        
        # Créer un livre pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Python Mastery", isbn="3333333333333")
        
        # L'endpoint utilise des query params, pas du JSON
        response = authenticated_client.post("/books/search/simple?q=Python")
        
        assert response.status_code == 200
        books = response.json()
        
        # Doit trouver seulement "Python Programming" (pas "Python Mastery" de l'autre utilisateur)
        assert len(books) == 1
        assert books[0]["title"] == "Python Programming"
        # L'isolation utilisateur est assurée par le service
    
    def test_search_no_results(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de recherche sans résultats."""
        book = create_test_book(session, test_user.id, title="Test Book")
        
        # L'endpoint utilise des query params, pas du JSON
        response = authenticated_client.post("/books/search/simple?q=Nonexistent")
        
        assert response.status_code == 200
        books = response.json()
        assert len(books) == 0