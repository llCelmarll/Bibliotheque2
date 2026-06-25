# Email service pour notifications d'inscription et réinitialisation de mot de passe
from typing import Optional
from datetime import datetime
import html
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from fastapi import Request

import resend


class EmailNotificationService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        self.email_from = os.getenv("EMAIL_FROM", "noreply@mabibliotheque.ovh")
        self.notification_email = os.getenv("NOTIFICATION_EMAIL")
        self.enabled = os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "true").lower() == "true"
        self.env = os.getenv("ENV", "production")
        self.frontend_base_url = os.getenv(
            "FRONTEND_BASE_URL",
            "http://localhost:8081" if self.env == "development" else "https://mabibliotheque.ovh"
        )
        # Papercut / Mailpit en développement
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "25"))

        if self.api_key:
            resend.api_key = self.api_key

    def _send(self, to: str, subject: str, html_body: str):
        """Envoie via SMTP local (dev) ou Resend API (prod)."""
        if self.env == "development":
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.email_from
            msg["To"] = to
            msg.attach(MIMEText(html_body, "html", "utf-8"))
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=5) as server:
                server.sendmail(self.email_from, [to], msg.as_string())
            print(f"Email SMTP local envoye a {to} ({self.smtp_host}:{self.smtp_port})")
        else:
            resend.Emails.send({
                "from": f"Ma Bibliotheque <{self.email_from}>",
                "to": [to],
                "subject": subject,
                "html": html_body,
            })

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
            return

        if self.env != "development" and not self.api_key:
            print("RESEND_API_KEY manquante - notification non envoyee")
            return

        if not self.notification_email:
            print("NOTIFICATION_EMAIL manquant - notification non envoyee")
            return

        try:
            client_ip = self.get_client_ip(request)
            timestamp = datetime.now().strftime("%d/%m/%Y a %H:%M:%S")

            is_authorized = (
                client_ip.startswith("192.168.") or
                client_ip.startswith("10.") or
                client_ip.startswith("172.") or
                client_ip == "127.0.0.1"
            )

            user_agent = request.headers.get("User-Agent", "Non specifie")
            user_agent_short = user_agent[:100] + "..." if len(user_agent) > 100 else user_agent
            subject = f"Nouvelle inscription - Ma Bibliotheque ({'OK' if is_authorized else 'ALERTE IP'})"

            safe_username = html.escape(username)
            safe_email = html.escape(email)
            safe_user_agent = html.escape(user_agent_short)
            safe_referer = html.escape(request.headers.get("Referer", "Acces direct"))

            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Nouvelle inscription sur Ma Bibliotheque</h2>
  <h3>Details de l'inscription</h3>
  <ul>
    <li><strong>Nom d'utilisateur :</strong> {safe_username}</li>
    <li><strong>Email :</strong> {safe_email}</li>
    <li><strong>Date/Heure :</strong> {timestamp}</li>
  </ul>
  <h3>Informations reseau</h3>
  <ul>
    <li><strong>Adresse IP :</strong> {client_ip}</li>
    <li><strong>User-Agent :</strong> {safe_user_agent}</li>
    <li><strong>Referer :</strong> {safe_referer}</li>
    <li><strong>Reseau :</strong> {"Reseau local/autorise" if is_authorized else "Internet public"}</li>
  </ul>
  {self._format_additional_info_html(additional_info) if additional_info else ""}
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">Systeme de notification Ma Bibliotheque</p>
</body>
</html>
            """

            self._send(self.notification_email, subject, html_body)
            print(f"Notification envoyee pour {username} ({client_ip})")

        except Exception as e:
            print(f"Erreur envoi notification email : {e}")

    async def send_password_reset_email(self, email: str, reset_token: str):
        """Envoie un email de réinitialisation de mot de passe à l'utilisateur"""

        if not self.enabled:
            return

        if self.env != "development" and not self.api_key:
            print("RESEND_API_KEY manquante - email reset non envoye")
            return

        try:
            reset_url = f"{self.frontend_base_url}/auth/reset-password?token={reset_token}"
            timestamp = datetime.now().strftime("%d/%m/%Y a %H:%M:%S")

            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #2196F3;">Reinitialisation de mot de passe</h2>
  <p>Bonjour,</p>
  <p>Vous avez demande la reinitialisation de votre mot de passe sur <strong>Ma Bibliotheque</strong>.</p>
  <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{reset_url}"
       style="background-color: #2196F3; color: white; padding: 14px 28px;
              text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
      Reinitialiser mon mot de passe
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">
    Ce lien est valable <strong>15 minutes</strong> (demande effectuee le {timestamp}).<br>
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="{reset_url}" style="color: #2196F3; word-break: break-all;">{reset_url}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">
    Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
    Votre mot de passe actuel reste inchange.
  </p>
