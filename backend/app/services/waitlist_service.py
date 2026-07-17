from typing import List, Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.waitlist_entry_model import WaitlistEntry, WaitlistStatus
from app.repositories.waitlist_repository import WaitlistRepository
from app.repositories.whitelist_repository import WhitelistRepository
from app.services.email_service import email_notification_service


class WaitlistService:
    def __init__(self, session: Session):
        self.session = session
        self.waitlist_repository = WaitlistRepository(session)
        self.whitelist_repository = WhitelistRepository(session)

    async def join(self, data) -> WaitlistEntry:
        existing = self.waitlist_repository.get_by_email(data.email.lower())
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cet email est déjà sur la liste d'attente.",
            )

        entry = WaitlistEntry(
            email=data.email.lower(),
            name=data.name.strip(),
            message=data.message.strip() if data.message else None,
            referred_by=data.referred_by.strip() if data.referred_by else None,
        )
        self.waitlist_repository.add_entry(entry)
        self.session.commit()
        self.session.refresh(entry)

        await email_notification_service.send_waitlist_confirmation(entry.email, entry.name)
        await email_notification_service.send_waitlist_admin_notification(
            entry.name, entry.email, entry.message, entry.referred_by
        )

        return entry

    def list_entries(
        self,
        search: Optional[str],
        status_filter: Optional[WaitlistStatus],
        offset: int,
        limit: int,
    ) -> List[WaitlistEntry]:
        return self.waitlist_repository.search_entries(search, status_filter, offset, limit)

    def delete(self, entry_id: int) -> None:
        entry = self.waitlist_repository.get_by_id(entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Entrée introuvable.")
        self.waitlist_repository.delete_entry(entry)
        self.session.commit()

    async def update_status(self, entry_id: int, new_status: WaitlistStatus, current_user_id: int) -> WaitlistEntry:
        entry = self.waitlist_repository.get_by_id(entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Entrée introuvable.")

        self.waitlist_repository.update_status(entry, new_status)
        self.session.commit()
        self.session.refresh(entry)

        if new_status == WaitlistStatus.invited:
            # Ajouter à la whitelist si pas déjà présent
            already_whitelisted = self.whitelist_repository.get_by_email(entry.email)
            if not already_whitelisted:
                self.whitelist_repository.add_entry(entry.email, current_user_id)
                self.session.commit()

            await email_notification_service.send_waitlist_invitation(entry.email, entry.name)

        return entry
