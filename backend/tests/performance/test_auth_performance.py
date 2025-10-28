"""
Tests de performance pour les endpoints d'authentification.
Mesure les performances de registration et login.
"""
import random
from locust import task
from .base_user import BibliothequeUser
from tests.factories import UserFactory


class AuthPerformanceUser(BibliothequeUser):
    """Tests de performance pour l'authentification."""
    
    @task(3)
    def test_login_performance(self):
        """Test de performance du login."""
        if not self.user_data:
            return
            
        login_payload = {
            "username": self.user_data["username"],
            "password": "testpassword123"
        }
        
        with self.client.post("/auth/login", data=login_payload, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Login failed: {response.text}")
    
    @task(1)
    def test_registration_performance(self):
        """Test de performance de l'enregistrement."""
        user_data = UserFactory.build()
        
        register_payload = {
            "email": user_data.email,
            "username": user_data.username,
            "password": "testpassword123",
            "confirm_password": "testpassword123"
        }
        
        with self.client.post("/auth/register", json=register_payload, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                # Éviter les erreurs de doublon
                if "already exists" in response.text:
                    response.success()
                else:
                    response.failure(f"Registration failed: {response.text}")
    
    @task(2)
    def test_protected_endpoint_performance(self):
        """Test de performance d'un endpoint protégé."""
        with self.client.get("/books", 
                             headers=self.get_auth_headers(),
                             catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Protected endpoint failed: {response.text}")


if __name__ == "__main__":
    # Pour exécuter directement ce fichier
    import os
    os.system("locust -f tests/performance/test_auth_performance.py --host=http://localhost:8000")