"""
Factory pour créer des utilisateurs de test.
"""
import factory
from factory import Faker
from passlib.context import CryptContext
from app.models.User import User

# Hash de "testpassword123" pour éviter les dépendances
TEST_PASSWORD_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"

class UserFactory(factory.Factory):
    """Factory pour créer des utilisateurs de test."""
    
    class Meta:
        model = User
    
    email = Faker('email')
    username = Faker('user_name')
    hashed_password = TEST_PASSWORD_HASH
    is_active = True