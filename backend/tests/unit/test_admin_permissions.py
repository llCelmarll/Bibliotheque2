"""
Tests unitaires des contrôles d'accès sur les routes /admin/*.
Vérifie que les rôles sont correctement appliqués sans tester le comportement métier.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
class TestAdminPermissions:
    """Vérifie que les endpoints admin refusent les accès non autorisés."""

    # --- Endpoints accessibles aux modérateurs et admins ---

    MODERATOR_ENDPOINTS = [
        ("GET",    "/admin/stats",   None),
        ("GET",    "/admin/users",   None),
        ("GET",    "/admin/books",   None),
        ("GET",    "/admin/audit-log", None),
    ]

    @pytest.mark.parametrize("method,path,body", MODERATOR_ENDPOINTS)
    def test_unauthenticated_forbidden(self, client: TestClient, method, path, body):
        """Un utilisateur non authentifié reçoit 403 sur les routes admin."""
        response = client.request(method, path, json=body)
        assert response.status_code == 403

    @pytest.mark.parametrize("method,path,body", MODERATOR_ENDPOINTS)
    def test_regular_user_forbidden(self, authenticated_client: TestClient, method, path, body):
        """Un utilisateur normal reçoit 403 sur les routes admin."""
        response = authenticated_client.request(method, path, json=body)
        assert response.status_code == 403

    @pytest.mark.parametrize("method,path,body", MODERATOR_ENDPOINTS)
    def test_moderator_allowed(self, moderator_client: TestClient, method, path, body):
        """Un modérateur peut accéder aux routes admin standard."""
        response = moderator_client.request(method, path, json=body)
        assert response.status_code in (200, 201)

    @pytest.mark.parametrize("method,path,body", MODERATOR_ENDPOINTS)
    def test_admin_allowed(self, admin_client: TestClient, method, path, body):
        """Un admin peut accéder aux routes admin standard."""
        response = admin_client.request(method, path, json=body)
        assert response.status_code in (200, 201)

    # --- Endpoints réservés aux admins (whitelist) ---

    def test_moderator_cannot_read_whitelist(self, moderator_client: TestClient):
        """Un modérateur ne peut pas lire la whitelist."""
        response = moderator_client.get("/admin/whitelist")
        assert response.status_code == 403

    def test_moderator_cannot_add_whitelist(self, moderator_client: TestClient):
        """Un modérateur ne peut pas ajouter à la whitelist."""
        response = moderator_client.post("/admin/whitelist", json={"email": "new@example.com"})
        assert response.status_code == 403

    def test_moderator_cannot_delete_whitelist(self, moderator_client: TestClient):
        """Un modérateur ne peut pas supprimer de la whitelist."""
        response = moderator_client.delete("/admin/whitelist/someone@example.com")
        assert response.status_code == 403

    def test_admin_can_read_whitelist(self, admin_client: TestClient):
        """Un admin peut lire la whitelist."""
        response = admin_client.get("/admin/whitelist")
        assert response.status_code == 200

    # --- Protections métier sur PATCH /admin/users/{id} ---

    def test_moderator_cannot_modify_own_account(self, moderator_client, moderator_user, session):
        """Un modérateur ne peut pas modifier son propre compte."""
        response = moderator_client.patch(
            f"/admin/users/{moderator_user.id}",
            json={"is_active": False},
        )
        assert response.status_code == 400

    def test_moderator_cannot_change_role(self, moderator_client, session):
        """Un modérateur ne peut pas changer le rôle d'un utilisateur."""
        from tests.conftest import create_test_user
        target = create_test_user(session, email="target@example.com", username="target")
        response = moderator_client.patch(
            f"/admin/users/{target.id}",
            json={"role": "admin"},
        )
        assert response.status_code == 403

    def test_admin_can_change_role(self, admin_client, session):
        """Un admin peut changer le rôle d'un utilisateur."""
        from tests.conftest import create_test_user
        target = create_test_user(session, email="target2@example.com", username="target2")
        response = admin_client.patch(
            f"/admin/users/{target.id}",
            json={"role": "moderator"},
        )
        assert response.status_code == 200
        assert response.json()["role"] == "moderator"

    # --- GET /admin/users/{id}/loans ---

    def test_user_loans_requires_moderator(self, authenticated_client, test_user):
        """Un utilisateur normal ne peut pas consulter les prêts d'un autre utilisateur."""
        response = authenticated_client.get(f"/admin/users/{test_user.id}/loans")
        assert response.status_code == 403

    def test_moderator_can_read_user_loans(self, moderator_client, test_user):
        """Un modérateur peut consulter les prêts d'un utilisateur."""
        response = moderator_client.get(f"/admin/users/{test_user.id}/loans")
        assert response.status_code == 200
