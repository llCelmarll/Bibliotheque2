# Email service pour notifications d'inscription
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from fastapi import Request

class EmailNotificationService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp-mail.outlook.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.email_user = os.getenv("EMAIL_USER")  # Votre email Hotmail
        self.email_password = os.getenv("EMAIL_PASSWORD")  # Mot de passe application Outlook
        self.notification_email = os.getenv("NOTIFICATION_EMAIL", self.email_user)
        self.email_from = os.getenv("EMAIL_FROM", "admin@mabibliotheque.ovh")  # Adresse expéditeur
        self.enabled = os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "true").lower() == "true"
        
    def get_client_ip(self, request: Request) -> str:
        """Récupère l'IP réelle du client (même derrière un proxy)"""
        # Vérifier les headers de proxy dans l'ordre de priorité
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
            
        if not self.email_user or not self.email_password:
            print("⚠️ Configuration email manquante - notification non envoyée")
            return
        
        try:
            client_ip = self.get_client_ip(request)
            timestamp = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")
            
            # Vérification si IP autorisée (réseaux locaux ou IP dynamique)
            is_authorized = (
                client_ip.startswith("192.168.") or  # Réseau local
                client_ip.startswith("10.") or       # Réseau local
                client_ip.startswith("172.") or      # Réseau local
                client_ip == "127.0.0.1"             # Localhost
                # Les IP publiques sont gérées au niveau nginx, pas dans le code
            )
            
            # Création du message
            msg = MIMEMultipart()
            msg['From'] = f"Ma Bibliothèque <{self.email_from}>"
            msg['Reply-To'] = self.email_user
            msg['To'] = self.notification_email
            msg['Subject'] = f"🔔 Nouvelle inscription - Ma Bibliothèque {'✅' if is_authorized else '⚠️'}"
            
            # Corps de l'email
            alert_message = "⚠️ ALERTE : Cette inscription provient d'une IP non autorisée!" if not is_authorized else ""
            user_agent = request.headers.get('User-Agent', 'Non spécifié')
            user_agent_short = user_agent[:100] + "..." if len(user_agent) > 100 else user_agent
            
            body = f"""
Nouvelle inscription sur Ma Bibliothèque !

📝 DÉTAILS DE L'INSCRIPTION :
• Nom d'utilisateur : {username}
• Email : {email}
• Date/Heure : {timestamp}

🌐 INFORMATIONS RÉSEAU :
• Adresse IP : {client_ip}
• User-Agent : {user_agent_short}
• Referer : {request.headers.get('Referer', 'Accès direct')}

🔐 SÉCURITÉ :
• Réseau : {'✅ Réseau local/autorisé' if is_authorized else '🌐 Internet public'}
• Statut : {'Accès depuis réseau interne' if is_authorized else 'Accès depuis Internet - Vérifiez nginx pour restrictions IP'}

{self._format_additional_info(additional_info) if additional_info else ''}

---
🛡️ Cette notification vous permet de surveiller les accès à votre bibliothèque privée.

{alert_message}

Cordialement,
Système de notification Ma Bibliothèque
            """
            
            msg.attach(MIMEText(body, 'plain', 'utf-8'))
            
            # Envoi de l'email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email_user, self.email_password)
                server.send_message(msg)
            
            print(f"✅ Notification email envoyée pour {username} ({client_ip}) - {'Autorisé' if is_authorized else 'NON AUTORISÉ'}")
            
        except Exception as e:
            print(f"❌ Erreur envoi notification email : {e}")
    
    async def send_password_reset_email(self, email: str, reset_token: str):
        """Envoie un email de réinitialisation de mot de passe à l'utilisateur"""

        if not self.enabled:
            print("📧 Notifications email désactivées")
            return

        if not self.email_user or not self.email_password:
            print("⚠️ Configuration email manquante - email reset non envoyé")
            return

        try:
            reset_url = f"https://mabibliotheque.ovh/auth/reset-password?token={reset_token}"
            timestamp = datetime.now().strftime("%d/%m/%Y à %H:%M:%S")

            msg = MIMEMultipart('alternative')
            msg['From'] = f"Ma Bibliothèque <{self.email_from}>"
            msg['To'] = email
            msg['Subject'] = "🔑 Réinitialisation de votre mot de passe - Ma Bibliothèque"

            text_body = f"""
Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe sur Ma Bibliothèque.

Cliquez sur le lien suivant pour choisir un nouveau mot de passe :
{reset_url}

Ce lien est valable 15 minutes (demande effectuée le {timestamp}).

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
Votre mot de passe actuel reste inchangé.

Cordialement,
Ma Bibliothèque
            """

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

            msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email_user, self.email_password)
                server.send_message(msg)

            print(f"✅ Email reset envoyé à {email}")

        except Exception as e:
            print(f"❌ Erreur envoi email reset : {e}")

    def _format_additional_info(self, info: dict) -> str:
        """Formate les informations supplémentaires"""
        if not info:
            return ""
        formatted = ["📊 INFORMATIONS SUPPLÉMENTAIRES :"]
        for key, value in info.items():
            formatted.append(f"• {key} : {value}")
        return "\n".join(formatted) + "\n"

# Instance globale
email_notification_service = EmailNotificationService()