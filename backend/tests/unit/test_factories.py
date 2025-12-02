"""
Tests pour valider le bon fonctionnement des factories.
"""
import pytest
from tests.factories import UserFactory, BookFactory, AuthorFactory, PublisherFactory, GenreFactory


@pytest.mark.unit
class TestFactories:
    """Tests pour valider les factories."""
    
    def test_user_factory(self):
        """Test de création d'utilisateur avec UserFactory."""
        user = UserFactory()
        
        assert user.email is not None
        assert "@" in user.email
        assert user.username is not None
        assert len(user.username) > 0
        assert user.hashed_password is not None
        assert user.is_active is True
    
    def test_book_factory(self):
        """Test de création de livre avec BookFactory."""
        book = BookFactory(owner_id=1)
        
        assert book.title is not None
        assert len(book.title) > 0
        assert book.isbn is not None
        assert len(book.isbn) == 13  # ISBN-13 sans tirets
        assert book.owner_id == 1
        assert book.page_count >= 50
        assert book.page_count <= 1000
        assert book.created_at is not None
    
    def test_author_factory(self):
        """Test de création d'auteur avec AuthorFactory."""
        author = AuthorFactory(owner_id=1)

        assert author.name is not None
        assert len(author.name) > 0
        assert author.owner_id == 1
    
    def test_publisher_factory(self):
        """Test de création d'éditeur avec PublisherFactory."""
        publisher = PublisherFactory(owner_id=1)

        assert publisher.name is not None
        assert len(publisher.name) > 0
        assert publisher.owner_id == 1
    
    def test_genre_factory(self):
        """Test de création de genre avec GenreFactory."""
        genre = GenreFactory(owner_id=1)

        assert genre.name is not None
        assert len(genre.name) > 0
        assert genre.owner_id == 1
    
    def test_factory_with_custom_values(self):
        """Test de factory avec valeurs personnalisées."""
        custom_user = UserFactory(
            email="custom@test.com",
            username="customuser",
            is_active=False
        )
        
        assert custom_user.email == "custom@test.com"
        assert custom_user.username == "customuser"
        assert custom_user.is_active is False
    
    def test_factory_batch_creation(self):
        """Test de création en lot avec les factories."""
        users = [UserFactory() for _ in range(3)]
        books = [BookFactory(owner_id=1) for _ in range(5)]
        
        assert len(users) == 3
        assert len(books) == 5
        assert all(user.email is not None for user in users)
        assert all(book.owner_id == 1 for book in books)
        
        # Vérifier que les données sont différentes
        emails = [user.email for user in users]
        assert len(set(emails)) == 3  # Tous les emails sont uniques