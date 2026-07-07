from pydantic import Field
from sqlmodel import SQLModel
from typing import Optional

class PublisherRead(SQLModel):
    id: int
    name: str

class PublisherCreate(SQLModel):
    name: str = Field(min_length=1, max_length=200)

class PublisherUpdate(SQLModel):
    id: int
    name: str = Field(min_length=1, max_length=200)

