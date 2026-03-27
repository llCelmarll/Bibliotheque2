from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.db import get_session
from app.services.auth_service import get_current_user
from app.models.User import User
from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
from app.models.ContactInvitation import ContactInvitation, InvitationStatus

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/counts")
async def get_notification_counts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Retourne les compteurs de notifications en une seule requête (pour le polling)."""
    invitation_pending = session.exec(
        select(func.count(ContactInvitation.id)).where(
            ContactInvitation.recipient_id == current_user.id,
            ContactInvitation.status == InvitationStatus.PENDING,
        )
    ).one()

    loan_pending = session.exec(
        select(func.count(UserLoanRequest.id)).where(
            UserLoanRequest.lender_id == current_user.id,
            UserLoanRequest.status == UserLoanRequestStatus.PENDING,
        )
    ).one()

    declined_ids: List[int] = list(session.exec(
        select(UserLoanRequest.id).where(
            UserLoanRequest.requester_id == current_user.id,
            UserLoanRequest.status == UserLoanRequestStatus.DECLINED,
        )
    ).all())

    return {
        "invitation_pending": invitation_pending,
        "loan_pending": loan_pending,
        "declined_outgoing_ids": declined_ids,
    }
