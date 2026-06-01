from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session

from app.models.MagazineSeries import MagazineSeries
from app.models.MagazineIssue import MagazineIssue
from app.repositories.magazine_repository import MagazineSeriesRepository, MagazineIssueRepository
from app.schemas.Magazine import (
    MagazineSeriesCreate, MagazineSeriesUpdate, MagazineSeriesRead,
    MagazineIssueCreate, MagazineIssueUpdate, MagazineIssueRead,
    MagazineIssueBulkCreate, MagazineIssueReadStatusUpdate,
    _parse_issue_range,
)


class MagazineService:
    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.series_repo = MagazineSeriesRepository(session)
        self.issue_repo = MagazineIssueRepository(session)

    # ── Series ──────────────────────────────────────────────────────────────

    def get_all_series(self, skip: int = 0, limit: int = 100) -> List[MagazineSeriesRead]:
        series_list = self.series_repo.get_all(self.user_id, skip, limit)
        return [self._build_series_read(s) for s in series_list]

    def get_series_by_id(self, series_id: int) -> MagazineSeriesRead:
        series = self._get_series_or_404(series_id)
        return self._build_series_read(series)

    def create_series(self, data: MagazineSeriesCreate) -> MagazineSeriesRead:
        series = MagazineSeries(
            title=data.title,
            publisher=data.publisher,
            periodicity=data.periodicity,
            cover_url=data.cover_url,
            owner_id=self.user_id,
        )
        series = self.series_repo.create(series)
        return self._build_series_read(series)

    def update_series(self, series_id: int, data: MagazineSeriesUpdate) -> MagazineSeriesRead:
        series = self._get_series_or_404(series_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(series, field, value)
        series.updated_at = datetime.utcnow()
        series = self.series_repo.update(series)
        return self._build_series_read(series)

    def delete_series(self, series_id: int) -> None:
        series = self._get_series_or_404(series_id)
        self.series_repo.delete(series)

    async def upload_series_cover(self, series_id: int, file: UploadFile) -> str:
        series = self._get_series_or_404(series_id)
        from app.services.cover_service import CoverService
        cover_url = await CoverService.process_and_save(series.id, file, prefix="mags_")
        series.cover_url = cover_url
        series.updated_at = datetime.utcnow()
        self.series_repo.update(series)
        return cover_url

    def delete_series_cover(self, series_id: int) -> None:
        series = self._get_series_or_404(series_id)
        from app.services.cover_service import CoverService
        CoverService.delete_file(series.id, prefix="mags_")
        series.cover_url = None
        series.updated_at = datetime.utcnow()
        self.series_repo.update(series)

    # ── Issues ───────────────────────────────────────────────────────────────

    def get_issues_by_series(self, series_id: int, skip: int = 0, limit: int = 200) -> List[MagazineIssueRead]:
        self._get_series_or_404(series_id)
        issues = self.issue_repo.get_by_series(series_id, self.user_id, skip, limit)
        return [self._build_issue_read(i) for i in issues]

    def get_issue_by_id(self, issue_id: int) -> MagazineIssueRead:
        issue = self._get_issue_or_404(issue_id)
        return self._build_issue_read(issue)

    def create_issue(self, data: MagazineIssueCreate) -> MagazineIssueRead:
        self._get_series_or_404(data.series_id)
        if data.issue_number is not None and self.issue_repo.exists(data.series_id, data.issue_number, self.user_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Le numéro {data.issue_number} existe déjà dans cette série",
            )
        issue = MagazineIssue(
            series_id=data.series_id,
            issue_number=data.issue_number,
            title=data.title,
            published_date=data.published_date,
            cover_url=data.cover_url,
            owner_id=self.user_id,
            is_read=data.is_read,
            read_date=data.read_date,
            rating=data.rating,
            notes=data.notes,
            is_lendable=data.is_lendable if data.is_lendable is not None else True,
        )
        issue = self.issue_repo.create(issue)
        return self._build_issue_read(issue)

    def bulk_create_issues(self, data: MagazineIssueBulkCreate) -> List[MagazineIssueRead]:
        self._get_series_or_404(data.series_id)
        numbers = _parse_issue_range(data.issue_range)

        # Filtrer les numéros déjà existants
        to_create = [n for n in numbers if not self.issue_repo.exists(data.series_id, n, self.user_id)]

        issues = [
            MagazineIssue(
                series_id=data.series_id,
                issue_number=n,
                published_date=data.published_date_prefix,
                owner_id=self.user_id,
            )
            for n in to_create
        ]
        created = self.issue_repo.bulk_create(issues)
        return [self._build_issue_read(i) for i in created]

    def update_issue(self, issue_id: int, data: MagazineIssueUpdate) -> MagazineIssueRead:
        issue = self._get_issue_or_404(issue_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(issue, field, value)
        issue.updated_at = datetime.utcnow()
        issue = self.issue_repo.update(issue)
        return self._build_issue_read(issue)

    def update_read_status(self, issue_id: int, data: MagazineIssueReadStatusUpdate) -> MagazineIssueRead:
        issue = self._get_issue_or_404(issue_id)
        issue.is_read = data.is_read
        if data.is_read and data.read_date:
            issue.read_date = data.read_date
        elif data.is_read and not issue.read_date:
            issue.read_date = datetime.utcnow()
        elif not data.is_read:
            issue.read_date = None
        issue.updated_at = datetime.utcnow()
        issue = self.issue_repo.update(issue)
        return self._build_issue_read(issue)

    def delete_issue(self, issue_id: int) -> None:
        issue = self._get_issue_or_404(issue_id)
        self.issue_repo.delete(issue)

    async def upload_issue_cover(self, issue_id: int, file: UploadFile) -> str:
        issue = self._get_issue_or_404(issue_id)
        from app.services.cover_service import CoverService
        cover_url = await CoverService.process_and_save(issue.id, file, prefix="magi_")
        issue.cover_url = cover_url
        issue.updated_at = datetime.utcnow()
        self.issue_repo.update(issue)
        return cover_url

    def delete_issue_cover(self, issue_id: int) -> None:
        issue = self._get_issue_or_404(issue_id)
        from app.services.cover_service import CoverService
        CoverService.delete_file(issue.id, prefix="magi_")
        issue.cover_url = None
        issue.updated_at = datetime.utcnow()
        self.issue_repo.update(issue)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _get_series_or_404(self, series_id: int) -> MagazineSeries:
        series = self.series_repo.get_by_id(series_id, self.user_id)
        if not series:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Série introuvable")
        return series

    def _get_issue_or_404(self, issue_id: int) -> MagazineIssue:
        issue = self.issue_repo.get_by_id(issue_id, self.user_id)
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Numéro introuvable")
        return issue

    def _build_series_read(self, series: MagazineSeries) -> MagazineSeriesRead:
        count = self.series_repo.count_issues(series.id, self.user_id)
        data = MagazineSeriesRead.model_validate(series)
        data.issue_count = count
        return data

    def _build_issue_read(self, issue: MagazineIssue) -> MagazineIssueRead:
        data = MagazineIssueRead.model_validate(issue)
        if issue.series:
            data.series_title = issue.series.title
        return data
