import csv
import io
import logging
import os
import secrets
import sys
import zipfile
from datetime import datetime, timedelta
from time import perf_counter
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session

from app.config.whitelist import is_email_allowed
from app.models.password_reset_token_model import PasswordResetToken
from app.models.user_model import User
from app.repositories.account_repository import AccountRepository

logger = logging.getLogger("app")

RESET_TOKEN_EXPIRE_MINUTES = 15


class AccountService:
    def __init__(self, session: Session, user_id: Optional[int] = None):
        self.session = session
        self.user_id = user_id
        self.account_repository = AccountRepository(session)

    def export_account_data_zip(self) -> bytes:
        """Génère un ZIP contenant un CSV par entité + un profil, pour la portabilité RGPD."""
        start = perf_counter()
        user = self.account_repository.get_user(self.user_id)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("profil.csv", self._export_profile_csv(user))
            zf.writestr("livres.csv", self._export_books_csv())
            zf.writestr("contacts.csv", self._export_contacts_csv())
            zf.writestr("invitations.csv", self._export_invitations_csv())
            zf.writestr("demandes_de_pret.csv", self._export_loan_requests_csv())
            zf.writestr("prets_consentis.csv", self._export_loans_csv())
            zf.writestr("emprunts.csv", self._export_borrowed_books_csv())
            zf.writestr("notifications_push.csv", self._export_push_tokens_csv())

        duration_ms = (perf_counter() - start) * 1000
        logger.info(
            "ACCOUNT_DATA_EXPORTED user_id=%s duration_ms=%.1f", self.user_id, duration_ms
        )
        return buffer.getvalue()

    # --- Helpers CSV (BOM UTF-8 + séparateur ';', pattern repris de BookService) ---

    @staticmethod
    def _new_csv_writer():
        output = io.StringIO()
        output.write('﻿')  # BOM UTF-8 pour compatibilité Excel
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        return output, writer

    def _export_profile_csv(self, user: User) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow(['champ', 'valeur'])
        writer.writerow(['email', user.email])
        writer.writerow(['username', user.username])
        writer.writerow(['role', user.role])
        writer.writerow(['consent_version', user.consent_version or ''])
        writer.writerow(['consent_accepted_at', user.consent_accepted_at.isoformat() if user.consent_accepted_at else ''])
        writer.writerow(['created_at', user.created_at.isoformat() if user.created_at else ''])
        push_prefs = user.push_prefs or {}
        for key, value in push_prefs.items():
            writer.writerow([f'notification_push_{key}', value])
        return output.getvalue()

    def _export_books_csv(self) -> str:
        # Réutilise BookService pour éviter la duplication de la logique d'enrichissement
        from app.services.book_service import BookService

        return BookService(self.session, user_id=self.user_id).export_books_csv()

    def _export_contacts_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'nom', 'email', 'telephone', 'notes',
            'compte_lie_username', 'compte_lie_email',
            'bibliotheque_partagee', 'date_creation',
        ])
        contacts = self.account_repository.get_contacts_owned(self.user_id)
        for c in contacts:
            linked_username = c.linked_user.username if c.linked_user else ''
            linked_email = c.linked_user.email if c.linked_user else ''
            writer.writerow([
                c.name,
                c.email or '',
                c.phone or '',
                c.notes or '',
                linked_username,
                linked_email,
                'oui' if c.library_shared else 'non',
                c.created_at.isoformat(),
            ])
        return output.getvalue()

    def _export_invitations_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'sens', 'autre_utilisateur_username', 'autre_utilisateur_email',
            'statut', 'message', 'date_creation', 'date_reponse',
        ])
        invitations = self.account_repository.get_invitations(self.user_id)
        for inv in invitations:
            is_sender = inv.sender_id == self.user_id
            other = inv.recipient if is_sender else inv.sender
            writer.writerow([
                'envoyee' if is_sender else 'recue',
                other.username if other else '',
                other.email if other else '',
                inv.status,
                inv.message or '',
                inv.created_at.isoformat(),
                inv.responded_at.isoformat() if inv.responded_at else '',
            ])
        return output.getvalue()

    def _export_loan_requests_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'sens', 'autre_utilisateur_username', 'autre_utilisateur_email', 'livre',
            'statut', 'message', 'reponse',
            'date_demande', 'date_reponse', 'date_echeance', 'date_retour',
        ])
        requests_ = self.account_repository.get_loan_requests(self.user_id)
        for r in requests_:
            is_requester = r.requester_id == self.user_id
            other = r.lender if is_requester else r.requester
            writer.writerow([
                'emprunteur' if is_requester else 'preteur',
                other.username if other else '',
                other.email if other else '',
                r.book.title if r.book else '',
                r.status,
                r.message or '',
                r.response_message or '',
                r.request_date.isoformat(),
                r.response_date.isoformat() if r.response_date else '',
                r.due_date.isoformat() if r.due_date else '',
                r.return_date.isoformat() if r.return_date else '',
            ])
        return output.getvalue()

    def _export_loans_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'livre', 'emprunteur_contact', 'statut',
            'date_pret', 'date_echeance', 'date_retour', 'notes',
        ])
        loans = self.account_repository.get_loans_as_owner(self.user_id)
        for l in loans:
            writer.writerow([
                l.book.title if l.book else '',
                l.contact.name if l.contact else '',
                l.status,
                l.loan_date.isoformat(),
                l.due_date.isoformat() if l.due_date else '',
                l.return_date.isoformat() if l.return_date else '',
                l.notes or '',
            ])
        return output.getvalue()

    def _export_borrowed_books_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'livre', 'emprunte_a', 'statut',
            'date_emprunt', 'date_retour_prevue', 'date_retour_reelle', 'notes',
        ])
        borrows = self.account_repository.get_borrowed_books(self.user_id)
        for b in borrows:
            writer.writerow([
                b.book.title if b.book else '',
                b.contact.name if b.contact else b.borrowed_from,
                b.status,
                b.borrowed_date.isoformat(),
                b.expected_return_date.isoformat() if b.expected_return_date else '',
                b.actual_return_date.isoformat() if b.actual_return_date else '',
                b.notes or '',
            ])
        return output.getvalue()

    def _export_push_tokens_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow(['plateforme', 'date_enregistrement'])
        tokens = self.account_repository.get_push_tokens(self.user_id)
        for t in tokens:
            writer.writerow([t.platform or '', t.created_at.isoformat()])
        return output.getvalue()

    # --- Mot de passe / profil / suppression de compte ---

    async def request_password_reset(self, email: str) -> dict:
        """Demande de réinitialisation de mot de passe.
        Envoie un email avec un lien valable 15 min.
        Réponse toujours identique (anti-énumération des emails)."""
        generic_response = {"message": "Si cet email correspond à un compte, vous recevrez un lien dans quelques minutes."}

        user = self.account_repository.get_user_by_email(email.lower())
        if not user or not user.is_active:
            return generic_response

        # Invalider les anciens tokens non utilisés pour cet utilisateur
        old_tokens = self.account_repository.list_unused_reset_tokens(user.id)
        for t in old_tokens:
            self.account_repository.mark_reset_token_used(t)

        # Créer le nouveau token
        raw_token = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            token=raw_token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
            used=False,
            created_at=datetime.utcnow(),
        )
        self.account_repository.add_reset_token(reset_token)
        self.session.commit()

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

    def reset_password(self, token: str, new_password: str, hash_password_fn) -> dict:
        """Réinitialisation du mot de passe via token (reçu par email).
        Le token est à usage unique et valable 15 min."""
        reset_token = self.account_repository.get_reset_token_by_value(token)

        if not reset_token:
            raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide.")

        if reset_token.used:
            raise HTTPException(status_code=400, detail="Ce lien a déjà été utilisé.")

        if datetime.utcnow() > reset_token.expires_at:
            raise HTTPException(status_code=400, detail="Ce lien a expiré. Veuillez faire une nouvelle demande.")

        user = self.account_repository.get_user(reset_token.user_id)
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="Compte introuvable ou désactivé.")

        # Mettre à jour le mot de passe
        user.hashed_password = hash_password_fn(new_password)
        self.account_repository.update_user_fields(user)

        # Invalider le token
        self.account_repository.mark_reset_token_used(reset_token)

        self.session.commit()

        return {"message": "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."}

    def change_password(self, current_user: User, current_password: str, new_password: str, verify_password_fn, hash_password_fn) -> dict:
        """Changement de mot de passe pour un utilisateur connecté. Nécessite le mot de passe actuel."""
        if not verify_password_fn(current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")

        if verify_password_fn(new_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'ancien.")

        current_user.hashed_password = hash_password_fn(new_password)
        self.account_repository.update_user_fields(current_user)
        self.session.commit()

        return {"message": "Mot de passe modifié avec succès."}

    def update_profile(self, current_user: User, username: Optional[str], email: Optional[str]) -> dict:
        """Modification du profil utilisateur (username et/ou email)."""
        if username is None and email is None:
            raise HTTPException(status_code=400, detail="Au moins un champ à modifier est requis.")

        if username is not None:
            import re
            username = username.strip()
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

        if email is not None:
            new_email = email.lower().strip()
            if new_email != current_user.email:
                if not is_email_allowed(new_email):
                    raise HTTPException(
                        status_code=403,
                        detail="Cette adresse email n'est pas autorisée. Contactez l'administrateur.",
                    )
                if self.account_repository.email_taken(new_email):
                    raise HTTPException(status_code=400, detail="Cette adresse email est déjà utilisée.")
                current_user.email = new_email

        self.account_repository.update_user_fields(current_user)
        self.session.commit()
        self.session.refresh(current_user)

        return {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at,
        }

    def delete_account(self, current_user: User, password: str, confirmation: str, client_ip: str, verify_password_fn) -> dict:
        """Suppression définitive du compte et de toutes les données associées.
        Nécessite le mot de passe et la saisie de "SUPPRIMER"."""
        if confirmation != "SUPPRIMER":
            raise HTTPException(status_code=400, detail="Confirmation incorrecte. Tapez exactement SUPPRIMER.")

        if not verify_password_fn(password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Mot de passe incorrect.")

        user_id = current_user.id

        # 1. Tokens de reset, vérification email et push notifications
        for t in self.account_repository.list_reset_tokens(user_id):
            self.account_repository.delete_entity(t)
        for t in self.account_repository.list_email_verification_tokens(user_id):
            self.account_repository.delete_entity(t)
        for t in self.account_repository.get_push_tokens(user_id):
            self.account_repository.delete_entity(t)

        # 2. Demandes de prêt (en tant que demandeur ou prêteur)
        for r in self.account_repository.get_loan_requests(user_id):
            self.account_repository.delete_entity(r)

        # 3. Invitations (envoyées ou reçues)
        for inv in self.account_repository.get_invitations(user_id):
            self.account_repository.delete_entity(inv)

        # 4. Délier les contacts d'autres utilisateurs qui pointaient vers ce compte
        for contact in self.account_repository.list_contacts_linked_to_user(user_id):
            self.account_repository.unlink_contact(contact)

        # 5. Prêts en tant que propriétaire
        for loan in self.account_repository.get_loans_as_owner(user_id):
            self.account_repository.delete_entity(loan)

        # 6. Livres empruntés
        for bb in self.account_repository.get_borrowed_books(user_id):
            self.account_repository.delete_entity(bb)

        # 7. Contacts du compte (et leurs prêts/borrowed_books via cascade SQLAlchemy)
        for contact in self.account_repository.get_contacts_owned(user_id):
            self.account_repository.delete_entity(contact)

        # Flush pour appliquer les suppressions avant de toucher aux livres
        self.session.flush()

        # 8. Livres du compte
        for book in self.account_repository.list_books_owned(user_id):
            self.account_repository.delete_entity(book)

        # 9. Supprimer l'utilisateur
        logger.info(
            "ACCOUNT_DELETED user_id=%s email=%s username=%s ip=%s",
            user_id, current_user.email, current_user.username, client_ip,
        )

        self.account_repository.delete_user(current_user)
        self.session.commit()

        return {"message": "Compte supprimé définitivement."}
