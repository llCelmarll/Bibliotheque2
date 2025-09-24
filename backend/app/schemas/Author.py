from sqlmodel import SQLModel
from typing import Optional

class AuthorRead(SQLModel):
    id: int
    name: str