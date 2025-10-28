"""
Factory pour créer des livres de test.
"""
import factory
from factory import Faker, SubFactory, LazyFunction
from datetime import datetime
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre


class AuthorFactory(factory.Factory):
    """Factory pour créer des auteurs de test."""
    
    class Meta:
        model = Author
    
    name = Faker('name')


class PublisherFactory(factory.Factory):
    """Factory pour créer des éditeurs de test."""
    
    class Meta:
        model = Publisher
    
    name = Faker('company')


class GenreFactory(factory.Factory):
    """Factory pour créer des genres de test."""
    
    class Meta:
        model = Genre
    
    name = Faker('word')


class BookFactory(factory.Factory):
    """Factory pour créer des livres de test."""
    
    class Meta:
        model = Book
    
    title = Faker('sentence', nb_words=4)
    isbn = Faker('isbn13')
    published_date = Faker('date_between', start_date='-50y', end_date='today')
    page_count = Faker('random_int', min=50, max=1000)
    barcode = Faker('ean13')
    cover_url = Faker('image_url')
    owner_id = factory.Sequence(lambda n: n + 1)  # Sera overridé dans les tests
    created_at = LazyFunction(datetime.utcnow)
    
    # Relations optionnelles
    # publisher = SubFactory(PublisherFactory)  # Commenté car optionnel