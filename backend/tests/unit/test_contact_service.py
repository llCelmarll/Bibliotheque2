"""
Tests unitaires pour ContactService — CRUD, erreurs, linked_user, delete avec contraintes.
"""
import pytest
from fastapi import HTTPException
from sqlmodel import Session

from app.models.Contact import Contact
from app.models.Loan import Loan
from app.services.contact_service import ContactService
from app.schemas.Contact import ContactCreate, ContactUpdate
from tests.conftest import create_test_user, create_test_contact, create_test_book, create_test_borrowed_book
from app.models.BorrowedBook import BorrowStatus


@pytest.mark.unit
class TestContactServiceGetByName:

    def test_get_by_name_existing_returns_contact_read(self, session, test_user):
        create_test_contact(session, test_user.id, name="Alice")
        svc = ContactService(session, user_id=test_user.id)
        result = svc.get_by_name("Alice")
        assert result is not None
        assert result.name == "Alice"

    def test_get_by_name_not_existing_returns_none(self, session, test_user):
        svc = ContactService(session, user_id=test_user.id)
        result = svc.get_by_name("Inconnu")
        assert result is None


@pytest.mark.unit
class TestContactServiceGetOrCreateByName:

    def test_get_or_create_existing_returns_without_creating(self, session, test_user):
        existing = create_test_contact(session, test_user.id, name="Bob")
        svc = ContactService(session, user_id=test_user.id)
        result = svc.get_or_create_by_name("Bob")
        assert result.id == existing.id

    def test_get_or_create_new_creates_contact(self, session, test_user):
        svc = ContactService(session, user_id=test_user.id)
        result = svc.get_or_create_by_name("Nouveau Contact")
        assert result is not None
        assert result.name == "Nouveau Contact"
        assert result.active_loans_count == 0
        assert result.active_borrows_count == 0


@pytest.mark.unit
class TestContactServiceUpdate:

    def test_update_not_found_raises_404(self, session, test_user):
        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.update(99999, ContactUpdate(name="New Name"))
        assert exc.value.status_code == 404

    def test_update_phone_and_notes(self, session, test_user):
        contact = create_test_contact(session, test_user.id, name="Charlie")
        svc = ContactService(session, user_id=test_user.id)
        result = svc.update(contact.id, ContactUpdate(phone="0600000000", notes="note"))
        assert result.phone == "0600000000"
        assert result.notes == "note"

    def test_update_linked_user_id_valid(self, session, test_user):
        second = create_test_user(session, email="linked@example.com", username="linkeduser")
        contact = create_test_contact(session, test_user.id, name="DeltaContact")
        svc = ContactService(session, user_id=test_user.id)
        result = svc.update(contact.id, ContactUpdate(linked_user_id=second.id))
        assert result.linked_user_id == second.id

    def test_update_linked_user_id_not_found_raises_404(self, session, test_user):
        contact = create_test_contact(session, test_user.id, name="EchoContact")
        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.update(contact.id, ContactUpdate(linked_user_id=99999))
        assert exc.value.status_code == 404

    def test_update_library_shared_without_linked_user_raises_400(self, session, test_user):
        contact = create_test_contact(session, test_user.id, name="FoxtrotContact")
        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.update(contact.id, ContactUpdate(library_shared=True))
        assert exc.value.status_code == 400
        assert "lier un utilisateur" in exc.value.detail

    def test_update_library_shared_with_linked_user_succeeds(self, session, test_user):
        second = create_test_user(session, email="shared2@example.com", username="shareduser2")
        contact = create_test_contact(session, test_user.id, name="GolfContact")
        svc = ContactService(session, user_id=test_user.id)
        svc.update(contact.id, ContactUpdate(linked_user_id=second.id))
        result = svc.update(contact.id, ContactUpdate(library_shared=True))
        assert result.library_shared is True


