"""
Tests d'intégration des endpoints /users (recherche, bibliothèque partagée).
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_book, create_test_user
from app.models.author_model import Author
from app.models.contact_model import Contact
from app.models.genre_model import Genre
from app.models.loan_model import Loan, LoanStatus


def create_shared_contact(session: Session, owner_id: int, linked_user_id: int, library_shared: bool = True) -> Contact:
    contact = Contact(
        name="Shared Contact",
        owner_id=owner_id,
        linked_user_id=linked_user_id,
        library_shared=library_shared,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@pytest.mark.integration
class TestSearchUsers:
    def test_search_finds_matching_username(self, authenticated_client: TestClient, session: Session):
        """Trouve un utilisateur par sous-chaîne du username, insensible à la casse."""
        create_test_user(session, email="findme@test.com", username="FindMeUser")
        response = authenticated_client.get("/users/search?q=findme")
        assert response.status_code == 200
        usernames = [u["username"] for u in response.json()]
        assert "FindMeUser" in usernames

    def test_search_excludes_current_user(self, authenticated_client: TestClient, test_user):
        """L'utilisateur courant n'apparaît jamais dans ses propres résultats."""
        response = authenticated_client.get(f"/users/search?q={test_user.username[:3]}")
        ids = [u["id"] for u in response.json()]
        assert test_user.id not in ids

    def test_search_excludes_inactive_users(self, authenticated_client: TestClient, session: Session):
        """Les utilisateurs inactifs n'apparaissent pas dans les résultats."""
        create_test_user(session, email="inactive@test.com", username="InactiveXyz", is_active=False)
        response = authenticated_client.get("/users/search?q=inactivexyz")
        usernames = [u["username"] for u in response.json()]
        assert "InactiveXyz" not in usernames

    def test_search_never_returns_email(self, authenticated_client: TestClient, session: Session):
        """La réponse ne contient jamais le champ email."""
        create_test_user(session, email="noleaks@test.com", username="NoLeaksUser")
        response = authenticated_client.get("/users/search?q=noleaks")
        for entry in response.json():
            assert "email" not in entry

    def test_search_query_too_short_returns_422(self, authenticated_client: TestClient):
        """q de moins de 2 caractères retourne 422."""
        response = authenticated_client.get("/users/search?q=a")
        assert response.status_code == 422

    def test_search_unauthenticated_returns_403(self, client: TestClient):
        """Sans authentification, retourne 403."""
        response = client.get("/users/search?q=test")
        assert response.status_code == 403


