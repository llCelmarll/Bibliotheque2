from typing import List, Optional
from sqlmodel import Session, select, func, or_, and_
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.MagazineLoan import MagazineLoan
from app.models.Loan import LoanStatus


class MagazineLoanRepository:
    def __init__(self, session: Session):
        self.session = session

    def create(self, loan: MagazineLoan) -> MagazineLoan:
        self.session.add(loan)
        self.session.commit()
        self.session.refresh(loan)
        return loan

    def get_by_id(self, loan_id: int, owner_id: int) -> Optional[MagazineLoan]:
        return self.session.exec(
            select(MagazineLoan)
            .where(MagazineLoan.id == loan_id, MagazineLoan.owner_id == owner_id)
            .options(selectinload(MagazineLoan.contact))
        ).first()

    def get_all(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[MagazineLoan]:
        return list(self.session.exec(
            select(MagazineLoan)
            .where(MagazineLoan.owner_id == owner_id)
            .options(selectinload(MagazineLoan.contact))
            .order_by(MagazineLoan.loan_date.desc())
            .offset(skip)
            .limit(limit)
        ))

    def get_active_loans(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[MagazineLoan]:
        return list(self.session.exec(
            select(MagazineLoan)
            .where(
                MagazineLoan.owner_id == owner_id,
                or_(
                    MagazineLoan.status == LoanStatus.ACTIVE,
                    MagazineLoan.status == LoanStatus.OVERDUE,
                ),
            )
            .options(selectinload(MagazineLoan.contact))
            .order_by(MagazineLoan.loan_date.desc())
            .offset(skip)
            .limit(limit)
        ))

    def get_overdue_loans(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[MagazineLoan]:
        return list(self.session.exec(
            select(MagazineLoan)
            .where(
                MagazineLoan.owner_id == owner_id,
                or_(
                    MagazineLoan.status == LoanStatus.OVERDUE,
                    and_(
                        MagazineLoan.status == LoanStatus.ACTIVE,
                        MagazineLoan.due_date != None,
                        MagazineLoan.due_date < datetime.utcnow(),
                    ),
                ),
            )
            .options(selectinload(MagazineLoan.contact))
            .order_by(MagazineLoan.due_date)
            .offset(skip)
            .limit(limit)
        ))

    def get_active_loan_for_issue(self, issue_id: int, owner_id: int) -> Optional[MagazineLoan]:
        return self.session.exec(
            select(MagazineLoan)
            .where(
                MagazineLoan.issue_id == issue_id,
                MagazineLoan.owner_id == owner_id,
                or_(
                    MagazineLoan.status == LoanStatus.ACTIVE,
                    MagazineLoan.status == LoanStatus.OVERDUE,
                ),
            )
            .options(selectinload(MagazineLoan.contact))
        ).first()

    def get_loans_by_issue(self, issue_id: int, owner_id: int) -> List[MagazineLoan]:
        return list(self.session.exec(
            select(MagazineLoan)
            .where(MagazineLoan.issue_id == issue_id, MagazineLoan.owner_id == owner_id)
            .options(selectinload(MagazineLoan.contact))
            .order_by(MagazineLoan.loan_date.desc())
        ))

    def get_loans_by_contact(self, contact_id: int, owner_id: int) -> List[MagazineLoan]:
        return list(self.session.exec(
            select(MagazineLoan)
            .where(MagazineLoan.contact_id == contact_id, MagazineLoan.owner_id == owner_id)
            .options(selectinload(MagazineLoan.contact))
            .order_by(MagazineLoan.loan_date.desc())
        ))

    def update(self, loan: MagazineLoan) -> MagazineLoan:
        self.session.add(loan)
        self.session.commit()
        self.session.refresh(loan)
        return loan

    def delete(self, loan: MagazineLoan) -> None:
        self.session.delete(loan)
        self.session.commit()

    def count_by_owner(self, owner_id: int) -> int:
        return self.session.exec(
            select(func.count(MagazineLoan.id)).where(MagazineLoan.owner_id == owner_id)
        ).one()

    def count_active_by_owner(self, owner_id: int) -> int:
        return self.session.exec(
            select(func.count(MagazineLoan.id)).where(
                MagazineLoan.owner_id == owner_id,
                or_(
                    MagazineLoan.status == LoanStatus.ACTIVE,
                    MagazineLoan.status == LoanStatus.OVERDUE,
                ),
            )
        ).one()
