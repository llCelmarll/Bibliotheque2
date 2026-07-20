from typing import List

from sqlmodel import Session, func, select

from app.models.contact_invitation_model import ContactInvitation, InvitationStatus
from app.models.user_loan_request_model import UserLoanRequest, UserLoanRequestStatus


class NotificationRepository:
    """Repository pour les compteurs de notifications (invitations, demandes de prêt)."""

    def __init__(self, session: Session):
        self.session = session

    def count_pending_invitations(self, recipient_id: int) -> int:
        return self.session.exec(
            select(func.count(ContactInvitation.id)).where(
                ContactInvitation.recipient_id == recipient_id,
                ContactInvitation.status == InvitationStatus.PENDING,
            )
        ).one()

    def count_pending_loan_requests(self, lender_id: int) -> int:
        return self.session.exec(
            select(func.count(UserLoanRequest.id)).where(
                UserLoanRequest.lender_id == lender_id,
                UserLoanRequest.status == UserLoanRequestStatus.PENDING,
            )
        ).one()

    def list_declined_outgoing_loan_request_ids(self, requester_id: int) -> List[int]:
        return list(self.session.exec(
            select(UserLoanRequest.id).where(
                UserLoanRequest.requester_id == requester_id,
                UserLoanRequest.status == UserLoanRequestStatus.DECLINED,
            )
        ).all())
