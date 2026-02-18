from fastapi import HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
from app.models.Contact import Contact
from app.repositories.user_loan_request_repository import UserLoanRequestRepository
from app.repositories.book_repository import BookRepository
from app.repositories.loan_repository import LoanRepository
from app.schemas.UserLoanRequest import (
    UserLoanRequestRead,
    UserLoanRequestCreate,
    UserLoanRequestAccept,
    UserLoanRequestDecline,
    UserLoanRequestReturn,
)


def _to_read(req: UserLoanRequest) -> UserLoanRequestRead:
    """Convertit un UserLoanRequest ORM en schema de lecture avec les usernames dénormalisés"""
    return UserLoanRequestRead(
        id=req.id,
        requester_id=req.requester_id,
        requester_username=req.requester.username if req.requester else str(req.requester_id),
        lender_id=req.lender_id,
        lender_username=req.lender.username if req.lender else str(req.lender_id),
        book_id=req.book_id,
        book=req.book,
        status=req.status,
        message=req.message,
        response_message=req.response_message,
        request_date=req.request_date,
        response_date=req.response_date,
        due_date=req.due_date,
        return_date=req.return_date,
        created_at=req.created_at,
        updated_at=req.updated_at,
    )


class UserLoanRequestService:
    """Service pour les demandes de prêt inter-membres"""

    def __init__(self, session: Session, current_user_id: int):
        self.session = session
        self.current_user_id = current_user_id
        self.repo = UserLoanRequestRepository(session)
        self.book_repo = BookRepository(session)
        self.loan_repo = LoanRepository(session)

    def get_incoming(self, skip: int = 0, limit: int = 100) -> List[UserLoanRequestRead]:
        """Demandes reçues (je suis le prêteur potentiel)"""
        reqs = self.repo.get_incoming(self.current_user_id, skip, limit)
        return [_to_read(r) for r in reqs]

    def get_outgoing(self, skip: int = 0, limit: int = 100) -> List[UserLoanRequestRead]:
        """Demandes envoyées (j'ai demandé à emprunter)"""
        reqs = self.repo.get_outgoing(self.current_user_id, skip, limit)
        return [_to_read(r) for r in reqs]

    def get_pending_count(self) -> int:
        """Nombre de demandes en attente de réponse (pour badge)"""
        return self.repo.get_pending_incoming_count(self.current_user_id)

    def get_by_id(self, req_id: int) -> UserLoanRequestRead:
        req = self.repo.get_by_id(req_id, self.current_user_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable")
        return _to_read(req)

    def create(self, data: UserLoanRequestCreate) -> UserLoanRequestRead:
        """Crée une demande de prêt.

        Le livre doit appartenir au prêteur. L'accès est vérifié via le contact
        qui lie le demandeur au prêteur (library_shared=True).
        """
        # Récupérer le livre pour identifier le prêteur
        book = self.book_repo.get_by_id(data.book_id)
        if not book:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livre introuvable")

        lender_id = book.owner_id
        if not lender_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce livre n'a pas de propriétaire")

        if lender_id == self.current_user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous ne pouvez pas emprunter votre propre livre")

        # Vérifier que le livre est disponible au prêt
        if not book.is_lendable:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ce livre n'est pas disponible au prêt inter-membres"
            )

        # Vérifier que le prêteur a bien partagé sa bibliothèque avec le demandeur
        # (il doit exister un contact chez le prêteur avec linked_user_id = demandeur ET library_shared=True)
        contact = self.session.exec(
            select(Contact).where(
                Contact.owner_id == lender_id,
                Contact.linked_user_id == self.current_user_id,
                Contact.library_shared == True,
            )
        ).first()
        if not contact:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Le propriétaire de ce livre n'a pas partagé sa bibliothèque avec vous"
            )

        # Vérifier pas de demande PENDING déjà existante
        if self.repo.has_pending_request_for_book(data.book_id, self.current_user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous avez déjà une demande en attente pour ce livre"
            )

        # Vérifier pas de prêt actif (classique ou inter-membres)
        active_loan = self.loan_repo.get_active_loan_for_book(data.book_id, lender_id)
        if active_loan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce livre est déjà prêté"
            )

        active_user_loan = self.repo.get_active_request_for_book(data.book_id)
        if active_user_loan:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce livre est déjà prêté à un autre membre"
            )

        req = UserLoanRequest(
            requester_id=self.current_user_id,
            lender_id=lender_id,
            book_id=data.book_id,
            status=UserLoanRequestStatus.PENDING,
            message=data.message,
            due_date=data.due_date,
            request_date=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        created = self.repo.create(req)
        return _to_read(created)

    def accept(self, req_id: int, data: UserLoanRequestAccept) -> UserLoanRequestRead:
        """Accepte une demande (action du prêteur)"""
        req = self.repo.get_by_id(req_id, self.current_user_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable")

        if req.lender_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le prêteur peut accepter cette demande")

        if req.status != UserLoanRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible d'accepter une demande en statut '{req.status}'"
            )

        now = datetime.utcnow()
        req.status = UserLoanRequestStatus.ACCEPTED
        req.response_message = data.response_message
        req.response_date = now
        req.updated_at = now
        if data.due_date:
            req.due_date = data.due_date

        updated = self.repo.update(req)
        return _to_read(updated)

    def decline(self, req_id: int, data: UserLoanRequestDecline) -> UserLoanRequestRead:
        """Refuse une demande (action du prêteur)"""
        req = self.repo.get_by_id(req_id, self.current_user_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable")

        if req.lender_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le prêteur peut refuser cette demande")

        if req.status != UserLoanRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible de refuser une demande en statut '{req.status}'"
            )

        now = datetime.utcnow()
        req.status = UserLoanRequestStatus.DECLINED
        req.response_message = data.response_message
        req.response_date = now
        req.updated_at = now

        updated = self.repo.update(req)
        return _to_read(updated)

    def cancel(self, req_id: int) -> UserLoanRequestRead:
        """Annule une demande (action du demandeur)"""
        req = self.repo.get_by_id(req_id, self.current_user_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable")

        if req.requester_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le demandeur peut annuler cette demande")

        if req.status != UserLoanRequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible d'annuler une demande en statut '{req.status}'"
            )

        req.status = UserLoanRequestStatus.CANCELLED
        req.updated_at = datetime.utcnow()

        updated = self.repo.update(req)
        return _to_read(updated)

    def return_book(self, req_id: int, data: UserLoanRequestReturn) -> UserLoanRequestRead:
        """Marque le livre comme retourné (action du prêteur)"""
        req = self.repo.get_by_id(req_id, self.current_user_id)
        if not req:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable")

        if req.lender_id != self.current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seul le prêteur peut marquer le retour")

        if req.status != UserLoanRequestStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Impossible de marquer le retour d'une demande en statut '{req.status}'"
            )

        now = datetime.utcnow()
        req.status = UserLoanRequestStatus.RETURNED
        req.return_date = data.return_date or now
        req.updated_at = now

        updated = self.repo.update(req)
        return _to_read(updated)
