from sqlmodel import Session, select
from fastapi import APIRouter, Depends, Query
from app.schemas.Author import AuthorRead, AuthorUpdate, AuthorCreate
from app.schemas.Search import AuthorSearchResult
from app.services.author_service import AuthorService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.db import get_session
from typing import List

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
	return author_service.get_all(current_user.id)

@router.get("/search", response_model=AuthorSearchResult)
async def search_authors(
		query: str = Query(..., min_length=1, description="Terme de recherche"),
		limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	"""Recherche fuzzy d'auteurs"""
	results = author_service.search_fuzzy(query, current_user.id, limit)
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
	return author_service.get_by_id(author_id, current_user.id)

@router.post("", response_model=AuthorRead)
async def create_author(
		author: AuthorCreate,
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.create(author, current_user.id)

@router.put("", response_model=AuthorRead)
async def update_author(
		author: AuthorUpdate,
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.update(author, current_user.id)

@router.delete("/{author_id}")
async def delete_author(
		author_id: int,
		current_user: User = Depends(get_current_user),
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.delete(author_id, current_user.id)