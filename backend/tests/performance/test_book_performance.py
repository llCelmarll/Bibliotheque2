"""
Tests de performance pour les endpoints de gestion des livres.
Mesure les performances CRUD des livres.
"""
import random
from locust import task
from .base_user import BibliothequeUser


class BookPerformanceUser(BibliothequeUser):
    """Tests de performance pour la gestion des livres."""
    
    def on_start(self):
        """Initialiser avec quelques livres de test."""
        super().on_start()
        
        # Créer quelques livres initiaux pour les tests
        for _ in range(3):
            self.create_test_book()
    
    @task(5)
    def test_list_books_performance(self):
        """Test de performance de la liste des livres."""
        with self.client.get("/books", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"List books failed: {response.text}")
    
    @task(3)
    def test_create_book_performance(self):
        """Test de performance de création de livre."""
        book = self.create_test_book()
        if book:
            # Succès géré dans create_test_book
            pass
    
    @task(2)
    def test_get_book_performance(self):
        """Test de performance de récupération d'un livre."""
        if not self.books:
            return
            
        book_id = random.choice(self.books)["id"]
        
        with self.client.get(f"/books/{book_id}", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Get book failed: {response.text}")
    
    @task(1)
    def test_update_book_performance(self):
        """Test de performance de mise à jour de livre."""
        if not self.books:
            return
            
        book = random.choice(self.books)
        book_id = book["id"]
        
        update_payload = {
            "title": f"Updated {book['title']} {random.randint(1, 1000)}",
            "page_count": random.randint(100, 800)
        }
        
        with self.client.put(f"/books/{book_id}", 
                             json=update_payload,
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Update book failed: {response.text}")
    
    @task(1)
    def test_search_books_performance(self):
        """Test de performance de recherche de livres."""
        search_terms = ["Python", "Java", "Test", "Book", "Programming"]
        query = random.choice(search_terms)
        
        with self.client.get(f"/books/search?q={query}", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Search books failed: {response.text}")


if __name__ == "__main__":
    # Pour exécuter directement ce fichier
    import os
    os.system("locust -f tests/performance/test_book_performance.py --host=http://localhost:8000")