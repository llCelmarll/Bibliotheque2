"""
Test de charge mixte simulant un usage réaliste de l'application.
Combine authentification, gestion de livres et scanning.
"""
import random
from locust import task, TaskSet
from .base_user import BibliothequeUser


class MixedWorkflow(TaskSet):
    """Workflow mixte pour simuler un usage réel."""
    
    @task(10)
    def browse_books(self):
        """Navigation dans la liste des livres."""
        self.client.get("/books", headers=self.parent.get_auth_headers())
    
    @task(5)
    def search_books(self):
        """Recherche de livres."""
        search_terms = ["Python", "Programming", "Science", "Fiction", "History"]
        query = random.choice(search_terms)
        self.client.get(f"/books/search?q={query}", headers=self.parent.get_auth_headers())
    
    @task(3)
    def scan_isbn(self):
        """Scanner un ISBN."""
        test_isbns = ["9780134685991", "9781617294938", "9780135957059"]
        isbn = random.choice(test_isbns)
        self.client.get(f"/scan/isbn/{isbn}", headers=self.parent.get_auth_headers())
    
    @task(2)
    def create_book(self):
        """Créer un nouveau livre."""
        self.parent.create_test_book()
    
    @task(1)
    def view_book_details(self):
        """Voir les détails d'un livre."""
        if self.parent.books:
            book_id = random.choice(self.parent.books)["id"]
            self.client.get(f"/books/{book_id}", headers=self.parent.get_auth_headers())


class RealUserWorkflow(BibliothequeUser):
    """Utilisateur simulant un workflow réaliste."""
    
    tasks = [MixedWorkflow]
    weight = 1  # Poids relatif de ce type d'utilisateur
    
    def on_start(self):
        """Initialisation avec quelques livres."""
        super().on_start()
        
        # Créer 2-5 livres initiaux
        for _ in range(random.randint(2, 5)):
            self.create_test_book()


if __name__ == "__main__":
    # Pour exécuter directement ce fichier
    import os
    os.system("locust -f tests/performance/test_mixed_workflow.py --host=http://localhost:8000 --users=10 --spawn-rate=2")