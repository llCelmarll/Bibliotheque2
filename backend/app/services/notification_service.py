from typing import Any, Dict

from sqlmodel import Session

from app.repositories.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, session: Session):
        self.session = session
        self.notification_repository = NotificationRepository(session)

    def get_counts(self, user_id: int) -> Dict[str, Any]:
        """Retourne les compteurs de notifications en une seule requête (pour le polling)."""
        invitation_pending = self.notification_repository.count_pending_invitations(user_id)
        loan_pending = self.notification_repository.count_pending_loan_requests(user_id)
        declined_ids = self.notification_repository.list_declined_outgoing_loan_request_ids(user_id)

        return {
            "invitation_pending": invitation_pending,
            "loan_pending": loan_pending,
            "declined_outgoing_ids": declined_ids,
        }
