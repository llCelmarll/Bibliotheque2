"""
Tests unitaires pour ContactInvitationService.
"""
import pytest
from datetime import datetime
from unittest.mock import patch

from sqlmodel import Session

from app.models.ContactInvitation import ContactInvitation, InvitationStatus
from app.models.Contact import Contact
from app.models.User import User
from app.schemas.ContactInvitation import ContactInvitationCreate
from app.services.contact_invitation_service import ContactInvitationService
from tests.conftest import create_test_user


# ---------------------------------------------------------------------------
# Send
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestContactInvitationSend:

    @pytest.fixture(autouse=True)
    def mock_push(self):
        with patch("app.services.contact_invitation_service._fire_push"):
            yield

    @pytest.fixture
    def users(self, session):
        user_a = create_test_user(session, email="a@example.com", username="user_a")
        user_b = create_test_user(session, email="b@example.com", username="user_b")
        return user_a, user_b

    def _svc(self, session, user_id):
        return ContactInvitationService(session, current_user_id=user_id)

    def test_send_self_invite_raises_400(self, session, users):
        user_a, _ = users
        from fastapi import HTTPException
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=user_a.id)
        with pytest.raises(HTTPException) as exc:
            svc.send(data)
        assert exc.value.status_code == 400

    def test_send_recipient_not_found_raises_404(self, session, users):
        user_a, _ = users
        from fastapi import HTTPException
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=99999)
        with pytest.raises(HTTPException) as exc:
            svc.send(data)
        assert exc.value.status_code == 404

    def test_send_recipient_inactive_raises_404(self, session, users):
        user_a, _ = users
        from fastapi import HTTPException
        inactive = create_test_user(session, email="inactive@example.com", username="inactive_u", is_active=False)
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=inactive.id)
        with pytest.raises(HTTPException) as exc:
            svc.send(data)
        assert exc.value.status_code == 404

    def test_send_pending_invite_already_exists_raises_409(self, session, users):
        user_a, user_b = users
        from fastapi import HTTPException
        inv = ContactInvitation(
            sender_id=user_a.id,
            recipient_id=user_b.id,
            status=InvitationStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        session.add(inv)
        session.commit()
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.send(data)
        assert exc.value.status_code == 409

    def test_send_reverse_pending_invite_raises_409(self, session, users):
        user_a, user_b = users
        from fastapi import HTTPException
        # B already sent to A
        inv = ContactInvitation(
            sender_id=user_b.id,
            recipient_id=user_a.id,
            status=InvitationStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        session.add(inv)
        session.commit()
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.send(data)
        assert exc.value.status_code == 409

    def test_send_already_linked_raises_409(self, session, users):
        user_a, user_b = users
        from fastapi import HTTPException
        contact = Contact(owner_id=user_a.id, name="User B", linked_user_id=user_b.id)
        session.add(contact)
        session.commit()
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.send(data)
        assert exc.value.status_code == 409

    def test_send_success_creates_pending_invitation(self, session, users):
        from sqlmodel import select
        user_a, user_b = users
        svc = self._svc(session, user_a.id)
        data = ContactInvitationCreate(recipient_id=user_b.id)
        result = svc.send(data)
        assert result.status == InvitationStatus.PENDING
        assert result.sender_id == user_a.id
        assert result.recipient_id == user_b.id
        # verify in DB
        inv = session.exec(select(ContactInvitation).where(ContactInvitation.sender_id == user_a.id)).first()
        assert inv is not None


# ---------------------------------------------------------------------------
# Accept
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestContactInvitationAccept:

    @pytest.fixture(autouse=True)
    def mock_push(self):
        with patch("app.services.contact_invitation_service._fire_push"):
            yield

    @pytest.fixture
    def users_and_inv(self, session):
        user_a = create_test_user(session, email="ac_a@example.com", username="ac_user_a")
        user_b = create_test_user(session, email="ac_b@example.com", username="ac_user_b")
        inv = ContactInvitation(
            sender_id=user_a.id,
            recipient_id=user_b.id,
            status=InvitationStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        session.add(inv)
        session.commit()
        session.refresh(inv)
        return user_a, user_b, inv

    def _svc(self, session, user_id):
        return ContactInvitationService(session, current_user_id=user_id)

    def test_accept_not_recipient_raises_403(self, session, users_and_inv):
        user_a, user_b, inv = users_and_inv
        from fastapi import HTTPException
        svc = self._svc(session, user_a.id)  # A is sender, not recipient
        with pytest.raises(HTTPException) as exc:
            svc.accept(inv.id)
        assert exc.value.status_code == 403

    def test_accept_non_existing_raises_404(self, session, users_and_inv):
        _, user_b, _ = users_and_inv
        from fastapi import HTTPException
        svc = self._svc(session, user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.accept(99999)
        assert exc.value.status_code == 404

    def test_accept_non_pending_raises_400(self, session, users_and_inv):
        user_a, user_b, inv = users_and_inv
        from fastapi import HTTPException
        inv.status = InvitationStatus.DECLINED
        session.add(inv)
        session.commit()
        svc = self._svc(session, user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.accept(inv.id)
        assert exc.value.status_code == 400

    def test_accept_success_creates_contacts_both_sides(self, session, users_and_inv):
        from sqlmodel import select
        user_a, user_b, inv = users_and_inv
        svc = self._svc(session, user_b.id)
        result = svc.accept(inv.id)
        assert result.status == InvitationStatus.ACCEPTED
        # Contact for user_b pointing to user_a
        contact_b = session.exec(
            select(Contact).where(Contact.owner_id == user_b.id, Contact.linked_user_id == user_a.id)
        ).first()
        assert contact_b is not None
        # Contact for user_a pointing to user_b
        contact_a = session.exec(
            select(Contact).where(Contact.owner_id == user_a.id, Contact.linked_user_id == user_b.id)
        ).first()
        assert contact_a is not None

    def test_accept_sets_responded_at(self, session, users_and_inv):
        _, user_b, inv = users_and_inv
        svc = self._svc(session, user_b.id)
        result = svc.accept(inv.id)
        assert result.status == InvitationStatus.ACCEPTED
        session.refresh(inv)
        assert inv.responded_at is not None


# ---------------------------------------------------------------------------
# Decline
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestContactInvitationDecline:

    @pytest.fixture(autouse=True)
    def mock_push(self):
        with patch("app.services.contact_invitation_service._fire_push"):
            yield

    @pytest.fixture
    def users_and_inv(self, session):
        user_a = create_test_user(session, email="dc_a@example.com", username="dc_user_a")
        user_b = create_test_user(session, email="dc_b@example.com", username="dc_user_b")
        inv = ContactInvitation(
            sender_id=user_a.id,
            recipient_id=user_b.id,
            status=InvitationStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        session.add(inv)
        session.commit()
        session.refresh(inv)
        return user_a, user_b, inv

    def _svc(self, session, user_id):
        return ContactInvitationService(session, current_user_id=user_id)

    def test_decline_not_recipient_raises_403(self, session, users_and_inv):
        user_a, _, inv = users_and_inv
        from fastapi import HTTPException
        svc = self._svc(session, user_a.id)
        with pytest.raises(HTTPException) as exc:
            svc.decline(inv.id)
        assert exc.value.status_code == 403

    def test_decline_not_found_raises_404(self, session, users_and_inv):
        _, user_b, _ = users_and_inv
        from fastapi import HTTPException
        svc = self._svc(session, user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.decline(99999)
        assert exc.value.status_code == 404

    def test_decline_non_pending_raises_400(self, session, users_and_inv):
        user_a, user_b, inv = users_and_inv
        from fastapi import HTTPException
        inv.status = InvitationStatus.ACCEPTED
        session.add(inv)
        session.commit()
        svc = self._svc(session, user_b.id)
        with pytest.raises(HTTPException) as exc:
            svc.decline(inv.id)
        assert exc.value.status_code == 400

    def test_decline_success(self, session, users_and_inv):
        _, user_b, inv = users_and_inv
        svc = self._svc(session, user_b.id)
        result = svc.decline(inv.id)
        assert result.status == InvitationStatus.DECLINED
        session.refresh(inv)
        assert inv.responded_at is not None


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestContactInvitationCancel:

    @pytest.fixture(autouse=True)
    def mock_push(self):
        with patch("app.services.contact_invitation_service._fire_push"):
            yield

    @pytest.fixture
    def users_and_inv(self, session):
        user_a = create_test_user(session, email="cc_a@example.com", username="cc_user_a")
        user_b = create_test_user(session, email="cc_b@example.com", username="cc_user_b")
        inv = ContactInvitation(
            sender_id=user_a.id,
            recipient_id=user_b.id,
            status=InvitationStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        session.add(inv)
        session.commit()
        session.refresh(inv)
        return user_a, user_b, inv

    def _svc(self, session, user_id):
        return ContactInvitationService(session, current_user_id=user_id)

    def test_cancel_not_sender_raises_403(self, session, users_and_inv):
        _, user_b, inv = users_and_inv
        from fastapi import HTTPException
        svc = self._svc(session, user_b.id)  # B is recipient, not sender
        with pytest.raises(HTTPException) as exc:
            svc.cancel(inv.id)
        assert exc.value.status_code == 403

    def test_cancel_not_found_raises_404(self, session, users_and_inv):
        user_a, _, _ = users_and_inv
        from fastapi import HTTPException
        svc = self._svc(session, user_a.id)
        with pytest.raises(HTTPException) as exc:
            svc.cancel(99999)
        assert exc.value.status_code == 404

    def test_cancel_non_pending_raises_400(self, session, users_and_inv):
        user_a, _, inv = users_and_inv
        from fastapi import HTTPException
        inv.status = InvitationStatus.ACCEPTED
        session.add(inv)
        session.commit()
        svc = self._svc(session, user_a.id)
        with pytest.raises(HTTPException) as exc:
            svc.cancel(inv.id)
        assert exc.value.status_code == 400

    def test_cancel_success(self, session, users_and_inv):
        user_a, _, inv = users_and_inv
        svc = self._svc(session, user_a.id)
        result = svc.cancel(inv.id)
        assert result.status == InvitationStatus.CANCELLED


# ---------------------------------------------------------------------------
# Getters
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestContactInvitationGetters:

    @pytest.fixture(autouse=True)
    def mock_push(self):
        with patch("app.services.contact_invitation_service._fire_push"):
            yield

    @pytest.fixture
    def users(self, session):
        user_a = create_test_user(session, email="g_a@example.com", username="g_user_a")
        user_b = create_test_user(session, email="g_b@example.com", username="g_user_b")
        return user_a, user_b

    def _inv(self, session, sender_id, recipient_id, status):
        inv = ContactInvitation(
            sender_id=sender_id,
            recipient_id=recipient_id,
            status=status,
            created_at=datetime.utcnow(),
        )
        session.add(inv)
        session.commit()
        return inv

    def test_get_received_returns_pending_only(self, session, users):
        user_a, user_b = users
        self._inv(session, user_a.id, user_b.id, InvitationStatus.PENDING)
        self._inv(session, user_a.id, user_b.id, InvitationStatus.ACCEPTED)
        svc = ContactInvitationService(session, current_user_id=user_b.id)
        result = svc.get_received()
        assert len(result) == 1
        assert result[0].status == InvitationStatus.PENDING

    def test_get_sent_excludes_cancelled(self, session, users):
        user_a, user_b = users
        self._inv(session, user_a.id, user_b.id, InvitationStatus.PENDING)
        self._inv(session, user_a.id, user_b.id, InvitationStatus.CANCELLED)
        svc = ContactInvitationService(session, current_user_id=user_a.id)
        result = svc.get_sent()
        assert len(result) == 1
        assert result[0].status == InvitationStatus.PENDING

    def test_get_pending_received_count_correct(self, session, users):
        user_a, user_b = users
        user_c = create_test_user(session, email="g_c@example.com", username="g_user_c")
        self._inv(session, user_a.id, user_b.id, InvitationStatus.PENDING)
        self._inv(session, user_c.id, user_b.id, InvitationStatus.PENDING)
        self._inv(session, user_a.id, user_b.id, InvitationStatus.ACCEPTED)  # should not count
        svc = ContactInvitationService(session, current_user_id=user_b.id)
        assert svc.get_pending_received_count() == 2

    def test_get_pending_received_count_zero(self, session, users):
        _, user_b = users
        svc = ContactInvitationService(session, current_user_id=user_b.id)
        assert svc.get_pending_received_count() == 0


# ---------------------------------------------------------------------------
# _get_or_create_linked_contact
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGetOrCreateLinkedContact:

    @pytest.fixture(autouse=True)
    def mock_push(self):
        with patch("app.services.contact_invitation_service._fire_push"):
            yield

    @pytest.fixture
    def users(self, session):
        user_a = create_test_user(session, email="lc_a@example.com", username="lc_user_a")
        user_b = create_test_user(session, email="lc_b@example.com", username="lc_user_b")
        return user_a, user_b

    def _svc(self, session, user_id):
        return ContactInvitationService(session, current_user_id=user_id)

    def test_returns_existing_by_linked_user_id(self, session, users):
        user_a, user_b = users
        contact = Contact(owner_id=user_a.id, name="B", linked_user_id=user_b.id)
        session.add(contact)
        session.commit()
        svc = self._svc(session, user_a.id)
        result = svc._get_or_create_linked_contact(owner_id=user_a.id, linked_user=user_b)
        assert result.id == contact.id
        assert result.linked_user_id == user_b.id

    def test_links_existing_contact_by_email(self, session, users):
        user_a, user_b = users
        contact = Contact(owner_id=user_a.id, name="Some Name", email=user_b.email)
        session.add(contact)
        session.commit()
        svc = self._svc(session, user_a.id)
        result = svc._get_or_create_linked_contact(owner_id=user_a.id, linked_user=user_b)
        assert result.linked_user_id == user_b.id

    def test_links_existing_contact_by_username(self, session, users):
        user_a, user_b = users
        contact = Contact(owner_id=user_a.id, name=user_b.username, email=None)
        session.add(contact)
        session.commit()
        svc = self._svc(session, user_a.id)
        result = svc._get_or_create_linked_contact(owner_id=user_a.id, linked_user=user_b)
        assert result.linked_user_id == user_b.id

    def test_creates_new_contact_when_no_match(self, session, users):
        from sqlmodel import select
        user_a, user_b = users
        svc = self._svc(session, user_a.id)
        result = svc._get_or_create_linked_contact(owner_id=user_a.id, linked_user=user_b)
        assert result.linked_user_id == user_b.id
        assert result.owner_id == user_a.id
        assert result.name == user_b.username
