import os
import asyncio
import httpx
from sqlmodel import Session, select

from app.models.UserPushToken import UserPushToken

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class PushNotificationService:
    def __init__(self):
        self.enabled = os.getenv("PUSH_NOTIFICATIONS_ENABLED", "true").lower() == "true"

    async def send(self, token: str, title: str, body: str, data: dict = None):
        """Envoie une notification push à un token Expo."""
        if not self.enabled:
            return

        if not token.startswith("ExponentPushToken["):
            print(f"⚠️ Token push invalide ignoré : {token[:30]}...")
            return

        payload = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
        }
        if data:
            payload["data"] = data

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    EXPO_PUSH_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                result = response.json()
                if result.get("data", {}).get("status") == "error":
                    print(f"❌ Erreur Expo push : {result['data'].get('message')}")
                else:
                    print(f"✅ Push envoyé à {token[:40]}...")
        except Exception as e:
            print(f"❌ Erreur envoi push : {e}")

    async def send_to_user(self, session: Session, user_id: int, title: str, body: str, data: dict = None):
        """Envoie une notification push à tous les tokens d'un utilisateur."""
        if not self.enabled:
            return

        try:
            # Vérifier les préférences si un type est fourni
            if data and data.get("type"):
                from app.models.User import User
                user = session.get(User, user_id)
                if user and user.push_prefs is not None:
                    if user.push_prefs.get(data["type"]) is False:
                        print(f"[Push] Type '{data['type']}' désactivé pour user {user_id} — ignoré")
                        return

            tokens = session.exec(
                select(UserPushToken).where(UserPushToken.user_id == user_id)
            ).all()

            if not tokens:
                return

            tasks = [self.send(pt.token, title, body, data) for pt in tokens]
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            print(f"❌ Erreur send_to_user (user {user_id}) : {e}")


push_notification_service = PushNotificationService()