@pytest.mark.integration
class TestGetUserLibrary:
    def test_access_denied_without_sharing(self, authenticated_client: TestClient, session: Session):
        """403 si aucun contact ne partage la bibliothèque avec l'utilisateur courant."""
        owner = create_test_user(session, email="owner1@test.com", username="owner1")
        response = authenticated_client.get(f"/users/{owner.id}/library")
        assert response.status_code == 403

    def test_access_granted_with_sharing(self, authenticated_client: TestClient, session: Session, test_user):
        """200 si un contact partage la bibliothèque, ne retourne que les livres is_lendable."""
        owner = create_test_user(session, email="owner2@test.com", username="owner2")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        create_test_book(session, owner_id=owner.id, title="Livre Partagé", isbn="9781111111111")

        response = authenticated_client.get(f"/users/{owner.id}/library")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Livre Partagé"

    def test_self_access_returns_400(self, authenticated_client: TestClient, test_user):
        """Accéder à sa propre bibliothèque via cette route retourne 400."""
        response = authenticated_client.get(f"/users/{test_user.id}/library")
        assert response.status_code == 400

    def test_personal_fields_are_masked(self, authenticated_client: TestClient, session: Session, test_user):
        """Les champs personnels (barcode, reading_status, notes, rating) sont masqués."""
        owner = create_test_user(session, email="owner3@test.com", username="owner3")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        create_test_book(
            session, owner_id=owner.id, title="Livre Masqué", isbn="9782222222222",
            barcode="1234567890123", rating=5, notes="notes privées",
        )

        response = authenticated_client.get(f"/users/{owner.id}/library")
        item = response.json()["items"][0]
        assert item["barcode"] is None
        assert item["reading_status"] is None
        assert item["notes"] is None
        assert item["rating"] is None

    def test_search_filters_by_title(self, authenticated_client: TestClient, session: Session, test_user):
        """Le paramètre search filtre par titre."""
        owner = create_test_user(session, email="owner4@test.com", username="owner4")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        create_test_book(session, owner_id=owner.id, title="Dragon Rouge", isbn="9783333333333")
        create_test_book(session, owner_id=owner.id, title="Autre Livre", isbn="9784444444444")

        response = authenticated_client.get(f"/users/{owner.id}/library?search=dragon")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Dragon Rouge"

    def test_advanced_filter_by_isbn(self, authenticated_client: TestClient, session: Session, test_user):
        """Le filtre avancé isbn fonctionne."""
        owner = create_test_user(session, email="owner5@test.com", username="owner5")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        create_test_book(session, owner_id=owner.id, title="Livre ISBN", isbn="9785555555555")

        response = authenticated_client.get(f"/users/{owner.id}/library?isbn=9785555555555")
        data = response.json()
        assert data["total"] == 1

    def test_sort_and_order(self, authenticated_client: TestClient, session: Session, test_user):
        """Le tri par titre (asc/desc) fonctionne."""
        owner = create_test_user(session, email="owner6@test.com", username="owner6")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        create_test_book(session, owner_id=owner.id, title="Zebra", isbn="9786666666666")
        create_test_book(session, owner_id=owner.id, title="Alpha", isbn="9787777777777")

        response = authenticated_client.get(f"/users/{owner.id}/library?sort_by=title&sort_order=asc")
        titles = [b["title"] for b in response.json()["items"]]
        assert titles == sorted(titles)

    def test_pagination(self, authenticated_client: TestClient, session: Session, test_user):
        """La pagination skip/limit fonctionne, total reflète le compte avant pagination."""
        owner = create_test_user(session, email="owner7@test.com", username="owner7")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        for i in range(5):
            create_test_book(session, owner_id=owner.id, title=f"Livre {i}", isbn=f"978888888888{i}")

        response = authenticated_client.get(f"/users/{owner.id}/library?skip=0&limit=2")
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2

    def test_deduplication_with_multiple_authors(self, authenticated_client: TestClient, session: Session, test_user):
        """Un livre avec plusieurs auteurs n'apparaît qu'une fois avec le filtre author."""
        owner = create_test_user(session, email="owner8@test.com", username="owner8")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(session, owner_id=owner.id, title="Livre Multi-Auteurs", isbn="9789999999991")

        author1 = Author(name="Premier Auteur")
        author2 = Author(name="Deuxième Auteur")
        session.add(author1)
        session.add(author2)
        session.commit()
        session.refresh(author1)
        session.refresh(author2)
        book.authors.append(author1)
        book.authors.append(author2)
        session.add(book)
        session.commit()

        response = authenticated_client.get(f"/users/{owner.id}/library?author=Auteur")
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_deduplication_with_multiple_genres(self, authenticated_client: TestClient, session: Session, test_user):
        """Un livre avec plusieurs genres n'apparaît qu'une fois avec le filtre genre."""
        owner = create_test_user(session, email="owner9@test.com", username="owner9")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(session, owner_id=owner.id, title="Livre Multi-Genres", isbn="9789999999992")

        genre1 = Genre(name="Fantasy")
        genre2 = Genre(name="Fantasy Épique")
        session.add(genre1)
        session.add(genre2)
        session.commit()
        session.refresh(genre1)
        session.refresh(genre2)
        book.genres.append(genre1)
        book.genres.append(genre2)
        session.add(book)
        session.commit()

        response = authenticated_client.get(f"/users/{owner.id}/library?genre=Fantasy")
        data = response.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_non_lendable_books_excluded(self, authenticated_client: TestClient, session: Session, test_user):
        """Un livre is_lendable=False n'apparaît jamais dans la bibliothèque partagée."""
        owner = create_test_user(session, email="owner10@test.com", username="owner10")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(session, owner_id=owner.id, title="Non Prêtable", isbn="9789999999993")
        book.is_lendable = False
        session.add(book)
        session.commit()

        response = authenticated_client.get(f"/users/{owner.id}/library")
        assert response.json()["total"] == 0

    def test_library_shared_false_denies_access(self, authenticated_client: TestClient, session: Session, test_user):
        """Un contact avec library_shared=False ne donne pas accès."""
        owner = create_test_user(session, email="owner11@test.com", username="owner11")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id, library_shared=False)
        response = authenticated_client.get(f"/users/{owner.id}/library")
        assert response.status_code == 403

    def test_unauthenticated_returns_403(self, client: TestClient, session: Session):
        """Sans authentification, retourne 403."""
        owner = create_test_user(session, email="owner12@test.com", username="owner12")
        response = client.get(f"/users/{owner.id}/library")
        assert response.status_code == 403


