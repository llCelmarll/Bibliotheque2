"""
Tests pour les livres empruntés (borrowed books).
"""
import pytest
from datetime import datetime, timedelta
from sqlmodel import Session
from fastapi.testclient import TestClient

from app.models.User import User
from app.models.Book import Book
from app.models.BorrowedBook import BorrowedBook, BorrowStatus
from app.services.borrowed_book_service import BorrowedBookService
from app.schemas.BorrowedBook import BorrowedBookCreate, BorrowedBookUpdate, BorrowedBookReturn


@pytest.mark.unit
class TestBorrowedBookModel:
    """Tests du modèle BorrowedBook."""

    def test_create_borrowed_book(self, session: Session, test_user: User, test_book: Book):
        """Test de création d'un livre emprunté."""
        borrowed_book = BorrowedBook(
            book_id=test_book.id,
            user_id=test_user.id,
            borrowed_from="Jean Dupont",
            borrowed_date=datetime.utcnow(),
            expected_return_date=datetime.utcnow() + timedelta(days=30),
            status=BorrowStatus.ACTIVE,
            notes="Emprunté lors d'un café",
            created_at=datetime.utcnow()
        )

        session.add(borrowed_book)
        session.commit()
        session.refresh(borrowed_book)

        assert borrowed_book.id is not None
        assert borrowed_book.book_id == test_book.id
        assert borrowed_book.user_id == test_user.id
        assert borrowed_book.borrowed_from == "Jean Dupont"
        assert borrowed_book.status == BorrowStatus.ACTIVE

    def test_borrow_status_enum(self):
        """Test des valeurs de l'enum BorrowStatus."""
        assert BorrowStatus.ACTIVE == "active"
        assert BorrowStatus.RETURNED == "returned"
        assert BorrowStatus.OVERDUE == "overdue"


