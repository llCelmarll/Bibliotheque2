from typing import Optional
from pydantic import BaseModel, EmailStr
from sqlmodel import SQLModel
from datetime import datetime

# Schema pour la connexion
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Schema pour la création d'utilisateur (futur, pour les invitations)
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

# Schema pour la lecture d'un utilisateur
class UserRead(SQLModel):
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime

# Schema pour la réponse de token
class Token(BaseModel):
    access_token: str
    token_type: str

# Schema pour les données du token
class TokenData(BaseModel):
    user_id: Optional[int] = None