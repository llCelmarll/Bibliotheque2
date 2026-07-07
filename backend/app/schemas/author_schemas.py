from pydantic import Field
from sqlmodel import SQLModel

class AuthorRead(SQLModel):
    id: int
    name: str

class AuthorCreate(SQLModel):
    name: str = Field(min_length=1, max_length=200)

class AuthorUpdate(SQLModel):
    id: int
    name: str = Field(min_length=1, max_length=200)