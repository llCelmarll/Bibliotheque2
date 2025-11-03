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
            
            body = f"""
Nouvelle inscription sur Ma Bibliothèque !

📝 DÉTAILS DE L'INSCRIPTION :
• Nom d'utilisateur : {username}
• Email : {email}
• Date/Heure : {timestamp}

🌐 INFORMATIONS RÉSEAU :
• Adresse IP : {client_ip}
• User-Agent : {request.headers.get('User-Agent', 'Non spécifié')[:100]}...
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