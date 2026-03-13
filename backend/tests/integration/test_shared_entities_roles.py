"""
Tests d'intégration pour la compartimentation des rôles sur les entités partagées.

Vérifie que :
- Tout utilisateur authentifié peut lire et créer des entités
- Seuls les modérateurs et admins peuvent modifier (PUT) et supprimer (DELETE)
- La suppression d'une entité utilisée par des livres nécessite un replacement_id
- La suppression avec replacement_id réassigne les FK et supprime l'entité
- Les entités sont visibles par tous les utilisateurs (partage global)
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.main import app as main_app
from app.services.auth_service import get_current_user, hash_password
from app.models.User import User
from app.models.Author import Author
from app.models.Genre import Genre
from app.models.Publisher import Publisher
from app.models.Series import Series
from app.models.Book import Book
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink
from app.models.BookSeriesLink import BookSeriesLink
from tests.conftest import create_test_book, create_test_user


# ---------------------------------------------------------------------------
# Helpers de création d'entités
# ---------------------------------------------------------------------------

def create_author(session: Session, name: str = "Stephen King") -> Author:
    author = Author(name=name)
    session.add(author)
    session.commit()
    session.refresh(author)
    return author


def create_genre(session: Session, name: str = "Fiction") -> Genre:
    genre = Genre(name=name)
    session.add(genre)
    session.commit()
    session.refresh(genre)
    return genre


def create_publisher(session: Session, name: str = "Gallimard") -> Publisher:
    publisher = Publisher(name=name)
    session.add(publisher)
    session.commit()
    session.refresh(publisher)
    return publisher


def create_series(session: Session, name: str = "Harry Potter") -> Series:
    series = Series(name=name)
    session.add(series)
    session.commit()
    session.refresh(series)
    return series


def make_user(session: Session, role: str, email: str, username: str) -> User:
    user = User(
        email=email,
        username=username,
        hashed_password=hash_password("testpassword123"),
        is_active=True,
        role=role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ---------------------------------------------------------------------------
# Fixtures de clients par rôle
# ---------------------------------------------------------------------------

@pytest.fixture
def user_client(client: TestClient, session: Session) -> TestClient:
    """Client authentifié avec le rôle 'user' (rôle par défaut)."""
    user = make_user(session, role="user", email="user@test.com", username="user_test")
    client.app.dependency_overrides[get_current_user] = lambda: user
    return client


@pytest.fixture
def moderator_client(client: TestClient, session: Session) -> TestClient:
    """Client authentifié avec le rôle 'moderator'."""
    user = make_user(session, role="moderator", email="mod@test.com", username="mod_test")
    client.app.dependency_overrides[get_current_user] = lambda: user
    return user, client


@pytest.fixture
def admin_client(client: TestClient, session: Session) -> TestClient:
    """Client authentifié avec le rôle 'admin'."""
    user = make_user(session, role="admin", email="admin@test.com", username="admin_test")
    client.app.dependency_overrides[get_current_user] = lambda: user
    return user, client


# ---------------------------------------------------------------------------
# Classe de base partagée entre les 4 entités
# ---------------------------------------------------------------------------

class SharedEntityRoleTests:
    """
    Mixin de tests communs à Author, Genre, Publisher, Series.
    Les sous-classes définissent :
      - endpoint      : str, ex "/authors"
      - create_entity : callable(session, name) -> entity
      - create_payload: dict avec au moins "name" pour POST
      - update_payload: callable(entity_id) -> dict pour PUT
    """
    endpoint: str
    create_entity = None
    create_payload: dict = {}

    def update_payload(self, entity_id: int) -> dict:
        return {"id": entity_id, "name": "Nouveau Nom"}

    # --- Lecture ---

    def test_get_all_authenticated(self, user_client, session):
        """Un user normal peut lister les entités."""
        self.create_entity(session, name="Entité A")
        response = user_client.get(self.endpoint)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_all_unauthenticated(self, client):
        """Sans token → 403."""
        response = client.get(self.endpoint)
        assert response.status_code == 403

    def test_search_authenticated(self, user_client, session):
        """La recherche retourne des résultats globaux."""
        self.create_entity(session, name="Unique Search Term XYZ")
        response = user_client.get(f"{self.endpoint}/search", params={"query": "Unique"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        names = [r["name"] for r in data["results"]]
        assert any("Unique" in n for n in names)

    # --- Création ---

    def test_create_as_user(self, user_client):
        """Un user normal peut créer une entité."""
        response = user_client.post(self.endpoint, json=self.create_payload)
        assert response.status_code == 200
        assert response.json()["name"] == self.create_payload["name"]

    def test_create_duplicate(self, user_client, session):
        """Créer un doublon → 409 Conflict."""
        self.create_entity(session, name=self.create_payload["name"])
        response = user_client.post(self.endpoint, json=self.create_payload)
        assert response.status_code == 409

    def test_create_unauthenticated(self, client):
        """Sans token → 403."""
        response = client.post(self.endpoint, json=self.create_payload)
        assert response.status_code == 403

    # --- Modification ---

    def test_update_as_user(self, user_client, session):
        """Un user normal ne peut pas modifier → 403."""
        entity = self.create_entity(session)
        response = user_client.put(self.endpoint, json=self.update_payload(entity.id))
        assert response.status_code == 403

    def test_update_as_moderator(self, moderator_client, session):
        """Un modérateur peut modifier → 200."""
        _user, client = moderator_client
        entity = self.create_entity(session)
        response = client.put(self.endpoint, json=self.update_payload(entity.id))
        assert response.status_code == 200
        assert response.json()["name"] == "Nouveau Nom"

    def test_update_as_admin(self, admin_client, session):
        """Un admin peut modifier → 200."""
        _user, client = admin_client
        entity = self.create_entity(session)
        response = client.put(self.endpoint, json=self.update_payload(entity.id))
        assert response.status_code == 200

    # --- Suppression ---

    def test_delete_as_user(self, user_client, session):
        """Un user normal ne peut pas supprimer → 403."""
        entity = self.create_entity(session)
        response = user_client.delete(f"{self.endpoint}/{entity.id}")
        assert response.status_code == 403

    def test_delete_unused_as_moderator(self, moderator_client, session):
        """Un modérateur peut supprimer une entité non utilisée → 200."""
        _user, client = moderator_client
        entity = self.create_entity(session)
        response = client.delete(f"{self.endpoint}/{entity.id}")
        assert response.status_code == 200

    def test_delete_nonexistent(self, moderator_client):
        """Supprimer une entité inexistante → 404."""
        _user, client = moderator_client
        response = client.delete(f"{self.endpoint}/99999")
        assert response.status_code == 404

    # --- Partage cross-utilisateur ---

    def test_entity_visible_to_other_user(self, session, client):
        """Une entité créée (en BDD) est visible par n'importe quel utilisateur."""
        # Créer directement en BDD (simule la création par un autre user)
        self.create_entity(session, name="Entité Partagée")

        # Un autre user se connecte et cherche l'entité
        other_user = make_user(session, role="user", email="other@test.com", username="other_test")
        client.app.dependency_overrides[get_current_user] = lambda: other_user

        response = client.get(f"{self.endpoint}/search", params={"query": "Partagée"})
        assert response.status_code == 200
        assert response.json()["total"] >= 1


