from typing import Optional, List, TYPE_CHECKING
from sqlmodel import Field, SQLModel, Column, String, UniqueConstraint, Relationship, DateTime
from datetime import datetime

if TYPE_CHECKING:
    from app.models.Book import Book

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Authentification
    email: str = Field(sa_column=Column(String, nullable=False, unique=True, index=True))
    username: str = Field(sa_column=Column(String, nullable=False))
    hashed_password: str = Field(sa_column=Column(String, nullable=False))
    
    # État du compte
    is_active: bool = Field(default=True)
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column=Column(DateTime, nullable=False),
    )
    
    # Relations
    books: List["Book"] = Relationship(back_populates="owner")
    
    # Contraintes
    __table_args__ = (
        UniqueConstraint("email", name="uq_user_email"),
    )