import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlmodel import Session

from app.db import get_session
from app.models.user_model import User
from app.schemas.auth_schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
)

from app.services.account_service import AccountService
from app.services.auth_service import (
    get_current_active_user,
    hash_password,
    verify_password,
)
from app.utils.rate_limiter import rate_limiter

logger = logging.getLogger("app")

router = APIRouter(prefix="/account", tags=["account"])


def get_account_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
) -> AccountService:
    return AccountService(session, user_id=current_user.id)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    if request.client:
        return request.client.host
    return "unknown"


# ---------------------------------------------------------------------------
# POST /account/forgot-password
# ---------------------------------------------------------------------------

@router.post("/forgot-password", status_code=200)
async def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Demande de réinitialisation de mot de passe.
    Envoie un email avec un lien valable 15 min.
    Réponse toujours identique (anti-énumération des emails).
    Protection rate limiting : 3 tentatives / 15 min.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "forgot-password", max_attempts=3, window_minutes=15, session=session)

    service = AccountService(session)
    return await service.request_password_reset(data.email)


# ---------------------------------------------------------------------------
# POST /account/reset-password
# ---------------------------------------------------------------------------

@router.post("/reset-password", status_code=200)
async def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    session: Session = Depends(get_session),
):
    """
    Réinitialisation du mot de passe via token (reçu par email).
    Le token est à usage unique et valable 15 min.
    Protection rate limiting : 5 tentatives / 15 min.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "reset-password", max_attempts=5, window_minutes=15, session=session)

    service = AccountService(session)
    return service.reset_password(data.token, data.new_password, hash_password)


# ---------------------------------------------------------------------------
# POST /account/change-password
# ---------------------------------------------------------------------------

@router.post("/change-password", status_code=200)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Changement de mot de passe pour un utilisateur connecté.
    Nécessite le mot de passe actuel.
    """
    return service.change_password(current_user, data.current_password, data.new_password, verify_password, hash_password)


# ---------------------------------------------------------------------------
# PATCH /account/profile
# ---------------------------------------------------------------------------

@router.patch("/profile", status_code=200)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Modification du profil utilisateur (username et/ou email).
    """
    return service.update_profile(current_user, data.username, data.email)


# ---------------------------------------------------------------------------
# GET /account/export
# ---------------------------------------------------------------------------

@router.get("/export")
async def export_account_data(
    request: Request,
    session: Session = Depends(get_session),
    service: AccountService = Depends(get_account_service),
):
    """
    Exporte l'ensemble des données personnelles de l'utilisateur au format ZIP
    (un CSV par catégorie de données + un fichier profil).
    Droit à la portabilité RGPD. Rate limite : 3 exports / 5 min.
    """
    client_ip = get_client_ip(request)
    rate_limiter.check_and_record(client_ip, "account-export", max_attempts=3, window_minutes=5, session=session)

    zip_bytes = service.export_account_data_zip()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="mes_donnees_bibliotheque.zip"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ---------------------------------------------------------------------------
# DELETE /account/
# ---------------------------------------------------------------------------

@router.delete("/", status_code=200)
async def delete_account(
    data: DeleteAccountRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    service: AccountService = Depends(get_account_service),
):
    """
    Suppression définitive du compte et de toutes les données associées.
    Nécessite le mot de passe et la saisie de "SUPPRIMER".
    """
    client_ip = get_client_ip(request)
    return service.delete_account(current_user, data.password, data.confirmation, client_ip, verify_password)
