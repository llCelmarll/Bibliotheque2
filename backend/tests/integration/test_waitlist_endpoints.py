"""
Tests d'intégration des endpoints /waitlist et /admin/waitlist.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user
from app.models.WaitlistEntry import WaitlistEntry, WaitlistStatus
from app.models.WhitelistEntry import WhitelistEntry


def create_waitlist_entry(session: Session, email: str = "alice@test.com", name: str = "Alice", **kwargs) -> WaitlistEntry:
    entry = WaitlistEntry(email=email, name=name, **kwargs)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@pytest.mark.integration
class TestJoinWaitlist:
    def test_join_success(self, client: TestClient):
        """POST /waitlist crée une entrée et retourne 201."""
        response = client.post("/waitlist", json={
            "name": "Alice",
            "email": "alice@test.com",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "alice@test.com"
        assert data["name"] == "Alice"
        assert data["status"] == "pending"

    def test_join_with_all_fields(self, client: TestClient):
        """POST /waitlist accepte message et referred_by."""
        response = client.post("/waitlist", json={
            "name": "Bob",
            "email": "bob@test.com",
            "message": "Super app !",
            "referred_by": "Alice",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["message"] == "Super app !"
        assert data["referred_by"] == "Alice"

    def test_join_email_lowercased(self, client: TestClient):
        """L'email est normalisé en minuscules."""
        response = client.post("/waitlist", json={
            "name": "Carol",
            "email": "Carol@TEST.com",
        })
        assert response.status_code == 201
        assert response.json()["email"] == "carol@test.com"

    def test_join_duplicate_email_returns_409(self, client: TestClient, session: Session):
        """Un email déjà inscrit retourne 409."""
        create_waitlist_entry(session, email="dup@test.com")
        response = client.post("/waitlist", json={"name": "Dup", "email": "dup@test.com"})
        assert response.status_code == 409
        assert "déjà sur la liste" in response.json()["detail"]

    def test_join_invalid_email_returns_422(self, client: TestClient):
        """Un email invalide retourne 422."""
        response = client.post("/waitlist", json={"name": "Bad", "email": "not-an-email"})
        assert response.status_code == 422

    def test_join_missing_name_returns_422(self, client: TestClient):
        """Le champ name est obligatoire."""
        response = client.post("/waitlist", json={"email": "noname@test.com"})
        assert response.status_code == 422


@pytest.mark.integration
class TestAdminListWaitlist:
    def test_list_requires_admin(self, client: TestClient, moderator_client: TestClient):
        """GET /admin/waitlist est refusé aux non-admins et anonymes."""
        assert client.get("/admin/waitlist").status_code == 403
        assert moderator_client.get("/admin/waitlist").status_code == 403

    def test_list_returns_entries(self, admin_client: TestClient, session: Session, admin_user):
        """GET /admin/waitlist retourne toutes les entrées."""
        create_waitlist_entry(session, email="a@test.com", name="A")
        create_waitlist_entry(session, email="b@test.com", name="B")
        response = admin_client.get("/admin/waitlist")
        assert response.status_code == 200
        assert len(response.json()) >= 2

    def test_list_filter_by_status(self, admin_client: TestClient, session: Session, admin_user):
        """Le filtre status ne retourne que les entrées correspondantes."""
        create_waitlist_entry(session, email="p@test.com", status=WaitlistStatus.pending)
        create_waitlist_entry(session, email="i@test.com", status=WaitlistStatus.invited)
        response = admin_client.get("/admin/waitlist?status=pending")
        data = response.json()
        assert all(e["status"] == "pending" for e in data)

    def test_list_filter_by_search(self, admin_client: TestClient, session: Session, admin_user):
        """Le filtre search fonctionne sur email et name."""
        create_waitlist_entry(session, email="unique_xyz@test.com", name="Unique XYZ")
        create_waitlist_entry(session, email="other@test.com", name="Other")
        response = admin_client.get("/admin/waitlist?search=unique_xyz")
        data = response.json()
        assert len(data) == 1
        assert data[0]["email"] == "unique_xyz@test.com"