</body>
</html>
            """

            self._send(email, "Reinitialisation de votre mot de passe - Ma Bibliotheque", html_body)
            print(f"Email reset envoye a {email}")

        except Exception as e:
            print(f"Erreur envoi email reset : {e}")

    async def send_email_verification(self, email: str, username: str, verification_token: str):
        """Envoie un email de verification d'adresse a l'utilisateur"""

        if not self.enabled:
            return

        if self.env != "development" and not self.api_key:
            print("RESEND_API_KEY manquante - email verification non envoye")
            return

        try:
            verify_url = f"{self.frontend_base_url}/auth/verify-email?token={verification_token}"
            timestamp = datetime.now().strftime("%d/%m/%Y a %H:%M:%S")

            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #4CAF50;">Confirmez votre adresse email</h2>
  <p>Bonjour {username},</p>
  <p>Merci de vous etre inscrit sur <strong>Ma Bibliotheque</strong>.</p>
  <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{verify_url}"
       style="background-color: #4CAF50; color: white; padding: 14px 28px;
              text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
      Confirmer mon email
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">
    Ce lien est valable <strong>24 heures</strong> (demande effectuee le {timestamp}).<br>
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="{verify_url}" style="color: #4CAF50; word-break: break-all;">{verify_url}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">
    Si vous n'avez pas cree de compte, ignorez cet email.
  </p>
</body>
</html>
            """

            self._send(email, "Confirmez votre adresse email - Ma Bibliotheque", html_body)
            print(f"Email de verification envoye a {email}")

        except Exception as e:
            print(f"Erreur envoi email verification : {e}")

    async def send_waitlist_confirmation(self, email: str, name: str):
        """Confirmation à l'utilisateur après son inscription sur la liste d'attente."""
        if not self.enabled:
            return
        if self.env != "development" and not self.api_key:
            return
        try:
            safe_name = html.escape(name)
            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #8B2020;">Inscription sur liste d'attente confirmee</h2>
  <p>Bonjour {safe_name},</p>
  <p>Merci de votre interet pour <strong>Ma Bibliotheque</strong> !</p>
  <p>Votre demande a bien ete enregistree. Nous vous contacterons des que votre acces sera disponible.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">Ma Bibliotheque — ne pas repondre a cet email.</p>
</body>
</html>
            """
            self._send(email, "Vous etes sur la liste d'attente - Ma Bibliotheque", html_body)
            print(f"Confirmation waitlist envoyee a {email}")
        except Exception as e:
            print(f"Erreur envoi confirmation waitlist : {e}")

    async def send_waitlist_admin_notification(self, name: str, email: str, message: Optional[str], referred_by: Optional[str] = None):
        """Notifie l'admin d'une nouvelle inscription sur la liste d'attente."""
        if not self.enabled:
            return
        if not self.notification_email:
            return
        try:
            safe_name = html.escape(name)
            safe_email = html.escape(email)
            safe_message = html.escape(message) if message else '—'
            safe_referred_by = html.escape(referred_by) if referred_by else '—'
            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Nouvelle inscription sur la liste d'attente</h2>
  <ul>
    <li><strong>Nom :</strong> {safe_name}</li>
    <li><strong>Email :</strong> {safe_email}</li>
    <li><strong>Message :</strong> {safe_message}</li>
    <li><strong>Recommandé par :</strong> {safe_referred_by}</li>
  </ul>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">Ma Bibliotheque — systeme de notification</p>
</body>
</html>
            """
            self._send(
                self.notification_email,
                f"[Ma Bibliotheque] Nouvelle inscription waitlist — {name} ({email})",
                html_body,
            )
        except Exception as e:
            print(f"Erreur notification admin waitlist : {e}")

    async def send_waitlist_invitation(self, email: str, name: str):
        """Envoie l'invitation quand l'admin passe le statut à 'invited'."""
        if not self.enabled:
            return
        if self.env != "development" and not self.api_key:
            return
        try:
            safe_name = html.escape(name)
            register_url = f"{self.frontend_base_url}/auth/register"
            html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #8B2020;">Votre invitation est prete !</h2>
  <p>Bonjour {safe_name},</p>
  <p>Nous avons le plaisir de vous inviter a rejoindre <strong>Ma Bibliotheque</strong>.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="{register_url}"
       style="background-color: #8B2020; color: white; padding: 14px 28px;
              text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
      Creer mon compte
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">
    Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
    <a href="{register_url}" style="color: #8B2020; word-break: break-all;">{register_url}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">Ma Bibliotheque — ne pas repondre a cet email.</p>
</body>
</html>
            """
            self._send(email, "Votre invitation Ma Bibliotheque est prete", html_body)
            print(f"Invitation waitlist envoyee a {email}")
        except Exception as e:
            print(f"Erreur envoi invitation waitlist : {e}")

    def _format_additional_info_html(self, info: dict) -> str:
        """Formate les informations supplémentaires en HTML"""
        if not info:
            return ""
        items = "".join(f"<li><strong>{k} :</strong> {v}</li>" for k, v in info.items())
        return f"<h3>📊 Informations supplémentaires</h3><ul>{items}</ul>"


# Instance globale
email_notification_service = EmailNotificationService()
