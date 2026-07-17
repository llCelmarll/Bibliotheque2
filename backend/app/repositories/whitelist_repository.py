from typing import List, Optional

from sqlmodel import Session, func, select

from app.models.whitelist_entry_model import WhitelistEntry


class WhitelistRepository:
    """Repository pour les opérations de données sur la whitelist (WhitelistEntry).

    Partagé entre waitlist_router.py (ajout automatique à l'invitation) et
    admin_router.py (CRUD complet)."""

    def __init__(self, session: Session):
        self.session = session

    def get_by_email(self, email: str) -> Optional[WhitelistEntry]:
        return self.session.exec(
            select(WhitelistEntry).where(WhitelistEntry.email == email)
        ).first()

    def add_entry(self, email: str, added_by_id: Optional[int]) -> WhitelistEntry:
        entry = WhitelistEntry(email=email, added_by_id=added_by_id)
        self.session.add(entry)
        return entry

    def list_all(self) -> List[WhitelistEntry]:
        return self.session.exec(
            select(WhitelistEntry).order_by(WhitelistEntry.added_at.desc())
        ).all()

    def count(self) -> int:
        return self.session.exec(select(func.count(WhitelistEntry.id))).one()

    def delete_entry(self, entry: WhitelistEntry) -> None:
        self.session.delete(entry)
