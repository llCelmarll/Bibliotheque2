from sqlmodel import SQLModel
from typing import Optional

class GenreRead(SQLModel):
    id: int
    name: str

class GenreCreate(SQLModel):
    name: str

class GenreUpdate(SQLModel):
    id: int
    name: str