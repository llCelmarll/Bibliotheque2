from sqlmodel import Session, select
from fastapi import APIRouter, Depends
from app.schemas.Author import AuthorRead, AuthorUpdate, AuthorCreate
from app.services.author_service import AuthorService
from app.db import get_session
from typing import List

router = APIRouter(
	prefix="/authors",
	tags=["authors"]
)

def get_author_service(session: Session = Depends(get_session)) -> AuthorService:
	return AuthorService(session)

@router.get("", response_model=List[AuthorRead])
def get_authors(
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.get_all()

@router.get("/{author_id}", response_model=AuthorRead)
def get_author_by_id(
		author_id: int,
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.get_by_id(author_id)

@router.post("", response_model=AuthorRead)
def create_author(
		author: AuthorCreate,
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.create(author)

@router.put("", response_model=AuthorRead)
def update_author(
		author: AuthorUpdate,
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.update(author)

@router.delete("/{author_id}")
def delete_author(
		author_id: int,
		author_service: AuthorService = Depends(get_author_service)
):
	return author_service.delete(author_id)