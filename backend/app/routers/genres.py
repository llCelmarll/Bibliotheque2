from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from app.models.Genre import Genre
from app.schemas.Genre import GenreRead
from app.db import get_session

router = APIRouter(
	prefix="/genres",
	tags=["genres"]
)

@router.get("", response_model=List[GenreRead])
def list_genres(session: Session = Depends(get_session)):
	genres = session.exec(select(Genre)).all()
	return genres
