from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.User import UserLogin, UserRead, Token
from app.services.auth_service import AuthService, get_auth_service, get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.User import User

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Connexion utilisateur avec email et mot de passe.
    Retourne un token JWT pour les requêtes authentifiées.
    """
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login-json", response_model=Token)
async def login_with_json(
    user_login: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Connexion utilisateur avec JSON (pour le frontend).
    Alternative à login qui accepte un JSON au lieu d'un form.
    """
    user = auth_service.authenticate_user(user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Récupérer les informations de l'utilisateur actuellement connecté.
    """
    return current_user

@router.get("/test")
async def test_protected_endpoint(current_user: User = Depends(get_current_active_user)):
    """
    Endpoint de test pour vérifier l'authentification.
    """
    return {"message": f"Hello {current_user.username}! Vous êtes connecté."}