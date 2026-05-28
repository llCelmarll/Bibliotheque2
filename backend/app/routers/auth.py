import logging
import os
import secrets
import sys
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from app.schemas.User import UserLogin, UserRead, Token
from app.schemas.auth import UserCreate, UserResponse
from app.services.auth_service import AuthService, get_auth_service, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.User import User
from app.models.EmailVerificationToken import EmailVerificationToken
from app.db import get_session
from app.utils.rate_limiter import rate_limiter

logger = logging.getLogger("app")

router = APIRouter(prefix="/auth", tags=["authentication"])

def get_client_ip(request: Request) -> str:
    """Récupérer l'IP réelle du client (même derrière un proxy)"""
    # Vérifier les headers de proxy courants
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback sur l'IP du client direct
    if request.client:
        return request.client.host
    
    return "unknown"

@router.post("/login", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    remember_me: bool = False,
    auth_service: AuthService = Depends(get_auth_service),
    session: Session = Depends(get_session),
):
    """
    Connexion utilisateur avec email et mot de passe.
    Retourne un token JWT pour les requêtes authentifiées.
    Protection rate limiting: 10 tentatives max par 15 minutes.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "login", max_attempts=10, window_minutes=15, session=session)

    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email non vérifié. Consultez votre boite mail pour activer votre compte.",
        )

    rate_limiter.clear_attempts(client_ip, "login", session=session)
    tokens = auth_service.generate_tokens(user_id=str(user.id), remember_me=remember_me)
    return tokens
class RefreshTokenRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    request: Request,
    body: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
    session: Session = Depends(get_session),
):
    """
    Renouvelle le token d'accès à partir du refresh token.
    Protection rate limiting: 10 tentatives max par 15 minutes.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "refresh", max_attempts=10, window_minutes=15, session=session)
    return auth_service.renew_access_token(body.refresh_token)

@router.post("/login-json", response_model=Token)
async def login_with_json(
    request: Request,
    user_login: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
    session: Session = Depends(get_session),
):
    """
    Connexion utilisateur avec JSON (pour le frontend).
    Alternative à login qui accepte un JSON au lieu d'un form.
    Protection rate limiting: 10 tentatives max par 15 minutes.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "login", max_attempts=10, window_minutes=15, session=session)

    user = auth_service.authenticate_user(user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.email_verified_at is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email non vérifié. Consultez votre boite mail pour activer votre compte.",
        )

    rate_limiter.clear_attempts(client_ip, "login", session=session)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    session: Session = Depends(get_session),
):
    """
    Inscription d'un nouvel utilisateur.
    - Vérifie que l'email est dans la liste blanche
    - Valide la force du mot de passe
    - Crée le compte et retourne directement un token de connexion
    - Envoie une notification email avec l'IP du nouvel inscrit
    Protection rate limiting: 3 tentatives max par 15 minutes.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "register", max_attempts=3, window_minutes=15, session=session)

    try:
        new_user = await auth_service.create_user(
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
            request=request
        )

        rate_limiter.clear_attempts(client_ip, "register", session=session)
        
        # Générer un token pour la connexion automatique
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth_service.create_access_token(
            data={"sub": str(new_user.id)}, expires_delta=access_token_expires
        )
        
        return {
            "user": new_user,
            "token": {
                "access_token": access_token,
                "token_type": "bearer"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erreur création compte pour %s: %s", user_data.email, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur interne est survenue. Veuillez réessayer."
        )

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Récupérer les informations de l'utilisateur actuellement connecté.
    """
    return current_user


@router.get("/verify-email")
async def verify_email(
    token: str,
    session: Session = Depends(get_session),
):
    """
    Activation du compte via le lien reçu par email.
    Le token est à usage unique et valable 24 heures.
    """
    record = session.exec(
        select(EmailVerificationToken).where(EmailVerificationToken.token == token)
    ).first()

    if not record:
        raise HTTPException(status_code=400, detail="Lien de vérification invalide.")

    if record.used:
        raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé.")

    if datetime.utcnow() > record.expires_at:
        raise HTTPException(status_code=400, detail="Ce lien a expiré. Demandez un nouveau lien.")

    user = session.get(User, record.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Compte introuvable ou désactivé.")

    user.email_verified_at = datetime.utcnow()
    session.add(user)

    record.used = True
    session.add(record)

    session.commit()

    return {"message": "Email vérifié avec succès. Vous pouvez maintenant vous connecter."}


class ResendVerificationRequest(BaseModel):
    email: str


@router.post("/resend-verification")
async def resend_verification(
    data: ResendVerificationRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Renvoie un email de vérification si le compte n'est pas encore activé.
    Réponse toujours identique (anti-énumération).
    Protection rate limiting : 3 tentatives / 15 min.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "resend-verification", max_attempts=3, window_minutes=15, session=session)

    generic_response = {"message": "Si cet email correspond à un compte non vérifié, vous recevrez un nouveau lien."}

    user = session.exec(select(User).where(User.email == data.email.lower())).first()
    if not user or not user.is_active or user.email_verified_at is not None:
        return generic_response

    # Invalider les anciens tokens non utilisés
    for old in session.exec(
        select(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used == False,
        )
    ).all():
        old.used = True
        session.add(old)

    raw_token = secrets.token_urlsafe(32)
    new_token = EmailVerificationToken(
        token=raw_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(hours=24),
        used=False,
        created_at=datetime.utcnow(),
    )
    session.add(new_token)
    session.commit()

    is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "true"
    if not is_testing:
        try:
            from app.services.email_service import email_notification_service
            await email_notification_service.send_email_verification(
                email=user.email,
                username=user.username,
                verification_token=raw_token,
            )
        except Exception as e:
            logger.warning("Erreur renvoi email verification : %s", e)

    return generic_response

