from sqlmodel import SQLModel
from typing import Optional


class SeriesRead(SQLModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class SeriesCreate(SQLModel):
    name: str


class SeriesUpdate(SQLModel):
    id: int
    name: str


class BookSeriesRead(SQLModel):
    """Série avec numéro de tome pour l'affichage dans un livre"""
    id: int
    name: str
    volume_number: Optional[int] = None
