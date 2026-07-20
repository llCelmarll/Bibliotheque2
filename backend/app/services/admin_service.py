from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import Session

from app.models.audit_log_model import AuditLog
from app.models.user_model import User
from app.models.whitelist_entry_model import WhitelistEntry
from app.repositories.admin_repository import AdminRepository
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.waitlist_repository import WaitlistRepository
from app.repositories.whitelist_repository import WhitelistRepository
from app.schemas.admin_schemas import AdminStats, AdminUserUpdate, WhitelistEntryCreate


class AdminService:
    def __init__(self, session: Session):
        self.session = session
        self.admin_repository = AdminRepository(session)
        self.report_repository = ReportRepository(session)
        self.waitlist_repository = WaitlistRepository(session)
        self.whitelist_repository = WhitelistRepository(session)
        self.audit_log_repository = AuditLogRepository(session)

    def get_stats(self) -> AdminStats:
        return AdminStats(
            total_users=self.admin_repository.count_users(),
            active_users=self.admin_repository.count_active_users(),
            total_books=self.admin_repository.count_books(),
            active_loans=self.admin_repository.count_active_loans(),
            pending_reports=self.report_repository.count_pending(),
            whitelist_count=self.whitelist_repository.count(),
            pending_waitlist=self.waitlist_repository.count_pending(),
        )

    def list_users(
        self,
        search: Optional[str],
        is_active: Optional[bool],
        role: Optional[str],
        offset: int,
        limit: int,
    ) -> List[User]:
        return self.admin_repository.search_users(search, is_active, role, offset, limit)

    def get_user_loans(self, user_id: int, limit: int) -> List[dict]:
        user = self.admin_repository.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        loans = self.admin_repository.get_loans_by_owner(user_id, limit)
        result = []
        for loan in loans:
            book = self.admin_repository.get_book(loan.book_id) if loan.book_id else None
            result.append({
                "id": loan.id,
                "status": loan.status,
                "loan_date": loan.loan_date,
                "due_date": loan.due_date,
                "return_date": loan.return_date,
                "book": {"id": book.id, "title": book.title, "authors": [{"name": a.name} for a in book.authors]} if book else None,
                "contact": {"name": loan.contact.name} if loan.contact else None,
            })
        return result

    def update_user(self, user_id: int, data: AdminUserUpdate, current_user: User) -> User:
        user = self.admin_repository.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre compte depuis l'admin")
        if data.role is not None and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Seul un administrateur peut modifier les rôles")

        audit_detail = {}
        if data.is_active is not None:
            audit_detail["is_active"] = {"before": user.is_active, "after": data.is_active}
            user.is_active = data.is_active
        if data.role is not None:
            audit_detail["role"] = {"before": user.role, "after": data.role}
            user.role = data.role

        action = "suspend_user" if data.is_active is False else "change_role" if data.role else "update_user"
        audit = AuditLog(actor_id=current_user.id, action=action, target_type="user", target_id=user_id, detail=audit_detail)
        self.admin_repository.update_user(user)
        self.audit_log_repository.add_audit_log(audit)
        self.session.commit()
        self.session.refresh(user)
        return user

    def delete_user(self, user_id: int, current_user: User) -> None:
        user = self.admin_repository.get_user(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
        audit = AuditLog(actor_id=current_user.id, action="delete_user", target_type="user", target_id=user_id, detail={"email": user.email, "username": user.username})
        self.audit_log_repository.add_audit_log(audit)
        self.admin_repository.delete_user(user)
        self.session.commit()

    def list_whitelist(self) -> List[WhitelistEntry]:
        return self.whitelist_repository.list_all()

    def add_to_whitelist(self, data: WhitelistEntryCreate, current_user: User) -> WhitelistEntry:
        email = data.email.lower()
        existing = self.whitelist_repository.get_by_email(email)
        if existing:
            raise HTTPException(status_code=409, detail="Cet email est déjà dans la whitelist")
        entry = self.whitelist_repository.add_entry(email, current_user.id)
        audit = AuditLog(actor_id=current_user.id, action="whitelist_add", target_type="whitelist", detail={"email": email})
        self.audit_log_repository.add_audit_log(audit)
        self.session.commit()
        self.session.refresh(entry)
        return entry

    def remove_from_whitelist(self, email: str, current_user: User) -> None:
        entry = self.whitelist_repository.get_by_email(email.lower())
        if not entry:
            raise HTTPException(status_code=404, detail="Email introuvable dans la whitelist")
        audit = AuditLog(actor_id=current_user.id, action="whitelist_remove", target_type="whitelist", detail={"email": email.lower()})
        self.audit_log_repository.add_audit_log(audit)
        self.whitelist_repository.delete_entry(entry)
        self.session.commit()

    def get_audit_log(self, action: Optional[str], offset: int, limit: int) -> List[AuditLog]:
        return self.audit_log_repository.list_audit_log(action, offset, limit)
