from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.Publisher import Publisher
from app.repositories.publisher_repository import PublisherRepository
from app.schemas.Publisher import PublisherCreate, PublisherRead, PublisherUpdate