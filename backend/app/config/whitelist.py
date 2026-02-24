import os

# Liste blanche des emails autorisés à créer un compte
# Configuration via variable d'environnement ALLOWED_EMAILS
# Format: emails séparés par des virgules
# Exemple: "user1@example.com,user2@example.com,@domain.com"
# Support: emails spécifiques OU domaines complets (@domain.com pour tout le domaine)

def get_allowed_emails() -> list[str]:
    """
    Récupère la liste des emails autorisés depuis les variables d'environnement.
    Fallback sur une liste vide si non configuré (accès bloqué par défaut).
    """
    env_emails = os.getenv("ALLOWED_EMAILS", "")
    
    if not env_emails:
        # En prod: aucun email autorisé par défaut (sécurité)
        if os.getenv("ENV", "development") != "development":
            return []
        # En dev sans ALLOWED_EMAILS: whitelist désactivée (tout est autorisé)
        return None
    
    # Parser la liste d'emails (séparés par virgules)
    emails = [email.strip() for email in env_emails.split(",") if email.strip()]
    return emails

# Fonction pour vérifier si un email est autorisé
def is_email_allowed(email: str) -> bool:
    """
    Vérifie si un email est dans la liste blanche.
    Supporte les emails spécifiques et les domaines complets.
    En dev sans ALLOWED_EMAILS configuré, tous les emails sont autorisés.
    """
    email = email.lower().strip()
    allowed_emails = get_allowed_emails()

    # None = whitelist désactivée (dev sans ALLOWED_EMAILS)
    if allowed_emails is None:
        return True

    # Vérifier les emails spécifiques
    if email in [e.lower() for e in allowed_emails if not e.startswith("@")]:
        return True

    # Vérifier les domaines autorisés
    email_domain = "@" + email.split("@")[1] if "@" in email else ""
    if email_domain in [d.lower() for d in allowed_emails if d.startswith("@")]:
        return True

    return False
