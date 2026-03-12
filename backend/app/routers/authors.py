from typing import List, Optional
from sqlmodel import Session
from fastapi import APIRouter, Depends, Query
from app.schemas.Author import AuthorRead, AuthorUpdate, AuthorCreate
from app.schemas.Search import AuthorSearchResult
from app.services.author_service import AuthorService
from app.services.auth_service import get_current_user, get_current_moderator_user
from app.models.User import User
from app.db import get_session

router = APIRouter(
	prefix="/authors",
	tags=["authors"]
)

def get_author_service(session: Session = Depends(get_session)) -> AuthorService:
	return AuthorService(session)

@router.get("", response_model=List[AuthorRead])
async def get_authors(
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.get_all()

@router.get("/search", response_model=AuthorSearchResult)
async def search_authors(
		query: str = Query(..., min_length=1, description="Terme de recherche"),
		limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	"""Recherche fuzzy d'auteurs"""
	results = author_service.search_fuzzy(query, limit)
	return AuthorSearchResult(
		results=results,
		total=len(results),
		query=query,
		limit=limit
	)

@router.get("/{author_id}", response_model=AuthorRead)
async def get_author_by_id(
		author_id: int,
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.get_by_id(author_id)

@router.post("", response_model=AuthorRead)
async def create_author(
		author: AuthorCreate,
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.create(author)

@router.put("", response_model=AuthorRead)
async def update_author(
		author: AuthorUpdate,
		current_user: User = Depends(get_current_moderator_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.update(author)

@router.delete("/{author_id}")
async def delete_author(
		author_id: int,
		replacement_id: Optional[int] = Query(None, description="ID de l'auteur de remplacement si utilisé par des livres"),
		current_user: User = Depends(get_current_moderator_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.delete(author_id, replacement_id)
