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

class ForgotPasswordRequest(BaseModel):
    """Demande de réinitialisation de mot de passe"""
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Réinitialisation du mot de passe via token"""
    token: str
    new_password: str
    confirm_new_password: str

    @validator('new_password')
    def password_strength(cls, v):
        import re
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        if not re.search(r'[a-z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une minuscule')
        if not re.search(r'[0-9]', v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        return v

    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Les mots de passe ne correspondent pas')
        return v

class ChangePasswordRequest(BaseModel):
    """Changement de mot de passe (utilisateur connecté)"""
    current_password: str
    new_password: str
    confirm_new_password: str

    @validator('new_password')
    def password_strength(cls, v):
        import re
        if len(v) < 8:
            raise ValueError('Le mot de passe doit contenir au moins 8 caractères')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une majuscule')
        if not re.search(r'[a-z]', v):
            raise ValueError('Le mot de passe doit contenir au moins une minuscule')
        if not re.search(r'[0-9]', v):
            raise ValueError('Le mot de passe doit contenir au moins un chiffre')
        return v

    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Les mots de passe ne correspondent pas')
        return v

class UpdateProfileRequest(BaseModel):
    """Modification du profil utilisateur"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class DeleteAccountRequest(BaseModel):
    """Suppression du compte utilisateur"""
    password: str
    confirmation: str