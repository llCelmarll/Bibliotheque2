"""
Tests unitaires supplémentaires pour BorrowedBookService — branches d'erreur et _process_contact.
"""
import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlmodel import Session

from app.models.BorrowedBook import BorrowStatus
from app.services.borrowed_book_service import BorrowedBookService
from app.schemas.BorrowedBook import BorrowedBookCreate, BorrowedBookUpdate, BorrowedBookReturn
from tests.conftest import create_test_book, create_test_user, create_test_contact, create_test_borrowed_book


@pytest.mark.unit
class TestBorrowedBookServiceErrors:
    """Branches d'erreur 404/400 non couvertes."""

    def test_create_book_not_found_raises_404(self, session, test_user):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.create(BorrowedBookCreate(book_id=99999, contact="Source"))
        assert exc.value.status_code == 404

    def test_create_already_active_borrow_raises_400(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Premiere source"))
        with pytest.raises(HTTPException) as exc:
            svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Deuxieme source"))
        assert exc.value.status_code == 400
        assert "emprunté" in exc.value.detail.lower()

    def test_update_not_found_raises_404(self, session, test_user):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.update(99999, BorrowedBookUpdate(notes="test"))
        assert exc.value.status_code == 404

    def test_return_book_not_found_raises_404(self, session, test_user):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.return_book(99999)
        assert exc.value.status_code == 404

    def test_return_book_already_returned_raises_400(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        svc.return_book(created.id)
        with pytest.raises(HTTPException) as exc:
            svc.return_book(created.id)
        assert exc.value.status_code == 400
        assert "déjà été retourné" in exc.value.detail

    def test_delete_not_found_raises_404(self, session, test_user):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.delete(99999)
        assert exc.value.status_code == 404

    def test_get_by_contact_not_found_raises_404(self, session, test_user):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.get_by_contact(99999)
        assert exc.value.status_code == 404

    def test_get_by_contact_returns_borrows(self, session, test_user, test_book):
        contact = create_test_contact(session, test_user.id, name="Jean Dupont")
        svc = BorrowedBookService(session, user_id=test_user.id)
        svc.create(BorrowedBookCreate(book_id=test_book.id, contact=contact.id))
        results = svc.get_by_contact(contact.id)
        assert len(results) == 1

    def test_get_by_book_not_found_raises_404(self, session, test_user):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.get_by_book(99999)
        assert exc.value.status_code == 404


@pytest.mark.unit
class TestBorrowedBookServiceUpdateBranches:
    """Branches de update() : expected_return_date, actual_return_date, status direct."""

    def test_update_expected_return_date_past_sets_overdue(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        past_date = datetime.utcnow() - timedelta(days=5)
        updated = svc.update(created.id, BorrowedBookUpdate(expected_return_date=past_date))
        assert updated.status == BorrowStatus.OVERDUE

    def test_update_expected_return_date_future_sets_active(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        future_date = datetime.utcnow() + timedelta(days=30)
        updated = svc.update(created.id, BorrowedBookUpdate(expected_return_date=future_date))
        assert updated.status == BorrowStatus.ACTIVE

    def test_update_expected_return_date_does_not_change_returned_status(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        svc.return_book(created.id)
        past_date = datetime.utcnow() - timedelta(days=5)
        updated = svc.update(created.id, BorrowedBookUpdate(expected_return_date=past_date))
        assert updated.status == BorrowStatus.RETURNED

    def test_update_actual_return_date_marks_returned(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        return_date = datetime.utcnow()
        updated = svc.update(created.id, BorrowedBookUpdate(actual_return_date=return_date))
        assert updated.status == BorrowStatus.RETURNED
        assert updated.actual_return_date is not None

    def test_update_status_direct_override(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        updated = svc.update(created.id, BorrowedBookUpdate(status=BorrowStatus.OVERDUE))
        assert updated.status == BorrowStatus.OVERDUE

    def test_update_borrowed_date(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact="Source"))
        new_date = datetime.utcnow() - timedelta(days=10)
        updated = svc.update(created.id, BorrowedBookUpdate(borrowed_date=new_date))
        assert updated.borrowed_date is not None


@pytest.mark.unit
class TestBorrowedBookServiceProcessContact:
    """_process_contact() : branches int, dict, format invalide."""

    def test_process_contact_int_existing(self, session, test_user, test_book):
        contact = create_test_contact(session, test_user.id, name="Jean Dupont")
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(book_id=test_book.id, contact=contact.id))
        assert created.borrowed_from == "Jean Dupont"
        assert created.contact is not None

    def test_process_contact_int_not_found_raises_404(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.create(BorrowedBookCreate(book_id=test_book.id, contact=99999))
        assert exc.value.status_code == 404

    def test_process_contact_dict_creates_new(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(
            book_id=test_book.id,
            contact={"name": "Marie Curie", "email": "marie@example.com"}
        ))
        assert created.borrowed_from == "Marie Curie"

    def test_process_contact_dict_reuses_existing(self, session, test_user, test_book):
        existing = create_test_contact(session, test_user.id, name="Existing Contact")
        svc = BorrowedBookService(session, user_id=test_user.id)
        created = svc.create(BorrowedBookCreate(
            book_id=test_book.id,
            contact={"name": "Existing Contact"}
        ))
        assert created.contact.id == existing.id

    def test_process_contact_dict_no_name_raises_400(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc.create(BorrowedBookCreate(
                book_id=test_book.id,
                contact={"email": "noname@example.com"}
            ))
        assert exc.value.status_code == 400

    def test_process_contact_invalid_type_raises_400(self, session, test_user, test_book):
        svc = BorrowedBookService(session, user_id=test_user.id)
        with pytest.raises(HTTPException) as exc:
            svc._process_contact(3.14)
        assert exc.value.status_code == 400
        assert "format" in exc.value.detail.lower()
