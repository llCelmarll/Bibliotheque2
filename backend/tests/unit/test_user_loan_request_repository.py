"""
Tests unitaires pour UserLoanRequestRepository.
Couvre : get_outgoing() (filtre CANCELLED), get_incoming() (filtre CANCELLED).
"""
import pytest
from sqlmodel import Session
from datetime import datetime

from tests.conftest import create_test_user, create_test_book
from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
from app.repositories.user_loan_request_repository import UserLoanRequestRepository


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def create_loan_request(
    session: Session,
    requester_id: int,
    lender_id: int,
    book_id: int,
    status: UserLoanRequestStatus,
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


# ---------------------------------------------------------------------------
# Tests get_outgoing
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGetOutgoing:
    """Tests pour UserLoanRequestRepository.get_outgoing()"""

    def test_returns_pending_and_declined(self, session: Session):
        """get_outgoing retourne les demandes PENDING et DECLINED."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        book = create_test_book(session, owner_id=bob.id)
        book2 = create_test_book(session, owner_id=bob.id, title="Book 2", isbn="9780000000001")

        pending = create_loan_request(session, alice.id, bob.id, book.id, UserLoanRequestStatus.PENDING)
        declined = create_loan_request(session, alice.id, bob.id, book2.id, UserLoanRequestStatus.DECLINED)

        repo = UserLoanRequestRepository(session)
        result = repo.get_outgoing(requester_id=alice.id)

        ids = {r.id for r in result}
        assert pending.id in ids
        assert declined.id in ids

    def test_excludes_cancelled(self, session: Session):
        """get_outgoing exclut les demandes CANCELLED."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        book = create_test_book(session, owner_id=bob.id)
        book2 = create_test_book(session, owner_id=bob.id, title="Book 2", isbn="9780000000001")

        cancelled = create_loan_request(session, alice.id, bob.id, book.id, UserLoanRequestStatus.CANCELLED)
        pending = create_loan_request(session, alice.id, bob.id, book2.id, UserLoanRequestStatus.PENDING)

        repo = UserLoanRequestRepository(session)
        result = repo.get_outgoing(requester_id=alice.id)

        ids = {r.id for r in result}
        assert cancelled.id not in ids
        assert pending.id in ids

    def test_returns_only_requester_requests(self, session: Session):
        """get_outgoing retourne uniquement les demandes du requester demandé."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        carol = create_test_user(session, email="carol@example.com", username="carol")
        book = create_test_book(session, owner_id=carol.id)
        book2 = create_test_book(session, owner_id=carol.id, title="Book 2", isbn="9780000000001")

        alice_req = create_loan_request(session, alice.id, carol.id, book.id, UserLoanRequestStatus.PENDING)
        bob_req = create_loan_request(session, bob.id, carol.id, book2.id, UserLoanRequestStatus.PENDING)

        repo = UserLoanRequestRepository(session)
        result = repo.get_outgoing(requester_id=alice.id)

        ids = {r.id for r in result}
        assert alice_req.id in ids
        assert bob_req.id not in ids

    def test_returns_empty_when_no_requests(self, session: Session):
        """get_outgoing retourne une liste vide si aucune demande."""
        alice = create_test_user(session, email="alice@example.com", username="alice")

        repo = UserLoanRequestRepository(session)
        result = repo.get_outgoing(requester_id=alice.id)

        assert result == []

    def test_all_statuses_except_cancelled(self, session: Session):
        """get_outgoing retourne PENDING, ACCEPTED, DECLINED et RETURNED mais pas CANCELLED."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")

        books = [
            create_test_book(session, owner_id=bob.id, title=f"Book {i}", isbn=f"978000000000{i}")
            for i in range(5)
        ]

        statuses = [
            UserLoanRequestStatus.PENDING,
            UserLoanRequestStatus.ACCEPTED,
            UserLoanRequestStatus.DECLINED,
            UserLoanRequestStatus.RETURNED,
            UserLoanRequestStatus.CANCELLED,
        ]
        reqs = [
            create_loan_request(session, alice.id, bob.id, books[i].id, statuses[i])
            for i in range(5)
        ]

        repo = UserLoanRequestRepository(session)
        result = repo.get_outgoing(requester_id=alice.id)

        ids = {r.id for r in result}
        # Tous sauf CANCELLED
        for i in range(4):
            assert reqs[i].id in ids, f"Statut {statuses[i]} devrait être inclus"
        assert reqs[4].id not in ids, "CANCELLED doit être exclu"


# ---------------------------------------------------------------------------
# Tests get_incoming
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGetIncoming:
    """Tests pour UserLoanRequestRepository.get_incoming()"""

    def test_excludes_cancelled_from_incoming(self, session: Session):
        """get_incoming exclut les demandes CANCELLED (vue prêteur)."""
        alice = create_test_user(session, email="alice@example.com", username="alice")
        bob = create_test_user(session, email="bob@example.com", username="bob")
        book = create_test_book(session, owner_id=alice.id)
        book2 = create_test_book(session, owner_id=alice.id, title="Book 2", isbn="9780000000001")

        cancelled = create_loan_request(session, bob.id, alice.id, book.id, UserLoanRequestStatus.CANCELLED)
        pending = create_loan_request(session, bob.id, alice.id, book2.id, UserLoanRequestStatus.PENDING)

        repo = UserLoanRequestRepository(session)
        result = repo.get_incoming(lender_id=alice.id)

        ids = {r.id for r in result}
        assert cancelled.id not in ids
        assert pending.id in ids
