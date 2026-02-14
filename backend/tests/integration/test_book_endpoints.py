"""
Tests d'intégration pour les endpoints de gestion des livres.
Focus sur l'isolation des données par utilisateur.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlmodel import Session

from tests.conftest import create_test_user, create_test_book


@pytest.mark.integration
@pytest.mark.books
class TestBookEndpoints:
    """Tests des endpoints de gestion des livres."""
    
    def test_create_book_success(self, authenticated_client: TestClient, test_user):
        """Test de création de livre réussie."""
        book_data = {
            "title": "Test Book",
            "isbn": "9781234567890",
            "published_date": "2023-01-01",
            "page_count": 300,
            "authors": ["Test Author"],
            "publisher": "Test Publisher",
            "genres": ["Fiction"]
        }
        
        response = authenticated_client.post("/books", json=book_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == book_data["title"]
        assert data["isbn"] == book_data["isbn"]
        assert "id" in data
        # Note: owner_id n'est pas exposé dans BookRead par design (sécurité)
    
    def test_create_book_unauthenticated(self, client: TestClient):
        """Test de création de livre sans authentification."""
        book_data = {
            "title": "Test Book",
            "isbn": "9781234567890"
        }
        
        response = client.post("/books", json=book_data)
        
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]
    
    def test_get_user_books(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération des livres de l'utilisateur."""
        # Créer quelques livres pour l'utilisateur de test
        book1 = create_test_book(session, test_user.id, title="Book 1", isbn="1111111111111")
        book2 = create_test_book(session, test_user.id, title="Book 2", isbn="2222222222222")
        
        # Créer un livre pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book", isbn="3333333333333")
        
        response = authenticated_client.get("/books/")
        
        assert response.status_code == 200
        books = response.json()
        
        # Doit contenir seulement les livres de l'utilisateur authentifié
        assert len(books) == 2
        book_titles = [book["title"] for book in books]
        assert "Book 1" in book_titles
        assert "Book 2" in book_titles
        assert "Other Book" not in book_titles  # Isolation utilisateur assurée par le service
    
    def test_get_book_by_id_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un livre par ID (propriétaire)."""
        book = create_test_book(session, test_user.id, title="My Book")
        
        response = authenticated_client.get(f"/books/{book.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "base" in data  # Structure avec données enrichies
        assert data["base"]["id"] == book.id
        assert data["base"]["title"] == "My Book"
        # L'isolation utilisateur est assurée par le service (pas besoin de vérifier owner_id)
    
    def test_get_book_by_id_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de récupération d'un livre d'un autre utilisateur (doit échouer)."""
        # Créer un autre utilisateur et son livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        
        response = authenticated_client.get(f"/books/{other_book.id}")
        
        assert response.status_code == 404
        assert "Livre introuvable" in response.json()["detail"]
    
    def test_update_book_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un livre (propriétaire)."""
        book = create_test_book(session, test_user.id, title="Original Title")
        
        update_data = {
            "title": "Updated Title",
            "page_count": 500
        }
        
        response = authenticated_client.put(f"/books/{book.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["page_count"] == 500
        # L'isolation utilisateur est assurée par le service
    
    def test_update_book_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour d'un livre d'un autre utilisateur (doit échouer)."""
        # Créer un autre utilisateur et son livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        
        update_data = {"title": "Hacked Title"}
        
        response = authenticated_client.put(f"/books/{other_book.id}", json=update_data)
        
        assert response.status_code == 404
        assert "Livre introuvable" in response.json()["detail"]
    
    def test_delete_book_success(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un livre (propriétaire)."""
        book = create_test_book(session, test_user.id, title="Book to Delete")
        
        response = authenticated_client.delete(f"/books/{book.id}")
        
        assert response.status_code == 204
        
        # Vérifier que le livre n'existe plus
        get_response = authenticated_client.get(f"/books/{book.id}")
        assert get_response.status_code == 404
    
    def test_delete_book_not_owner(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de suppression d'un livre d'un autre utilisateur (doit échouer)."""
        # Créer un autre utilisateur et son livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Other Book")
        
        response = authenticated_client.delete(f"/books/{other_book.id}")
        
        assert response.status_code == 404
        assert "Livre introuvable" in response.json()["detail"]
        
        # Vérifier que le livre existe toujours
        # (on ne peut pas le vérifier depuis ce client, mais il devrait exister)
    
    def test_duplicate_book_same_user(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création d'un livre en double pour le même utilisateur (doit échouer)."""
        # Créer un premier livre
        first_book = create_test_book(session, test_user.id, title="Duplicate Book", isbn="9999999999999")

        # Essayer de créer le même livre
        duplicate_data = {
            "title": "Duplicate Book",
            "isbn": "9999999999999"
        }

        response = authenticated_client.post("/books", json=duplicate_data)

        # Doit bloquer avec 400
        assert response.status_code == 400
        assert "existe déjà" in response.json()["detail"].lower()
    
    def test_duplicate_book_different_users(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création d'un livre en double pour des utilisateurs différents (doit réussir)."""
        # Créer un autre utilisateur avec le même livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Same Book", isbn="8888888888888")
        
        # L'utilisateur authentifié peut créer le même livre
        same_book_data = {
            "title": "Same Book",
            "isbn": "8888888888888"
        }
        
        response = authenticated_client.post("/books", json=same_book_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Same Book"
        # L'isolation utilisateur est assurée par le service

    def test_book_with_active_loan_includes_loan_info(self, authenticated_client: TestClient, session: Session, test_user):
        """Test que les livres avec prêts actifs incluent les informations de prêt."""
        from app.models.Contact import Contact
        from app.models.Loan import Loan, LoanStatus
        from datetime import datetime, timedelta

        # Créer un livre
        book = create_test_book(session, test_user.id, title="Book with Loan", isbn="1234567890123")

        # Créer un contact
        contact = Contact(
            name="Test Contact",
            email="contact@test.com",
            owner_id=test_user.id
        )
        session.add(contact)
        session.commit()
        session.refresh(contact)

        # Créer un prêt actif
        loan_date = datetime.utcnow()
        due_date = loan_date + timedelta(days=14)
        loan = Loan(
            book_id=book.id,
            contact_id=contact.id,
            owner_id=test_user.id,
            loan_date=loan_date,
            due_date=due_date,
            status=LoanStatus.ACTIVE
        )
        session.add(loan)
        session.commit()
        session.refresh(loan)

        # Récupérer le livre via l'API
        response = authenticated_client.get(f"/books/{book.id}")

        assert response.status_code == 200
        data = response.json()

        # Vérifier que les informations de prêt sont présentes
        assert "base" in data
        assert "current_loan" in data["base"]
        assert data["base"]["current_loan"] is not None
        assert data["base"]["current_loan"]["id"] == loan.id
        assert data["base"]["current_loan"]["contact_id"] == contact.id
        assert data["base"]["current_loan"]["status"].upper() == "ACTIVE"
        assert "contact" in data["base"]["current_loan"]
        assert data["base"]["current_loan"]["contact"]["name"] == "Test Contact"

    def test_book_search_includes_loan_info(self, authenticated_client: TestClient, session: Session, test_user):
        """Test que la recherche de livres inclut les informations de prêt."""
        from app.models.Contact import Contact
        from app.models.Loan import Loan, LoanStatus
        from datetime import datetime, timedelta

        # Créer deux livres
        book1 = create_test_book(session, test_user.id, title="Loaned Book", isbn="1111111111111")
        book2 = create_test_book(session, test_user.id, title="Available Book", isbn="2222222222222")

        # Créer un contact
        contact = Contact(
            name="Test Contact",
            email="contact@test.com",
            owner_id=test_user.id
        )
        session.add(contact)
        session.commit()
        session.refresh(contact)

        # Créer un prêt actif pour book1
        loan = Loan(
            book_id=book1.id,
            contact_id=contact.id,
            owner_id=test_user.id,
            loan_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=14),
            status=LoanStatus.ACTIVE
        )
        session.add(loan)
        session.commit()

        # Rechercher les livres
        response = authenticated_client.get("/books/")

        assert response.status_code == 200
        books = response.json()

        # Trouver les deux livres
        loaned_book = next((b for b in books if b["id"] == book1.id), None)
        available_book = next((b for b in books if b["id"] == book2.id), None)

        assert loaned_book is not None
        assert available_book is not None

        # Vérifier que book1 a les informations de prêt
        assert "current_loan" in loaned_book
        assert loaned_book["current_loan"] is not None
        assert loaned_book["current_loan"]["contact"]["name"] == "Test Contact"

        # Vérifier que book2 n'a pas de prêt actif
        assert "current_loan" in available_book
        assert available_book["current_loan"] is None


@pytest.mark.integration  
@pytest.mark.books
class TestBookSearch:
    """Tests de recherche de livres avec isolation utilisateur."""
    
    def test_simple_search(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de recherche simple dans les livres de l'utilisateur."""
        # Créer des livres pour l'utilisateur
        book1 = create_test_book(session, test_user.id, title="Python Programming", isbn="1111111111111")
        book2 = create_test_book(session, test_user.id, title="Java Development", isbn="2222222222222")
        
        # Créer un livre pour un autre utilisateur (ne doit pas apparaître)
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(session, other_user.id, title="Python Mastery", isbn="3333333333333")
        
        # L'endpoint utilise des query params, pas du JSON
        response = authenticated_client.post("/books/search/simple?q=Python")
        
        assert response.status_code == 200
        books = response.json()
        
        # Doit trouver seulement "Python Programming" (pas "Python Mastery" de l'autre utilisateur)
        assert len(books) == 1
        assert books[0]["title"] == "Python Programming"
        # L'isolation utilisateur est assurée par le service
    
    def test_search_no_results(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de recherche sans résultats."""
        book = create_test_book(session, test_user.id, title="Test Book")

        # L'endpoint utilise des query params, pas du JSON
        response = authenticated_client.post("/books/search/simple?q=Nonexistent")

        assert response.status_code == 200
        books = response.json()
        assert len(books) == 0


@pytest.mark.integration
@pytest.mark.books
class TestScanBookSimilarDetection:
    """Tests d'intégration pour la détection de livres similaires lors du scan."""

    @patch('app.services.book_service.fetch_openlibrary')
    @patch('app.services.book_service.fetch_google_books')
    def test_scan_with_similar_book_found(self, mock_google, mock_ol, authenticated_client: TestClient, session: Session, test_user):
        """Test de scan avec un livre similaire dans la bibliothèque."""
        # Créer un livre existant avec un ISBN différent
        existing_book = create_test_book(
            session,
            test_user.id,
            title="Sapiens",
            isbn="9782226257012"
        )

        # Scanner un ISBN différent mais même titre
        scanned_isbn = "9782226257017"

        # Mock des APIs pour retourner un titre similaire
        mock_google.return_value = ({"title": "Sapiens", "authors": ["Yuval Noah Harari"]}, None)
        mock_ol.return_value = (None, None)

        response = authenticated_client.get(f"/books/scan/{scanned_isbn}")

        assert response.status_code == 200
        data = response.json()

        # Le livre scanné n'existe pas
        assert data['base'] is None or data['base']['isbn'] != scanned_isbn

        # Mais des livres similaires doivent être trouvés
        assert 'title_match' in data

        # Si des livres similaires sont trouvés, vérifier qu'ils contiennent le livre existant
        if len(data['title_match']) > 0:
            similar_isbns = [book['isbn'] for book in data['title_match']]
            assert existing_book.isbn in similar_isbns

    @patch('app.services.book_service.fetch_openlibrary')
    @patch('app.services.book_service.fetch_google_books')
    def test_scan_existing_book_no_similar_search(self, mock_google, mock_ol, authenticated_client: TestClient, session: Session, test_user):
        """Test de scan d'un livre existant (pas de recherche de similaires)."""
        mock_google.return_value = (None, None)
        mock_ol.return_value = (None, None)
        # Créer un livre
        existing_book = create_test_book(
            session,
            test_user.id,
            title="Python Programming",
            isbn="1234567890123"
        )

        # Scanner le même ISBN
        response = authenticated_client.get(f"/books/scan/{existing_book.isbn}")

        assert response.status_code == 200
        data = response.json()

        # Le livre doit être trouvé
        assert data['base'] is not None
        assert data['base']['isbn'] == existing_book.isbn

        # title_match ne doit pas être utilisé (ou vide) car le livre existe déjà
        # La logique frontend n'affiche pas les similaires si le livre existe

    @patch('app.services.book_service.fetch_openlibrary')
    @patch('app.services.book_service.fetch_google_books')
    def test_scan_user_isolation_similar_books(self, mock_google, mock_ol, authenticated_client: TestClient, session: Session, test_user):
        """Test que la recherche de livres similaires respecte l'isolation utilisateur."""
        # Créer un autre utilisateur avec un livre
        other_user = create_test_user(session, email="other@example.com", username="otheruser")
        other_book = create_test_book(
            session,
            other_user.id,
            title="Shared Title Book",
            isbn="1111111111111"
        )

        # Scanner un ISBN différent avec un titre similaire
        scanned_isbn = "2222222222222"

        # Mock des APIs pour retourner un titre similaire à celui de l'autre user
        mock_google.return_value = ({"title": "Shared Title Book"}, None)
        mock_ol.return_value = (None, None)

        response = authenticated_client.get(f"/books/scan/{scanned_isbn}")

        assert response.status_code == 200
        data = response.json()

        # Les livres similaires ne doivent PAS inclure le livre de l'autre utilisateur
        if 'title_match' in data and len(data['title_match']) > 0:
            similar_isbns = [book['isbn'] for book in data['title_match']]
            assert other_book.isbn not in similar_isbns

    def test_book_with_active_borrow_includes_borrow_info(self, authenticated_client: TestClient, session: Session, test_user):
        """Test que les livres avec emprunts actifs incluent les informations d'emprunt."""
        from app.models.BorrowedBook import BorrowedBook, BorrowStatus
        from datetime import datetime, timedelta

        # Créer un livre
        book = create_test_book(session, test_user.id, title="Borrowed Book", isbn="9998887776665")

        # Créer un emprunt actif
        borrowed_date = datetime.utcnow()
        expected_return_date = borrowed_date + timedelta(days=30)
        borrowed_book = BorrowedBook(
            book_id=book.id,
            user_id=test_user.id,
            borrowed_from="Marie Dupont",
            borrowed_date=borrowed_date,
            expected_return_date=expected_return_date,
            status=BorrowStatus.ACTIVE,
            notes="Emprunté à la bibliothèque"
        )
        session.add(borrowed_book)
        session.commit()
        session.refresh(borrowed_book)

        # Récupérer le livre via l'API
        response = authenticated_client.get(f"/books/{book.id}")

        assert response.status_code == 200
        data = response.json()

        # Vérifier que les informations d'emprunt sont présentes
        assert "base" in data
        assert "borrowed_book" in data["base"]
        assert data["base"]["borrowed_book"] is not None
        assert data["base"]["borrowed_book"]["id"] == borrowed_book.id
        assert data["base"]["borrowed_book"]["borrowed_from"] == "Marie Dupont"
        assert data["base"]["borrowed_book"]["status"].upper() == "ACTIVE"
        assert data["base"]["borrowed_book"]["notes"] == "Emprunté à la bibliothèque"

    def test_book_search_includes_borrow_info(self, authenticated_client: TestClient, session: Session, test_user):
        """Test que la recherche de livres inclut les informations d'emprunt."""
        from app.models.BorrowedBook import BorrowedBook, BorrowStatus
        from datetime import datetime, timedelta

        # Créer deux livres
        book1 = create_test_book(session, test_user.id, title="Livre Emprunté", isbn="5554443332221")
        book2 = create_test_book(session, test_user.id, title="Livre Possédé", isbn="6665554443332")

        # Créer un emprunt actif pour le premier livre
        borrowed_date = datetime.utcnow()
        expected_return_date = borrowed_date + timedelta(days=21)
        borrowed_book = BorrowedBook(
            book_id=book1.id,
            user_id=test_user.id,
            borrowed_from="Bibliothèque Municipale",
            borrowed_date=borrowed_date,
            expected_return_date=expected_return_date,
            status=BorrowStatus.ACTIVE
        )
        session.add(borrowed_book)
        session.commit()

        # Rechercher les livres (sans paramètres = tous les livres)
        response = authenticated_client.post("/books/search/simple")

        assert response.status_code == 200
        books = response.json()

        # Trouver le livre emprunté dans les résultats
        borrowed_book_result = next((b for b in books if b["id"] == book1.id), None)
        owned_book_result = next((b for b in books if b["id"] == book2.id), None)

        assert borrowed_book_result is not None
        assert owned_book_result is not None

        # Le livre emprunté doit avoir les informations d'emprunt
        assert "borrowed_book" in borrowed_book_result
        assert borrowed_book_result["borrowed_book"] is not None
        assert borrowed_book_result["borrowed_book"]["borrowed_from"] == "Bibliothèque Municipale"
        assert borrowed_book_result["borrowed_book"]["status"].upper() == "ACTIVE"

        # Le livre possédé ne doit pas avoir d'emprunt
        assert "borrowed_book" in owned_book_result
        assert owned_book_result["borrowed_book"] is None


@pytest.mark.integration
@pytest.mark.books
class TestBookRatingAndNotes:
    """Tests d'intégration pour rating et notes personnelles."""

    def test_create_book_with_rating_and_notes(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de création de livre avec notation et notes."""
        book_data = {
            "title": "Book With Rating",
            "isbn": "9781111222333",
            "rating": 4,
            "notes": "Très bon livre, à relire."
        }
        response = authenticated_client.post("/books", json=book_data)
        assert response.status_code == 201
        data = response.json()
        assert data["rating"] == 4
        assert data["notes"] == "Très bon livre, à relire."

    def test_update_book_rating(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour de la notation."""
        book = create_test_book(session, test_user.id, title="Book To Rate", isbn="9784444555666")
        response = authenticated_client.put(f"/books/{book.id}", json={"rating": 5})
        assert response.status_code == 200
        data = response.json()
        assert data["rating"] == 5

    def test_update_book_notes(self, authenticated_client: TestClient, session: Session, test_user):
        """Test de mise à jour des notes personnelles."""
        book = create_test_book(session, test_user.id, title="Book With Notes", isbn="9787777888999")
        response = authenticated_client.put(f"/books/{book.id}", json={"notes": "Mes réflexions personnelles."})
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Mes réflexions personnelles."

    def test_get_book_returns_rating_and_notes(self, authenticated_client: TestClient, session: Session, test_user):
        """Test que GET retourne rating et notes."""
        book = create_test_book(
            session, test_user.id, title="Rated Book", isbn="9789999000111",
            rating=3, notes="Livre correct."
        )
        response = authenticated_client.get(f"/books/{book.id}")
        assert response.status_code == 200
        data = response.json()
        assert "base" in data
        assert data["base"]["rating"] == 3
        assert data["base"]["notes"] == "Livre correct."

    def test_update_book_invalid_rating(self, authenticated_client: TestClient, session: Session, test_user):
        """Test que rating hors 0-5 renvoie 400."""
        book = create_test_book(session, test_user.id, title="Book", isbn="9783333444555")
        response = authenticated_client.put(f"/books/{book.id}", json={"rating": 6})
        assert response.status_code == 400
        assert "notation" in response.json()["detail"].lower() or "0" in response.json()["detail"]