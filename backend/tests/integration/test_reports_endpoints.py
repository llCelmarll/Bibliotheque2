"""
Tests d'intégration des endpoints /reports.

reports_router.py utilise get_current_user_sync (pas get_current_user async) —
les fixtures moderator_client/admin_client overrident bien get_current_moderator_user_sync/
get_current_admin_user_sync (par référence de fonction), mais aucune fixture existante
n'override get_current_user_sync pour un utilisateur simple authentifié. On le fait
manuellement ici via la fixture `sync_authenticated_client`.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.report_model import Report, ReportStatus, ReportTargetType, ReportReason
from app.models.audit_log_model import AuditLog
from app.services.auth_service import get_current_user_sync


@pytest.fixture
def sync_authenticated_client(client: TestClient, test_user) -> TestClient:
    """Client authentifié pour les endpoints utilisant get_current_user_sync (def, pas async def)."""
    client.app.dependency_overrides[get_current_user_sync] = lambda: test_user
    return client


def create_report_entry(
    session: Session,
    reporter_id: int,
    target_type: ReportTargetType = ReportTargetType.book,
    target_id: int = 1,
    reason: ReportReason = ReportReason.spam,
    **kwargs,
) -> Report:
    report = Report(
        reporter_id=reporter_id,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        **kwargs,
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@pytest.mark.integration
class TestCreateReport:
    def test_create_success(self, sync_authenticated_client: TestClient, test_user):
        """POST /reports crée un signalement et retourne 201."""
        response = sync_authenticated_client.post("/reports", json={
            "target_type": "book",
            "target_id": 42,
            "reason": "spam",
            "description": "Contenu suspect",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["reporter_id"] == test_user.id
        assert data["status"] == "pending"
        assert data["target_id"] == 42

    def test_create_unauthenticated_returns_403(self, client: TestClient):
        """Sans authentification, retourne 403."""
        response = client.post("/reports", json={
            "target_type": "book",
            "target_id": 1,
            "reason": "spam",
        })
        assert response.status_code == 403

    def test_create_invalid_target_type_returns_422(self, sync_authenticated_client: TestClient):
        """target_type invalide retourne 422."""
        response = sync_authenticated_client.post("/reports", json={
            "target_type": "invalid_type",
            "target_id": 1,
            "reason": "spam",
        })
        assert response.status_code == 422

    def test_create_invalid_reason_returns_422(self, sync_authenticated_client: TestClient):
        """reason invalide retourne 422."""
        response = sync_authenticated_client.post("/reports", json={
            "target_type": "book",
            "target_id": 1,
            "reason": "invalid_reason",
        })
        assert response.status_code == 422


@pytest.mark.integration
class TestListReports:
    def test_list_requires_moderator(self, client: TestClient, sync_authenticated_client: TestClient):
        """GET /reports est refusé aux anonymes et aux utilisateurs simples."""
        assert client.get("/reports").status_code == 403
        assert sync_authenticated_client.get("/reports").status_code == 403

    def test_list_returns_entries(self, moderator_client: TestClient, session: Session, test_user):
        """GET /reports retourne les signalements existants."""
        create_report_entry(session, reporter_id=test_user.id)
        create_report_entry(session, reporter_id=test_user.id, target_id=2)
        response = moderator_client.get("/reports")
        assert response.status_code == 200
        assert len(response.json()) >= 2

    def test_list_filter_by_status(self, moderator_client: TestClient, session: Session, test_user):
        """Le filtre status ne retourne que les entrées correspondantes."""
        create_report_entry(session, reporter_id=test_user.id, status=ReportStatus.pending)
        create_report_entry(session, reporter_id=test_user.id, target_id=2, status=ReportStatus.resolved)
        response = moderator_client.get("/reports?status=pending")
        data = response.json()
        assert all(r["status"] == "pending" for r in data)

    def test_list_filter_by_target_type(self, moderator_client: TestClient, session: Session, test_user):
        """Le filtre target_type ne retourne que les entrées correspondantes."""
        create_report_entry(session, reporter_id=test_user.id, target_type=ReportTargetType.book)
        create_report_entry(session, reporter_id=test_user.id, target_id=2, target_type=ReportTargetType.user)
        response = moderator_client.get("/reports?target_type=book")
        data = response.json()
        assert all(r["target_type"] == "book" for r in data)

    def test_list_pagination(self, moderator_client: TestClient, session: Session, test_user):
        """La pagination offset/limit fonctionne."""
        for i in range(5):
            create_report_entry(session, reporter_id=test_user.id, target_id=i)
        response = moderator_client.get("/reports?offset=0&limit=2")
        assert len(response.json()) == 2


@pytest.mark.integration
class TestGetReport:
    def test_get_success(self, moderator_client: TestClient, session: Session, test_user):
        """GET /reports/{id} retourne le signalement."""
        report = create_report_entry(session, reporter_id=test_user.id)
        response = moderator_client.get(f"/reports/{report.id}")
        assert response.status_code == 200
        assert response.json()["id"] == report.id

    def test_get_not_found_returns_404(self, moderator_client: TestClient):
        """GET sur un id inexistant retourne 404."""
        response = moderator_client.get("/reports/99999")
        assert response.status_code == 404

    def test_get_requires_moderator(self, client: TestClient, sync_authenticated_client: TestClient, session: Session, test_user):
        """GET /reports/{id} est refusé aux anonymes et aux utilisateurs simples."""
        report = create_report_entry(session, reporter_id=test_user.id)
        assert client.get(f"/reports/{report.id}").status_code == 403
        assert sync_authenticated_client.get(f"/reports/{report.id}").status_code == 403


@pytest.mark.integration
class TestResolveReport:
    def test_resolve_success(self, moderator_client: TestClient, session: Session, test_user, moderator_user):
        """PATCH /reports/{id} avec status=resolved met à jour le signalement."""
        report = create_report_entry(session, reporter_id=test_user.id)
        response = moderator_client.patch(f"/reports/{report.id}", json={
            "status": "resolved",
            "moderator_note": "Traité",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        assert data["moderator_id"] == moderator_user.id
        assert data["moderator_note"] == "Traité"
        assert data["resolved_at"] is not None

    def test_resolve_rejected(self, moderator_client: TestClient, session: Session, test_user):
        """PATCH /reports/{id} avec status=rejected fonctionne aussi."""
        report = create_report_entry(session, reporter_id=test_user.id)
        response = moderator_client.patch(f"/reports/{report.id}", json={"status": "rejected"})
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    def test_resolve_already_treated_returns_400(self, moderator_client: TestClient, session: Session, test_user):
        """Un signalement déjà traité (non pending) retourne 400."""
        report = create_report_entry(session, reporter_id=test_user.id, status=ReportStatus.resolved)
        response = moderator_client.patch(f"/reports/{report.id}", json={"status": "rejected"})
        assert response.status_code == 400
        assert "déjà été traité" in response.json()["detail"]

    def test_resolve_to_pending_returns_400(self, moderator_client: TestClient, session: Session, test_user):
        """Repasser explicitement à pending retourne 400."""
        report = create_report_entry(session, reporter_id=test_user.id)
        response = moderator_client.patch(f"/reports/{report.id}", json={"status": "pending"})
        assert response.status_code == 400

    def test_resolve_not_found_returns_404(self, moderator_client: TestClient):
        """PATCH sur un id inexistant retourne 404."""
        response = moderator_client.patch("/reports/99999", json={"status": "resolved"})
        assert response.status_code == 404

    def test_resolve_requires_moderator(self, client: TestClient, sync_authenticated_client: TestClient, session: Session, test_user):
        """PATCH /reports/{id} est refusé aux anonymes et aux utilisateurs simples."""
        report = create_report_entry(session, reporter_id=test_user.id)
        assert client.patch(f"/reports/{report.id}", json={"status": "resolved"}).status_code == 403
        assert sync_authenticated_client.patch(f"/reports/{report.id}", json={"status": "resolved"}).status_code == 403

    def test_resolve_creates_audit_log(self, moderator_client: TestClient, session: Session, test_user, moderator_user):
        """La résolution crée une entrée AuditLog avec le bon détail."""
        report = create_report_entry(session, reporter_id=test_user.id)
        response = moderator_client.patch(f"/reports/{report.id}", json={
            "status": "resolved",
            "moderator_note": "Note test",
        })
        assert response.status_code == 200

        audit = session.exec(
            select(AuditLog).where(
                AuditLog.target_type == "report",
                AuditLog.target_id == report.id,
            )
        ).first()
        assert audit is not None
        assert audit.action == "resolve_report"
        assert audit.actor_id == moderator_user.id
        assert audit.detail["status"] == "resolved"
        assert audit.detail["note"] == "Note test"

    def test_reject_creates_audit_log_with_reject_action(self, moderator_client: TestClient, session: Session, test_user):
        """Le rejet crée une entrée AuditLog avec action=reject_report."""
        report = create_report_entry(session, reporter_id=test_user.id)
        moderator_client.patch(f"/reports/{report.id}", json={"status": "rejected"})

        audit = session.exec(
            select(AuditLog).where(
                AuditLog.target_type == "report",
                AuditLog.target_id == report.id,
            )
        ).first()
        assert audit is not None
        assert audit.action == "reject_report"