# ---------------------------------------------------------------------------
# Implémentations concrètes : Author
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestAuthorRoles(SharedEntityRoleTests):
    endpoint = "/authors"
    create_payload = {"name": "Victor Hugo"}

    @staticmethod
    def create_entity(session: Session, name: str = "Albert Camus") -> Author:
        return create_author(session, name=name)

    def test_delete_used_without_replacement(self, moderator_client, session):
        """Supprimer un auteur utilisé par un livre sans replacement_id → 409."""
        _user, client = moderator_client
        author = create_author(session, name="Auteur Utilisé")
        user = make_user(session, role="user", email="bookowner@test.com", username="bookowner")
        book = create_test_book(session, owner_id=user.id, title="Mon Livre", isbn="1111111111111")
        # Lier le livre à l'auteur
        link = BookAuthorLink(book_id=book.id, author_id=author.id)
        session.add(link)
        session.commit()

        response = client.delete(f"/authors/{author.id}")
        assert response.status_code == 409
        assert "1" in response.json()["detail"]  # "utilisé par 1 livre(s)"

    def test_delete_used_with_replacement(self, moderator_client, session):
        """Supprimer un auteur utilisé avec replacement_id valide → 200, FK réassignées."""
        _user, client = moderator_client
        author_to_delete = create_author(session, name="Auteur À Supprimer")
        author_replacement = create_author(session, name="Auteur Remplacement")
        user = make_user(session, role="user", email="bowner2@test.com", username="bowner2")
        book = create_test_book(session, owner_id=user.id, title="Livre Lié", isbn="2222222222222")
        link = BookAuthorLink(book_id=book.id, author_id=author_to_delete.id)
        session.add(link)
        session.commit()

        response = client.delete(
            f"/authors/{author_to_delete.id}",
            params={"replacement_id": author_replacement.id}
        )
        assert response.status_code == 200

        # Vérifier que le lien pointe maintenant vers le remplacement
        session.expire_all()
        updated_link = session.get(BookAuthorLink, (book.id, author_replacement.id))
        assert updated_link is not None

    def test_delete_with_invalid_replacement(self, moderator_client, session):
        """Supprimer avec un replacement_id inexistant → 404."""
        _user, client = moderator_client
        author = create_author(session, name="Auteur Solo")
        user = make_user(session, role="user", email="bowner3@test.com", username="bowner3")
        book = create_test_book(session, owner_id=user.id, title="Livre Solo", isbn="3333333333333")
        link = BookAuthorLink(book_id=book.id, author_id=author.id)
        session.add(link)
        session.commit()

        response = client.delete(f"/authors/{author.id}", params={"replacement_id": 99999})
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Implémentations concrètes : Genre
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestGenreRoles(SharedEntityRoleTests):
    endpoint = "/genres"
    create_payload = {"name": "Science-Fiction"}

    @staticmethod
    def create_entity(session: Session, name: str = "Policier") -> Genre:
        return create_genre(session, name=name)

    def test_delete_used_without_replacement(self, moderator_client, session):
        """Supprimer un genre utilisé sans replacement_id → 409."""
        _user, client = moderator_client
        genre = create_genre(session, name="Genre Utilisé")
        user = make_user(session, role="user", email="gowner@test.com", username="gowner")
        book = create_test_book(session, owner_id=user.id, title="Livre Genre", isbn="4444444444444")
        link = BookGenreLink(book_id=book.id, genre_id=genre.id)
        session.add(link)
        session.commit()

        response = client.delete(f"/genres/{genre.id}")
        assert response.status_code == 409
        assert "1" in response.json()["detail"]

    def test_delete_used_with_replacement(self, moderator_client, session):
        """Supprimer un genre utilisé avec replacement_id → 200, FK réassignées."""
        _user, client = moderator_client
        genre_to_delete = create_genre(session, name="Genre À Supprimer")
        genre_replacement = create_genre(session, name="Genre Remplacement")
        user = make_user(session, role="user", email="gowner2@test.com", username="gowner2")
        book = create_test_book(session, owner_id=user.id, title="Livre Genre Lié", isbn="5555555555555")
        link = BookGenreLink(book_id=book.id, genre_id=genre_to_delete.id)
        session.add(link)
        session.commit()

        response = client.delete(
            f"/genres/{genre_to_delete.id}",
            params={"replacement_id": genre_replacement.id}
        )
        assert response.status_code == 200

        session.expire_all()
        updated_link = session.get(BookGenreLink, (book.id, genre_replacement.id))
        assert updated_link is not None

    def test_delete_with_invalid_replacement(self, moderator_client, session):
        """Supprimer avec un replacement_id inexistant → 404."""
        _user, client = moderator_client
        genre = create_genre(session, name="Genre Solo")
        user = make_user(session, role="user", email="gowner3@test.com", username="gowner3")
        book = create_test_book(session, owner_id=user.id, title="Livre Genre Solo", isbn="6666666666666")
        link = BookGenreLink(book_id=book.id, genre_id=genre.id)
        session.add(link)
        session.commit()

        response = client.delete(f"/genres/{genre.id}", params={"replacement_id": 99999})
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Implémentations concrètes : Publisher
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestPublisherRoles(SharedEntityRoleTests):
    endpoint = "/publishers"
    create_payload = {"name": "Hachette"}

    @staticmethod
    def create_entity(session: Session, name: str = "Flammarion") -> Publisher:
        return create_publisher(session, name=name)

    def test_delete_used_without_replacement(self, moderator_client, session):
        """Supprimer un éditeur utilisé sans replacement_id → 409."""
        _user, client = moderator_client
        publisher = create_publisher(session, name="Éditeur Utilisé")
        user = make_user(session, role="user", email="powner@test.com", username="powner")
        book = create_test_book(session, owner_id=user.id, title="Livre Éditeur", isbn="7777777777771")
        book.publisher_id = publisher.id
        session.add(book)
        session.commit()

        response = client.delete(f"/publishers/{publisher.id}")
        assert response.status_code == 409
        assert "1" in response.json()["detail"]

    def test_delete_used_with_replacement(self, moderator_client, session):
        """Supprimer un éditeur utilisé avec replacement_id → 200, FK réassignées."""
        _user, client = moderator_client
        pub_to_delete = create_publisher(session, name="Éditeur À Supprimer")
        pub_replacement = create_publisher(session, name="Éditeur Remplacement")
        user = make_user(session, role="user", email="powner2@test.com", username="powner2")
        book = create_test_book(session, owner_id=user.id, title="Livre Éditeur Lié", isbn="7777777777772")
        book.publisher_id = pub_to_delete.id
        session.add(book)
        session.commit()

        response = client.delete(
            f"/publishers/{pub_to_delete.id}",
            params={"replacement_id": pub_replacement.id}
        )
        assert response.status_code == 200

        session.expire_all()
        updated_book = session.get(Book, book.id)
        assert updated_book.publisher_id == pub_replacement.id

    def test_delete_with_invalid_replacement(self, moderator_client, session):
        """Supprimer avec un replacement_id inexistant → 404."""
        _user, client = moderator_client
        publisher = create_publisher(session, name="Éditeur Solo")
        user = make_user(session, role="user", email="powner3@test.com", username="powner3")
        book = create_test_book(session, owner_id=user.id, title="Livre Éditeur Solo", isbn="7777777777773")
        book.publisher_id = publisher.id
        session.add(book)
        session.commit()

        response = client.delete(f"/publishers/{publisher.id}", params={"replacement_id": 99999})
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Implémentations concrètes : Series
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestSeriesRoles(SharedEntityRoleTests):
    endpoint = "/series"
    create_payload = {"name": "Le Seigneur des Anneaux"}

    @staticmethod
    def create_entity(session: Session, name: str = "Discworld") -> Series:
        return create_series(session, name=name)

    def test_delete_used_without_replacement(self, moderator_client, session):
        """Supprimer une série utilisée sans replacement_id → 409."""
        _user, client = moderator_client
        series = create_series(session, name="Série Utilisée")
        user = make_user(session, role="user", email="sowner@test.com", username="sowner")
        book = create_test_book(session, owner_id=user.id, title="Livre Série", isbn="8888888888881")
        link = BookSeriesLink(book_id=book.id, series_id=series.id, volume_number=1)
        session.add(link)
        session.commit()

        response = client.delete(f"/series/{series.id}")
        assert response.status_code == 409
        assert "1" in response.json()["detail"]

    def test_delete_used_with_replacement(self, moderator_client, session):
        """Supprimer une série utilisée avec replacement_id → 200, FK réassignées."""
        _user, client = moderator_client
        series_to_delete = create_series(session, name="Série À Supprimer")
        series_replacement = create_series(session, name="Série Remplacement")
        user = make_user(session, role="user", email="sowner2@test.com", username="sowner2")
        book = create_test_book(session, owner_id=user.id, title="Livre Série Lié", isbn="8888888888882")
        link = BookSeriesLink(book_id=book.id, series_id=series_to_delete.id, volume_number=1)
        session.add(link)
        session.commit()

        response = client.delete(
            f"/series/{series_to_delete.id}",
            params={"replacement_id": series_replacement.id}
        )
        assert response.status_code == 200

        session.expire_all()
        updated_link = session.get(BookSeriesLink, (book.id, series_replacement.id))
        assert updated_link is not None

    def test_delete_with_invalid_replacement(self, moderator_client, session):
        """Supprimer avec un replacement_id inexistant → 404."""
        _user, client = moderator_client
        series = create_series(session, name="Série Solo")
        user = make_user(session, role="user", email="sowner3@test.com", username="sowner3")
        book = create_test_book(session, owner_id=user.id, title="Livre Série Solo", isbn="8888888888883")
        link = BookSeriesLink(book_id=book.id, series_id=series.id, volume_number=1)
        session.add(link)
        session.commit()

        response = client.delete(f"/series/{series.id}", params={"replacement_id": 99999})
        assert response.status_code == 404
