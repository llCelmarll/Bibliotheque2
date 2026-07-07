from sqlmodel import SQLModel, Field, Relationship, Column, String, UniqueConstraint
from typing import List, Optional, ForwardRef

Book = ForwardRef("Book")

class Publisher(SQLModel, table=True):
    __tablename__ = "publishers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String, nullable=False, index=True))

    books: List["Book"] = Relationship(back_populates="publisher")

    # Contrainte d'unicité globale sur le nom
    __table_args__ = (
        UniqueConstraint("name", name="uq_publisher_name"),
    )