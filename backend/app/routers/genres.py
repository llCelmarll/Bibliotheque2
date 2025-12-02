from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List
from app.models.Genre import Genre
from app.models.User import User
from app.schemas.Genre import GenreRead, GenreCreate, GenreUpdate
from app.schemas.Search import GenreSearchResult
from app.db import get_session
from app.services.genre_service import GenreService
from app.services.auth_service import get_current_user

router = APIRouter(
	prefix="/genres",
	tags=["genres"]
)

def get_genre_service(session: Session = Depends(get_session)) -> GenreService:
	return GenreService(session)

@router.get("", response_model=List[GenreRead])
async def get_genres(
		current_user: User = Depends(get_current_user),
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.get_all(current_user.id)

@router.get("/search", response_model=GenreSearchResult)
async def search_genres(
		query: str = Query(..., min_length=1, description="Terme de recherche"),
		limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
		current_user: User = Depends(get_current_user),
		genre_service: GenreService = Depends(get_genre_service)
):
	"""Recherche fuzzy de genres"""
	results = genre_service.search_fuzzy(query, current_user.id, limit)
	return GenreSearchResult(
		results=results,
		total=len(results),
		query=query,
		limit=limit
	)

@router.get("/{genre_id}", response_model=GenreRead)
async def get_genre_by_id(
		genre_id: int,
		current_user: User = Depends(get_current_user),
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.get_by_id(genre_id, current_user.id)

@router.post("", response_model=GenreRead)
async def create_genre(
		genre: GenreCreate,
		current_user: User = Depends(get_current_user),
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.create(genre, current_user.id)

@router.put("", response_model=GenreRead)
async def update_genre(
		genre: GenreUpdate,
		current_user: User = Depends(get_current_user),
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.update(genre, current_user.id)

@router.delete("/{genre_id}")
async def delete_genre(
		genre_id: int,
		current_user: User = Depends(get_current_user),
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.delete(genre_id, current_user.id)