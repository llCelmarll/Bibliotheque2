from datetime import datetime, timedelta
from typing import Optional
import hashlib
import re
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from app.models.User import User
from app.db import get_session
from app.config.whitelist import is_email_allowed

# Configuration de sécurité
import os
SECRET_KEY = os.getenv("SECRET_KEY", "dev-key-not-for-production")  # Depuis variables d'environnement
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Configuration du bearer token
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash simple pour le développement (à remplacer par bcrypt en production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe contre son hash"""
    return hash_password(plain_password) == hashed_password

class AuthService:
    def generate_tokens(self, user_id: str, remember_me: bool = False):
        """
        Génère un access token et un refresh token selon l'option 'Se souvenir de moi'.
        """
        if remember_me:
            access_token_expires = timedelta(days=30)
            refresh_token_expires = timedelta(days=60)
        else:
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            refresh_token_expires = timedelta(days=1)
        access_token = self.create_access_token(
            data={"sub": user_id}, expires_delta=access_token_expires
        )
        refresh_token = self.create_refresh_token(
            data={"sub": user_id}, expires_delta=refresh_token_expires
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    def renew_access_token(self, refresh_token: str):
        """
        Renouvelle le token d'accès à partir du refresh token.
        """
        payload = self.verify_refresh_token(refresh_token)
        if not payload:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Refresh token invalide ou expiré")
        user_id = payload.get("sub")
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": user_id}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    def create_refresh_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Créer un refresh token JWT"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=7)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def verify_refresh_token(self, token: str) -> Optional[dict]:
        """Vérifier et décoder un refresh token JWT"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                return None
            return payload
        except JWTError:
            return None
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

    def validate_email(self, email: str) -> bool:
        """Valider le format d'un email"""
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_regex, email) is not None
    
    def validate_password(self, password: str) -> tuple[bool, str]:
        """
        Valider la force d'un mot de passe.
        Retourne (is_valid, error_message)
        """
        if len(password) < 8:
            return False, "Le mot de passe doit contenir au moins 8 caractères"
        
        if not re.search(r'[A-Z]', password):
            return False, "Le mot de passe doit contenir au moins une majuscule"
        
        if not re.search(r'[a-z]', password):
            return False, "Le mot de passe doit contenir au moins une minuscule"
        
        if not re.search(r'[0-9]', password):
            return False, "Le mot de passe doit contenir au moins un chiffre"
        
        return True, ""

    async def create_user(self, email: str, username: str, password: str, request=None) -> User:
        """Créer un nouvel utilisateur avec validation stricte"""
        
        # 1. Valider le format de l'email
        if not self.validate_email(email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format d'email invalide"
            )
        
        # 2. Vérifier si l'email est dans la liste blanche
        if not is_email_allowed(email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cette adresse email n'est pas autorisée à créer un compte. Contactez l'administrateur."
            )
        
        # 3. Vérifier si l'email existe déjà
        existing_user = self.get_user_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un compte avec cette adresse email existe déjà"
            )
        
        # 4. Valider la force du mot de passe
        is_valid, error_msg = self.validate_password(password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # 5. Valider le username
        if len(username) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le nom d'utilisateur doit contenir au moins 3 caractères"
            )
        
        if not re.match(r'^[\w\s\-]+$', username, re.UNICODE):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le nom d'utilisateur ne peut contenir que des lettres (y compris accentuées), chiffres, espaces, tirets et underscores"
            )
        
        # 6. Créer le nouvel utilisateur
        hashed_password = self.get_password_hash(password)
        new_user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        self.session.add(new_user)
        self.session.commit()
        self.session.refresh(new_user)
        
        # 7. Envoyer notification email (sauf en mode test)
        # Détecte si pytest est en cours d'exécution
        import sys
        import logging
        logger = logging.getLogger("app")

        is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "true"
        logger.info(f"[AUTH] is_testing={is_testing}, pytest in sys.modules={'pytest' in sys.modules}, TESTING env={os.getenv('TESTING')}")

        if request and not is_testing:
            logger.info("[AUTH] Sending registration email notification...")
            try:
                from .email_service import email_notification_service
                await email_notification_service.send_registration_notification(
                    username=username,
                    email=email,
                    request=request,
                    additional_info={
                        "ID utilisateur": new_user.id,
                        "Date création": new_user.created_at.strftime("%d/%m/%Y %H:%M:%S")
                    }
                )
            except Exception as e:
                logger.warning(f"Erreur notification email : {e}")
        else:
            logger.info("[AUTH] Skipping email notification (testing mode)")
        
        return new_user


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