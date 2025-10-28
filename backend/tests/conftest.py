"""
Configuration globale pour les tests pytest.
"""
import asyncio
import pytest
from typing import Generator, AsyncGenerator
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from httpx import AsyncClient
import tempfile
import os

from app.main import app as main_app
from app.db import get_session
from app.services.auth_service import get_current_user
from app.models.User import User
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre

# Import des factories (commenté temporairement)
# from tests.factories.user_factory import UserFactory
# from tests.factories.book_factory import BookFactory


@pytest.fixture(scope="session")
def anyio_backend():
    """Configuration backend pour anyio."""
    return "asyncio"


@pytest.fixture(scope="function")
def test_db():
    """Base de données SQLite en mémoire pour les tests."""
    # Utiliser une base de données en mémoire (plus rapide et pas de problème de fichier)
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False  # Mettre à True pour voir les requêtes SQL
    )
    
    # Créer les tables
    SQLModel.metadata.create_all(engine)
    
    yield engine


@pytest.fixture(scope="function")
def session(test_db) -> Generator[Session, None, None]:
    """Session de base de données pour les tests."""
    with Session(test_db) as session:
        yield session


@pytest.fixture(scope="function")
def client(session: Session) -> Generator[TestClient, None, None]:
    """Client de test FastAPI."""
    # Override de la dépendance de session
    def get_test_session():
        return session
    
    main_app.dependency_overrides[get_session] = get_test_session
    
    with TestClient(main_app) as test_client:
        yield test_client
    
    # Nettoyage des overrides
    main_app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def async_client(session: Session) -> AsyncGenerator[AsyncClient, None]:
    """Client HTTP asynchrone pour les tests."""
    # Override de la dépendance de session
    def get_test_session():
        return session
    
    main_app.dependency_overrides[get_session] = get_test_session
    
    async with AsyncClient(app=main_app, base_url="http://test") as async_client:
        yield async_client
    
    # Nettoyage des overrides
    main_app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(session: Session) -> User:
    """Utilisateur de test."""
    from app.services.auth_service import hash_password
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=hash_password("testpassword123"),
        is_active=True
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(scope="function")
def authenticated_client(client: TestClient, test_user: User) -> TestClient:
    """Client authentifié avec un utilisateur de test."""
    app = client.app
    
    # Override pour retourner directement notre utilisateur de test
    def get_test_user():
        return test_user
    
    app.dependency_overrides[get_current_user] = get_test_user
    
    return client


@pytest.fixture(scope="function")
async def authenticated_async_client(async_client: AsyncClient, test_user: User) -> AsyncClient:
    """Client async authentifié avec un utilisateur de test."""
    app = async_client._transport.app  # type: ignore
    
    # Override pour retourner directement notre utilisateur de test
    def get_test_user():
        return test_user
    
    app.dependency_overrides[get_current_user] = get_test_user
    
    return async_client


@pytest.fixture(scope="function")
def test_book(session: Session, test_user: User) -> Book:
    """Livre de test appartenant à l'utilisateur de test."""
    book = Book(
        title="Test Book",
        isbn="9781234567890",
        owner_id=test_user.id
    )
    session.add(book)
    session.commit()
    session.refresh(book)
    return book


# Fixtures pour nettoyer la base entre les tests
@pytest.fixture(autouse=True)
def clean_db(session: Session):
    """Nettoie la base de données avant chaque test."""
    # Cette fixture s'exécute automatiquement avant chaque test
    yield  # Le test s'exécute ici
    
    # Nettoyage après le test
    session.rollback()
    for table in reversed(SQLModel.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()


# Helpers pour les tests
def create_test_user(session: Session, **kwargs) -> User:
    """Helper pour créer un utilisateur de test avec des paramètres personnalisés."""
    from app.services.auth_service import hash_password
    
    defaults = {
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": hash_password("testpassword123"),
        "is_active": True
    }
    defaults.update(kwargs)
    
    user = User(**defaults)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def create_test_book(session: Session, owner_id: int, title: str = "Test Book", isbn: str = None, barcode: str = None) -> Book:
    """Helper pour créer un livre de test avec des paramètres personnalisés."""
    book_data = {
        "title": title,
        "isbn": isbn or "9781234567890",
        "owner_id": owner_id
    }
    
    if barcode:
        book_data["barcode"] = barcode
    
    book = Book(**book_data)
    session.add(book)
    session.commit()
    session.refresh(book)
    return book