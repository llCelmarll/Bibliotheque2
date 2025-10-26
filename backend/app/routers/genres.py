from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List
from app.models.Genre import Genre
from app.schemas.Genre import GenreRead, GenreCreate, GenreUpdate
from app.schemas.Search import GenreSearchResult
from app.db import get_session
from app.services.genre_service import GenreService

router = APIRouter(
	prefix="/genres",
	tags=["genres"]
)

def get_genre_service(session: Session = Depends(get_session)) -> GenreService:
	return GenreService(session)

@router.get("", response_model=List[GenreRead])
def get_genres(
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.get_all()

@router.get("/search", response_model=GenreSearchResult)
def search_genres(
		query: str = Query(..., min_length=1, description="Terme de recherche"),
		limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
		genre_service: GenreService = Depends(get_genre_service)
):
	"""Recherche fuzzy de genres"""
	results = genre_service.search_fuzzy(query, limit)
	return GenreSearchResult(
		results=results,
		total=len(results),
		query=query,
		limit=limit
	)

@router.get("/{genre_id}", response_model=GenreRead)
def get_genre_by_id(
		genre_id: int,
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.get_by_id(genre_id)

@router.post("", response_model=GenreRead)
def create_genre(
		genre: GenreCreate,
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.create(genre)

@router.put("", response_model=GenreRead)
def update_genre(
		genre: GenreUpdate,
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.update(genre)

@router.delete("/{genre_id}")
def delete_genre(
		genre_id: int,
		genre_service: GenreService = Depends(get_genre_service)
):
	return genre_service.delete(genre_id)