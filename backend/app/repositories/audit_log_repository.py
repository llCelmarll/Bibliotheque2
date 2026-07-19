from typing import List, Optional

from app.models.audit_log_model import AuditLog
from sqlmodel import Session, select


class AuditLogRepository:
    """Repository pour les entrées de journal d'audit (AuditLog).

    Partagé entre admin_entities_router.py (fusion d'entités) et admin_router.py."""

    def __init__(self, session: Session):
        self.session = session

    def add_audit_log(self, audit: AuditLog) -> AuditLog:
        self.session.add(audit)
        return audit

    def list_audit_log(self, action: Optional[str], offset: int, limit: int) -> List[AuditLog]:
        query = select(AuditLog)
        if action:
            query = query.where(AuditLog.action == action)
        query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        return self.session.exec(query).all()
