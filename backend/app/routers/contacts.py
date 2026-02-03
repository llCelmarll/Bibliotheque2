from sqlmodel import Session
from fastapi import APIRouter, Depends, Query
from typing import List

from app.schemas.Contact import ContactRead, ContactCreate, ContactUpdate
from app.services.contact_service import ContactService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.db import get_session


router = APIRouter(
    prefix="/contacts",
    tags=["contacts"]
)


def get_contact_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> ContactService:
    return ContactService(session, current_user.id)


@router.get("", response_model=List[ContactRead])
async def get_contacts(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum de résultats"),
    contact_service: ContactService = Depends(get_contact_service)
):
    """Récupère tous les contacts de l'utilisateur"""
    return contact_service.get_all(skip, limit)


@router.get("/search", response_model=List[ContactRead])
async def search_contacts(
    query: str = Query(..., min_length=1, description="Terme de recherche"),
    limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
    contact_service: ContactService = Depends(get_contact_service)
):
    """Recherche fuzzy de contacts par nom"""
    return contact_service.search_fuzzy(query, limit)


@router.get("/{contact_id}", response_model=ContactRead)
async def get_contact_by_id(
    contact_id: int,
    contact_service: ContactService = Depends(get_contact_service)
):
    """Récupère un contact par son ID"""
    return contact_service.get_by_id(contact_id)


@router.post("", response_model=ContactRead, status_code=201)
async def create_contact(
    contact: ContactCreate,
    contact_service: ContactService = Depends(get_contact_service)
):
    """Crée un nouveau contact"""
    return contact_service.create(contact)


@router.put("/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: int,
    contact: ContactUpdate,
    contact_service: ContactService = Depends(get_contact_service)
):
    """Met à jour un contact"""
    return contact_service.update(contact_id, contact)


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: int,
    contact_service: ContactService = Depends(get_contact_service)
):
    """Supprime un contact (impossible s'il a des prêts ou emprunts actifs)"""
    contact_service.delete(contact_id)
    return None
