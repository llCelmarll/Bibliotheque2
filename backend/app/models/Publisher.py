from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional

class Publisher(SQLModel, table=True):
    __tablename__ = "publishers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    books: List["Book"] = Relationship(back_populates="publisher")