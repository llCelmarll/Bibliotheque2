from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from app.models.Publisher import Publisher
from app.schemas.Publisher import PublisherRead, PublisherCreate, PublisherUpdate
from app.db import get_session
from app.services.publisher_service import PublisherService

router = APIRouter(
	prefix="/publishers",
	tags=["publishers"]
)

def get_publisher_service(session: Session = Depends(get_session)) -> PublisherService:
	return PublisherService(session)

@router.get("", response_model=List[PublisherRead])
def get_publishers(
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.get_all()

@router.get("/{publisher_id}", response_model=PublisherRead)
def get_publisher_by_id(
		publisher_id: int,
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.get_by_id(publisher_id)

@router.post("", response_model=PublisherRead)
def create_publisher(
		publisher: PublisherCreate,
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.create(publisher)

@router.put("", response_model=PublisherRead)
def update_publisher(
		publisher: PublisherUpdate,
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.update(publisher)

@router.delete("/{publisher_id}")
def delete_publisher(
		publisher_id: int,
		publisher_service: PublisherService = Depends(get_publisher_service)
):
	return publisher_service.delete(publisher_id)