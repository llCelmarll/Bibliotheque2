from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.User import UserLogin, UserRead, Token
from app.schemas.auth import UserCreate, UserResponse
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

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Inscription d'un nouvel utilisateur.
    Crée le compte et retourne directement un token de connexion.
    Envoie une notification email avec l'IP du nouvel inscrit.
    """
    try:
        # Créer l'utilisateur
        new_user = await auth_service.create_user(
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
            request=request
        )
        
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du compte: {str(e)}"
        )

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