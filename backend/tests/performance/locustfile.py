"""Point d'entrée Locust pour les tests de performance.
Usage (depuis backend/): locust -f tests/performance/locustfile.py --host=http://localhost:8000 --headless --users=10 --spawn-rate=2 --run-time=2m
"""
from tests.performance.test_book_performance import BookPerformanceUser
from tests.performance.test_auth_performance import AuthPerformanceUser