@pytest.mark.unit
class TestBorrowedBookService:
    """Tests du service BorrowedBookService."""

    def test_create_borrowed_book(self, session: Session, test_user: User, test_book: Book):
        """Test de création d'un emprunt via le service."""
        service = BorrowedBookService(session, user_id=test_user.id)

        borrow_data = BorrowedBookCreate(
            book_id=test_book.id,
            borrowed_from="Marie Martin",
            borrowed_date=datetime.utcnow(),
            expected_return_date=datetime.utcnow() + timedelta(days=30),
            notes="Test emprunt"
        )

        result = service.create(borrow_data)

        assert result.id is not None
        assert result.book_id == test_book.id
        assert result.borrowed_from == "Marie Martin"
        assert result.status == BorrowStatus.ACTIVE

    def test_get_by_id(self, session: Session, test_user: User, test_book: Book):
        """Test de récupération d'un emprunt par ID."""
        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un emprunt
        borrow_data = BorrowedBookCreate(
            book_id=test_book.id,
            borrowed_from="Test Source"
        )
        created = service.create(borrow_data)

        # Récupérer par ID
        result = service.get_by_id(created.id)

        assert result.id == created.id
        assert result.book_id == test_book.id

    def test_get_all(self, session: Session, test_user: User):
        """Test de récupération de tous les emprunts."""
        from tests.conftest import create_test_book

        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer plusieurs livres et emprunts
        book1 = create_test_book(session, test_user.id, "Book 1", "1111111111111")
        book2 = create_test_book(session, test_user.id, "Book 2", "2222222222222")

        service.create(BorrowedBookCreate(book_id=book1.id, borrowed_from="Source 1"))
        service.create(BorrowedBookCreate(book_id=book2.id, borrowed_from="Source 2"))

        # Récupérer tous
        results = service.get_all(skip=0, limit=100)

        assert len(results) == 2

    def test_get_active(self, session: Session, test_user: User):
        """Test de récupération des emprunts actifs."""
        from tests.conftest import create_test_book

        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un emprunt actif
        book1 = create_test_book(session, test_user.id, "Active Book", "1111111111111")
        active_borrow = service.create(
            BorrowedBookCreate(book_id=book1.id, borrowed_from="Active Source")
        )

        # Créer un emprunt retourné
        book2 = create_test_book(session, test_user.id, "Returned Book", "2222222222222")
        returned_borrow = service.create(
            BorrowedBookCreate(book_id=book2.id, borrowed_from="Returned Source")
        )
        service.return_book(returned_borrow.id, None)

        # Récupérer uniquement les actifs
        active_results = service.get_active(skip=0, limit=100)

        assert len(active_results) == 1
        assert active_results[0].status in [BorrowStatus.ACTIVE, BorrowStatus.OVERDUE]

    def test_get_overdue(self, session: Session, test_user: User, test_book: Book):
        """Test de récupération des emprunts en retard."""
        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un emprunt avec une date de retour dépassée
        borrow_data = BorrowedBookCreate(
            book_id=test_book.id,
            borrowed_from="Overdue Source",
            borrowed_date=datetime.utcnow() - timedelta(days=40),
            expected_return_date=datetime.utcnow() - timedelta(days=10)
        )
        service.create(borrow_data)

        # Récupérer les emprunts en retard
        overdue_results = service.get_overdue(skip=0, limit=100)

        assert len(overdue_results) >= 1
        for borrow in overdue_results:
            assert borrow.status == BorrowStatus.OVERDUE

    def test_return_book(self, session: Session, test_user: User, test_book: Book):
        """Test de retour d'un livre emprunté."""
        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un emprunt
        borrow_data = BorrowedBookCreate(
            book_id=test_book.id,
            borrowed_from="Return Test"
        )
        created = service.create(borrow_data)
        assert created.status == BorrowStatus.ACTIVE

        # Retourner le livre
        returned = service.return_book(created.id, None)

        assert returned.status == BorrowStatus.RETURNED
        assert returned.actual_return_date is not None

    def test_update_borrowed_book(self, session: Session, test_user: User, test_book: Book):
        """Test de mise à jour d'un emprunt."""
        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un emprunt
        created = service.create(
            BorrowedBookCreate(book_id=test_book.id, borrowed_from="Original")
        )

        # Mettre à jour
        update_data = BorrowedBookUpdate(
            borrowed_from="Updated Source",
            notes="Updated notes"
        )
        updated = service.update(created.id, update_data)

        assert updated.borrowed_from == "Updated Source"
        assert updated.notes == "Updated notes"

    def test_delete_borrowed_book(self, session: Session, test_user: User, test_book: Book):
        """Test de suppression d'un emprunt."""
        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un emprunt
        created = service.create(
            BorrowedBookCreate(book_id=test_book.id, borrowed_from="Delete Test")
        )

        # Supprimer
        service.delete(created.id)

        # Vérifier que c'est supprimé
        with pytest.raises(Exception):
            service.get_by_id(created.id)

    def test_get_statistics(self, session: Session, test_user: User):
        """Test des statistiques d'emprunts."""
        from tests.conftest import create_test_book

        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer plusieurs emprunts
        book1 = create_test_book(session, test_user.id, "Book 1", "1111111111111")
        book2 = create_test_book(session, test_user.id, "Book 2", "2222222222222")
        book3 = create_test_book(session, test_user.id, "Book 3", "3333333333333")

        borrow1 = service.create(BorrowedBookCreate(book_id=book1.id, borrowed_from="S1"))
        borrow2 = service.create(BorrowedBookCreate(book_id=book2.id, borrowed_from="S2"))
        borrow3 = service.create(BorrowedBookCreate(
            book_id=book3.id,
            borrowed_from="S3",
            expected_return_date=datetime.utcnow() - timedelta(days=1)
        ))

        # Retourner un livre
        service.return_book(borrow1.id, None)

        # Récupérer les stats
        stats = service.get_statistics()

        assert stats.total_borrowed == 3
        assert stats.returned == 1
        assert stats.currently_borrowed == 2
        assert stats.overdue >= 1


