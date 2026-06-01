from typing import List
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlmodel import Session

from app.db import get_session
from app.services.auth_service import get_current_user
from app.services.magazine_service import MagazineService
from app.models.User import User
from app.schemas.Magazine import (
    MagazineSeriesRead, MagazineSeriesCreate, MagazineSeriesUpdate,
    MagazineIssueRead, MagazineIssueCreate, MagazineIssueUpdate,
    MagazineIssueBulkCreate, MagazineIssueReadStatusUpdate,
)

router = APIRouter(prefix="/magazines", tags=["magazines"])


def get_magazine_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> MagazineService:
    return MagazineService(session, user_id=current_user.id)


# ── Series ───────────────────────────────────────────────────────────────────

@router.get("/series", response_model=List[MagazineSeriesRead])
def list_series(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: MagazineService = Depends(get_magazine_service),
):
    return service.get_all_series(skip, limit)


@router.post("/series", response_model=MagazineSeriesRead, status_code=201)
def create_series(
    data: MagazineSeriesCreate,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.create_series(data)


@router.get("/series/{series_id}", response_model=MagazineSeriesRead)
def get_series(
    series_id: int,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.get_series_by_id(series_id)


@router.put("/series/{series_id}", response_model=MagazineSeriesRead)
def update_series(
    series_id: int,
    data: MagazineSeriesUpdate,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.update_series(series_id, data)


@router.delete("/series/{series_id}", status_code=204)
def delete_series(
    series_id: int,
    service: MagazineService = Depends(get_magazine_service),
):
    service.delete_series(series_id)


@router.post("/series/{series_id}/cover")
async def upload_series_cover(
    series_id: int,
    file: UploadFile = File(...),
    service: MagazineService = Depends(get_magazine_service),
):
    cover_url = await service.upload_series_cover(series_id, file)
    return {"cover_url": cover_url, "message": "Couverture mise à jour"}


@router.delete("/series/{series_id}/cover")
def delete_series_cover(
    series_id: int,
    service: MagazineService = Depends(get_magazine_service),
):
    service.delete_series_cover(series_id)
    return {"message": "Couverture supprimée"}


# ── Issues ────────────────────────────────────────────────────────────────────

@router.get("/series/{series_id}/issues", response_model=List[MagazineIssueRead])
def list_issues(
    series_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    service: MagazineService = Depends(get_magazine_service),
):
    return service.get_issues_by_series(series_id, skip, limit)


@router.post("/series/{series_id}/issues/bulk", response_model=List[MagazineIssueRead], status_code=201)
def bulk_create_issues(
    series_id: int,
    data: MagazineIssueBulkCreate,
    service: MagazineService = Depends(get_magazine_service),
):
    data.series_id = series_id
    return service.bulk_create_issues(data)


@router.post("/issues", response_model=MagazineIssueRead, status_code=201)
def create_issue(
    data: MagazineIssueCreate,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.create_issue(data)


@router.get("/issues/{issue_id}", response_model=MagazineIssueRead)
def get_issue(
    issue_id: int,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.get_issue_by_id(issue_id)


@router.put("/issues/{issue_id}", response_model=MagazineIssueRead)
def update_issue(
    issue_id: int,
    data: MagazineIssueUpdate,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.update_issue(issue_id, data)


@router.patch("/issues/{issue_id}/read-status", response_model=MagazineIssueRead)
def update_read_status(
    issue_id: int,
    data: MagazineIssueReadStatusUpdate,
    service: MagazineService = Depends(get_magazine_service),
):
    return service.update_read_status(issue_id, data)


@router.delete("/issues/{issue_id}", status_code=204)
def delete_issue(
    issue_id: int,
    service: MagazineService = Depends(get_magazine_service),
):
    service.delete_issue(issue_id)


@router.post("/issues/{issue_id}/cover")
async def upload_issue_cover(
    issue_id: int,
    file: UploadFile = File(...),
    service: MagazineService = Depends(get_magazine_service),
):
    cover_url = await service.upload_issue_cover(issue_id, file)
    return {"cover_url": cover_url, "message": "Couverture mise à jour"}


@router.delete("/issues/{issue_id}/cover")
def delete_issue_cover(
    issue_id: int,
    service: MagazineService = Depends(get_magazine_service),
):
    service.delete_issue_cover(issue_id)
    return {"message": "Couverture supprimée"}


@router.get("/health")
def health():
    return {"status": "ok"}
