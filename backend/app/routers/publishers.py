from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List
from app.models.Publisher import Publisher
from app.models.User import User
from app.schemas.Publisher import PublisherRead, PublisherCreate, PublisherUpdate
from app.schemas.Search import PublisherSearchResult
from app.db import get_session
from app.services.publisher_service import PublisherService
from app.services.auth_service import get_current_user

router = APIRouter(
	prefix="/publishers",
	tags=["publishers"]
)

def get_publisher_service(session: Session = Depends(get_session)) -> PublisherService:
	return PublisherService(session)

@router.get("", response_model=List[PublisherRead])
async def get_publishers(
		current_user: User = Depends(get_current_user),
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.get_all(current_user.id)

@router.get("/search", response_model=PublisherSearchResult)
async def search_publishers(
		query: str = Query(..., min_length=1, description="Terme de recherche"),
		limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
		current_user: User = Depends(get_current_user),
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	"""Recherche fuzzy d'éditeurs"""
	results = publisher_service.search_fuzzy(query, current_user.id, limit)
	return PublisherSearchResult(
		results=results,
		total=len(results),
		query=query,
		limit=limit
	)

@router.get("/{publisher_id}", response_model=PublisherRead)
async def get_publisher_by_id(
		publisher_id: int,
		current_user: User = Depends(get_current_user),
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.get_by_id(publisher_id, current_user.id)

@router.post("", response_model=PublisherRead)
async def create_publisher(
		publisher: PublisherCreate,
		current_user: User = Depends(get_current_user),
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.create(publisher, current_user.id)

@router.put("", response_model=PublisherRead)
async def update_publisher(
		publisher: PublisherUpdate,
		current_user: User = Depends(get_current_user),
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.update(publisher, current_user.id)

@router.delete("/{publisher_id}")
async def delete_publisher(
		publisher_id: int,
		current_user: User = Depends(get_current_user),
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.delete(publisher_id, current_user.id)