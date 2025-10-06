from sqlmodel import Session, select
from fastapi import APIRouter, Depends
from app.models.Author import Author
from app.schemas.Author import AuthorRead
from app.db import get_session
from typing import List

router = APIRouter(
	prefix="/authors",
	tags=["authors"]
)

@router.get("", response_model=List[AuthorRead])
def get_authors(session: Session = Depends(get_session)):
	authors = session.exec(select(Author)).all()
	return authors