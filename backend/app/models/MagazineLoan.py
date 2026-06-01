from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Column, String, DateTime, Relationship
from datetime import datetime

from app.models.Loan import LoanStatus

if TYPE_CHECKING:
    from app.models.MagazineIssue import MagazineIssue
    from app.models.User import User
    from app.models.Contact import Contact


class MagazineLoan(SQLModel, table=True):
    __tablename__ = "magazine_loans"

    id: Optional[int] = Field(default=None, primary_key=True)

    issue_id: int = Field(foreign_key="magazine_issues.id", index=True)
    issue: Optional["MagazineIssue"] = Relationship(back_populates="loans")

    owner_id: int = Field(foreign_key="users.id", index=True)

    contact_id: int = Field(foreign_key="contacts.id", index=True)

    loan_date: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    due_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )
    return_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime, nullable=True),
    )

    status: LoanStatus = Field(
        default=LoanStatus.ACTIVE,
        sa_column=Column(String, nullable=False),
    )

    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True),
    )

    calendar_event_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String, nullable=True),
    )
