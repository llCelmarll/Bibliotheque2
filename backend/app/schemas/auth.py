# schemas/auth.py
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    """Modèle pour la création d'un utilisateur (inscription)"""
    email: EmailStr
    username: str
    password: str
    confirm_password: str
    
    @validator('username')
    def username_length(cls, v):
        if len(v) < 3:
            raise ValueError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
        if len(v) > 50:
            raise ValueError('Le nom d\'utilisateur ne peut pas dépasser 50 caractères')
        return v
    
    @validator('password')
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError('Le mot de passe doit contenir au moins 6 caractères')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Les mots de passe ne correspondent pas')
        return v

class UserLogin(BaseModel):
    """Modèle pour la connexion d'un utilisateur"""
    email: EmailStr
    password: str

class UserRead(BaseModel):
    """Modèle pour lire les informations d'un utilisateur"""
    id: int
    email: str
    username: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    """Modèle pour le token d'authentification"""
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    """Modèle pour la réponse après inscription"""
    user: UserRead
    token: Token