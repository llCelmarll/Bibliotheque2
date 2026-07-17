from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session
from app.db import get_session
from app.models.user_model import User
from app.models.report_model import ReportStatus
from app.schemas.report_schemas import ReportCreate, ReportRead, ReportResolve
from app.services.auth_service import get_current_user_sync as get_current_user, get_current_moderator_user_sync as get_current_moderator_user
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


def get_report_service(
    session: Session = Depends(get_session),
) -> ReportService:
    return ReportService(session)


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
):
    return service.create_report(current_user.id, data)


@router.get("", response_model=List[ReportRead])
def list_reports(
    report_status: Optional[ReportStatus] = Query(None, alias="status"),
    target_type: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_moderator_user),
    service: ReportService = Depends(get_report_service),
):
    return service.list_reports(report_status, target_type, offset, limit)


@router.get("/{report_id}", response_model=ReportRead)
def get_report(
    report_id: int,
    current_user: User = Depends(get_current_moderator_user),
    service: ReportService = Depends(get_report_service),
):
    return service.get_report(report_id)


@router.patch("/{report_id}", response_model=ReportRead)
def resolve_report(
    report_id: int,
    data: ReportResolve,
    current_user: User = Depends(get_current_moderator_user),
    service: ReportService = Depends(get_report_service),
):
    return service.resolve_report(report_id, data, current_user.id)
