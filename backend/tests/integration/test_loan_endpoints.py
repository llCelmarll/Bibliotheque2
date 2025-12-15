"""
Tests d'intégration pour les endpoints de gestion des prêts.
Focus sur l'isolation des données par utilisateur et la logique métier.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime, timedelta

from tests.conftest import create_test_user, create_test_book
from app.models.Borrower import Borrower
from app.models.Loan import Loan, LoanStatus


def create_test_borrower(session: Session, owner_id: int, name: str = "Test Borrower", **kwargs) -> Borrower:
    """Helper pour créer un emprunteur de test."""
    borrower_data = {
        "name": name,
        "owner_id": owner_id,
        **kwargs
    }
    borrower = Borrower(**borrower_data)
    session.add(borrower)
    session.commit()
    session.refresh(borrower)
    return borrower


def create_test_loan(session: Session, owner_id: int, book_id: int, borrower_id: int, **kwargs) -> Loan:
    """Helper pour créer un prêt de test."""
    loan_data = {
        "book_id": book_id,
        "borrower_id": borrower_id,
        "owner_id": owner_id,
        "loan_date": datetime.utcnow(),
        "status": LoanStatus.ACTIVE,
        **kwargs
    }
    loan = Loan(**loan_data)
    session.add(loan)
    session.commit()
    session.refresh(loan)
    return loan


@pytest.mark.integration
@pytest.mark.loans
class TestLoanEndpoints:
    """Tests des endpoints de gestion des prêts."""

    def test_create_loan_with_borrower_id(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création de prêt avec ID d'emprunteur existant."""
        book = create_test_book(session, test_user.id, title="Book to Lend")
        borrower = create_test_borrower(session, test_user.id, name="Marie Dupont")

        loan_data = {
            "book_id": book.id,
            "borrower": borrower.id,
            "due_date": (datetime.utcnow() + timedelta(days=14)).isoformat()
        }

        response = authenticated_client.post("/loans", json=loan_data)

        assert response.status_code == 201
        data = response.json()
        assert data["book_id"] == book.id
        assert data["borrower_id"] == borrower.id
        assert data["status"] == "active"
        assert "id" in data

    def test_create_loan_with_borrower_name(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création de prêt avec nom d'emprunteur (création automatique)."""
        book = create_test_book(session, test_user.id, title="Book to Lend")

        loan_data = {
            "book_id": book.id,
            "borrower": "Jean Martin"  # Nouvel emprunteur
        }

        response = authenticated_client.post("/loans", json=loan_data)

        assert response.status_code == 201
        data = response.json()
        assert data["borrower"]["name"] == "Jean Martin"

        # Vérifier que l'emprunteur a été créé
        response = authenticated_client.get("/borrowers/search?query=Jean")
        borrowers = response.json()
        assert len(borrowers) >= 1
        assert any(b["name"] == "Jean Martin" for b in borrowers)

    def test_create_loan_with_borrower_object(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création de prêt avec objet emprunteur complet."""
        book = create_test_book(session, test_user.id, title="Book to Lend")

        loan_data = {
            "book_id": book.id,
            "borrower": {
                "name": "Sophie Durand",
                "email": "sophie@example.com",
                "phone": "0123456789"
            }
        }

        response = authenticated_client.post("/loans", json=loan_data)

        assert response.status_code == 201
        data = response.json()
        assert data["borrower"]["name"] == "Sophie Durand"
        assert data["borrower"]["email"] == "sophie@example.com"

    def test_create_loan_book_already_loaned(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création de prêt pour un livre déjà prêté (doit échouer)."""
        book = create_test_book(session, test_user.id, title="Already Loaned Book")
        borrower1 = create_test_borrower(session, test_user.id, name="Borrower 1")
        borrower2 = create_test_borrower(session, test_user.id, name="Borrower 2")

        # Créer le premier prêt
        create_test_loan(session, test_user.id, book.id, borrower1.id)

        # Essayer de créer un second prêt
        loan_data = {
            "book_id": book.id,
            "borrower": borrower2.id
        }

        response = authenticated_client.post("/loans", json=loan_data)

        assert response.status_code == 400
        assert "déjà prêté" in response.json()["detail"]

    def test_create_loan_book_not_found(self, authenticated_client: TestClient):
        """Test de création de prêt avec livre inexistant."""
        loan_data = {
            "book_id": 99999,
            "borrower": "Test Borrower"
        }

        response = authenticated_client.post("/loans", json=loan_data)

        assert response.status_code == 404
        assert "introuvable" in response.json()["detail"]

    def test_create_loan_unauthenticated(self, client: TestClient):
        """Test de création sans authentification."""
        loan_data = {
            "book_id": 1,
            "borrower": "Test"
        }
        response = client.post("/loans", json=loan_data)

        assert response.status_code == 403

    def test_get_loans(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération de tous les prêts."""
        book1 = create_test_book(session, test_user.id, title="Book 1")
        book2 = create_test_book(session, test_user.id, title="Book 2")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")

        loan1 = create_test_loan(session, test_user.id, book1.id, borrower.id)
        loan2 = create_test_loan(session, test_user.id, book2.id, borrower.id)

        # Créer un prêt pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        other_borrower = create_test_borrower(session, other_user.id, name="Other Borrower")
        create_test_loan(session, other_user.id, other_book.id, other_borrower.id)

        response = authenticated_client.get("/loans")

        assert response.status_code == 200
        loans = response.json()

        # Doit contenir seulement les prêts de l'utilisateur authentifié
        assert len(loans) == 2

    def test_get_active_loans(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération des prêts actifs uniquement."""
        book1 = create_test_book(session, test_user.id, title="Book 1")
        book2 = create_test_book(session, test_user.id, title="Book 2")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")

        # Prêt actif
        create_test_loan(session, test_user.id, book1.id, borrower.id, status=LoanStatus.ACTIVE)
        # Prêt retourné
        create_test_loan(session, test_user.id, book2.id, borrower.id, status=LoanStatus.RETURNED)

        response = authenticated_client.get("/loans/active")

        assert response.status_code == 200
        loans = response.json()
        assert len(loans) == 1
        assert loans[0]["status"] == "active"

    def test_get_overdue_loans(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération des prêts en retard."""
        book = create_test_book(session, test_user.id, title="Overdue Book")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")

        # Prêt en retard (due_date dans le passé)
        past_date = datetime.utcnow() - timedelta(days=7)
        create_test_loan(session, test_user.id, book.id, borrower.id, due_date=past_date)

        response = authenticated_client.get("/loans/overdue")

        assert response.status_code == 200
        loans = response.json()
        assert len(loans) >= 1

    def test_get_loan_statistics(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération des statistiques."""
        book1 = create_test_book(session, test_user.id, title="Book 1")
        book2 = create_test_book(session, test_user.id, title="Book 2")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")

        create_test_loan(session, test_user.id, book1.id, borrower.id, status=LoanStatus.ACTIVE)
        create_test_loan(session, test_user.id, book2.id, borrower.id, status=LoanStatus.RETURNED)

        response = authenticated_client.get("/loans/statistics")

        assert response.status_code == 200
        stats = response.json()
        assert "total_loans" in stats
        assert "active_loans" in stats
        assert "returned_loans" in stats
        assert stats["total_loans"] == 2
        assert stats["active_loans"] == 1
        assert stats["returned_loans"] == 1

    def test_return_loan(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de retour d'un livre."""
        book = create_test_book(session, test_user.id, title="Book to Return")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")
        loan = create_test_loan(session, test_user.id, book.id, borrower.id)

        response = authenticated_client.put(f"/loans/{loan.id}/return")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "returned"
        assert data["return_date"] is not None

    def test_return_loan_already_returned(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de retour d'un livre déjà retourné (doit échouer)."""
        book = create_test_book(session, test_user.id, title="Already Returned")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")
        loan = create_test_loan(session, test_user.id, book.id, borrower.id, status=LoanStatus.RETURNED)

        response = authenticated_client.put(f"/loans/{loan.id}/return")

        assert response.status_code == 400
        assert "déjà été retourné" in response.json()["detail"]

    def test_update_loan(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un prêt."""
        book = create_test_book(session, test_user.id, title="Book")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")
        loan = create_test_loan(session, test_user.id, book.id, borrower.id)

        new_due_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
        update_data = {
            "due_date": new_due_date,
            "notes": "Extension de prêt"
        }

        response = authenticated_client.put(f"/loans/{loan.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Extension de prêt"

    def test_delete_loan(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un prêt."""
        book = create_test_book(session, test_user.id, title="Book")
        borrower = create_test_borrower(session, test_user.id, name="Borrower")
        loan = create_test_loan(session, test_user.id, book.id, borrower.id)

        response = authenticated_client.delete(f"/loans/{loan.id}")

        assert response.status_code == 204

        # Vérifier qu'il n'existe plus
        response = authenticated_client.get(f"/loans/{loan.id}")
        assert response.status_code == 404

    def test_get_loans_by_book(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération de l'historique des prêts pour un livre."""
        book = create_test_book(session, test_user.id, title="Popular Book")
        borrower1 = create_test_borrower(session, test_user.id, name="Borrower 1")
        borrower2 = create_test_borrower(session, test_user.id, name="Borrower 2")

        # Ancien prêt retourné
        create_test_loan(session, test_user.id, book.id, borrower1.id, status=LoanStatus.RETURNED)
        # Prêt actuel
        create_test_loan(session, test_user.id, book.id, borrower2.id, status=LoanStatus.ACTIVE)

        response = authenticated_client.get(f"/loans/by-book/{book.id}")

        assert response.status_code == 200
        loans = response.json()
        assert len(loans) == 2

    def test_get_loans_by_borrower(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération de l'historique des prêts pour un emprunteur."""
        book1 = create_test_book(session, test_user.id, title="Book 1")
        book2 = create_test_book(session, test_user.id, title="Book 2")
        borrower = create_test_borrower(session, test_user.id, name="Regular Borrower")

        create_test_loan(session, test_user.id, book1.id, borrower.id)
        create_test_loan(session, test_user.id, book2.id, borrower.id)

        response = authenticated_client.get(f"/loans/by-borrower/{borrower.id}")

        assert response.status_code == 200
        loans = response.json()
        assert len(loans) == 2

    def test_loan_isolation_between_users(self, authenticated_client: TestClient, session: Session, test_user):
        """Test d'isolation : un utilisateur ne peut pas accéder aux prêts d'un autre."""
        # Créer un prêt pour un autre utilisateur
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        other_borrower = create_test_borrower(session, other_user.id, name="Other Borrower")
        other_loan = create_test_loan(session, other_user.id, other_book.id, other_borrower.id)

        # Essayer d'accéder au prêt de l'autre utilisateur
        response = authenticated_client.get(f"/loans/{other_loan.id}")

        assert response.status_code == 404
