import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, select

from app.db import engine
from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
from app.models.Loan import Loan
from app.services.push_notification_service import push_notification_service


async def check_due_date_reminders():
    """Notifie les emprunteurs dont la date de retour arrive dans 48h."""
    now = datetime.utcnow()
    window_start = now
    window_end = now + timedelta(hours=48)

    with Session(engine) as session:
        # Rappels pour les demandes de prêt inter-membres acceptées
        user_loans = session.exec(
            select(UserLoanRequest).where(
                UserLoanRequest.status == UserLoanRequestStatus.ACCEPTED,
                UserLoanRequest.due_date >= window_start,
                UserLoanRequest.due_date <= window_end,
            )
        ).all()

        for req in user_loans:
            book_title = req.book.title if req.book else "un livre"
            # Notifier le demandeur (emprunteur)
            await push_notification_service.send_to_user(
                session,
                req.requester_id,
                "Rappel de retour",
                f"Le retour de « {book_title} » est prévu dans moins de 48h",
            )
            # Notifier aussi le prêteur
            await push_notification_service.send_to_user(
                session,
                req.lender_id,
                "Rappel de retour",
                f"« {book_title} » doit être rendu dans moins de 48h",
            )

        # Rappels pour les prêts classiques
        loans = session.exec(
            select(Loan).where(
                Loan.return_date.is_(None),
                Loan.due_date >= window_start,
                Loan.due_date <= window_end,
            )
        ).all()

        for loan in loans:
            book_title = loan.book.title if loan.book else "un livre"
            await push_notification_service.send_to_user(
                session,
                loan.owner_id,
                "Rappel de retour",
                f"« {book_title} » doit être rendu dans moins de 48h",
            )

    print(f"[Scheduler] Vérification rappels effectuée : {len(user_loans)} prêts membres, {len(loans)} prêts classiques")


async def scheduler_loop():
    while True:
        try:
            await check_due_date_reminders()
        except Exception as e:
            print(f"[Scheduler] Erreur : {e}")
        await asyncio.sleep(86400)  # 24h


def start_scheduler():
    asyncio.create_task(scheduler_loop())
