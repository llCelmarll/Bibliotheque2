from fastapi import APIRouter, Depends, HTTPException
from app.models.User import User
from app.schemas.Admin import ContactStaffMessage
from app.services.auth_service import get_current_user_sync as get_current_user
from app.services.email_service import email_notification_service
import os

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("/staff", status_code=200)
def contact_staff(
    data: ContactStaffMessage,
    current_user: User = Depends(get_current_user),
):
    staff_email = os.getenv("STAFF_EMAIL") or os.getenv("NOTIFICATION_EMAIL")
    if not staff_email:
        raise HTTPException(status_code=503, detail="Contact staff indisponible (configuration manquante)")

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2>Nouveau message de l'application</h2>
  <p><strong>De :</strong> {current_user.username} ({current_user.email})</p>
  <p><strong>Sujet :</strong> {data.subject}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="white-space: pre-wrap;">{data.message}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="color: #aaa; font-size: 12px;">Envoyé depuis Ma Bibliothèque — ID utilisateur : {current_user.id}</p>
</body>
</html>
"""
    try:
        email_notification_service._send(
            staff_email,
            f"[Ma Bibliothèque] {data.subject}",
            html_body,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erreur lors de l'envoi : {str(e)}")

    return {"message": "Message envoyé au staff"}
