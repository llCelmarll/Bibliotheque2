"""
Classe de base pour les tests de performance Locust.
Contient les utilitaires communs pour l'authentification et les requêtes.
"""
import json
import random
from locust import HttpUser, task, between
from tests.factories import UserFactory, BookFactory


class BibliothequeUser(HttpUser):
    """Utilisateur de base pour les tests de performance."""
    
    wait_time = between(1, 3)  # Attendre 1-3 secondes entre les requêtes
    
    def on_start(self):
        """Méthode appelée au démarrage de chaque utilisateur."""
        self.token = None
        self.user_data = None
        self.books = []
        
        # Créer et authentifier un utilisateur
        self.register_and_login()
    
    def register_and_login(self):
        """Enregistrer un nouvel utilisateur et se connecter."""
        # Générer des données utilisateur uniques
        user_data = UserFactory.build()
        
        # Registration
        register_payload = {
            "email": user_data.email,
            "username": user_data.username,
            "password": "testpassword123",
            "confirm_password": "testpassword123"
        }
        
        with self.client.post("/auth/register", json=register_payload, catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.token = data["token"]["access_token"]
                self.user_data = data["user"]
                response.success()
            else:
                response.failure(f"Registration failed: {response.text}")
    
    def get_auth_headers(self):
        """Retourner les headers d'authentification."""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    def create_test_book(self):
        """Créer un livre de test et le retourner."""
        book_data = BookFactory.build()
        
        book_payload = {
            "title": book_data.title,
            "isbn": book_data.isbn,
            "authors": [f"Author {random.randint(1, 1000)}"],
            "publisher": f"Publisher {random.randint(1, 100)}"
        }
        
        with self.client.post("/books", 
                              json=book_payload, 
                              headers=self.get_auth_headers(),
                              catch_response=True) as response:
            if response.status_code == 201:
                book = response.json()
                self.books.append(book)
                response.success()
                return book
            else:
                response.failure(f"Book creation failed: {response.text}")
                return None