@pytest.mark.integration
class TestGetSharedBook:
    def test_access_denied_without_sharing(self, authenticated_client: TestClient, session: Session):
        """403 si aucun contact ne partage la bibliothèque."""
        owner = create_test_user(session, email="ownerb1@test.com", username="ownerb1")
        book = create_test_book(session, owner_id=owner.id, title="Livre", isbn="9781111111121")
        response = authenticated_client.get(f"/users/{owner.id}/library/{book.id}")
        assert response.status_code == 403

    def test_success_with_sharing(self, authenticated_client: TestClient, session: Session, test_user):
        """200 avec les détails du livre si le partage existe."""
        owner = create_test_user(session, email="ownerb2@test.com", username="ownerb2")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(session, owner_id=owner.id, title="Livre Détail", isbn="9781111111122")

        response = authenticated_client.get(f"/users/{owner.id}/library/{book.id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Livre Détail"

    def test_not_found_returns_404(self, authenticated_client: TestClient, session: Session, test_user):
        """404 si le livre n'existe pas."""
        owner = create_test_user(session, email="ownerb3@test.com", username="ownerb3")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        response = authenticated_client.get(f"/users/{owner.id}/library/99999")
        assert response.status_code == 404

    def test_non_lendable_returns_404(self, authenticated_client: TestClient, session: Session, test_user):
        """404 si le livre existe mais n'est pas is_lendable."""
        owner = create_test_user(session, email="ownerb4@test.com", username="ownerb4")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(session, owner_id=owner.id, title="Non Prêtable", isbn="9781111111123")
        book.is_lendable = False
        session.add(book)
        session.commit()

        response = authenticated_client.get(f"/users/{owner.id}/library/{book.id}")
        assert response.status_code == 404

    def test_self_access_returns_400(self, authenticated_client: TestClient, session: Session, test_user):
        """Accéder à son propre livre via cette route retourne 400."""
        book = create_test_book(session, owner_id=test_user.id, title="Mon Livre", isbn="9781111111124")
        response = authenticated_client.get(f"/users/{test_user.id}/library/{book.id}")
        assert response.status_code == 400

    def test_current_loan_populated(self, authenticated_client: TestClient, session: Session, test_user):
        """current_loan est rempli si un prêt actif existe pour ce livre."""
        owner = create_test_user(session, email="ownerb5@test.com", username="ownerb5")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(session, owner_id=owner.id, title="Livre Prêté", isbn="9781111111125")
        contact = Contact(name="Emprunteur", owner_id=owner.id)
        session.add(contact)
        session.commit()
        session.refresh(contact)
        loan = Loan(book_id=book.id, owner_id=owner.id, contact_id=contact.id, status=LoanStatus.ACTIVE)
        session.add(loan)
        session.commit()

        response = authenticated_client.get(f"/users/{owner.id}/library/{book.id}")
        assert response.status_code == 200
        assert response.json()["current_loan"] is not None

    def test_personal_fields_masked(self, authenticated_client: TestClient, session: Session, test_user):
        """Les champs personnels sont masqués sur le détail aussi."""
        owner = create_test_user(session, email="ownerb6@test.com", username="ownerb6")
        create_shared_contact(session, owner_id=owner.id, linked_user_id=test_user.id)
        book = create_test_book(
            session, owner_id=owner.id, title="Livre Masqué Détail", isbn="9781111111126",
            rating=4, notes="privé",
        )

        response = authenticated_client.get(f"/users/{owner.id}/library/{book.id}")
        data = response.json()
        assert data["rating"] is None
        assert data["notes"] is None

    def test_unauthenticated_returns_403(self, client: TestClient, session: Session):
        """Sans authentification, retourne 403."""
        owner = create_test_user(session, email="ownerb7@test.com", username="ownerb7")
        book = create_test_book(session, owner_id=owner.id, title="Livre", isbn="9781111111127")
        response = client.get(f"/users/{owner.id}/library/{book.id}")
        assert response.status_code == 403