@pytest.mark.unit
class TestContactServiceDelete:

    def test_delete_not_found_raises_404(self, session, test_user):
        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.delete(99999)
        assert exc.value.status_code == 404

    def test_delete_contact_with_active_loan_raises_400(self, session, test_user, test_book):
        contact = create_test_contact(session, test_user.id, name="HotelContact")
        # Créer un prêt actif lié à ce contact
        from datetime import datetime, timedelta
        loan = Loan(
            book_id=test_book.id,
            owner_id=test_user.id,
            contact_id=contact.id,
            loan_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=14),
            status="active"
        )
        session.add(loan)
        session.commit()
        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.delete(contact.id)
        assert exc.value.status_code == 400

    def test_delete_contact_with_active_borrow_raises_400(self, session, test_user, test_book):
        contact = create_test_contact(session, test_user.id, name="IndiaContact")
        create_test_borrowed_book(session, test_book.id, test_user.id,
                                  contact_id=contact.id, status=BorrowStatus.ACTIVE)
        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.delete(contact.id)
        assert exc.value.status_code == 400

    def test_delete_simple_contact_succeeds(self, session, test_user):
        contact = create_test_contact(session, test_user.id, name="JuliettContact")
        svc = ContactService(session, user_id=test_user.id)
        svc.delete(contact.id)
        with pytest.raises(HTTPException):
            svc.get_by_id(contact.id)

    def test_delete_contact_with_accepted_loan_request_raises_400(self, session, test_user, test_book):
        second = create_test_user(session, email="accepted@example.com", username="accepteduser")
        contact_ab = Contact(name="AcceptedContact", owner_id=test_user.id, linked_user_id=second.id)
        session.add(contact_ab)
        session.commit()
        session.refresh(contact_ab)

        from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
        req = UserLoanRequest(
            requester_id=second.id,
            lender_id=test_user.id,
            book_id=test_book.id,
            status=UserLoanRequestStatus.ACCEPTED,
        )
        session.add(req)
        session.commit()

        svc = ContactService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.delete(contact_ab.id)
        assert exc.value.status_code == 400

    def test_delete_contact_with_linked_user_and_pending_requests_cancels_them(self, session, test_user, test_book):
        second = create_test_user(session, email="pending@example.com", username="pendinguser")
        contact_ab = Contact(name="PendingContact", owner_id=test_user.id, linked_user_id=second.id)
        session.add(contact_ab)
        session.commit()
        session.refresh(contact_ab)

        from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
        req = UserLoanRequest(
            requester_id=test_user.id,
            lender_id=second.id,
            book_id=test_book.id,
            status=UserLoanRequestStatus.PENDING,
        )
        session.add(req)
        session.commit()
        session.refresh(req)

        svc = ContactService(session, user_id=test_user.id)
        svc.delete(contact_ab.id)

        session.refresh(req)
        assert req.status == UserLoanRequestStatus.CANCELLED

    def test_delete_contact_with_linked_user_deletes_mirror(self, session, test_user):
        second = create_test_user(session, email="mirror@example.com", username="mirroruser")
        # Créer contact A→B et mirror B→A
        contact_ab = Contact(name="MirrorContact", owner_id=test_user.id,
                             linked_user_id=second.id)
        contact_ba = Contact(name=test_user.username, owner_id=second.id,
                             linked_user_id=test_user.id)
        session.add(contact_ab)
        session.add(contact_ba)
        session.commit()
        session.refresh(contact_ab)
        session.refresh(contact_ba)

        svc = ContactService(session, user_id=test_user.id)
        svc.delete(contact_ab.id)

        # Le miroir doit être supprimé
        svc2 = ContactService(session, user_id=second.id)
        result = svc2.get_by_name(test_user.username)
        assert result is None


@pytest.mark.unit
class TestContactServiceToContactRead:
    """_to_contact_read() : branches linked_user (username + UserLoanRequest counts)."""

    def test_to_contact_read_with_linked_user_resolves_username(self, session, test_user):
        second = create_test_user(session, email="toread@example.com", username="toreaduser")
        contact = create_test_contact(session, test_user.id, name="LinkedContact")
        # Lier manuellement
        contact.linked_user_id = second.id
        session.add(contact)
        session.commit()
        session.refresh(contact)

        svc = ContactService(session, user_id=test_user.id)
        result = svc.get_by_id(contact.id)
        assert result.linked_user_username == "toreaduser"

    def test_to_contact_read_without_linked_user_username_is_none(self, session, test_user):
        contact = create_test_contact(session, test_user.id, name="UnlinkedContact")
        svc = ContactService(session, user_id=test_user.id)
        result = svc.get_by_id(contact.id)
        assert result.linked_user_username is None
