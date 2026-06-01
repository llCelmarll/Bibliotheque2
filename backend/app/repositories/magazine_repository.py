from typing import List, Optional
from sqlmodel import Session, select, func
from sqlalchemy.orm import selectinload

from app.models.MagazineSeries import MagazineSeries
from app.models.MagazineIssue import MagazineIssue


class MagazineSeriesRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, series: MagazineSeries) -> MagazineSeries:
        self.session.add(series)
        self.session.commit()
        self.session.refresh(series)
        return series

    def get_by_id(self, series_id: int, owner_id: int) -> Optional[MagazineSeries]:
        return self.session.exec(
            select(MagazineSeries).where(
                MagazineSeries.id == series_id,
                MagazineSeries.owner_id == owner_id,
            )
        ).first()

    def get_all(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[MagazineSeries]:
        return list(self.session.exec(
            select(MagazineSeries)
            .where(MagazineSeries.owner_id == owner_id)
            .order_by(MagazineSeries.title)
            .offset(skip)
            .limit(limit)
        ))

    def update(self, series: MagazineSeries) -> MagazineSeries:
        self.session.add(series)
        self.session.commit()
        self.session.refresh(series)
        return series

    def delete(self, series: MagazineSeries) -> None:
        self.session.delete(series)
        self.session.commit()

    def count_issues(self, series_id: int, owner_id: int) -> int:
        return self.session.exec(
            select(func.count(MagazineIssue.id)).where(
                MagazineIssue.series_id == series_id,
                MagazineIssue.owner_id == owner_id,
            )
        ).one()


class MagazineIssueRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, issue: MagazineIssue) -> MagazineIssue:
        self.session.add(issue)
        self.session.commit()
        self.session.refresh(issue)
        return issue

    def bulk_create(self, issues: List[MagazineIssue]) -> List[MagazineIssue]:
        for issue in issues:
            self.session.add(issue)
        self.session.commit()
        for issue in issues:
            self.session.refresh(issue)
        return issues

    def get_by_id(self, issue_id: int, owner_id: int) -> Optional[MagazineIssue]:
        return self.session.exec(
            select(MagazineIssue)
            .where(MagazineIssue.id == issue_id, MagazineIssue.owner_id == owner_id)
            .options(selectinload(MagazineIssue.series))
        ).first()

    def get_by_series(self, series_id: int, owner_id: int, skip: int = 0, limit: int = 200) -> List[MagazineIssue]:
        return list(self.session.exec(
            select(MagazineIssue)
            .where(MagazineIssue.series_id == series_id, MagazineIssue.owner_id == owner_id)
            .options(selectinload(MagazineIssue.series))
            .order_by(MagazineIssue.issue_number)
            .offset(skip)
            .limit(limit)
        ))

    def get_all(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[MagazineIssue]:
        return list(self.session.exec(
            select(MagazineIssue)
            .where(MagazineIssue.owner_id == owner_id)
            .options(selectinload(MagazineIssue.series))
            .order_by(MagazineIssue.created_at.desc())
            .offset(skip)
            .limit(limit)
        ))

    def exists(self, series_id: int, issue_number: int, owner_id: int) -> bool:
        result = self.session.exec(
            select(MagazineIssue.id).where(
                MagazineIssue.series_id == series_id,
                MagazineIssue.issue_number == issue_number,
                MagazineIssue.owner_id == owner_id,
            )
        ).first()
        return result is not None

    def update(self, issue: MagazineIssue) -> MagazineIssue:
        self.session.add(issue)
        self.session.commit()
        self.session.refresh(issue)
        return issue

    def delete(self, issue: MagazineIssue) -> None:
        self.session.delete(issue)
        self.session.commit()
