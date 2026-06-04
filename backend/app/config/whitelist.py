import os
from typing import Optional


def get_allowed_emails_from_env() -> Optional[list[str]]:
    """Retourne la liste des emails/domaines autorisés depuis ALLOWED_EMAILS env var."""
    env_emails = os.getenv("ALLOWED_EMAILS", "")
    if not env_emails:
        if os.getenv("ENV", "development") != "development":
            return []
        return None
    return [email.strip() for email in env_emails.split(",") if email.strip()]


# Conservé pour compatibilité avec le code existant qui appelle get_allowed_emails()
def get_allowed_emails() -> Optional[list[str]]:
    return get_allowed_emails_from_env()


def _check_against_list(email: str, allowed: list[str]) -> bool:
    if email in [e.lower() for e in allowed if not e.startswith("@")]:
        return True
    email_domain = "@" + email.split("@")[1] if "@" in email else ""
    if email_domain in [d.lower() for d in allowed if d.startswith("@")]:
        return True
    return False


def is_email_allowed(email: str, session=None) -> bool:
    """
    Vérifie si un email est autorisé à s'inscrire.

    Priorité :
    1. Table whitelist_entries (si session fournie et table non vide)
    2. Variable d'environnement ALLOWED_EMAILS (fallback)
    """
    email = email.lower().strip()

    if session is not None:
        try:
            from sqlmodel import select
            from app.models.WhitelistEntry import WhitelistEntry
            entries = session.exec(select(WhitelistEntry)).all()
            if entries:
                allowed = [e.email.lower() for e in entries]
                return _check_against_list(email, allowed)
        except Exception:
            pass

    allowed_emails = get_allowed_emails_from_env()
    if allowed_emails is None:
        return True
    return _check_against_list(email, allowed_emails)
