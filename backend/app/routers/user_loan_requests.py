from typing import List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.db import get_session
from app.services.user_loan_request_service import UserLoanRequestService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.schemas.UserLoanRequest import (
    UserLoanRequestRead,
    UserLoanRequestCreate,
    UserLoanRequestAccept,
    UserLoanRequestDecline,
    UserLoanRequestReturn,
)


router = APIRouter(prefix="/user-loans", tags=["user-loans"])


def get_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> UserLoanRequestService:
    return UserLoanRequestService(session, current_user_id=current_user.id)


@router.get("/incoming", response_model=List[UserLoanRequestRead])
async def get_incoming(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: UserLoanRequestService = Depends(get_service),
):
    """Demandes reçues (je suis le prêteur)"""
    return service.get_incoming(skip, limit)


@router.get("/outgoing", response_model=List[UserLoanRequestRead])
async def get_outgoing(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: UserLoanRequestService = Depends(get_service),
):
    """Demandes envoyées (j'ai demandé à emprunter)"""
    return service.get_outgoing(skip, limit)


@router.get("/incoming/count")
async def get_pending_count(
    service: UserLoanRequestService = Depends(get_service),
):
    """Nombre de demandes en attente (pour badge notification)"""
    return {"count": service.get_pending_count()}


@router.get("/{req_id}", response_model=UserLoanRequestRead)
async def get_request(
    req_id: int,
    service: UserLoanRequestService = Depends(get_service),
):
    """Détail d'une demande (accessible uniquement aux participants)"""
    return service.get_by_id(req_id)


@router.post("", response_model=UserLoanRequestRead, status_code=201)
async def create_request(
    data: UserLoanRequestCreate,
    service: UserLoanRequestService = Depends(get_service),
):
    """Crée une demande de prêt pour un livre (demandeur)"""
    return service.create(data)


@router.post("/{req_id}/accept", response_model=UserLoanRequestRead)
async def accept_request(
    req_id: int,
    data: UserLoanRequestAccept,
    service: UserLoanRequestService = Depends(get_service),
):
    """Accepte une demande (prêteur uniquement)"""
    return service.accept(req_id, data)


@router.post("/{req_id}/decline", response_model=UserLoanRequestRead)
async def decline_request(
    req_id: int,
    data: UserLoanRequestDecline,
    service: UserLoanRequestService = Depends(get_service),
):
    """Refuse une demande (prêteur uniquement)"""
    return service.decline(req_id, data)


@router.post("/{req_id}/cancel", response_model=UserLoanRequestRead)
async def cancel_request(
    req_id: int,
    service: UserLoanRequestService = Depends(get_service),
):
    """Annule une demande (demandeur uniquement)"""
    return service.cancel(req_id)


@router.put("/{req_id}/return", response_model=UserLoanRequestRead)
async def return_book(
    req_id: int,
    data: UserLoanRequestReturn = UserLoanRequestReturn(),
    service: UserLoanRequestService = Depends(get_service),
):
    """Marque le livre comme retourné (prêteur uniquement)"""
    return service.return_book(req_id, data)
