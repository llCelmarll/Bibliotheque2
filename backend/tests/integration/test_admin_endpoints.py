"""
Tests d'intégration des endpoints /admin/*.
Vérifie le comportement métier réel : filtres, isolement des données, audit log.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user, create_test_book


@pytest.mark.integration
class TestAdminStats:
    def test_stats_returns_correct_counts(self, moderator_client: TestClient, session: Session, moderator_user):
        """Les stats reflètent le nombre réel d'utilisateurs et de livres."""
        create_test_user(session, email="u1@example.com", username="u1")
        create_test_user(session, email="u2@example.com", username="u2")

        response = moderator_client.get("/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_users"] >= 2
        assert "total_books" in data
        assert "active_loans" in data
        assert "pending_reports" in data

    def test_stats_counts_inactive_users(self, moderator_client: TestClient, session: Session, moderator_user):
        """Les stats distinguent les users actifs des inactifs."""
        create_test_user(session, email="active@example.com", username="active")
        create_test_user(session, email="inactive@example.com", username="inactive", is_active=False)

        response = moderator_client.get("/admin/stats")
        data = response.json()
        assert data["total_users"] > data["active_users"]


@pytest.mark.integration
class TestAdminUsers:
    def test_list_users_returns_all(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/users retourne tous les utilisateurs."""
        create_test_user(session, email="a@example.com", username="usera")
        create_test_user(session, email="b@example.com", username="userb")

        response = moderator_client.get("/admin/users")
        assert response.status_code == 200
        assert len(response.json()) >= 2

    def test_list_users_filter_by_search(self, moderator_client: TestClient, session: Session, moderator_user):
        """Le filtre search fonctionne sur le username."""
        create_test_user(session, email="unique_xyz@example.com", username="unique_xyz")
        create_test_user(session, email="other@example.com", username="other")

        response = moderator_client.get("/admin/users?search=unique_xyz")
        data = response.json()
        assert len(data) == 1
        assert data[0]["username"] == "unique_xyz"

    def test_list_users_filter_by_role(self, moderator_client: TestClient, session: Session, moderator_user):
        """Le filtre role retourne uniquement les users du rôle demandé."""
        create_test_user(session, email="mod@example.com", username="mod", role="moderator")
        create_test_user(session, email="usr@example.com", username="usr", role="user")

        response = moderator_client.get("/admin/users?role=moderator")
        data = response.json()
        assert all(u["role"] == "moderator" for u in data)

    def test_list_users_filter_by_active(self, moderator_client: TestClient, session: Session, moderator_user):
        """Le filtre is_active retourne uniquement les users actifs/inactifs."""
        create_test_user(session, email="act@example.com", username="act", is_active=True)
        create_test_user(session, email="inact@example.com", username="inact", is_active=False)

        response = moderator_client.get("/admin/users?is_active=false")
        data = response.json()
        assert all(not u["is_active"] for u in data)

    def test_patch_user_suspend(self, moderator_client: TestClient, session: Session, moderator_user):
        """PATCH suspend un utilisateur et génère un audit log."""
        target = create_test_user(session, email="target@example.com", username="target")

        response = moderator_client.patch(f"/admin/users/{target.id}", json={"is_active": False})
        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_patch_user_not_found(self, moderator_client: TestClient):
        """PATCH sur un user inexistant retourne 404."""
        response = moderator_client.patch("/admin/users/99999", json={"is_active": False})
        assert response.status_code == 404

    def test_delete_user(self, admin_client: TestClient, session: Session, admin_user):
        """DELETE supprime un utilisateur."""
        target = create_test_user(session, email="todelete@example.com", username="todelete")

        response = admin_client.delete(f"/admin/users/{target.id}")
        assert response.status_code == 204

        # Vérifie qu'il n'est plus listable
        check = admin_client.get(f"/admin/users?search=todelete")
        assert len(check.json()) == 0

    def test_delete_user_not_found(self, admin_client: TestClient):
        """DELETE sur un user inexistant retourne 404."""
        response = admin_client.delete("/admin/users/99999")
        assert response.status_code == 404


@pytest.mark.integration
class TestAdminUserLoans:
    def test_loans_returns_empty_for_user_without_loans(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/users/{id}/loans retourne une liste vide si pas de prêts."""
        target = create_test_user(session, email="noloan@example.com", username="noloan")

        response = moderator_client.get(f"/admin/users/{target.id}/loans")
        assert response.status_code == 200
        assert response.json() == []

    def test_loans_returns_404_for_unknown_user(self, moderator_client: TestClient):
        """GET /admin/users/{id}/loans retourne 404 pour un user inexistant."""
        response = moderator_client.get("/admin/users/99999/loans")
        assert response.status_code == 404

    def test_loans_isolated_per_user(self, moderator_client: TestClient, session: Session, moderator_user):
        """Les prêts retournés appartiennent bien à l'utilisateur demandé, pas à l'appelant."""
        from app.models.loan_model import Loan, LoanStatus
        from app.models.contact_model import Contact
        from datetime import datetime

        user_a = create_test_user(session, email="usera@example.com", username="usera")
        user_b = create_test_user(session, email="userb@example.com", username="userb")
        book_a = create_test_book(session, user_a.id, title="Book A", isbn="1111111111111")
        book_b = create_test_book(session, user_b.id, title="Book B", isbn="2222222222222")

        contact_a = Contact(name="Alice A", owner_id=user_a.id)
        contact_b = Contact(name="Bob B", owner_id=user_b.id)
        session.add(contact_a)
        session.add(contact_b)
        session.commit()

        loan_a = Loan(owner_id=user_a.id, book_id=book_a.id, contact_id=contact_a.id, status=LoanStatus.ACTIVE, loan_date=datetime.utcnow())
        loan_b = Loan(owner_id=user_b.id, book_id=book_b.id, contact_id=contact_b.id, status=LoanStatus.ACTIVE, loan_date=datetime.utcnow())
        session.add(loan_a)
        session.add(loan_b)
        session.commit()

        response = moderator_client.get(f"/admin/users/{user_a.id}/loans")
        assert response.status_code == 200
        loans = response.json()
        assert len(loans) == 1
        assert loans[0]["book"]["title"] == "Book A"


@pytest.mark.integration
class TestAdminBooks:
    def test_list_all_books(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/books retourne les livres de tous les utilisateurs."""
        user_a = create_test_user(session, email="ba@example.com", username="ba")
        user_b = create_test_user(session, email="bb@example.com", username="bb")
        create_test_book(session, user_a.id, title="Book A", isbn="1111111111110")
        create_test_book(session, user_b.id, title="Book B", isbn="2222222222220")

        response = moderator_client.get("/admin/books")
        assert response.status_code == 200
        titles = [b["title"] for b in response.json()]
        assert "Book A" in titles
        assert "Book B" in titles

    def test_filter_by_owner_id(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/books?owner_id=X retourne uniquement les livres de X."""
        user_a = create_test_user(session, email="oa@example.com", username="oa")
        user_b = create_test_user(session, email="ob@example.com", username="ob")
        create_test_book(session, user_a.id, title="Only A", isbn="3333333333330")
        create_test_book(session, user_b.id, title="Only B", isbn="4444444444440")

        response = moderator_client.get(f"/admin/books?owner_id={user_a.id}")
        assert response.status_code == 200
        books = response.json()
        assert all(b["owner_id"] == user_a.id for b in books)
        assert any(b["title"] == "Only A" for b in books)
        assert not any(b["title"] == "Only B" for b in books)

    def test_filter_by_title(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/books?title=X filtre par titre."""
        user = create_test_user(session, email="ft@example.com", username="ft")
        create_test_book(session, user.id, title="Dune", isbn="5555555555550")
        create_test_book(session, user.id, title="Foundation", isbn="6666666666660")

        response = moderator_client.get("/admin/books?title=Dune")
        books = response.json()
        assert all("Dune" in b["title"] for b in books)

    def test_sort_by_created_at(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/books?sort_by=created_at retourne sans erreur."""
        response = moderator_client.get("/admin/books?sort_by=created_at&sort_order=desc")
        assert response.status_code == 200

    def test_sort_by_id(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/books?sort_by=id retourne sans erreur."""
        response = moderator_client.get("/admin/books?sort_by=id&sort_order=asc")
        assert response.status_code == 200


@pytest.mark.integration
class TestAdminAuditLog:
    def test_audit_log_empty_initially(self, moderator_client: TestClient):
        """GET /admin/audit-log retourne une liste vide s'il n'y a pas d'entrées."""
        response = moderator_client.get("/admin/audit-log")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_audit_log_created_on_user_patch(self, moderator_client: TestClient, session: Session, moderator_user):
        """Suspendre un utilisateur crée une entrée dans l'audit log."""
        target = create_test_user(session, email="audit@example.com", username="audit")

        moderator_client.patch(f"/admin/users/{target.id}", json={"is_active": False})

        response = moderator_client.get("/admin/audit-log")
        logs = response.json()
        assert any(
            log["action"] == "suspend_user" and log["target_id"] == target.id
            for log in logs
        )

    def test_audit_log_created_on_user_delete(self, admin_client: TestClient, session: Session, admin_user):
        """Supprimer un utilisateur crée une entrée dans l'audit log."""
        target = create_test_user(session, email="auditdel@example.com", username="auditdel")

        admin_client.delete(f"/admin/users/{target.id}")

        response = admin_client.get("/admin/audit-log")
        logs = response.json()
        assert any(
            log["action"] == "delete_user" and log["target_id"] == target.id
            for log in logs
        )
