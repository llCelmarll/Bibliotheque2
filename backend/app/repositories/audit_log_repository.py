from app.models.audit_log_model import AuditLog
from sqlmodel import Session


class AuditLogRepository:
    """Repository pour les entrées de journal d'audit (AuditLog).

    Partagé entre admin_entities_router.py (fusion d'entités) et admin_router.py."""

    def __init__(self, session: Session):
        self.session = session

    def add_audit_log(self, audit: AuditLog) -> AuditLog:
        self.session.add(audit)
        return audit
