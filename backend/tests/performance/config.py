"""
Configuration et scripts de lancement pour les tests de performance.
"""

# Configuration par défaut pour les tests Locust
LOCUST_CONFIG = {
    "host": "http://localhost:8000",
    "users": 10,
    "spawn_rate": 2,
    "run_time": "2m",
    "headless": True,  # Mode sans interface par défaut
}

# Scénarios de test prédéfinis
SCENARIOS = {
    "auth_load": {
        "file": "test_auth_performance.py",
        "description": "Test de charge sur l'authentification",
        "users": 5,
        "spawn_rate": 1,
        "run_time": "1m"
    },
    
    "book_crud": {
        "file": "test_book_performance.py", 
        "description": "Test de charge sur les opérations CRUD des livres",
        "users": 10,
        "spawn_rate": 2,
        "run_time": "2m"
    },
    
    "scan_load": {
        "file": "test_scan_performance.py",
        "description": "Test de charge sur le scanning ISBN",
        "users": 3,  # Moins d'utilisateurs car appels API externes
        "spawn_rate": 1,
        "run_time": "1m"
    },
    
    "mixed_workflow": {
        "file": "test_mixed_workflow.py",
        "description": "Test de charge avec workflow mixte réaliste", 
        "users": 15,
        "spawn_rate": 3,
        "run_time": "3m"
    }
}