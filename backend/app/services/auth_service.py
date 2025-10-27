from datetime import datetime, timedelta
from typing import Optional
import hashlib
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from app.models.User import User
from app.db import get_session

# Configuration de sécurité
SECRET_KEY = "votre-clé-secrète-super-longue-et-complexe-ici"  # À changer en production !
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Configuration du bearer token
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash simple pour le développement (à remplacer par bcrypt en production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe contre son hash"""
    return hash_password(plain_password) == hashed_password

class AuthService:
    def __init__(self, session: Session):
        self.session = session

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Vérifier un mot de passe contre son hash"""
        return verify_password(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        """Hasher un mot de passe"""
        return hash_password(password)

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Récupérer un utilisateur par son email"""
        statement = select(User).where(User.email == email)
        result = self.session.exec(statement)
        return result.first()

    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authentifier un utilisateur"""
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        return user

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Créer un token JWT"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_token(self, token: str) -> Optional[dict]:
        """Vérifier et décoder un token JWT"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None

    def get_user_from_token(self, token: str) -> Optional[User]:
        """Récupérer un utilisateur à partir d'un token"""
        payload = self.verify_token(token)
        if payload is None:
            return None
        
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
            
        statement = select(User).where(User.id == user_id)
        result = self.session.exec(statement)
        return result.first()


def get_auth_service(session: Session = Depends(get_session)) -> AuthService:
    """Dependency injection pour le service d'authentification"""
    return AuthService(session)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """Récupérer l'utilisateur actuel à partir du token Bearer"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    user = auth_service.get_user_from_token(token)
    
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
        
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Récupérer l'utilisateur actuel actif"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user