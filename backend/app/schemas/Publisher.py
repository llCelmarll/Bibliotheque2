from sqlmodel import SQLModel
from typing import Optional

class PublisherRead(SQLModel):
    id: int
    name: str

class PublisherCreate(SQLModel):
    name: str

class PublisherUpdate(SQLModel):
    id: int
    name: str

