import logging
import os
import secrets
import sys
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.config.whitelist import is_email_allowed
from app.db import get_session
from app.models.BorrowedBook import BorrowedBook
from app.models.Contact import Contact
from app.models.ContactInvitation import ContactInvitation
from app.models.Loan import Loan
from app.models.PasswordResetToken import PasswordResetToken
from app.models.User import User
from app.models.UserLoanRequest import UserLoanRequest
from app.schemas.auth import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserRead,
)
from app.services.auth_service import (
    get_auth_service,
    get_current_active_user,
    hash_password,
    verify_password,
    AuthService,
)
from app.utils.rate_limiter import rate_limiter

logger = logging.getLogger("app")

router = APIRouter(prefix="/account", tags=["account"])

RESET_TOKEN_EXPIRE_MINUTES = 15


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
    rate_limiter.check_and_record(client_ip, "forgot-password", max_attempts=3, window_minutes=15)

    generic_response = {"message": "Si cet email correspond à un compte, vous recevrez un lien dans quelques minutes."}

    user = session.exec(select(User).where(User.email == data.email.lower())).first()
    if not user or not user.is_active:
        return generic_response

    # Invalider les anciens tokens non utilisés pour cet utilisateur
    old_tokens = session.exec(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
        )
    ).all()
    for t in old_tokens:
        t.used = True
        session.add(t)

    # Créer le nouveau token
    raw_token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        token=raw_token,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        used=False,
        created_at=datetime.utcnow(),
    )
    session.add(reset_token)
    session.commit()

    # Envoi de l'email (sauf en mode test)
    is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "true"
    if not is_testing:
        try:
            from app.services.email_service import email_notification_service
            await email_notification_service.send_password_reset_email(
                email=user.email,
                reset_token=raw_token,
            )
        except Exception as e:
            logger.warning("Erreur envoi email reset : %s", e)

    return generic_response


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
    rate_limiter.check_and_record(client_ip, "reset-password", max_attempts=5, window_minutes=15)

    reset_token = session.exec(
        select(PasswordResetToken).where(PasswordResetToken.token == data.token)
    ).first()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide.")

    if reset_token.used:
        raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé.")

    if datetime.utcnow() > reset_token.expires_at:
        raise HTTPException(status_code=400, detail="Ce lien a expiré. Veuillez faire une nouvelle demande.")

    user = session.get(User, reset_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Compte introuvable ou désactivé.")

    # Mettre à jour le mot de passe
    user.hashed_password = hash_password(data.new_password)
    session.add(user)

    # Invalider le token
    reset_token.used = True
    session.add(reset_token)

    session.commit()

    return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}


# ---------------------------------------------------------------------------
# POST /account/change-password
# ---------------------------------------------------------------------------

@router.post("/change-password", status_code=200)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """
    Changement de mot de passe pour un utilisateur connecté.
    Nécessite le mot de passe actuel.
    """
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")

    if verify_password(data.new_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'ancien.")

    current_user.hashed_password = hash_password(data.new_password)
    session.add(current_user)
    session.commit()

    return {"message": "Mot de passe modifié avec succès."}


# ---------------------------------------------------------------------------
# PATCH /account/profile
# ---------------------------------------------------------------------------

@router.patch("/profile", response_model=UserRead, status_code=200)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """
    Modification du profil utilisateur (username et/ou email).
    """
    if data.username is None and data.email is None:
        raise HTTPException(status_code=400, detail="Au moins un champ à modifier est requis.")

    if data.username is not None:
        import re
        username = data.username.strip()
        if len(username) < 3:
            raise HTTPException(status_code=400, detail="Le nom d'utilisateur doit contenir au moins 3 caractères.")
        if len(username) > 50:
            raise HTTPException(status_code=400, detail="Le nom d'utilisateur ne peut pas dépasser 50 caractères.")
        if not re.match(r'^[\w\s\-]+$', username, re.UNICODE):
            raise HTTPException(
                status_code=400,
                detail="Le nom d'utilisateur ne peut contenir que des lettres, chiffres, espaces, tirets et underscores.",
            )
        current_user.username = username

    if data.email is not None:
        new_email = data.email.lower().strip()
        if new_email != current_user.email:
            if not is_email_allowed(new_email):
                raise HTTPException(
                    status_code=403,
                    detail="Cette adresse email n'est pas autorisée. Contactez l'administrateur.",
                )
            existing = session.exec(select(User).where(User.email == new_email)).first()
            if existing:
                raise HTTPException(status_code=400, detail="Cette adresse email est déjà utilisée.")
            current_user.email = new_email

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return current_user


# ---------------------------------------------------------------------------
# DELETE /account/
# ---------------------------------------------------------------------------

@router.delete("/", status_code=200)
async def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session),
):
    """
    Suppression définitive du compte et de toutes les données associées.
    Nécessite le mot de passe et la saisie de "SUPPRIMER".
    """
    if data.confirmation != "SUPPRIMER":
        raise HTTPException(status_code=400, detail="Confirmation incorrecte. Tapez exactement SUPPRIMER.")

    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe incorrect.")

    user_id = current_user.id

    # 1. Tokens de reset
    session.exec(
        select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
    )
    for t in session.exec(select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)).all():
        session.delete(t)

    # 2. Demandes de prêt (en tant que demandeur ou prêteur)
    for r in session.exec(
        select(UserLoanRequest).where(
            (UserLoanRequest.requester_id == user_id) | (UserLoanRequest.lender_id == user_id)
        )
    ).all():
        session.delete(r)

    # 3. Invitations (envoyées ou reçues)
    for inv in session.exec(
        select(ContactInvitation).where(
            (ContactInvitation.sender_id == user_id) | (ContactInvitation.recipient_id == user_id)
        )
    ).all():
        session.delete(inv)

    # 4. Délier les contacts d'autres utilisateurs qui pointaient vers ce compte
    for contact in session.exec(
        select(Contact).where(Contact.linked_user_id == user_id)
    ).all():
        contact.linked_user_id = None
        contact.library_shared = False
        session.add(contact)

    # 5. Prêts en tant que propriétaire
    for loan in session.exec(select(Loan).where(Loan.owner_id == user_id)).all():
        session.delete(loan)

    # 6. Livres empruntés
    for bb in session.exec(select(BorrowedBook).where(BorrowedBook.user_id == user_id)).all():
        session.delete(bb)

    # 7. Contacts du compte (et leurs prêts/borrowed_books via cascade SQLAlchemy)
    for contact in session.exec(select(Contact).where(Contact.owner_id == user_id)).all():
        session.delete(contact)

    # Flush pour appliquer les suppressions avant de toucher aux livres
    session.flush()

    # 8. Livres du compte
    from app.models.Book import Book
    for book in session.exec(select(Book).where(Book.owner_id == user_id)).all():
        session.delete(book)

    # 9. Supprimer l'utilisateur
    session.delete(current_user)
    session.commit()

    return {"message": "Compte supprimé définitivement."}
