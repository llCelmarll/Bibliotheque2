"""
Tests unitaires pour BookService.export_books_csv()
Couvre les edge cases : séries, caractères spéciaux, encodage, couvertures, champs vides.
"""
import csv
import io
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from sqlmodel import Session

from app.services.book_service import BookService
from app.schemas.book_schemas import BookRead
from app.schemas.author_schemas import AuthorRead
from app.schemas.publisher_schemas import PublisherRead
from app.schemas.genre_schemas import GenreRead
from app.schemas.series_schemas import BookSeriesRead


# ─── Helpers ────────────────────────────────────────────────────────────────

def _make_book(**kwargs) -> BookRead:
    """Construit un BookRead minimal valide pour les tests."""
    defaults = dict(
        id=1,
        title="Livre Test",
        subtitle=None,
        isbn=None,
        published_date=None,
        page_count=None,
        barcode=None,
        cover_url=None,
        reading_status=None,
        read_date=None,
        rating=None,
        notes=None,
        created_at=datetime(2024, 1, 1),
        updated_at=None,
        authors=[],
        publisher=None,
        genres=[],
        series=[],
        is_lendable=True,
        current_loan=None,
        borrowed_book=None,
        has_borrow_history=False,
    )
    defaults.update(kwargs)
    return BookRead(**defaults)


def _author(name: str) -> AuthorRead:
    return AuthorRead(id=1, name=name)


def _publisher(name: str) -> PublisherRead:
    return PublisherRead(id=1, name=name)


def _genre(name: str) -> GenreRead:
    return GenreRead(id=1, name=name)


def _series(name: str, volume: int | None = None) -> BookSeriesRead:
    return BookSeriesRead(id=1, name=name, volume_number=volume)


def _parse_csv(csv_str: str) -> list[dict]:
    """Parse le CSV exporté (avec BOM) en liste de dicts."""
    clean = csv_str.lstrip('﻿')
    reader = csv.DictReader(io.StringIO(clean), delimiter=';')
    return list(reader)


# ─── Fixture commune ────────────────────────────────────────────────────────

@pytest.fixture
def book_service(test_user):
    session = Mock(spec=Session)
    svc = BookService(session, user_id=test_user.id)
    svc.book_repository = Mock()
    svc.loan_repository = Mock()
    svc.borrowed_book_repository = Mock()
    return svc


def _setup_books(svc: BookService, books: list[BookRead]):
    """Configure le mock repository pour retourner ces livres enrichis."""
    raw_books = [Mock() for _ in books]
    svc.book_repository.search_books.return_value = raw_books
    svc.loan_repository.get_active_loan_for_book.return_value = None
    svc.borrowed_book_repository.get_active_borrow_for_book.return_value = None
    svc.borrowed_book_repository.get_by_book.return_value = []
    # _enrich_book_read retourne le BookRead correspondant
    svc._enrich_book_read = Mock(side_effect=lambda b: books[raw_books.index(b)])