@pytest.mark.unit
class TestBorrowedBookAPI:
    """Tests des endpoints API pour les livres empruntés."""

    def test_create_borrowed_book_endpoint(
        self,
        authenticated_client: TestClient,
        test_user: User,
        test_book: Book
    ):
        """Test de création d'un emprunt via l'API."""
        response = authenticated_client.post(
            "/borrowed-books",
            json={
                "book_id": test_book.id,
                "borrowed_from": "API Test",
                "notes": "Test via API"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["book_id"] == test_book.id
        assert data["borrowed_from"] == "API Test"
        assert data["status"] == "active"

    def test_get_borrowed_books_endpoint(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User,
        test_book: Book
    ):
        """Test de récupération de tous les emprunts via l'API."""
        # Créer un emprunt
        service = BorrowedBookService(session, user_id=test_user.id)
        service.create(BorrowedBookCreate(book_id=test_book.id, borrowed_from="API Test"))

        response = authenticated_client.get("/borrowed-books")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    def test_get_active_borrowed_books_endpoint(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test de récupération des emprunts actifs via l'API."""
        from tests.conftest import create_test_book

        service = BorrowedBookService(session, user_id=test_user.id)

        # Créer un actif et un retourné
        book1 = create_test_book(session, test_user.id, "Active", "1111111111111")
        book2 = create_test_book(session, test_user.id, "Returned", "2222222222222")

        service.create(BorrowedBookCreate(book_id=book1.id, borrowed_from="Active"))
        returned = service.create(BorrowedBookCreate(book_id=book2.id, borrowed_from="Returned"))
        service.return_book(returned.id, None)

        response = authenticated_client.get("/borrowed-books/active")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_return_borrowed_book_endpoint(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User,
        test_book: Book
    ):
        """Test de retour d'un livre via l'API."""
        # Créer un emprunt
        service = BorrowedBookService(session, user_id=test_user.id)
        created = service.create(
            BorrowedBookCreate(book_id=test_book.id, borrowed_from="Return Test")
        )

        response = authenticated_client.put(
            f"/borrowed-books/{created.id}/return",
            json={}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "returned"
        assert data["actual_return_date"] is not None

    def test_get_statistics_endpoint(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User,
        test_book: Book
    ):
        """Test de récupération des statistiques via l'API."""
        # Créer un emprunt
        service = BorrowedBookService(session, user_id=test_user.id)
        service.create(BorrowedBookCreate(book_id=test_book.id, borrowed_from="Stats Test"))

        response = authenticated_client.get("/borrowed-books/statistics")

        assert response.status_code == 200
        data = response.json()
        assert "total_borrowed" in data
        assert "currently_borrowed" in data
        assert "overdue" in data
        assert "returned" in data


@pytest.mark.unit
class TestBookBorrowIntegration:
    """Tests d'intégration entre books et borrowed_books."""

    def test_create_book_as_borrowed(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test de création d'un livre directement marqué comme emprunté."""
        response = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Emprunté",
                "isbn": "9999999999999",
                "authors": ["Test Author"],
                "is_borrowed": True,
                "borrowed_from": "Bibliothèque Municipale"
            }
        )

        assert response.status_code == 201
        book_data = response.json()
        book_id = book_data["id"]

        # Vérifier que l'emprunt a été créé
        service = BorrowedBookService(session, user_id=test_user.id)
        borrows = service.get_by_book(book_id)

        assert len(borrows) == 1
        assert borrows[0].borrowed_from == "Bibliothèque Municipale"
        assert borrows[0].status == BorrowStatus.ACTIVE

    def test_book_visibility_after_return(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test que le livre disparaît de la liste après retour."""
        # Créer un livre emprunté
        response = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Visibilité",
                "isbn": "8888888888888",
                "authors": ["Test Author"],
                "is_borrowed": True,
                "borrowed_from": "Source Test"
            }
        )
        book_id = response.json()["id"]

        # Vérifier qu'il est visible dans la recherche
        search_response = authenticated_client.post(
            "/books/search/simple?limit=1000",
            json=[]
        )
        book_ids = [b["id"] for b in search_response.json()]
        assert book_id in book_ids

        # Récupérer l'ID de l'emprunt
        service = BorrowedBookService(session, user_id=test_user.id)
        borrows = service.get_by_book(book_id)
        borrow_id = borrows[0].id

        # Retourner le livre
        authenticated_client.put(f"/borrowed-books/{borrow_id}/return", json={})

        # Vérifier qu'il n'est PLUS visible dans la recherche
        search_response2 = authenticated_client.post(
            "/books/search/simple?limit=1000",
            json=[]
        )
        book_ids2 = [b["id"] for b in search_response2.json()]
        assert book_id not in book_ids2

    def test_cannot_lend_borrowed_book(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test qu'on ne peut pas prêter un livre qu'on a emprunté."""
        # Créer un livre emprunté
        response = authenticated_client.post(
            "/books",
            json={
                "title": "Livre à ne pas prêter",
                "isbn": "7777777777777",
                "authors": ["Test Author"],
                "is_borrowed": True,
                "borrowed_from": "Source Test"
            }
        )
        book_id = response.json()["id"]

        # Créer un emprunteur
        borrower_response = authenticated_client.post(
            "/borrowers",
            json={
                "name": "Jean Test",
                "email": "jean@test.com"
            }
        )
        borrower_id = borrower_response.json()["id"]

        # Tenter de prêter le livre avec tous les champs requis
        from datetime import datetime
        loan_response = authenticated_client.post(
            "/loans",
            json={
                "book_id": book_id,
                "borrower": borrower_id,  # Utiliser 'borrower' au lieu de 'borrower_id'
                "loan_date": datetime.utcnow().isoformat()
            }
        )

        # Doit échouer avec 400 (validation métier)
        assert loan_response.status_code == 400, f"Expected 400 but got {loan_response.status_code}: {loan_response.json()}"
        assert "emprunté" in loan_response.json()["detail"].lower()


@pytest.mark.unit
class TestBookBorrowValidation:
    """Tests des nouvelles validations pour emprunts multiples"""

    def test_cannot_reborrow_active_book(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test : Ajouter livre (emprunt ACTIF) avec is_borrowed=True → 400"""
        # Créer un livre emprunté
        response1 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Reborrow",
                "isbn": "1111111111111",
                "authors": ["Author Test"],
                "is_borrowed": True,
                "borrowed_from": "Marie"
            }
        )
        assert response1.status_code == 201

        # Tenter de ré-emprunter (même livre, is_borrowed=True)
        response2 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Reborrow",
                "isbn": "1111111111111",
                "authors": ["Author Test"],
                "is_borrowed": True,
                "borrowed_from": "Paul"
            }
        )

        # Doit échouer
        assert response2.status_code == 400
        assert "emprunt actif existe déjà" in response2.json()["detail"].lower()

    def test_cannot_buy_actively_borrowed_book(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test : Ajouter livre (emprunt ACTIF) avec is_borrowed=False → 400"""
        # Créer un livre emprunté
        response1 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Buy Active",
                "isbn": "2222222222222",
                "authors": ["Author Test"],
                "is_borrowed": True,
                "borrowed_from": "Marie"
            }
        )
        assert response1.status_code == 201

        # Tenter de "l'acheter" (is_borrowed=False)
        response2 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Buy Active",
                "isbn": "2222222222222",
                "authors": ["Author Test"],
                "is_borrowed": False
            }
        )

        # Doit échouer
        assert response2.status_code == 400
        assert "retournez" in response2.json()["detail"].lower()

    def test_reborrow_after_return_succeeds(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test : Livre (emprunt RETURNED) + is_borrowed=True → Nouveau BorrowedBook"""
        from app.services.borrowed_book_service import BorrowedBookService

        # Créer un livre emprunté
        response1 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Reborrow After Return",
                "isbn": "3333333333333",
                "authors": ["Author Test"],
                "is_borrowed": True,
                "borrowed_from": "Marie"
            }
        )
        assert response1.status_code == 201
        book_id = response1.json()["id"]

        # Retourner le livre
        service = BorrowedBookService(session, user_id=test_user.id)
        borrows = service.get_by_book(book_id)
        service.return_book(borrows[0].id, None)

        # Ré-emprunter (nouveau BorrowedBook)
        response2 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Reborrow After Return",
                "isbn": "3333333333333",
                "authors": ["Author Test"],
                "is_borrowed": True,
                "borrowed_from": "Paul"
            }
        )

        # Doit réussir
        assert response2.status_code == 201

        # Vérifier qu'il y a 2 emprunts dans l'historique
        borrows_after = service.get_by_book(book_id)
        assert len(borrows_after) == 2

    def test_buy_returned_book_deletes_history(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test : Livre (emprunt RETURNED) + is_borrowed=False → Suppression des BorrowedBook"""
        from app.services.borrowed_book_service import BorrowedBookService

        # Créer un livre emprunté
        response1 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Buy Returned",
                "isbn": "4444444444444",
                "authors": ["Author Test"],
                "is_borrowed": True,
                "borrowed_from": "Marie"
            }
        )
        assert response1.status_code == 201
        book_id = response1.json()["id"]

        # Retourner le livre
        service = BorrowedBookService(session, user_id=test_user.id)
        borrows = service.get_by_book(book_id)
        assert len(borrows) == 1
        service.return_book(borrows[0].id, None)

        # "Acheter" le livre (is_borrowed=False)
        response2 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Buy Returned",
                "isbn": "4444444444444",
                "authors": ["Author Test"],
                "is_borrowed": False
            }
        )

        # Doit réussir
        assert response2.status_code == 201

        # Vérifier que l'historique est supprimé
        borrows_after = service.get_by_book(book_id)
        assert len(borrows_after) == 0

    def test_add_existing_owned_book_returns_existing(
        self,
        authenticated_client: TestClient,
        session: Session,
        test_user: User
    ):
        """Test : Livre possédé (pas d'emprunt) + ajout → 400 "existe déjà" """
        # Créer un livre possédé (is_borrowed=False)
        response1 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Owned",
                "isbn": "5555555555555",
                "authors": ["Author Test"],
                "is_borrowed": False
            }
        )
        assert response1.status_code == 201

        # Tenter d'ajouter le même livre
        response2 = authenticated_client.post(
            "/books",
            json={
                "title": "Livre Test Owned",
                "isbn": "5555555555555",
                "authors": ["Author Test"],
                "is_borrowed": False
            }
        )

        # Doit BLOQUER avec 400
        assert response2.status_code == 400
        assert "existe déjà" in response2.json()["detail"].lower()
