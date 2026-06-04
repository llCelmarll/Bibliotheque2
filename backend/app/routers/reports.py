from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from app.db import engine
from app.models.User import User
from app.models.Report import Report, ReportStatus
from app.models.AuditLog import AuditLog
from app.schemas.Report import ReportCreate, ReportRead, ReportResolve
from app.services.auth_service import get_current_user_sync as get_current_user, get_current_moderator_user_sync as get_current_moderator_user

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(data: ReportCreate, current_user: User = Depends(get_current_user)):
    with Session(engine) as session:
        report = Report(
            reporter_id=current_user.id,
            target_type=data.target_type,
            target_id=data.target_id,
            reason=data.reason,
            description=data.description,
        )
        session.add(report)
        session.commit()
        session.refresh(report)
        return report


@router.get("", response_model=List[ReportRead])
def list_reports(
    report_status: Optional[ReportStatus] = Query(None, alias="status"),
    target_type: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_moderator_user),
):
    with Session(engine) as session:
        query = select(Report)
        if report_status:
            query = query.where(Report.status == report_status)
        if target_type:
            query = query.where(Report.target_type == target_type)
        query = query.order_by(Report.created_at.desc()).offset(offset).limit(limit)
        return session.exec(query).all()


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: int, current_user: User = Depends(get_current_moderator_user)):
    with Session(engine) as session:
        report = session.get(Report, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Signalement introuvable")
        return report


@router.patch("/{report_id}", response_model=ReportRead)
def resolve_report(
    report_id: int,
    data: ReportResolve,
    current_user: User = Depends(get_current_moderator_user),
):
    with Session(engine) as session:
        report = session.get(Report, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Signalement introuvable")
        if report.status != ReportStatus.pending:
            raise HTTPException(status_code=400, detail="Ce signalement a déjà été traité")
        if data.status == ReportStatus.pending:
            raise HTTPException(status_code=400, detail="Le statut doit être 'resolved' ou 'rejected'")

        report.status = data.status
        report.moderator_id = current_user.id
        report.moderator_note = data.moderator_note
        report.resolved_at = datetime.utcnow()

        audit = AuditLog(
            actor_id=current_user.id,
            action="resolve_report" if data.status == ReportStatus.resolved else "reject_report",
            target_type="report",
            target_id=report_id,
            detail={"status": data.status, "note": data.moderator_note},
        )
        session.add(report)
        session.add(audit)
        session.commit()
        session.refresh(report)
        return report
