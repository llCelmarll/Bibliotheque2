"""
Tests de performance pour les endpoints de scanning ISBN.
Mesure les performances des requêtes aux APIs externes.
"""
import random
from locust import task
from .base_user import BibliothequeUser


class ScanPerformanceUser(BibliothequeUser):
    """Tests de performance pour le scanning ISBN."""
    
    # ISBNs de test réalistes
    TEST_ISBNS = [
        "9780134685991",  # Python Programming
        "9781617294938",  # Spring in Action
        "9780135957059",  # Architecture Patterns with Python
        "9781492040343",  # Designing Data-Intensive Applications
        "9780596527068",  # JavaScript: The Good Parts
        "9781449373320",  # Designing APIs with Swagger
        "9781617295270",  # Kafka in Action
        "9781491950296",  # Building Microservices
        "9780134757599",  # Refactoring
        "9781492032649",  # Architecture Patterns
    ]
    
    @task(3)
    def test_scan_existing_isbn_performance(self):
        """Test de performance de scan d'ISBN existant."""
        isbn = random.choice(self.TEST_ISBNS)
        
        with self.client.get(f"/scan/isbn/{isbn}", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code in [200, 404]:  # 404 acceptable si livre pas dans la DB
                response.success()
            else:
                response.failure(f"ISBN scan failed: {response.text}")
    
    @task(2)
    def test_scan_barcode_performance(self):
        """Test de performance de scan de code-barres."""
        # Générer un code-barres EAN-13 valide
        barcode = f"978{random.randint(1000000000, 9999999999)}"
        
        with self.client.get(f"/scan/barcode/{barcode}", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code in [200, 404]:  # 404 acceptable
                response.success()
            else:
                response.failure(f"Barcode scan failed: {response.text}")
    
    @task(1)
    def test_scan_invalid_isbn_performance(self):
        """Test de performance avec ISBN invalide."""
        invalid_isbn = f"invalid{random.randint(1000, 9999)}"
        
        with self.client.get(f"/scan/isbn/{invalid_isbn}", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code in [400, 422]:  # Erreur de validation attendue
                response.success()
            else:
                response.failure(f"Invalid ISBN should return 400/422: {response.text}")


if __name__ == "__main__":
    # Pour exécuter directement ce fichier
    import os
    os.system("locust -f tests/performance/test_scan_performance.py --host=http://localhost:8000")