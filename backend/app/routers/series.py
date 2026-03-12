from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session
from app.models.User import User
from app.schemas.Series import SeriesRead, SeriesCreate, SeriesUpdate
from app.schemas.Search import SeriesSearchResult
from app.db import get_session
from app.services.series_service import SeriesService
from app.services.auth_service import get_current_user, get_current_moderator_user

router = APIRouter(
	prefix="/series",
	tags=["series"]
)

def get_series_service(session: Session = Depends(get_session)) -> SeriesService:
	return SeriesService(session)

@router.get("", response_model=List[SeriesRead])
async def get_series(
		current_user: User = Depends(get_current_user),
		series_service: SeriesService = Depends(get_series_service)
):
	return series_service.get_all()

@router.get("/search", response_model=SeriesSearchResult)
async def search_series(
		query: str = Query(..., min_length=1, description="Terme de recherche"),
		limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
		current_user: User = Depends(get_current_user),
		series_service: SeriesService = Depends(get_series_service)
):
	"""Recherche fuzzy de séries"""
	results = series_service.search_fuzzy(query, limit)
	return SeriesSearchResult(
		results=results,
		total=len(results),
		query=query,
		limit=limit
	)

@router.get("/{series_id}", response_model=SeriesRead)
async def get_series_by_id(
		series_id: int,
		current_user: User = Depends(get_current_user),
		series_service: SeriesService = Depends(get_series_service)
):
	return series_service.get_by_id(series_id)

@router.post("", response_model=SeriesRead)
async def create_series(
		series: SeriesCreate,
		current_user: User = Depends(get_current_user),
		series_service: SeriesService = Depends(get_series_service)
):
	return series_service.create(series)

@router.put("", response_model=SeriesRead)
async def update_series(
		series: SeriesUpdate,
		current_user: User = Depends(get_current_moderator_user),
		series_service: SeriesService = Depends(get_series_service)
):
	return series_service.update(series)

@router.delete("/{series_id}")
async def delete_series(
		series_id: int,
		replacement_id: Optional[int] = Query(None, description="ID de la série de remplacement si utilisée par des livres"),
		current_user: User = Depends(get_current_moderator_user),
		series_service: SeriesService = Depends(get_series_service)
):
	return series_service.delete(series_id, replacement_id)
