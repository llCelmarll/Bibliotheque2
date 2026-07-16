from typing import List, Optional

from sqlmodel import Session, select

from app.models.borrowed_book_model import BorrowedBook
from app.models.contact_model import Contact
from app.models.contact_invitation_model import ContactInvitation
from app.models.loan_model import Loan
from app.models.user_loan_request_model import UserLoanRequest
from app.models.user_model import User
from app.models.user_push_token_model import UserPushToken


class AccountRepository:
    """Repository pour les opérations de données liées au compte utilisateur (profil, RGPD)."""

    def __init__(self, session: Session):
        self.session = session

    def get_user(self, user_id: int) -> Optional[User]:
        return self.session.get(User, user_id)

    def get_contacts_owned(self, user_id: int) -> List[Contact]:
        return self.session.exec(
            select(Contact).where(Contact.owner_id == user_id)
        ).all()

    def get_invitations(self, user_id: int) -> List[ContactInvitation]:
        return self.session.exec(
            select(ContactInvitation).where(
                (ContactInvitation.sender_id == user_id)
                | (ContactInvitation.recipient_id == user_id)
            )
        ).all()

    def get_loan_requests(self, user_id: int) -> List[UserLoanRequest]:
        return self.session.exec(
            select(UserLoanRequest).where(
                (UserLoanRequest.requester_id == user_id)
                | (UserLoanRequest.lender_id == user_id)
            )
        ).all()

    def get_loans_as_owner(self, user_id: int) -> List[Loan]:
        return self.session.exec(select(Loan).where(Loan.owner_id == user_id)).all()

    def get_borrowed_books(self, user_id: int) -> List[BorrowedBook]:
        return self.session.exec(
            select(BorrowedBook).where(BorrowedBook.user_id == user_id)
        ).all()

    def get_push_tokens(self, user_id: int) -> List[UserPushToken]:
        return self.session.exec(
            select(UserPushToken).where(UserPushToken.user_id == user_id)
        ).all()
