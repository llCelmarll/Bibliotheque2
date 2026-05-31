from pydantic import Field
from sqlmodel import SQLModel
from typing import Optional


class SeriesRead(SQLModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class SeriesCreate(SQLModel):
    name: str = Field(min_length=1, max_length=200)


class SeriesUpdate(SQLModel):
    id: int
    name: str = Field(min_length=1, max_length=200)


class BookSeriesRead(SQLModel):
    """Série avec numéro de tome pour l'affichage dans un livre"""
    id: int
    name: str
    volume_number: Optional[int] = None
