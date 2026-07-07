from pydantic import Field
from sqlmodel import SQLModel
from typing import Optional

class GenreRead(SQLModel):
    id: int
    name: str

class GenreCreate(SQLModel):
    name: str = Field(min_length=1, max_length=100)

class GenreUpdate(SQLModel):
    id: int
    name: str = Field(min_length=1, max_length=100)