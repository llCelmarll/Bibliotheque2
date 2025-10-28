"""
Factory pour créer des utilisateurs de test.
"""
import factory
from factory import Faker
from app.models.User import User
from app.services.auth_service import get_password_hash


class UserFactory(factory.Factory):
    """Factory pour créer des utilisateurs de test."""
    
    class Meta:
        model = User
    
    email = Faker('email')
    username = Faker('user_name')
    hashed_password = factory.LazyAttribute(lambda obj: get_password_hash("testpassword123"))
    is_active = True