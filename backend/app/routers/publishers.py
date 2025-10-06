from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from app.models.Publisher import Publisher
from app.schemas.Publisher import PublisherRead
from app.db import get_session

router = APIRouter(
	prefix="/publishers",
	tags=["publishers"]
)

@router.get("", response_model=List[PublisherRead])
def list_publishers(session: Session = Depends(get_session)):
	publishers = session.exec(select(Publisher)).all()
	return publishers