from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import Session

from app.models.audit_log_model import AuditLog
from app.models.report_model import Report, ReportStatus
from app.repositories.report_repository import ReportRepository
from app.schemas.report_schemas import ReportCreate, ReportResolve


class ReportService:
    def __init__(self, session: Session):
        self.session = session
        self.report_repository = ReportRepository(session)

    def create_report(self, reporter_id: int, data: ReportCreate) -> Report:
        report = Report(
            reporter_id=reporter_id,
            target_type=data.target_type,
            target_id=data.target_id,
            reason=data.reason,
            description=data.description,
        )
        self.report_repository.add_report(report)
        self.session.commit()
        self.session.refresh(report)
        return report

    def list_reports(
        self,
        status_filter: Optional[ReportStatus],
        target_type: Optional[str],
        offset: int,
        limit: int,
    ) -> List[Report]:
        return self.report_repository.search_reports(status_filter, target_type, offset, limit)

    def get_report(self, report_id: int) -> Report:
        report = self.report_repository.get_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Signalement introuvable")
        return report

    def resolve_report(self, report_id: int, data: ReportResolve, moderator_id: int) -> Report:
        report = self.report_repository.get_by_id(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Signalement introuvable")
        if report.status != ReportStatus.pending:
            raise HTTPException(status_code=400, detail="Ce signalement a déjà été traité")
        if data.status == ReportStatus.pending:
            raise HTTPException(status_code=400, detail="Le statut doit être 'resolved' ou 'rejected'")

        self.report_repository.update_report_resolution(
            report,
            new_status=data.status,
            moderator_id=moderator_id,
            moderator_note=data.moderator_note,
            resolved_at=datetime.utcnow(),
        )

        audit = AuditLog(
            actor_id=moderator_id,
            action="resolve_report" if data.status == ReportStatus.resolved else "reject_report",
            target_type="report",
            target_id=report_id,
            detail={"status": data.status, "note": data.moderator_note},
        )
        self.report_repository.add_audit_log(audit)
        self.session.commit()
        self.session.refresh(report)
        return report
