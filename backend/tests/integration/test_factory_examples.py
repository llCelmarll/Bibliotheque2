"""
Exemples d'utilisation de Factory Boy dans les tests d'intégration.
"""
import pytest
from fastapi.testclient import TestClient
from tests.factories import UserFactory, BookFactory


@pytest.mark.integration 
@pytest.mark.books
class TestFactoryIntegration:
    """Exemples d'utilisation des factories dans les tests d'intégration."""
    
    def test_create_book_with_factory(self, authenticated_client, test_user):
        """Exemple : créer un livre en utilisant Factory Boy."""
        # Générer des données de livre avec Factory Boy
        book_data = BookFactory.build(owner_id=test_user.id)
        
        book_payload = {
            "title": book_data.title,
            "isbn": book_data.isbn,
            "published_date": str(book_data.published_date),
            "page_count": book_data.page_count,
            "barcode": book_data.barcode,
            "authors": ["Test Author"],
            "publisher": "Test Publisher"
        }
        
        response = authenticated_client.post("/books", json=book_payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == book_data.title
        assert data["isbn"] == book_data.isbn
    
    def test_create_multiple_books_with_factory(self, authenticated_client, test_user):
        """Exemple : créer plusieurs livres avec des données variées."""
        # Générer 3 livres différents
        books_data = [BookFactory.build(owner_id=test_user.id) for _ in range(3)]
        
        created_books = []
        for book_data in books_data:
            book_payload = {
                "title": book_data.title,
                "isbn": book_data.isbn,
                "authors": ["Generated Author"],
                "publisher": "Generated Publisher"
            }
            
            response = authenticated_client.post("/books", json=book_payload)
            assert response.status_code == 201
            created_books.append(response.json())
        
        # Vérifier que tous les livres sont différents
        titles = [book["title"] for book in created_books]
        assert len(set(titles)) == 3  # Tous les titres sont uniques
        
        isbns = [book["isbn"] for book in created_books]
        assert len(set(isbns)) == 3  # Tous les ISBNs sont uniques
    
    def test_user_factory_integration(self, client):
        """Exemple : utilisation de UserFactory pour créer des utilisateurs de test."""
        # Créer un utilisateur avec des données réalistes
        user_data = UserFactory.build()

        # Utiliser un email de la whitelist pour que le test passe
        test_email = "factorytest@example.com"

        register_payload = {
            "email": test_email,
            "username": user_data.username,
            "password": "TestPassword123",
            "confirm_password": "TestPassword123"
        }
        
        response = client.post("/auth/register", json=register_payload)
        
        assert response.status_code == 200  # Registration retourne 200
        data = response.json()
        assert data["user"]["email"] == test_email
        assert data["user"]["username"] == user_data.username
        assert "token" in data  # Vérifier la présence du token