@pytest.mark.integration
class TestAdminUpdateWaitlist:
    def test_update_requires_admin(self, client: TestClient, session: Session, moderator_client: TestClient):
        """PATCH /admin/waitlist/{id} est refusé aux non-admins."""
        entry = create_waitlist_entry(session)
        assert client.patch(f"/admin/waitlist/{entry.id}", json={"status": "invited"}).status_code == 403
        assert moderator_client.patch(f"/admin/waitlist/{entry.id}", json={"status": "invited"}).status_code == 403

    def test_update_status_to_rejected(self, admin_client: TestClient, session: Session, admin_user):
        """PATCH status=rejected met à jour le statut."""
        entry = create_waitlist_entry(session)
        response = admin_client.patch(f"/admin/waitlist/{entry.id}", json={"status": "rejected"})
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    def test_invite_adds_to_whitelist(self, admin_client: TestClient, session: Session, admin_user):
        """Inviter un candidat l'ajoute automatiquement à la whitelist."""
        entry = create_waitlist_entry(session, email="invite@test.com")
        response = admin_client.patch(f"/admin/waitlist/{entry.id}", json={"status": "invited"})
        assert response.status_code == 200
        assert response.json()["status"] == "invited"
        whitelist = session.exec(
            __import__("sqlmodel", fromlist=["select"]).select(WhitelistEntry)
            .where(WhitelistEntry.email == "invite@test.com")
        ).first()
        assert whitelist is not None

    def test_invite_does_not_duplicate_whitelist(self, admin_client: TestClient, session: Session, admin_user):
        """Inviter deux fois ne crée pas de doublon en whitelist."""
        entry = create_waitlist_entry(session, email="dup_wl@test.com")
        session.add(WhitelistEntry(email="dup_wl@test.com"))
        session.commit()
        response = admin_client.patch(f"/admin/waitlist/{entry.id}", json={"status": "invited"})
        assert response.status_code == 200
        from sqlmodel import select
        count = len(session.exec(select(WhitelistEntry).where(WhitelistEntry.email == "dup_wl@test.com")).all())
        assert count == 1

    def test_update_not_found_returns_404(self, admin_client: TestClient, admin_user):
        """PATCH sur un id inexistant retourne 404."""
        response = admin_client.patch("/admin/waitlist/99999", json={"status": "rejected"})
        assert response.status_code == 404


@pytest.mark.integration
class TestAdminDeleteWaitlist:
    def test_delete_requires_admin(self, client: TestClient, session: Session, moderator_client: TestClient):
        """DELETE /admin/waitlist/{id} est refusé aux non-admins."""
        entry = create_waitlist_entry(session)
        assert client.delete(f"/admin/waitlist/{entry.id}").status_code == 403
        assert moderator_client.delete(f"/admin/waitlist/{entry.id}").status_code == 403

    def test_delete_removes_entry(self, admin_client: TestClient, session: Session, admin_user):
        """DELETE supprime l'entrée de la base."""
        entry = create_waitlist_entry(session, email="del@test.com")
        response = admin_client.delete(f"/admin/waitlist/{entry.id}")
        assert response.status_code == 204
        from sqlmodel import select
        remaining = session.exec(select(WaitlistEntry).where(WaitlistEntry.email == "del@test.com")).first()
        assert remaining is None

    def test_delete_not_found_returns_404(self, admin_client: TestClient, admin_user):
        """DELETE sur un id inexistant retourne 404."""
        response = admin_client.delete("/admin/waitlist/99999")
        assert response.status_code == 404


@pytest.mark.integration
class TestAdminStatsWaitlist:
    def test_stats_include_pending_waitlist(self, moderator_client: TestClient, session: Session, moderator_user):
        """GET /admin/stats inclut pending_waitlist."""
        create_waitlist_entry(session, email="s1@test.com", status=WaitlistStatus.pending)
        create_waitlist_entry(session, email="s2@test.com", status=WaitlistStatus.invited)
        response = moderator_client.get("/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "pending_waitlist" in data
        assert data["pending_waitlist"] >= 1
