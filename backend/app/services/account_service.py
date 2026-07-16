import csv
import io
import logging
import zipfile
from time import perf_counter

from sqlmodel import Session

from app.models.user_model import User
from app.repositories.account_repository import AccountRepository

logger = logging.getLogger("app")


class AccountService:
    def __init__(self, session: Session, user_id: int):
        self.session = session
        self.user_id = user_id
        self.account_repository = AccountRepository(session)

    def export_account_data_zip(self) -> bytes:
        """Génère un ZIP contenant un CSV par entité + un profil, pour la portabilité RGPD."""
        start = perf_counter()
        user = self.account_repository.get_user(self.user_id)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("profil.csv", self._export_profile_csv(user))
            zf.writestr("livres.csv", self._export_books_csv())
            zf.writestr("contacts.csv", self._export_contacts_csv())
            zf.writestr("invitations.csv", self._export_invitations_csv())
            zf.writestr("demandes_de_pret.csv", self._export_loan_requests_csv())
            zf.writestr("prets_consentis.csv", self._export_loans_csv())
            zf.writestr("emprunts.csv", self._export_borrowed_books_csv())
            zf.writestr("notifications_push.csv", self._export_push_tokens_csv())

        duration_ms = (perf_counter() - start) * 1000
        logger.info(
            "ACCOUNT_DATA_EXPORTED user_id=%s duration_ms=%.1f", self.user_id, duration_ms
        )
        return buffer.getvalue()

    # --- Helpers CSV (BOM UTF-8 + séparateur ';', pattern repris de BookService) ---

    @staticmethod
    def _new_csv_writer():
        output = io.StringIO()
        output.write('﻿')  # BOM UTF-8 pour compatibilité Excel
        writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        return output, writer

    def _export_profile_csv(self, user: User) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow(['champ', 'valeur'])
        writer.writerow(['email', user.email])
        writer.writerow(['username', user.username])
        writer.writerow(['role', user.role])
        writer.writerow(['consent_version', user.consent_version or ''])
        writer.writerow(['consent_accepted_at', user.consent_accepted_at.isoformat() if user.consent_accepted_at else ''])
        writer.writerow(['created_at', user.created_at.isoformat() if user.created_at else ''])
        push_prefs = user.push_prefs or {}
        for key, value in push_prefs.items():
            writer.writerow([f'notification_push_{key}', value])
        return output.getvalue()

    def _export_books_csv(self) -> str:
        # Réutilise BookService pour éviter la duplication de la logique d'enrichissement
        from app.services.book_service import BookService

        return BookService(self.session, user_id=self.user_id).export_books_csv()

    def _export_contacts_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'nom', 'email', 'telephone', 'notes',
            'compte_lie_username', 'compte_lie_email',
            'bibliotheque_partagee', 'date_creation',
        ])
        contacts = self.account_repository.get_contacts_owned(self.user_id)
        for c in contacts:
            linked_username = c.linked_user.username if c.linked_user else ''
            linked_email = c.linked_user.email if c.linked_user else ''
            writer.writerow([
                c.name,
                c.email or '',
                c.phone or '',
                c.notes or '',
                linked_username,
                linked_email,
                'oui' if c.library_shared else 'non',
                c.created_at.isoformat(),
            ])
        return output.getvalue()

    def _export_invitations_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'sens', 'autre_utilisateur_username', 'autre_utilisateur_email',
            'statut', 'message', 'date_creation', 'date_reponse',
        ])
        invitations = self.account_repository.get_invitations(self.user_id)
        for inv in invitations:
            is_sender = inv.sender_id == self.user_id
            other = inv.recipient if is_sender else inv.sender
            writer.writerow([
                'envoyee' if is_sender else 'recue',
                other.username if other else '',
                other.email if other else '',
                inv.status,
                inv.message or '',
                inv.created_at.isoformat(),
                inv.responded_at.isoformat() if inv.responded_at else '',
            ])
        return output.getvalue()

    def _export_loan_requests_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'sens', 'autre_utilisateur_username', 'autre_utilisateur_email', 'livre',
            'statut', 'message', 'reponse',
            'date_demande', 'date_reponse', 'date_echeance', 'date_retour',
        ])
        requests_ = self.account_repository.get_loan_requests(self.user_id)
        for r in requests_:
            is_requester = r.requester_id == self.user_id
            other = r.lender if is_requester else r.requester
            writer.writerow([
                'emprunteur' if is_requester else 'preteur',
                other.username if other else '',
                other.email if other else '',
                r.book.title if r.book else '',
                r.status,
                r.message or '',
                r.response_message or '',
                r.request_date.isoformat(),
                r.response_date.isoformat() if r.response_date else '',
                r.due_date.isoformat() if r.due_date else '',
                r.return_date.isoformat() if r.return_date else '',
            ])
        return output.getvalue()

    def _export_loans_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'livre', 'emprunteur_contact', 'statut',
            'date_pret', 'date_echeance', 'date_retour', 'notes',
        ])
        loans = self.account_repository.get_loans_as_owner(self.user_id)
        for l in loans:
            writer.writerow([
                l.book.title if l.book else '',
                l.contact.name if l.contact else '',
                l.status,
                l.loan_date.isoformat(),
                l.due_date.isoformat() if l.due_date else '',
                l.return_date.isoformat() if l.return_date else '',
                l.notes or '',
            ])
        return output.getvalue()

    def _export_borrowed_books_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow([
            'livre', 'emprunte_a', 'statut',
            'date_emprunt', 'date_retour_prevue', 'date_retour_reelle', 'notes',
        ])
        borrows = self.account_repository.get_borrowed_books(self.user_id)
        for b in borrows:
            writer.writerow([
                b.book.title if b.book else '',
                b.contact.name if b.contact else b.borrowed_from,
                b.status,
                b.borrowed_date.isoformat(),
                b.expected_return_date.isoformat() if b.expected_return_date else '',
                b.actual_return_date.isoformat() if b.actual_return_date else '',
                b.notes or '',
            ])
        return output.getvalue()

    def _export_push_tokens_csv(self) -> str:
        output, writer = self._new_csv_writer()
        writer.writerow(['plateforme', 'date_enregistrement'])
        tokens = self.account_repository.get_push_tokens(self.user_id)
        for t in tokens:
            writer.writerow([t.platform or '', t.created_at.isoformat()])
        return output.getvalue()
