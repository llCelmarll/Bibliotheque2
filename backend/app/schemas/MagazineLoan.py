from typing import Optional, Dict, Any
from pydantic import Field
from sqlmodel import SQLModel
from datetime import datetime

from app.models.Loan import LoanStatus
from app.schemas.Contact import ContactRead


class MagazineLoanRead(SQLModel):
    id: int
    issue_id: int
    contact_id: int
    contact: Optional[ContactRead] = None
    loan_date: datetime
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    status: LoanStatus
    notes: Optional[str] = None
    calendar_event_id: Optional[str] = None


class MagazineLoanCreate(SQLModel):
    issue_id: int
    contact: int | str | Dict[str, Any]
    loan_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=2000)


class MagazineLoanUpdate(SQLModel):
    loan_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    status: Optional[LoanStatus] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    calendar_event_id: Optional[str] = None


class MagazineLoanReturn(SQLModel):
    return_date: Optional[datetime] = None
