from typing import List, Optional

from sqlmodel import Session, select

from app.models.book_model import Book
from app.models.borrowed_book_model import BorrowedBook
from app.models.contact_model import Contact
from app.models.contact_invitation_model import ContactInvitation
from app.models.email_verification_token_model import EmailVerificationToken
from app.models.loan_model import Loan
from app.models.password_reset_token_model import PasswordResetToken
from app.models.user_loan_request_model import UserLoanRequest
from app.models.user_model import User
from app.models.user_push_token_model import UserPushToken


class AccountRepository:
    """Repository pour les opérations de données liées au compte utilisateur (profil, RGPD, suppression)."""

    def __init__(self, session: Session):
        self.session = session

    def get_user(self, user_id: int) -> Optional[User]:
        return self.session.get(User, user_id)

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.session.exec(select(User).where(User.email == email)).first()

    def email_taken(self, email: str) -> bool:
        return self.session.exec(select(User).where(User.email == email)).first() is not None

    def update_user_fields(self, user: User) -> User:
        self.session.add(user)
        return user

    # --- Password reset tokens ---

    def list_unused_reset_tokens(self, user_id: int) -> List[PasswordResetToken]:
        return self.session.exec(
            select(PasswordResetToken).where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used == False,
            )
        ).all()

    def add_reset_token(self, token: PasswordResetToken) -> PasswordResetToken:
        self.session.add(token)
        return token

    def get_reset_token_by_value(self, token: str) -> Optional[PasswordResetToken]:
        return self.session.exec(
            select(PasswordResetToken).where(PasswordResetToken.token == token)
        ).first()

    def mark_reset_token_used(self, token: PasswordResetToken) -> PasswordResetToken:
        token.used = True
        self.session.add(token)
        return token

    # --- Suppression de compte (cascade) ---

    def list_reset_tokens(self, user_id: int) -> List[PasswordResetToken]:
        return self.session.exec(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
        ).all()

    def list_email_verification_tokens(self, user_id: int) -> List[EmailVerificationToken]:
        return self.session.exec(
            select(EmailVerificationToken).where(EmailVerificationToken.user_id == user_id)
        ).all()

    def list_contacts_linked_to_user(self, user_id: int) -> List[Contact]:
        return self.session.exec(
            select(Contact).where(Contact.linked_user_id == user_id)
        ).all()

    def unlink_contact(self, contact: Contact) -> Contact:
        contact.linked_user_id = None
        contact.library_shared = False
        self.session.add(contact)
        return contact

    def list_books_owned(self, user_id: int) -> List[Book]:
        return self.session.exec(select(Book).where(Book.owner_id == user_id)).all()

    def delete_entity(self, entity) -> None:
        self.session.delete(entity)

    def delete_user(self, user: User) -> None:
        self.session.delete(user)

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
