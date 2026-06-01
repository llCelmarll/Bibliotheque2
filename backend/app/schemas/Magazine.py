from typing import Optional, List
from pydantic import Field, field_validator
from sqlmodel import SQLModel
from datetime import datetime

from app.models.MagazineSeries import Periodicity


class MagazineSeriesRead(SQLModel):
    id: int
    title: str
    publisher: Optional[str] = None
    periodicity: Optional[str] = None
    cover_url: Optional[str] = None
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    issue_count: int = 0


class MagazineSeriesCreate(SQLModel):
    title: str = Field(min_length=1, max_length=500)
    publisher: Optional[str] = Field(default=None, max_length=500)
    periodicity: Optional[Periodicity] = None
    cover_url: Optional[str] = Field(default=None, max_length=2000)


class MagazineSeriesUpdate(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    publisher: Optional[str] = Field(default=None, max_length=500)
    periodicity: Optional[Periodicity] = None
    cover_url: Optional[str] = Field(default=None, max_length=2000)


class MagazineIssueRead(SQLModel):
    id: int
    series_id: int
    series_title: Optional[str] = None
    issue_number: Optional[int] = None
    title: Optional[str] = None
    published_date: Optional[str] = None
    cover_url: Optional[str] = None
    owner_id: Optional[int] = None
    is_read: Optional[bool] = None
    read_date: Optional[datetime] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    is_lendable: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None
    current_loan: Optional[dict] = None


class MagazineIssueCreate(SQLModel):
    series_id: int
    issue_number: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=500)
    published_date: Optional[str] = Field(default=None, max_length=50)
    cover_url: Optional[str] = Field(default=None, max_length=2000)
    is_read: Optional[bool] = None
    read_date: Optional[datetime] = None
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = Field(default=None, max_length=5000)
    is_lendable: Optional[bool] = True


class MagazineIssueUpdate(SQLModel):
    issue_number: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=500)
    published_date: Optional[str] = Field(default=None, max_length=50)
    cover_url: Optional[str] = Field(default=None, max_length=2000)
    is_read: Optional[bool] = None
    read_date: Optional[datetime] = None
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    notes: Optional[str] = Field(default=None, max_length=5000)
    is_lendable: Optional[bool] = None


class MagazineIssueReadStatusUpdate(SQLModel):
    is_read: Optional[bool]
    read_date: Optional[datetime] = None


class MagazineIssueBulkCreate(SQLModel):
    """
    Crée plusieurs numéros d'un coup.
    issue_range accepte : "480-510, 520, 525"
    Plages et numéros individuels peuvent être mélangés.
    """
    series_id: int
    issue_range: str = Field(min_length=1, max_length=500)
    published_date_prefix: Optional[str] = Field(
        default=None,
        max_length=10,
        description="Préfixe de date ex: '2023' — sera combiné avec le numéro",
    )

    @field_validator("issue_range")
    @classmethod
    def validate_range(cls, v: str) -> str:
        try:
            _parse_issue_range(v)
        except Exception:
            raise ValueError(
                "Format invalide. Exemples valides : '480-510', '480, 482, 485', '480-490, 500'"
            )
        return v


def _parse_issue_range(range_str: str) -> List[int]:
    numbers: set[int] = set()
    for part in range_str.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            bounds = part.split("-")
            if len(bounds) != 2:
                raise ValueError(f"Plage invalide: {part}")
            start, end = int(bounds[0].strip()), int(bounds[1].strip())
            if start > end:
                raise ValueError(f"Début > fin dans la plage: {part}")
            if end - start > 10000:
                raise ValueError("Plage trop grande (max 10 000 numéros)")
            numbers.update(range(start, end + 1))
        else:
            numbers.add(int(part))
    return sorted(numbers)
