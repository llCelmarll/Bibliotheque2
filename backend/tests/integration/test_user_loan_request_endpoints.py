"""
Tests d'intégration pour les endpoints UserLoanRequest (prêts inter-membres)
et les endpoints de bibliothèque partagée.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime, timedelta

from tests.conftest import create_test_user, create_test_book
from app.models.Contact import Contact
from app.models.UserLoanRequest import UserLoanRequest, UserLoanRequestStatus
from app.models.Loan import Loan, LoanStatus
from app.services.auth_service import get_current_user
from app.db import get_session
from app.main import app as main_app


# ---------------------------------------------------------------------------
# Helpers locaux
# ---------------------------------------------------------------------------

def create_contact_with_library_access(
    session: Session,
    owner_id: int,
    linked_user_id: int,
    name: str = "Linked Contact",
    library_shared: bool = True,
) -> Contact:
    """Crée un contact chez owner_id qui pointe vers linked_user_id."""
    contact = Contact(
        owner_id=owner_id,
        linked_user_id=linked_user_id,
        library_shared=library_shared,
        name=name,
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


def create_pending_request(
    session: Session,
    requester_id: int,
    lender_id: int,
    book_id: int,
    status: UserLoanRequestStatus = UserLoanRequestStatus.PENDING,
) -> UserLoanRequest:
    """Crée une UserLoanRequest en base directement."""
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


def make_client_for_user(user, session) -> TestClient:
    """Retourne un TestClient authentifié pour un utilisateur donné (partage la même session)."""
    def get_test_session():
        return session

    def get_test_user():
        return user

    main_app.dependency_overrides[get_session] = get_test_session
    main_app.dependency_overrides[get_current_user] = get_test_user
    return TestClient(main_app)


# ---------------------------------------------------------------------------
# Tests : Création de demande
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.user_loan_requests
class TestCreateRequest:
    """Tests de création de demande de prêt inter-membres."""

    def test_create_request_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Un emprunteur avec accès bibliothèque peut créer une demande → 201 PENDING."""
        lender = create_test_user(session, email="lender@example.com", username="lender")
        book = create_test_book(session, lender.id, title="Book to Borrow")
        # Prêteur a partagé sa bibliothèque avec test_user
        create_contact_with_library_access(session, lender.id, test_user.id)

        response = authenticated_client.post("/user-loans", json={"book_id": book.id})

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        assert data["book_id"] == book.id
        assert data["requester_id"] == test_user.id
        assert data["lender_id"] == lender.id

    def test_create_request_own_book_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """On ne peut pas emprunter son propre livre → 400."""
        book = create_test_book(session, test_user.id, title="My Own Book")

        response = authenticated_client.post("/user-loans", json={"book_id": book.id})

        assert response.status_code == 400
        assert "propre livre" in response.json()["detail"]

    def test_create_request_no_library_access_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Sans library_shared=True → 403."""
        lender = create_test_user(session, email="lender2@example.com", username="lender2")
        book = create_test_book(session, lender.id, title="Private Book")
        # Contact existe mais library_shared=False
        create_contact_with_library_access(session, lender.id, test_user.id, library_shared=False)

        response = authenticated_client.post("/user-loans", json={"book_id": book.id})

        assert response.status_code == 403
        assert "bibliothèque" in response.json()["detail"]

    def test_create_request_no_contact_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Sans contact du tout → 403."""
        lender = create_test_user(session, email="lender3@example.com", username="lender3")
        book = create_test_book(session, lender.id, title="No Contact Book")
        # Aucun contact créé

        response = authenticated_client.post("/user-loans", json={"book_id": book.id})

        assert response.status_code == 403

    def test_create_request_book_not_lendable_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Livre avec is_lendable=False → 403."""
        lender = create_test_user(session, email="lender4@example.com", username="lender4")
        book = create_test_book(session, lender.id, title="Not Lendable Book")
        book.is_lendable = False
        session.add(book)
        session.commit()
        create_contact_with_library_access(session, lender.id, test_user.id, name="Lender4")

        response = authenticated_client.post("/user-loans", json={"book_id": book.id})

        assert response.status_code == 403
        assert "disponible" in response.json()["detail"]

    def test_create_request_duplicate_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """2ème demande PENDING sur le même livre → 400."""
        lender = create_test_user(session, email="lender5@example.com", username="lender5")
        book = create_test_book(session, lender.id, title="Already Requested Book")
        create_contact_with_library_access(session, lender.id, test_user.id, name="Lender5")
        # Créer une première demande PENDING
        create_pending_request(session, test_user.id, lender.id, book.id)

        response = authenticated_client.post("/user-loans", json={"book_id": book.id})

        assert response.status_code == 400
        assert "attente" in response.json()["detail"]

    def test_create_request_with_message(self, authenticated_client: TestClient, session: Session, test_user):
        """Création avec message optionnel."""
        lender = create_test_user(session, email="lender6@example.com", username="lender6")
        book = create_test_book(session, lender.id, title="Book with Message")
        create_contact_with_library_access(session, lender.id, test_user.id, name="Lender6")

        response = authenticated_client.post("/user-loans", json={
            "book_id": book.id,
            "message": "Je voudrais beaucoup emprunter ce livre !",
        })

        assert response.status_code == 201
        assert response.json()["message"] == "Je voudrais beaucoup emprunter ce livre !"


# ---------------------------------------------------------------------------
# Tests : Accept / Decline / Cancel / Return
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.user_loan_requests
class TestAcceptDeclineCancelReturn:
    """Tests des transitions de statut d'une demande.

    Pattern : test_user est le PRÊTEUR (authenticated_client).
    requester est créé localement → client avec make_client_for_user().
    """

    def _setup_lender_perspective(self, session: Session, test_user):
        """test_user est le prêteur. Crée le demandeur, le livre et la demande PENDING."""
        requester = create_test_user(session, email="requester@example.com", username="requester")
        book = create_test_book(session, test_user.id, title="Loan Book")
        create_contact_with_library_access(session, test_user.id, requester.id)
        req = create_pending_request(session, requester.id, test_user.id, book.id)
        return requester, book, req

    def test_accept_by_lender(self, authenticated_client: TestClient, session: Session, test_user):
        """Le prêteur peut accepter une demande PENDING → ACCEPTED."""
        requester, book, req = self._setup_lender_perspective(session, test_user)

        response = authenticated_client.post(f"/user-loans/{req.id}/accept", json={})

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["response_date"] is not None

    def test_accept_with_due_date(self, authenticated_client: TestClient, session: Session, test_user):
        """Accepter avec une date de retour."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        due_date = (datetime.utcnow() + timedelta(days=14)).isoformat()

        response = authenticated_client.post(f"/user-loans/{req.id}/accept", json={"due_date": due_date})

        assert response.status_code == 200
        assert response.json()["due_date"] is not None

    def test_accept_by_requester_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Le demandeur ne peut pas accepter → 403.
        Ici test_user est le prêteur → on crée un client pour le demandeur."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        # Client authentifié en tant que requester
        requester_client = make_client_for_user(requester, session)

        response = requester_client.post(f"/user-loans/{req.id}/accept", json={})

        assert response.status_code == 403
        assert "prêteur" in response.json()["detail"]

    def test_decline_by_lender(self, authenticated_client: TestClient, session: Session, test_user):
        """Le prêteur peut refuser une demande PENDING → DECLINED."""
        requester, book, req = self._setup_lender_perspective(session, test_user)

        response = authenticated_client.post(f"/user-loans/{req.id}/decline", json={
            "response_message": "Pas disponible pour le moment"
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "declined"
        assert data["response_message"] == "Pas disponible pour le moment"

    def test_decline_by_requester_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Le demandeur ne peut pas refuser → 403."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        requester_client = make_client_for_user(requester, session)

        response = requester_client.post(f"/user-loans/{req.id}/decline", json={})

        assert response.status_code == 403

    def test_cancel_by_requester(self, authenticated_client: TestClient, session: Session, test_user):
        """Le demandeur peut annuler une demande PENDING → CANCELLED."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        requester_client = make_client_for_user(requester, session)

        response = requester_client.post(f"/user-loans/{req.id}/cancel")

        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"

    def test_cancel_by_lender_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Le prêteur ne peut pas annuler → 403."""
        requester, book, req = self._setup_lender_perspective(session, test_user)

        response = authenticated_client.post(f"/user-loans/{req.id}/cancel")

        assert response.status_code == 403
        assert "demandeur" in response.json()["detail"]

    def test_return_by_lender(self, authenticated_client: TestClient, session: Session, test_user):
        """Le prêteur peut marquer retourné une demande ACCEPTED → RETURNED."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        # Accepter d'abord
        req.status = UserLoanRequestStatus.ACCEPTED
        req.response_date = datetime.utcnow()
        session.add(req)
        session.commit()

        response = authenticated_client.put(f"/user-loans/{req.id}/return")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "returned"
        assert data["return_date"] is not None

    def test_return_by_requester_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Le demandeur ne peut pas marquer le retour → 403."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        req.status = UserLoanRequestStatus.ACCEPTED
        req.response_date = datetime.utcnow()
        session.add(req)
        session.commit()
        requester_client = make_client_for_user(requester, session)

        response = requester_client.put(f"/user-loans/{req.id}/return")

        assert response.status_code == 403
        assert "prêteur" in response.json()["detail"]

    def test_return_non_accepted_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """On ne peut pas marquer retourné une demande PENDING → 400."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        # La demande est PENDING, pas ACCEPTED

        response = authenticated_client.put(f"/user-loans/{req.id}/return")

        assert response.status_code == 400
        assert "statut" in response.json()["detail"]

    def test_accept_already_declined_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """On ne peut pas accepter une demande DECLINED → 400."""
        requester, book, req = self._setup_lender_perspective(session, test_user)
        req.status = UserLoanRequestStatus.DECLINED
        session.add(req)
        session.commit()

        response = authenticated_client.post(f"/user-loans/{req.id}/accept", json={})

        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tests : Listes incoming / outgoing / count
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.user_loan_requests
class TestGetIncomingOutgoing:
    """Tests des endpoints de liste et comptage."""

    def test_get_incoming(self, authenticated_client: TestClient, session: Session, test_user):
        """test_user est prêteur → il voit ses demandes reçues."""
        requester = create_test_user(session, email="req1@example.com", username="req1")
        book = create_test_book(session, test_user.id, title="Incoming Book")
        create_contact_with_library_access(session, test_user.id, requester.id, name="Req1")
        create_pending_request(session, requester.id, test_user.id, book.id)

        response = authenticated_client.get("/user-loans/incoming")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["lender_id"] == test_user.id

    def test_get_outgoing(self, authenticated_client: TestClient, session: Session, test_user):
        """test_user est demandeur → il voit ses demandes envoyées."""
        lender = create_test_user(session, email="lend1@example.com", username="lend1")
        book = create_test_book(session, lender.id, title="Outgoing Book")
        create_contact_with_library_access(session, lender.id, test_user.id, name="Lend1")
        create_pending_request(session, test_user.id, lender.id, book.id)

        response = authenticated_client.get("/user-loans/outgoing")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["requester_id"] == test_user.id

    def test_get_pending_count(self, authenticated_client: TestClient, session: Session, test_user):
        """Le badge retourne le bon nombre de demandes PENDING entrantes."""
        requester1 = create_test_user(session, email="r1@example.com", username="r1")
        requester2 = create_test_user(session, email="r2@example.com", username="r2")
        book1 = create_test_book(session, test_user.id, title="Book 1", isbn="1111111111111")
        book2 = create_test_book(session, test_user.id, title="Book 2", isbn="2222222222222")
        create_contact_with_library_access(session, test_user.id, requester1.id, name="R1")
        create_contact_with_library_access(session, test_user.id, requester2.id, name="R2")
        create_pending_request(session, requester1.id, test_user.id, book1.id)
        create_pending_request(session, requester2.id, test_user.id, book2.id)

        response = authenticated_client.get("/user-loans/incoming/count")

        assert response.status_code == 200
        assert response.json()["count"] == 2

    def test_pending_count_excludes_non_pending(self, authenticated_client: TestClient, session: Session, test_user):
        """Le badge ne compte que les PENDING (pas ACCEPTED, DECLINED, etc.)."""
        requester = create_test_user(session, email="r3@example.com", username="r3")
        book1 = create_test_book(session, test_user.id, title="B1", isbn="1111111111112")
        book2 = create_test_book(session, test_user.id, title="B2", isbn="2222222222223")
        create_contact_with_library_access(session, test_user.id, requester.id, name="R3")
        create_pending_request(session, requester.id, test_user.id, book1.id)  # PENDING
        create_pending_request(
            session, requester.id, test_user.id, book2.id,
            status=UserLoanRequestStatus.ACCEPTED
        )  # ACCEPTED — ne doit pas compter

        response = authenticated_client.get("/user-loans/incoming/count")

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_isolation_between_users(self, authenticated_client: TestClient, session: Session, test_user):
        """test_user ne voit pas les demandes entre deux autres utilisateurs."""
        user_a = create_test_user(session, email="a@example.com", username="usera")
        user_b = create_test_user(session, email="b@example.com", username="userb")
        book = create_test_book(session, user_a.id, title="Private Book")
        create_contact_with_library_access(session, user_a.id, user_b.id, name="UserB")
        create_pending_request(session, user_b.id, user_a.id, book.id)

        # test_user n'est ni requester ni lender — il ne doit rien voir
        incoming = authenticated_client.get("/user-loans/incoming")
        outgoing = authenticated_client.get("/user-loans/outgoing")

        assert incoming.json() == []
        assert outgoing.json() == []

    def test_get_by_id_as_lender(self, authenticated_client: TestClient, session: Session, test_user):
        """Un participant (ici le prêteur) peut voir le détail d'une demande."""
        requester = create_test_user(session, email="req_detail@example.com", username="reqdet")
        book = create_test_book(session, test_user.id, title="Detail Book")
        create_contact_with_library_access(session, test_user.id, requester.id, name="ReqDet")
        req = create_pending_request(session, requester.id, test_user.id, book.id)

        response = authenticated_client.get(f"/user-loans/{req.id}")

        assert response.status_code == 200
        assert response.json()["id"] == req.id

    def test_get_by_id_as_non_participant_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Un non-participant ne peut pas voir le détail → 404."""
        user_a = create_test_user(session, email="aa@example.com", username="useraa")
        user_b = create_test_user(session, email="bb@example.com", username="userbb")
        book = create_test_book(session, user_a.id, title="Not My Book")
        create_contact_with_library_access(session, user_a.id, user_b.id, name="UserBB")
        req = create_pending_request(session, user_b.id, user_a.id, book.id)

        # test_user n'est ni requester (user_b) ni lender (user_a)
        response = authenticated_client.get(f"/user-loans/{req.id}")

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tests : Bibliothèque partagée (GET /users/{userId}/library/{bookId})
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.user_loan_requests
class TestSharedLibraryEndpoints:
    """Tests des endpoints de la bibliothèque partagée.

    test_user est ici le DEMANDEUR qui accède à la bibliothèque d'un prêteur.
    """

    def test_get_shared_book_without_loan(self, authenticated_client: TestClient, session: Session, test_user):
        """Un livre sans prêt actif → current_loan doit être null."""
        lender = create_test_user(session, email="lend_lib@example.com", username="lendlib")
        book = create_test_book(session, lender.id, title="Free Book")
        create_contact_with_library_access(session, lender.id, test_user.id, name="LendLib")

        response = authenticated_client.get(f"/users/{lender.id}/library/{book.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == book.id
        assert data["current_loan"] is None
        # Données personnelles masquées
        assert data["is_read"] is None
        assert data["rating"] is None
        assert data["notes"] is None
        assert data["barcode"] is None

    def test_get_shared_book_with_active_loan(self, authenticated_client: TestClient, session: Session, test_user):
        """Un livre avec un prêt actif → current_loan doit être non-null."""
        lender = create_test_user(session, email="lend_loan@example.com", username="lendloan")
        book = create_test_book(session, lender.id, title="Loaned Book")
        create_contact_with_library_access(session, lender.id, test_user.id, name="LendLoan")

        # Créer un contact et un prêt actif
        from tests.conftest import create_test_contact
        contact = create_test_contact(session, lender.id, name="External Borrower", email="ext@test.com")
        loan = Loan(
            book_id=book.id,
            contact_id=contact.id,
            owner_id=lender.id,
            loan_date=datetime.utcnow(),
            status=LoanStatus.ACTIVE,
        )
        session.add(loan)
        session.commit()

        response = authenticated_client.get(f"/users/{lender.id}/library/{book.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["current_loan"] is not None
        assert data["current_loan"]["status"] == "active"

    def test_get_shared_book_no_access_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Sans library_shared → 403."""
        lender = create_test_user(session, email="lend_priv@example.com", username="lendpriv")
        book = create_test_book(session, lender.id, title="Private")
        # Pas de contact → pas d'accès

        response = authenticated_client.get(f"/users/{lender.id}/library/{book.id}")

        assert response.status_code == 403

    def test_get_own_library_book_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Accéder à son propre livre via cet endpoint → 400."""
        book = create_test_book(session, test_user.id, title="My Book")

        response = authenticated_client.get(f"/users/{test_user.id}/library/{book.id}")

        assert response.status_code == 400

    def test_book_not_lendable_is_hidden(self, authenticated_client: TestClient, session: Session, test_user):
        """Un livre is_lendable=False n'est pas accessible → 404."""
        lender = create_test_user(session, email="lend_hide@example.com", username="lendhide")
        book = create_test_book(session, lender.id, title="Hidden Book")
        book.is_lendable = False
        session.add(book)
        session.commit()
        create_contact_with_library_access(session, lender.id, test_user.id, name="LendHide")

        response = authenticated_client.get(f"/users/{lender.id}/library/{book.id}")

        assert response.status_code == 404

    def test_get_library_list_no_access_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """GET /users/{userId}/library sans accès → 403."""
        lender = create_test_user(session, email="lend_list@example.com", username="lendlist")

        response = authenticated_client.get(f"/users/{lender.id}/library")

        assert response.status_code == 403

    def test_get_library_list_with_access(self, authenticated_client: TestClient, session: Session, test_user):
        """GET /users/{userId}/library avec accès → liste des livres lendable uniquement."""
        lender = create_test_user(session, email="lend_list2@example.com", username="lendlist2")
        book1 = create_test_book(session, lender.id, title="Alpha", isbn="1111111111113")
        book2 = create_test_book(session, lender.id, title="Beta", isbn="2222222222224")
        # Un livre non-prêtable (ne doit pas apparaître)
        book3 = create_test_book(session, lender.id, title="Hidden", isbn="3333333333335")
        book3.is_lendable = False
        session.add(book3)
        session.commit()
        create_contact_with_library_access(session, lender.id, test_user.id, name="LendList2")

        response = authenticated_client.get(f"/users/{lender.id}/library")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        titles = [b["title"] for b in data["items"]]
        assert "Alpha" in titles
        assert "Beta" in titles
        assert "Hidden" not in titles

    def test_get_own_library_fails(self, authenticated_client: TestClient, session: Session, test_user):
        """Accéder à sa propre bibliothèque via cet endpoint → 400."""
        response = authenticated_client.get(f"/users/{test_user.id}/library")

        assert response.status_code == 400
