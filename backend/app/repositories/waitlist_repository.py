from typing import List, Optional

from sqlmodel import Session, select

from app.models.waitlist_entry_model import WaitlistEntry, WaitlistStatus


class WaitlistRepository:
    """Repository pour les opérations de données sur la liste d'attente (WaitlistEntry)."""

    def __init__(self, session: Session):
        self.session = session

    def get_by_email(self, email: str) -> Optional[WaitlistEntry]:
        return self.session.exec(
            select(WaitlistEntry).where(WaitlistEntry.email == email)
        ).first()

    def add_entry(self, entry: WaitlistEntry) -> WaitlistEntry:
        self.session.add(entry)
        return entry

    def search_entries(
        self,
        search: Optional[str],
        status_filter: Optional[WaitlistStatus],
        offset: int,
        limit: int,
    ) -> List[WaitlistEntry]:
        query = select(WaitlistEntry)
        if search:
            query = query.where(
                (WaitlistEntry.email.ilike(f"%{search}%"))
                | (WaitlistEntry.name.ilike(f"%{search}%"))
            )
        if status_filter:
            query = query.where(WaitlistEntry.status == status_filter)
        query = query.order_by(WaitlistEntry.created_at.desc()).offset(offset).limit(limit)
        return self.session.exec(query).all()

    def get_by_id(self, entry_id: int) -> Optional[WaitlistEntry]:
        return self.session.get(WaitlistEntry, entry_id)

    def update_status(self, entry: WaitlistEntry, status: WaitlistStatus) -> WaitlistEntry:
        entry.status = status
        self.session.add(entry)
        return entry

    def delete_entry(self, entry: WaitlistEntry) -> None:
        self.session.delete(entry)
