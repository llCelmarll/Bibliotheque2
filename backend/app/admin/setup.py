from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse
from sqlmodel import Session, select

from app.db import engine
from app.models.user_model import User
from app.models.book_model import Book
from app.models.author_model import Author
from app.models.publisher_model import Publisher
from app.models.genre_model import Genre
from app.models.series_model import Series
from app.models.report_model import Report
from app.models.audit_log_model import AuditLog
from app.models.loan_model import Loan
from app.models.user_loan_request_model import UserLoanRequest
from app.models.contact_model import Contact
from app.models.whitelist_entry_model import WhitelistEntry


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        token = form.get("token", "")
        if not token:
            return False
        try:
            from app.services.auth_service import AuthService
            auth_svc = AuthService(Session(engine))
            user = auth_svc.get_user_from_token(token)
            if user and user.role == "admin" and user.is_active:
                request.session["admin_token"] = token
                return True
        except Exception:
            pass
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("admin_token")
        if not token:
            return False
        try:
            from app.services.auth_service import AuthService
            auth_svc = AuthService(Session(engine))
            user = auth_svc.get_user_from_token(token)
            return user is not None and user.role == "admin" and user.is_active
        except Exception:
            return False


class UserAdmin(ModelView, model=User):
    name = "Utilisateur"
    name_plural = "Utilisateurs"
    icon = "fa-solid fa-users"
    column_list = [User.id, User.email, User.username, User.role, User.is_active, User.created_at]
    column_searchable_list = [User.email, User.username]
    column_sortable_list = [User.id, User.email, User.role, User.is_active, User.created_at]
    column_filters = [User.role, User.is_active]
    can_delete = True


class BookAdmin(ModelView, model=Book):
    name = "Livre"
    name_plural = "Livres"
    icon = "fa-solid fa-book"
    column_list = [Book.id, Book.title, Book.isbn, Book.owner_id, Book.is_read, Book.rating, Book.created_at]
    column_searchable_list = [Book.title, Book.isbn]
    column_sortable_list = [Book.id, Book.title, Book.rating, Book.created_at]
    can_delete = True


class AuthorAdmin(ModelView, model=Author):
    name = "Auteur"
    name_plural = "Auteurs"
    icon = "fa-solid fa-pen"
    column_list = [Author.id, Author.name]
    column_searchable_list = [Author.name]
    column_sortable_list = [Author.id, Author.name]
    can_delete = True


class PublisherAdmin(ModelView, model=Publisher):
    name = "Éditeur"
    name_plural = "Éditeurs"
    icon = "fa-solid fa-building"
    column_list = [Publisher.id, Publisher.name]
    column_searchable_list = [Publisher.name]
    column_sortable_list = [Publisher.id, Publisher.name]
    can_delete = True


class GenreAdmin(ModelView, model=Genre):
    name = "Genre"
    name_plural = "Genres"
    icon = "fa-solid fa-tag"
    column_list = [Genre.id, Genre.name]
    column_searchable_list = [Genre.name]
    column_sortable_list = [Genre.id, Genre.name]
    can_delete = True


class SeriesAdmin(ModelView, model=Series):
    name = "Série"
    name_plural = "Séries"
    icon = "fa-solid fa-layer-group"
    column_list = [Series.id, Series.name]
    column_searchable_list = [Series.name]
    column_sortable_list = [Series.id, Series.name]
    can_delete = True


class ReportAdmin(ModelView, model=Report):
    name = "Signalement"
    name_plural = "Signalements"
    icon = "fa-solid fa-flag"
    column_list = [Report.id, Report.reporter_id, Report.target_type, Report.target_id, Report.reason, Report.status, Report.created_at]
    column_sortable_list = [Report.id, Report.status, Report.target_type, Report.created_at]
    column_filters = [Report.status, Report.target_type, Report.reason]
    can_delete = True


class AuditLogAdmin(ModelView, model=AuditLog):
    name = "Audit Log"
    name_plural = "Audit Logs"
    icon = "fa-solid fa-clipboard-list"
    column_list = [AuditLog.id, AuditLog.actor_id, AuditLog.action, AuditLog.target_type, AuditLog.target_id, AuditLog.created_at]
    column_sortable_list = [AuditLog.id, AuditLog.action, AuditLog.created_at]
    column_filters = [AuditLog.action, AuditLog.target_type]
    can_create = False
    can_edit = False
    can_delete = False


class LoanAdmin(ModelView, model=Loan):
    name = "Prêt"
    name_plural = "Prêts"
    icon = "fa-solid fa-handshake"
    column_list = [Loan.id, Loan.book_id, Loan.owner_id, Loan.contact_id, Loan.status, Loan.loan_date, Loan.due_date, Loan.return_date]
    column_sortable_list = [Loan.id, Loan.status, Loan.loan_date]
    column_filters = [Loan.status]
    can_delete = True


class UserLoanRequestAdmin(ModelView, model=UserLoanRequest):
    name = "Demande de prêt"
    name_plural = "Demandes de prêt"
    icon = "fa-solid fa-envelope"
    column_list = [UserLoanRequest.id, UserLoanRequest.requester_id, UserLoanRequest.lender_id, UserLoanRequest.book_id, UserLoanRequest.status, UserLoanRequest.request_date]
    column_sortable_list = [UserLoanRequest.id, UserLoanRequest.status, UserLoanRequest.request_date]
    column_filters = [UserLoanRequest.status]
    can_delete = True


class ContactAdmin(ModelView, model=Contact):
    name = "Contact"
    name_plural = "Contacts"
    icon = "fa-solid fa-address-book"
    column_list = [Contact.id, Contact.name, Contact.email, Contact.owner_id, Contact.linked_user_id, Contact.library_shared]
    column_searchable_list = [Contact.name, Contact.email]
    column_sortable_list = [Contact.id, Contact.name]
    can_delete = True


class WhitelistEntryAdmin(ModelView, model=WhitelistEntry):
    name = "Whitelist"
    name_plural = "Whitelist"
    icon = "fa-solid fa-list-check"
    column_list = [WhitelistEntry.id, WhitelistEntry.email, WhitelistEntry.added_by_id, WhitelistEntry.added_at]
    column_searchable_list = [WhitelistEntry.email]
    column_sortable_list = [WhitelistEntry.id, WhitelistEntry.email, WhitelistEntry.added_at]
    can_delete = True


def setup_admin(app):
    import os
    secret_key = os.getenv("SECRET_KEY", "change-me")
    authentication_backend = AdminAuth(secret_key=secret_key)
    admin = Admin(
        app,
        engine,
        authentication_backend=authentication_backend,
        base_url="/sqladmin",
        title="Ma Bibliothèque — Admin",
    )
    admin.add_view(UserAdmin)
    admin.add_view(BookAdmin)
    admin.add_view(AuthorAdmin)
    admin.add_view(PublisherAdmin)
    admin.add_view(GenreAdmin)
    admin.add_view(SeriesAdmin)
    admin.add_view(ReportAdmin)
    admin.add_view(AuditLogAdmin)
    admin.add_view(LoanAdmin)
    admin.add_view(UserLoanRequestAdmin)
    admin.add_view(ContactAdmin)
    admin.add_view(WhitelistEntryAdmin)
