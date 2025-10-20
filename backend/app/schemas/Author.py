from sqlmodel import SQLModel

class AuthorRead(SQLModel):
    id: int
    name: str

class AuthorCreate(SQLModel):
    name: str

class AuthorUpdate(SQLModel):
    id: int
    name: str