# ─── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestExportBooksCsv:

    def test_bom_utf8_present(self, book_service):
        """Le BOM UTF-8 doit être le premier caractère du fichier."""
        _setup_books(book_service, [])
        result = book_service.export_books_csv()
        assert result[0] == '﻿'

    def test_headers_corrects(self, book_service):
        """La première ligne doit contenir exactement les 13 colonnes attendues."""
        _setup_books(book_service, [])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows == []  # Bibliothèque vide — juste les headers
        # Vérifier les colonnes via DictReader fieldnames
        clean = book_service.export_books_csv().lstrip('﻿')
        reader = csv.DictReader(io.StringIO(clean), delimiter=';')
        expected = ['titre', 'sous-titre', 'isbn', 'auteurs', 'editeur', 'genres',
                    'date_publication', 'pages', 'serie', 'lu', 'note', 'notes', 'couverture']
        assert reader.fieldnames == expected

    def test_bibliotheque_vide(self, book_service):
        """Aucun livre → seule la ligne d'en-têtes, pas de crash."""
        _setup_books(book_service, [])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows == []

    def test_livre_complet(self, book_service):
        """Livre avec tous les champs remplis."""
        book = _make_book(
            title="Dune",
            subtitle="Le désert des déserts",
            isbn="9782266233200",
            authors=[_author("Frank Herbert")],
            publisher=_publisher("Pocket"),
            genres=[_genre("Science-Fiction")],
            published_date="1965",
            page_count=896,
            series=[_series("Dune", 1)],
            reading_status="read",
            rating=5,
            notes="Chef-d'œuvre.",
            cover_url="https://example.com/dune.jpg",
        )
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert len(rows) == 1
        r = rows[0]
        assert r['titre'] == "Dune"
        assert r['sous-titre'] == "Le désert des déserts"
        assert r['isbn'] == "9782266233200"
        assert r['auteurs'] == "Frank Herbert"
        assert r['editeur'] == "Pocket"
        assert r['genres'] == "Science-Fiction"
        assert r['date_publication'] == "1965"
        assert r['pages'] == "896"
        assert r['serie'] == "Dune:1"
        assert r['lu'] == "lu"
        assert r['note'] == "5"
        assert r['notes'] == "Chef-d'œuvre."
        assert r['couverture'] == "https://example.com/dune.jpg"

    def test_livre_sans_auteur_genre_editeur(self, book_service):
        """Livre sans auteur, genre ni éditeur → colonnes vides, pas de crash."""
        book = _make_book(title="Titre seul", authors=[], genres=[], publisher=None)
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert len(rows) == 1
        assert rows[0]['auteurs'] == ''
        assert rows[0]['genres'] == ''
        assert rows[0]['editeur'] == ''

    def test_reading_status_lu(self, book_service):
        book = _make_book(reading_status="read")
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['lu'] == 'lu'

    def test_reading_status_non_lu(self, book_service):
        book = _make_book(reading_status="unread")
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['lu'] == 'non lu'

    def test_reading_status_in_progress(self, book_service):
        book = _make_book(reading_status="in_progress")
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['lu'] == 'en cours'

    def test_reading_status_none(self, book_service):
        book = _make_book(reading_status=None)
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['lu'] == ''

    def test_rating_zero(self, book_service):
        book = _make_book(rating=0)
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['note'] == '0'

    def test_rating_cinq(self, book_service):
        book = _make_book(rating=5)
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['note'] == '5'

    def test_rating_none(self, book_service):
        book = _make_book(rating=None)
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['note'] == ''

    def test_serie_simple_sans_tome(self, book_service):
        book = _make_book(series=[_series("Fondation")])
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['serie'] == 'Fondation'

    def test_serie_avec_tome(self, book_service):
        book = _make_book(series=[_series("Dune", 3)])
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['serie'] == 'Dune:3'

    def test_deux_series(self, book_service):
        book = _make_book(series=[_series("Serie1", 1), _series("Serie2", 4)])
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['serie'] == 'Serie1:1 ; Serie2:4'

    def test_titre_avec_guillemets_et_point_virgule(self, book_service):
        """Le titre contenant " et ; doit être correctement échappé dans le CSV."""
        book = _make_book(title='Le "Grand" Livre ; test CSV')
        _setup_books(book_service, [book])
        raw = book_service.export_books_csv()
        rows = _parse_csv(raw)
        assert rows[0]['titre'] == 'Le "Grand" Livre ; test CSV'

    def test_cover_url_locale_prefixee(self, book_service):
        """Une cover_url locale (/covers/42.jpg) doit être préfixée par APP_BASE_URL."""
        book = _make_book(cover_url='/covers/42.jpg')
        _setup_books(book_service, [book])
        with patch('app.config.APP_BASE_URL', 'http://localhost:8000'):
            rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['couverture'] == 'http://localhost:8000/covers/42.jpg'

    def test_cover_url_externe_inchangee(self, book_service):
        """Une cover_url externe (https://...) ne doit pas être modifiée."""
        book = _make_book(cover_url='https://covers.openlibrary.org/b/isbn/9782070612888-L.jpg')
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['couverture'] == 'https://covers.openlibrary.org/b/isbn/9782070612888-L.jpg'

    def test_cover_url_vide(self, book_service):
        book = _make_book(cover_url=None)
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['couverture'] == ''

    def test_deux_auteurs(self, book_service):
        book = _make_book(authors=[_author("Terry Pratchett"), _author("Neil Gaiman")])
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['auteurs'] == 'Terry Pratchett, Neil Gaiman'

    def test_deux_genres(self, book_service):
        book = _make_book(genres=[_genre("Fantasy"), _genre("Humour")])
        _setup_books(book_service, [book])
        rows = _parse_csv(book_service.export_books_csv())
        assert rows[0]['genres'] == 'Fantasy, Humour'
