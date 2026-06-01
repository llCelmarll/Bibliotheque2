from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.MagazineLoan import MagazineLoan
from app.models.Loan import LoanStatus
from app.repositories.magazine_loan_repository import MagazineLoanRepository
from app.repositories.magazine_repository import MagazineIssueRepository
from app.repositories.contact_repository import ContactRepository
from app.schemas.MagazineLoan import MagazineLoanCreate, MagazineLoanRead, MagazineLoanUpdate, MagazineLoanReturn
from app.services.contact_service import ContactService


class MagazineLoanService:
    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.loan_repo = MagazineLoanRepository(session)
        self.issue_repo = MagazineIssueRepository(session)
        self.contact_repo = ContactRepository(session)
        self.contact_service = ContactService(session, user_id)

    def get_all(self, skip: int = 0, limit: int = 100) -> List[MagazineLoanRead]:
        loans = self.loan_repo.get_all(self.user_id, skip, limit)
        return [MagazineLoanRead.model_validate(loan) for loan in loans]

    def get_active_loans(self, skip: int = 0, limit: int = 100) -> List[MagazineLoanRead]:
        loans = self.loan_repo.get_active_loans(self.user_id, skip, limit)
        self._update_overdue_status(loans)
        return [MagazineLoanRead.model_validate(loan) for loan in loans]

    def get_overdue_loans(self, skip: int = 0, limit: int = 100) -> List[MagazineLoanRead]:
        loans = self.loan_repo.get_overdue_loans(self.user_id, skip, limit)
        self._update_overdue_status(loans)
        return [MagazineLoanRead.model_validate(loan) for loan in loans]

    def get_by_id(self, loan_id: int) -> MagazineLoanRead:
        loan = self._get_loan_or_404(loan_id)
        self._update_overdue_status([loan])
        return MagazineLoanRead.model_validate(loan)

    def create(self, data: MagazineLoanCreate) -> MagazineLoanRead:
        issue = self.issue_repo.get_by_id(data.issue_id, self.user_id)
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Numéro introuvable")

        active = self.loan_repo.get_active_loan_for_issue(data.issue_id, self.user_id)
        if active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ce numéro est déjà prêté à {active.contact.name}",
            )

        contact_id = self._process_contact(data.contact)

        loan = MagazineLoan(
            issue_id=data.issue_id,
            contact_id=contact_id,
            owner_id=self.user_id,
            loan_date=data.loan_date or datetime.utcnow(),
            due_date=data.due_date,
            status=LoanStatus.ACTIVE,
            notes=data.notes,
        )
        loan = self.loan_repo.create(loan)
        return MagazineLoanRead.model_validate(loan)

    def update(self, loan_id: int, data: MagazineLoanUpdate) -> MagazineLoanRead:
        loan = self._get_loan_or_404(loan_id)

        if data.loan_date is not None:
            loan.loan_date = data.loan_date
        if data.due_date is not None:
            loan.due_date = data.due_date
            if loan.status != LoanStatus.RETURNED:
                loan.status = LoanStatus.OVERDUE if loan.due_date < datetime.utcnow() else LoanStatus.ACTIVE
        if data.return_date is not None:
            loan.return_date = data.return_date
            if loan.status != LoanStatus.RETURNED:
                loan.status = LoanStatus.RETURNED
        if data.status is not None:
            loan.status = data.status
        if data.notes is not None:
            loan.notes = data.notes
        if data.calendar_event_id is not None or "calendar_event_id" in data.model_fields_set:
            loan.calendar_event_id = data.calendar_event_id

        loan = self.loan_repo.update(loan)
        return MagazineLoanRead.model_validate(loan)

    def return_loan(self, loan_id: int, return_data: Optional[MagazineLoanReturn] = None) -> MagazineLoanRead:
        loan = self._get_loan_or_404(loan_id)

        if loan.status == LoanStatus.RETURNED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce numéro a déjà été retourné",
            )

        loan.return_date = return_data.return_date if return_data and return_data.return_date else datetime.utcnow()
        loan.status = LoanStatus.RETURNED
        loan = self.loan_repo.update(loan)
        return MagazineLoanRead.model_validate(loan)

    def delete(self, loan_id: int) -> None:
        loan = self._get_loan_or_404(loan_id)
        self.loan_repo.delete(loan)

    def get_loans_by_issue(self, issue_id: int) -> List[MagazineLoanRead]:
        issue = self.issue_repo.get_by_id(issue_id, self.user_id)
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Numéro introuvable")
        loans = self.loan_repo.get_loans_by_issue(issue_id, self.user_id)
        return [MagazineLoanRead.model_validate(loan) for loan in loans]

    def get_statistics(self) -> Dict[str, Any]:
        total = self.loan_repo.count_by_owner(self.user_id)
        active = self.loan_repo.count_active_by_owner(self.user_id)
        return {
            "total_loans": total,
            "active_loans": active,
            "returned_loans": total - active,
        }

    def _get_loan_or_404(self, loan_id: int) -> MagazineLoan:
        loan = self.loan_repo.get_by_id(loan_id, self.user_id)
        if not loan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prêt introuvable")
        return loan

    def _process_contact(self, contact_input: int | str | Dict[str, Any]) -> int:
        if isinstance(contact_input, int):
            contact = self.contact_repo.get_by_id(contact_input, self.user_id)
            if not contact:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact introuvable")
            return contact.id

        if isinstance(contact_input, str):
            contact = self.contact_service.get_or_create_by_name(contact_input)
            return contact.id

        if isinstance(contact_input, dict):
            name = contact_input.get("name")
            if not name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Le nom du contact est requis")
            existing = self.contact_repo.get_by_name(name, self.user_id)
            if existing:
                return existing.id
            from app.models.Contact import Contact
            new_contact = Contact(
                name=name,
                email=contact_input.get("email"),
                phone=contact_input.get("phone"),
                notes=contact_input.get("notes"),
                owner_id=self.user_id,
            )
            contact = self.contact_repo.create(new_contact)
            return contact.id

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format de contact invalide")

    def _update_overdue_status(self, loans: List[MagazineLoan]) -> None:
        now = datetime.utcnow()
        for loan in loans:
            if loan.status == LoanStatus.ACTIVE and loan.due_date and loan.due_date < now:
                loan.status = LoanStatus.OVERDUE
                self.loan_repo.update(loan)
