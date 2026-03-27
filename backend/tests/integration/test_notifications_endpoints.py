"""
Tests d'intégration pour GET /notifications/counts
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime

from tests.conftest import create_test_user, create_test_book
from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
from app.models.ContactInvitation import ContactInvitation, InvitationStatus
from app.services.auth_service import get_current_user
from app.db import get_session
from app.main import app as main_app


# ---------------------------------------------------------------------------
# Helpers locaux
# ---------------------------------------------------------------------------

def make_client_for_user(user, session) -> TestClient:
    """Client authentifié pour un utilisateur donné (partage la même session)."""
    main_app.dependency_overrides[get_session] = lambda: session
    main_app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(main_app)


def create_loan_request(
    session: Session,
    requester_id: int,
    lender_id: int,
    book_id: int,
    status: UserLoanRequestStatus = UserLoanRequestStatus.PENDING,
) -> UserLoanRequest:
    req = UserLoanRequest(
        requester_id=requester_id,
        lender_id=lender_id,
        book_id=book_id,
        status=status,
        request_date=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    session.add(req)
    session.commit()
    session.refresh(req)
    return req


def create_invitation(
    session: Session,
    sender_id: int,
    recipient_id: int,
    status: InvitationStatus = InvitationStatus.PENDING,
) -> ContactInvitation:
    inv = ContactInvitation(
        sender_id=sender_id,
        recipient_id=recipient_id,
        status=status,
        created_at=datetime.utcnow(),
    )
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return inv


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.integration
class TestGetNotificationCounts:
    """Tests pour GET /notifications/counts"""

    def test_counts_all_zero_when_no_data(self, session: Session):
        """Retourne des zéros si aucune invitation ni demande."""
        user = create_test_user(session, email="alice@example.com", username="alice")
        client = make_client_for_user(user, session)

        response = client.get("/notifications/counts")

        assert response.status_code == 200
        data = response.json()
        assert data["invitation_pending"] == 0
        assert data["loan_pending"] == 0
        assert data["declined_outgoing_ids"] == []

    def test_invitation_pending_count(self, session: Session):
        """Compte uniquement les invitations PENDING reçues par l'utilisateur courant."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        carol = create_test_user(session, email="carol@example.com", username="carol")

        # 2 invitations PENDING reçues par alice
        create_invitation(session, bob.id, alice.id, InvitationStatus.PENDING)
        create_invitation(session, carol.id, alice.id, InvitationStatus.PENDING)
        # 1 invitation ACCEPTED (ne doit pas compter)
        create_invitation(session, bob.id, alice.id, InvitationStatus.ACCEPTED)
        # 1 invitation envoyée par alice (ne doit pas compter)
        create_invitation(session, alice.id, carol.id, InvitationStatus.PENDING)

        client = make_client_for_user(alice, session)
        response = client.get("/notifications/counts")

        assert response.status_code == 200
        assert response.json()["invitation_pending"] == 2

    def test_loan_pending_count(self, session: Session):
        """Compte uniquement les demandes PENDING reçues (vue prêteur)."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        book = create_test_book(session, owner_id=alice.id)
        book2 = create_test_book(session, owner_id=alice.id, title="Book 2", isbn="9780000000001")

        # 2 demandes PENDING reçues par alice (elle est le prêteur)
        create_loan_request(session, bob.id, alice.id, book.id, UserLoanRequestStatus.PENDING)
        create_loan_request(session, bob.id, alice.id, book2.id, UserLoanRequestStatus.PENDING)
        # 1 demande ACCEPTED (ne doit pas compter)
        create_loan_request(session, bob.id, alice.id, book.id, UserLoanRequestStatus.ACCEPTED)
        # 1 demande PENDING envoyée par alice (elle est requester, pas prêteur → ne compte pas)
        book3 = create_test_book(session, owner_id=bob.id, title="Bob Book", isbn="9780000000002")
        create_loan_request(session, alice.id, bob.id, book3.id, UserLoanRequestStatus.PENDING)

        client = make_client_for_user(alice, session)
        response = client.get("/notifications/counts")

        assert response.status_code == 200
        assert response.json()["loan_pending"] == 2

    def test_declined_outgoing_ids(self, session: Session):
        """Retourne les IDs des demandes DECLINED envoyées par l'utilisateur courant."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        book = create_test_book(session, owner_id=bob.id)
        book2 = create_test_book(session, owner_id=bob.id, title="Book 2", isbn="9780000000001")
        book3 = create_test_book(session, owner_id=bob.id, title="Book 3", isbn="9780000000002")

        # 2 demandes DECLINED envoyées par alice
        req1 = create_loan_request(session, alice.id, bob.id, book.id, UserLoanRequestStatus.DECLINED)
        req2 = create_loan_request(session, alice.id, bob.id, book2.id, UserLoanRequestStatus.DECLINED)
        # 1 demande PENDING (ne doit pas être dans declined_ids)
        create_loan_request(session, alice.id, bob.id, book3.id, UserLoanRequestStatus.PENDING)
        # 1 demande DECLINED reçue par alice (elle est lender → ne doit pas compter)
        create_loan_request(session, bob.id, alice.id, book.id, UserLoanRequestStatus.DECLINED)

        client = make_client_for_user(alice, session)
        response = client.get("/notifications/counts")

        assert response.status_code == 200
        ids = response.json()["declined_outgoing_ids"]
        assert sorted(ids) == sorted([req1.id, req2.id])

    def test_requires_authentication(self, session: Session):
        """L'endpoint nécessite une authentification (retourne 403 sans token)."""
        # Client avec seulement get_session overridé, pas get_current_user
        main_app.dependency_overrides[get_session] = lambda: session
        # S'assurer que get_current_user n'est pas overridé
        main_app.dependency_overrides.pop(get_current_user, None)
        client = TestClient(main_app)

        response = client.get("/notifications/counts")

        assert response.status_code == 403
        main_app.dependency_overrides.clear()

    def test_combined_counts(self, session: Session):
        """Vérifie les trois compteurs simultanément."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        book_alice = create_test_book(session, owner_id=alice.id)
        book_bob = create_test_book(session, owner_id=bob.id, title="Bob Book", isbn="9780000000001")

        # 1 invitation PENDING reçue par alice
        create_invitation(session, bob.id, alice.id, InvitationStatus.PENDING)
        # 1 demande PENDING reçue par alice (comme prêteur)
        create_loan_request(session, bob.id, alice.id, book_alice.id, UserLoanRequestStatus.PENDING)
        # 1 demande DECLINED envoyée par alice
        req = create_loan_request(session, alice.id, bob.id, book_bob.id, UserLoanRequestStatus.DECLINED)

        client = make_client_for_user(alice, session)
        response = client.get("/notifications/counts")

        assert response.status_code == 200
        data = response.json()
        assert data["invitation_pending"] == 1
        assert data["loan_pending"] == 1
        assert data["declined_outgoing_ids"] == [req.id]
