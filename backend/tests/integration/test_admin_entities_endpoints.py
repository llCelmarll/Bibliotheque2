"""
Tests d'intégration de POST /admin/entities/{entity_type}/merge.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from tests.conftest import create_test_book
from app.models.author_model import Author
from app.models.publisher_model import Publisher
from app.models.genre_model import Genre
from app.models.series_model import Series
from app.models.book_author_link_model import BookAuthorLink
from app.models.book_genre_link_model import BookGenreLink
from app.models.book_series_link_model import BookSeriesLink
from app.models.audit_log_model import AuditLog


def create_author(session: Session, name: str) -> Author:
    a = Author(name=name)
    session.add(a)
    session.commit()
    session.refresh(a)
    return a


def create_publisher(session: Session, name: str) -> Publisher:
    p = Publisher(name=name)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


def create_genre(session: Session, name: str) -> Genre:
    g = Genre(name=name)
    session.add(g)
    session.commit()
    session.refresh(g)
    return g


def create_series(session: Session, name: str) -> Series:
    s = Series(name=name)
    session.add(s)
    session.commit()
    session.refresh(s)
    return s


@pytest.mark.integration
class TestMergeAuthor:
    def test_merge_success(self, moderator_client: TestClient, session: Session, moderator_user):
        """Fusion réussie : les livres sont réassignés, source supprimée, audit créé."""
        source = create_author(session, "Source Auteur")
        target = create_author(session, "Target Auteur")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre A", isbn="9781000000001")
        session.add(BookAuthorLink(book_id=book.id, author_id=source.id))
        session.commit()

        response = moderator_client.post(
            "/admin/entities/author/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        link = session.exec(
            select(BookAuthorLink).where(BookAuthorLink.book_id == book.id, BookAuthorLink.author_id == target.id)
        ).first()
        assert link is not None

        assert session.get(Author, source.id) is None
        assert session.get(Author, target.id) is not None

        audit = session.exec(select(AuditLog).where(AuditLog.action == "merge_entity")).first()
        assert audit is not None
        assert audit.target_type == "author"
        assert audit.detail["source_id"] == source.id

    def test_merge_with_existing_link_conflict(self, moderator_client: TestClient, session: Session, moderator_user):
        """Un livre déjà lié à source ET target ne crée pas de doublon (lien source supprimé)."""
        source = create_author(session, "Source Conflit")
        target = create_author(session, "Target Conflit")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre B", isbn="9781000000002")
        session.add(BookAuthorLink(book_id=book.id, author_id=source.id))
        session.add(BookAuthorLink(book_id=book.id, author_id=target.id))
        session.commit()

        response = moderator_client.post(
            "/admin/entities/author/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        links = session.exec(
            select(BookAuthorLink).where(BookAuthorLink.book_id == book.id)
        ).all()
        assert len(links) == 1
        assert links[0].author_id == target.id

    def test_source_not_found_returns_404(self, moderator_client: TestClient, session: Session):
        target = create_author(session, "Target Seul")
        response = moderator_client.post(
            "/admin/entities/author/merge",
            json={"source_id": 99999, "target_id": target.id},
        )
        assert response.status_code == 404

    def test_target_not_found_returns_404(self, moderator_client: TestClient, session: Session):
        source = create_author(session, "Source Seule")
        response = moderator_client.post(
            "/admin/entities/author/merge",
            json={"source_id": source.id, "target_id": 99999},
        )
        assert response.status_code == 404


@pytest.mark.integration
class TestMergePublisher:
    def test_merge_success(self, moderator_client: TestClient, session: Session, moderator_user):
        """Fusion éditeur : les livres basculent vers target (relation simple publisher_id)."""
        source = create_publisher(session, "Source Editeur")
        target = create_publisher(session, "Target Editeur")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre C", isbn="9781000000003")
        book.publisher_id = source.id
        session.add(book)
        session.commit()

        response = moderator_client.post(
            "/admin/entities/publisher/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        session.refresh(book)
        assert book.publisher_id == target.id
        assert session.get(Publisher, source.id) is None


@pytest.mark.integration
class TestMergeGenre:
    def test_merge_success(self, moderator_client: TestClient, session: Session, moderator_user):
        """Fusion genre : livres réassignés, source supprimée, audit créé."""
        source = create_genre(session, "Source Genre")
        target = create_genre(session, "Target Genre")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre D", isbn="9781000000004")
        session.add(BookGenreLink(book_id=book.id, genre_id=source.id))
        session.commit()

        response = moderator_client.post(
            "/admin/entities/genre/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        link = session.exec(
            select(BookGenreLink).where(BookGenreLink.book_id == book.id, BookGenreLink.genre_id == target.id)
        ).first()
        assert link is not None
        assert session.get(Genre, source.id) is None

    def test_merge_with_existing_link_conflict(self, moderator_client: TestClient, session: Session, moderator_user):
        """Conflit de lien genre : pas de doublon après fusion."""
        source = create_genre(session, "Source Conflit Genre")
        target = create_genre(session, "Target Conflit Genre")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre E", isbn="9781000000005")
        session.add(BookGenreLink(book_id=book.id, genre_id=source.id))
        session.add(BookGenreLink(book_id=book.id, genre_id=target.id))
        session.commit()

        response = moderator_client.post(
            "/admin/entities/genre/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        links = session.exec(select(BookGenreLink).where(BookGenreLink.book_id == book.id)).all()
        assert len(links) == 1


@pytest.mark.integration
class TestMergeSeries:
    def test_merge_success(self, moderator_client: TestClient, session: Session, moderator_user):
        """Fusion série : livres réassignés, source supprimée, audit créé."""
        source = create_series(session, "Source Serie")
        target = create_series(session, "Target Serie")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre F", isbn="9781000000006")
        session.add(BookSeriesLink(book_id=book.id, series_id=source.id))
        session.commit()

        response = moderator_client.post(
            "/admin/entities/series/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        link = session.exec(
            select(BookSeriesLink).where(BookSeriesLink.book_id == book.id, BookSeriesLink.series_id == target.id)
        ).first()
        assert link is not None
        assert session.get(Series, source.id) is None

    def test_merge_with_existing_link_conflict(self, moderator_client: TestClient, session: Session, moderator_user):
        """Conflit de lien série : pas de doublon après fusion."""
        source = create_series(session, "Source Conflit Serie")
        target = create_series(session, "Target Conflit Serie")
        book = create_test_book(session, owner_id=moderator_user.id, title="Livre G", isbn="9781000000007")
        session.add(BookSeriesLink(book_id=book.id, series_id=source.id))
        session.add(BookSeriesLink(book_id=book.id, series_id=target.id))
        session.commit()

        response = moderator_client.post(
            "/admin/entities/series/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 200

        links = session.exec(select(BookSeriesLink).where(BookSeriesLink.book_id == book.id)).all()
        assert len(links) == 1


@pytest.mark.integration
class TestMergeGeneral:
    def test_invalid_entity_type_returns_400(self, moderator_client: TestClient, session: Session):
        source = create_author(session, "Source Invalid")
        target = create_author(session, "Target Invalid")
        response = moderator_client.post(
            "/admin/entities/invalid_type/merge",
            json={"source_id": source.id, "target_id": target.id},
        )
        assert response.status_code == 400

    def test_source_equals_target_returns_400(self, moderator_client: TestClient, session: Session):
        author = create_author(session, "Meme Auteur")
        response = moderator_client.post(
            "/admin/entities/author/merge",
            json={"source_id": author.id, "target_id": author.id},
        )
        assert response.status_code == 400

    def test_requires_moderator(self, client: TestClient, authenticated_client: TestClient, session: Session):
        source = create_author(session, "Source Perm")
        target = create_author(session, "Target Perm")
        payload = {"source_id": source.id, "target_id": target.id}
        assert client.post("/admin/entities/author/merge", json=payload).status_code == 403
        assert authenticated_client.post("/admin/entities/author/merge", json=payload).status_code == 403
