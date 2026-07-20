from typing import List, Optional

from sqlmodel import Session, func, select

from app.models.audit_log_model import AuditLog
from app.models.report_model import Report, ReportStatus


class ReportRepository:
    """Repository pour les opérations de données sur les signalements (Report)."""

    def __init__(self, session: Session):
        self.session = session

    def add_report(self, report: Report) -> Report:
        self.session.add(report)
        return report

    def search_reports(
        self,
        status_filter: Optional[ReportStatus],
        target_type: Optional[str],
        offset: int,
        limit: int,
    ) -> List[Report]:
        query = select(Report)
        if status_filter:
            query = query.where(Report.status == status_filter)
        if target_type:
            query = query.where(Report.target_type == target_type)
        query = query.order_by(Report.created_at.desc()).offset(offset).limit(limit)
        return self.session.exec(query).all()

    def get_by_id(self, report_id: int) -> Optional[Report]:
        return self.session.get(Report, report_id)

    def count_pending(self) -> int:
        return self.session.exec(
            select(func.count(Report.id)).where(Report.status == ReportStatus.pending)
        ).one()

    def update_report_resolution(
        self,
        report: Report,
        new_status: ReportStatus,
        moderator_id: int,
        moderator_note: Optional[str],
        resolved_at,
    ) -> Report:
        report.status = new_status
        report.moderator_id = moderator_id
        report.moderator_note = moderator_note
        report.resolved_at = resolved_at
        self.session.add(report)
        return report

    def add_audit_log(self, audit: AuditLog) -> AuditLog:
        self.session.add(audit)
        return audit
