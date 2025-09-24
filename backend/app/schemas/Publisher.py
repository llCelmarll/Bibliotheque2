from sqlmodel import SQLModel
from typing import Optional

class PublisherRead(SQLModel):
    id: int
    name: str