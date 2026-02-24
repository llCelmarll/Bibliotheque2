# Email service pour notifications d'inscription et réinitialisation de mot de passe
from typing import Optional
from datetime import datetime
import os
from fastapi import Request

import resend


class EmailNotificationService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        self.email_from = os.getenv("EMAIL_FROM", "noreply@mabibliotheque.ovh")
        self.notification_email = os.getenv("NOTIFICATION_EMAIL")
        self.enabled = os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "true").lower() == "true"
        env = os.getenv("ENV", "production")
        self.frontend_base_url = os.getenv(
            "FRONTEND_BASE_URL",
            "http://localhost:8081" if env == "development" else "https://mabibliotheque.ovh"
        )

        if self.api_key:
            resend.api_key = self.api_key

    def get_client_ip(self, request: Request) -> str:
        """Récupère l'IP réelle du client (même derrière un proxy)"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        client_ip_header = request.headers.get("X-Client-IP")
        if client_ip_header:
            return client_ip_header

        return request.client.host if request.client else "unknown"

    async def send_registration_notification(
        self,
        username: str,
        email: str,
        request: Request,
        additional_info: Optional[dict] = None
    ):
        """Envoie une notification email pour chaque nouvelle inscription"""

        if not self.enabled:
            print("📧 Notifications email désactivées")
            return

        if not self.api_key:
            print("⚠️ RESEND_API_KEY manquante - notification non envoyée")
            return

        if not self.notification_email:
            print("⚠️ NOTIFICATION_EMAIL manquant - notification non envoyée")
            return

        try:
            client_ip = self.get_client_ip(request)
            timestamp = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")

            is_authorized = (
                client_ip.startswith("192.168.") or
                client_ip.startswith("10.") or
                client_ip.startswith("172.") or
                client_ip == "127.0.0.1"
            )

            alert_message = "⚠️ ALERTE : Cette inscription provient d'une IP non autorisée!" if not is_authorized else ""
            user_agent = request.headers.get('User-Agent', 'Non spécifié')
            user_agent_short = user_agent[:100] + "..." if len(user_agent) > 100 else user_agent

            subject = f"🔔 Nouvelle inscription - Ma Bibliothèque {'✅' if is_authorized else '⚠️'}"

            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>🔔 Nouvelle inscription sur Ma Bibliothèque</h2>
  <h3>📝 Détails de l'inscription</h3>
  <ul>
    <li><strong>Nom d'utilisateur :</strong> {username}</li>
    <li><strong>Email :</strong> {email}</li>
    <li><strong>Date/Heure :</strong> {timestamp}</li>
  </ul>
  <h3>🌐 Informations réseau</h3>
  <ul>
    <li><strong>Adresse IP :</strong> {client_ip}</li>
    <li><strong>User-Agent :</strong> {user_agent_short}</li>
    <li><strong>Referer :</strong> {request.headers.get('Referer', 'Accès direct')}</li>
  </ul>
  <h3>🔐 Sécurité</h3>
  <ul>
    <li><strong>Réseau :</strong> {'✅ Réseau local/autorisé' if is_authorized else '🌐 Internet public'}</li>
  </ul>
  {f'<p style="color: red; font-weight: bold;">{alert_message}</p>' if alert_message else ''}
  {self._format_additional_info_html(additional_info) if additional_info else ''}
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">Système de notification Ma Bibliothèque</p>
</body>
</html>
            """

            resend.Emails.send({
                "from": f"Ma Bibliothèque <{self.email_from}>",
                "to": [self.notification_email],
                "subject": subject,
                "html": html_body,
            })

            print(f"✅ Notification email envoyée pour {username} ({client_ip}) - {'Autorisé' if is_authorized else 'NON AUTORISÉ'}")

        except Exception as e:
            print(f"❌ Erreur envoi notification email : {e}")

    async def send_password_reset_email(self, email: str, reset_token: str):
        """Envoie un email de réinitialisation de mot de passe à l'utilisateur"""

        if not self.enabled:
            print("📧 Notifications email désactivées")
            return

        if not self.api_key:
            print("⚠️ RESEND_API_KEY manquante - email reset non envoyé")
            return

        try:
            reset_url = f"{self.frontend_base_url}/auth/reset-password?token={reset_token}"
            timestamp = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")

            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #2196F3;">Réinitialisation de mot de passe</h2>
  <p>Bonjour,</p>
  <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Ma Bibliothèque</strong>.</p>
  <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{reset_url}"
       style="background-color: #2196F3; color: white; padding: 14px 28px;
              text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
      Réinitialiser mon mot de passe
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">
    Ce lien est valable <strong>15 minutes</strong> (demande effectuée le {timestamp}).<br>
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="{reset_url}" style="color: #2196F3; word-break: break-all;">{reset_url}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">
    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    Votre mot de passe actuel reste inchangé.
  </p>
</body>
</html>
            """

            resend.Emails.send({
                "from": f"Ma Bibliothèque <{self.email_from}>",
                "to": [email],
                "subject": "🔑 Réinitialisation de votre mot de passe - Ma Bibliothèque",
                "html": html_body,
            })

            print(f"✅ Email reset envoyé à {email}")

        except Exception as e:
            print(f"❌ Erreur envoi email reset : {e}")

    def _format_additional_info_html(self, info: dict) -> str:
        """Formate les informations supplémentaires en HTML"""
        if not info:
            return ""
        items = "".join(f"<li><strong>{k} :</strong> {v}</li>" for k, v in info.items())
        return f"<h3>📊 Informations supplémentaires</h3><ul>{items}</ul>"


# Instance globale
email_notification_service = EmailNotificationService()
