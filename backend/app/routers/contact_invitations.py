from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.db import get_session
from app.services.contact_invitation_service import ContactInvitationService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.schemas.ContactInvitation import (
    ContactInvitationRead,
    ContactInvitationCreate,
)


router = APIRouter(prefix="/contact-invitations", tags=["contact-invitations"])


def get_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ContactInvitationService:
    return ContactInvitationService(session, current_user_id=current_user.id)


@router.get("/received", response_model=List[ContactInvitationRead])
async def get_received(service: ContactInvitationService = Depends(get_service)):
    """Invitations reçues en attente"""
    return service.get_received()


@router.get("/sent", response_model=List[ContactInvitationRead])
async def get_sent(service: ContactInvitationService = Depends(get_service)):
    """Invitations envoyées"""
    return service.get_sent()


@router.get("/received/count")
async def get_pending_count(service: ContactInvitationService = Depends(get_service)):
    """Nombre d'invitations en attente (pour badge)"""
    return {"count": service.get_pending_received_count()}


@router.post("", response_model=ContactInvitationRead, status_code=201)
async def send_invitation(
    data: ContactInvitationCreate,
    service: ContactInvitationService = Depends(get_service),
):
    """Envoie une invitation de connexion à un utilisateur"""
    return service.send(data)


@router.post("/{inv_id}/accept", response_model=ContactInvitationRead)
async def accept_invitation(
    inv_id: int,
    service: ContactInvitationService = Depends(get_service),
):
    """Accepte une invitation → crée les contacts des deux côtés"""
    return service.accept(inv_id)


@router.post("/{inv_id}/decline", response_model=ContactInvitationRead)
async def decline_invitation(
    inv_id: int,
    service: ContactInvitationService = Depends(get_service),
):
    """Refuse une invitation"""
    return service.decline(inv_id)


@router.post("/{inv_id}/cancel", response_model=ContactInvitationRead)
async def cancel_invitation(
    inv_id: int,
    service: ContactInvitationService = Depends(get_service),
):
    """Annule une invitation envoyée"""
    return service.cancel(inv_id)
