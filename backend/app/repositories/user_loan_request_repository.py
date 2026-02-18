from typing import List, Optional
from sqlmodel import Session, select, func, or_
from sqlalchemy.orm import selectinload
from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus


class UserLoanRequestRepository:
    """Repository pour les demandes de prêt inter-membres"""

    def __init__(self, session: Session):
        self.session = session

    def _base_query(self):
        return (
            select(UserLoanRequest)
            .options(
                selectinload(UserLoanRequest.book),
                selectinload(UserLoanRequest.requester),
                selectinload(UserLoanRequest.lender),
            )
        )

    def create(self, req: UserLoanRequest) -> UserLoanRequest:
        self.session.add(req)
        self.session.commit()
        self.session.refresh(req)
        return self.get_by_id_internal(req.id)

    def get_by_id_internal(self, req_id: int) -> Optional[UserLoanRequest]:
        """Retourne une demande par son ID (sans restriction d'accès)"""
        statement = self._base_query().where(UserLoanRequest.id == req_id)
        return self.session.exec(statement).first()

    def get_by_id(self, req_id: int, user_id: int) -> Optional[UserLoanRequest]:
        """Retourne une demande si l'utilisateur est participant (requester ou lender)"""
        statement = (
            self._base_query()
            .where(
                UserLoanRequest.id == req_id,
                or_(
                    UserLoanRequest.requester_id == user_id,
                    UserLoanRequest.lender_id == user_id,
                )
            )
        )
        return self.session.exec(statement).first()

    def get_incoming(self, lender_id: int, skip: int = 0, limit: int = 100) -> List[UserLoanRequest]:
        """Demandes reçues (vue prêteur), toutes sauf CANCELLED"""
        statement = (
            self._base_query()
            .where(
                UserLoanRequest.lender_id == lender_id,
                UserLoanRequest.status != UserLoanRequestStatus.CANCELLED,
            )
            .offset(skip)
            .limit(limit)
            .order_by(UserLoanRequest.request_date.desc())
        )
        return list(self.session.exec(statement))

    def get_outgoing(self, requester_id: int, skip: int = 0, limit: int = 100) -> List[UserLoanRequest]:
        """Demandes envoyées (vue demandeur), toutes sauf DECLINED"""
        statement = (
            self._base_query()
            .where(
                UserLoanRequest.requester_id == requester_id,
                UserLoanRequest.status != UserLoanRequestStatus.DECLINED,
            )
            .offset(skip)
            .limit(limit)
            .order_by(UserLoanRequest.request_date.desc())
        )
        return list(self.session.exec(statement))

    def get_pending_incoming_count(self, lender_id: int) -> int:
        """Nombre de demandes PENDING en attente de réponse (pour le badge)"""
        statement = select(func.count(UserLoanRequest.id)).where(
            UserLoanRequest.lender_id == lender_id,
            UserLoanRequest.status == UserLoanRequestStatus.PENDING,
        )
        return self.session.exec(statement).one()

    def get_active_request_for_book(self, book_id: int) -> Optional[UserLoanRequest]:
        """Retourne la demande ACCEPTED active pour un livre (empêche le double-prêt)"""
        statement = (
            select(UserLoanRequest)
            .where(
                UserLoanRequest.book_id == book_id,
                UserLoanRequest.status == UserLoanRequestStatus.ACCEPTED,
            )
        )
        return self.session.exec(statement).first()

    def has_pending_request_for_book(self, book_id: int, requester_id: int) -> bool:
        """Vérifie si le demandeur a déjà une demande PENDING pour ce livre"""
        statement = select(func.count(UserLoanRequest.id)).where(
            UserLoanRequest.book_id == book_id,
            UserLoanRequest.requester_id == requester_id,
            UserLoanRequest.status == UserLoanRequestStatus.PENDING,
        )
        return self.session.exec(statement).one() > 0

    def update(self, req: UserLoanRequest) -> UserLoanRequest:
        self.session.add(req)
        self.session.commit()
        self.session.refresh(req)
        return self.get_by_id_internal(req.id)
