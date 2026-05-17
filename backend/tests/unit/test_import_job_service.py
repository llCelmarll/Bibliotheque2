"""
Tests unitaires pour import_job_service :
- _extract_id()
- _compute_missing_fields()
- _run() : doublon avec ISBN, doublon sans ISBN, doublon complet (skipped),
           auto-cover, conflit avec champs manquants
- apply_conflict_resolutions()
"""
import pytest
from unittest.mock import MagicMock, patch
from sqlmodel import Session

from app.services.import_job_service import (
    _extract_id,
    _compute_missing_fields,
    ImportJob,
    ImportJobManager,
    JobStatus,
)
from app.schemas.Book import BookCreate
from app.models.Book import Book


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_job(books, populate_covers=False, skip_errors=True):
    job = ImportJob(
        job_id="test-job",
        user_id=1,
        books=books,
        skip_errors=skip_errors,
        populate_covers=populate_covers,
        total=len(books),
    )
    job._pause_event.set()
    return job


def _make_book_create(title, isbn=None, cover_url=None, notes=None, rating=None):
    return BookCreate(
        title=title,
        isbn=isbn,
        cover_url=cover_url,
        notes=notes,
        rating=rating,
    )


def _make_existing_book(title, isbn=None, cover_url=None, notes=None, rating=None):
    return Book(
        id=42,
        title=title,
        isbn=isbn,
        cover_url=cover_url,
        notes=notes,
        rating=rating,
        owner_id=1,
    )


# ── _extract_id ───────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestExtractId:
    def test_extrait_id_depuis_message(self):
        assert _extract_id("Ce livre existe déjà dans votre bibliothèque (ID: 42)") == 42

    def test_extrait_id_espaces_variables(self):
        assert _extract_id("(ID:  99)") == 99

    def test_retourne_moins_un_si_absent(self):
        assert _extract_id("Erreur inconnue") == -1


# ── _compute_missing_fields ──────────────────────────────────────────────────

@pytest.mark.unit
class TestComputeMissingFields:
    def test_champ_simple_manquant(self):
        existing = _make_existing_book("Dune")
        csv = _make_book_create("Dune", notes="Super livre")
        result = _compute_missing_fields(existing, csv)
        assert result == {"notes": "Super livre"}

    def test_champ_deja_present_ignore(self):
        existing = _make_existing_book("Dune", notes="Déjà là")
        csv = _make_book_create("Dune", notes="Autre note")
        result = _compute_missing_fields(existing, csv)
        assert "notes" not in result

    def test_cover_manquante(self):
        existing = _make_existing_book("Dune")
        csv = _make_book_create("Dune", cover_url="https://example.com/cover.jpg")
        result = _compute_missing_fields(existing, csv)
        assert result["cover_url"] == "https://example.com/cover.jpg"

    def test_rating_manquant(self):
        existing = _make_existing_book("Dune")
        csv = _make_book_create("Dune", rating=5)
        result = _compute_missing_fields(existing, csv)
        assert result["rating"] == 5

    def test_aucun_champ_manquant(self):
        existing = _make_existing_book("Dune", notes="Présent", rating=4)
        csv = _make_book_create("Dune", notes="Autre", rating=3)
        result = _compute_missing_fields(existing, csv)
        assert result == {}

    def test_auteurs_manquants(self):
        existing = _make_existing_book("Dune")
        existing.authors = []
        csv = _make_book_create("Dune")
        csv.authors = ["Frank Herbert"]
        result = _compute_missing_fields(existing, csv)
        assert result["authors"] == ["Frank Herbert"]

    def test_auteurs_deja_presents_ignores(self):
        existing = _make_existing_book("Dune")
        author = MagicMock()
        author.name = "Frank Herbert"
        existing.authors = [author]
        csv = _make_book_create("Dune")
        csv.authors = ["Autre Auteur"]
        result = _compute_missing_fields(existing, csv)
        assert "authors" not in result


# ── _run() via ImportJobManager ──────────────────────────────────────────────

@pytest.mark.unit
class TestImportJobManagerRun:

    def _run_job(self, books, existing_book=None, populate_covers=False,
                 create_raises=None, patch_raises=None):
        """Lance _run() de façon synchrone avec les mocks nécessaires."""
        manager = ImportJobManager()
        job = _make_job(books, populate_covers=populate_covers)

        mock_svc = MagicMock()
        if create_raises:
            mock_svc.create_book.side_effect = create_raises
        else:
            mock_svc.create_book.return_value = MagicMock()

        if patch_raises:
            mock_svc.patch_missing_fields.side_effect = patch_raises

        mock_svc._find_cover_url_sync.return_value = None

        # Session et BookService sont importés en lazy dans _run(), on patche à leur source
        with patch("app.db.engine"), \
             patch("sqlmodel.Session"), \
             patch("app.services.book_service.BookService", return_value=mock_svc), \
             patch("app.services.import_job_service._get_book_for_conflict",
                   return_value=existing_book):
            # Injecter directement le service mocké sans passer par les imports lazy
            import app.services.import_job_service as svc_module
            original_run = manager._run

            def patched_run(j):
                # Remplacer les imports lazy en surchargeant les symboles au niveau module
                import sqlmodel
                orig_session = sqlmodel.Session
                sqlmodel.Session = MagicMock(return_value=MagicMock(
                    __enter__=MagicMock(return_value=MagicMock()),
                    __exit__=MagicMock(return_value=False),
                ))
                import app.services.book_service as bs_module
                orig_bs = bs_module.BookService
                bs_module.BookService = MagicMock(return_value=mock_svc)
                try:
                    original_run(j)
                finally:
                    sqlmodel.Session = orig_session
                    bs_module.BookService = orig_bs

            patched_run(job)

        return job

    def test_import_nominal(self):
        books = [_make_book_create("Dune", isbn="9782266211222")]
        job = self._run_job(books)
        assert job.success == 1
        assert job.failed == 0
        assert job.status == JobStatus.DONE

    def test_doublon_complet_skipped(self):
        from fastapi import HTTPException
        existing = _make_existing_book("Dune", isbn="9782266211222",
                                       notes="Déjà là", rating=5)
        existing.authors = [MagicMock(name="author")]
        exc = HTTPException(status_code=400,
                            detail="Ce livre existe déjà dans votre bibliothèque (ID: 42)")
        books = [_make_book_create("Dune", isbn="9782266211222")]
        job = self._run_job(books, existing_book=existing, create_raises=exc)
        assert job.skipped == 1
        assert job.success == 0
        assert len(job.conflicts) == 0

    def test_doublon_avec_champs_manquants_ajoute_conflict(self):
        from fastapi import HTTPException
        existing = _make_existing_book("Dune", isbn="9782266211222")
        exc = HTTPException(status_code=400,
                            detail="Ce livre existe déjà dans votre bibliothèque (ID: 42)")
        books = [_make_book_create("Dune", isbn="9782266211222", notes="Super livre")]
        job = self._run_job(books, existing_book=existing, create_raises=exc)
        assert len(job.conflicts) == 1
        assert job.conflicts[0]["missing_fields"] == {"notes": "Super livre"}
        assert job.skipped == 0

    def test_auto_cover_si_populate_covers(self):
        from fastapi import HTTPException
        existing = _make_existing_book("Dune", isbn="9782266211222")
        exc = HTTPException(status_code=400,
                            detail="Ce livre existe déjà dans votre bibliothèque (ID: 42)")
        books = [_make_book_create("Dune", isbn="9782266211222",
                                   cover_url="https://example.com/cover.jpg")]
        job = self._run_job(books, existing_book=existing,
                            create_raises=exc, populate_covers=True)
        assert job.auto_completed == 1
        assert job.success == 1
        assert len(job.conflicts) == 0

    def test_auto_cover_pas_declenche_si_cover_deja_presente(self):
        from fastapi import HTTPException
        existing = _make_existing_book("Dune", isbn="9782266211222",
                                       cover_url="https://example.com/existing.jpg")
        exc = HTTPException(status_code=400,
                            detail="Ce livre existe déjà dans votre bibliothèque (ID: 42)")
        books = [_make_book_create("Dune", isbn="9782266211222",
                                   cover_url="https://example.com/new.jpg")]
        job = self._run_job(books, existing_book=existing,
                            create_raises=exc, populate_covers=True)
        assert job.auto_completed == 0

    def test_erreur_autre_que_doublon_incremente_failed(self):
        from fastapi import HTTPException
        exc = HTTPException(status_code=422, detail="ISBN invalide")
        books = [_make_book_create("Dune", isbn="invalid")]
        job = self._run_job(books, create_raises=exc)
        assert job.failed == 1
        assert len(job.errors) == 1

    def test_erreur_stoppe_job_si_skip_errors_false(self):
        from fastapi import HTTPException
        exc = HTTPException(status_code=422, detail="ISBN invalide")
        books = [
            _make_book_create("Dune"),
            _make_book_create("Fondation"),
        ]
        job = self._run_job(books, create_raises=exc)
        # skip_errors=True par défaut dans _run_job, on recrée avec False
        manager = ImportJobManager()
        job2 = _make_job(books, skip_errors=False)

        mock_svc = MagicMock()
        mock_svc.create_book.side_effect = exc
        mock_svc._find_cover_url_sync.return_value = None

        import sqlmodel
        import app.services.book_service as bs_module
        orig_session = sqlmodel.Session
        orig_bs = bs_module.BookService
        sqlmodel.Session = MagicMock(return_value=MagicMock(
            __enter__=MagicMock(return_value=MagicMock()),
            __exit__=MagicMock(return_value=False),
        ))
        bs_module.BookService = MagicMock(return_value=mock_svc)
        with patch("app.services.import_job_service._get_book_for_conflict", return_value=None):
            try:
                manager._run(job2)
            finally:
                sqlmodel.Session = orig_session
                bs_module.BookService = orig_bs

        assert job2.status == JobStatus.ERROR
        assert job2.failed == 1  # arrêté après le premier


# ── apply_conflict_resolutions ───────────────────────────────────────────────

@pytest.mark.unit
class TestApplyConflictResolutions:

    def _run_resolve(self, resolutions, mock_svc=None):
        import sqlmodel
        import app.services.book_service as bs_module
        manager = ImportJobManager()
        job = _make_job([])
        if mock_svc is None:
            mock_svc = MagicMock()
        orig_session = sqlmodel.Session
        orig_bs = bs_module.BookService
        sqlmodel.Session = MagicMock(return_value=MagicMock(
            __enter__=MagicMock(return_value=MagicMock()),
            __exit__=MagicMock(return_value=False),
        ))
        bs_module.BookService = MagicMock(return_value=mock_svc)
        try:
            result = manager.apply_conflict_resolutions(job, resolutions)
        finally:
            sqlmodel.Session = orig_session
            bs_module.BookService = orig_bs
        return result, mock_svc

    def test_applique_les_champs_selectionnes(self):
        result, mock_svc = self._run_resolve([
            {"existing_book_id": 42, "fields": {"notes": "Super livre"}},
        ])
        mock_svc.patch_missing_fields.assert_called_once_with(42, {"notes": "Super livre"})
        assert result["applied"] == 1
        assert result["skipped"] == 0

    def test_ignore_les_resolutions_sans_champs(self):
        result, mock_svc = self._run_resolve([
            {"existing_book_id": 42, "fields": None},
        ])
        mock_svc.patch_missing_fields.assert_not_called()
        assert result["applied"] == 0
        assert result["skipped"] == 1

    def test_mixte_applique_et_ignore(self):
        result, _ = self._run_resolve([
            {"existing_book_id": 1, "fields": {"notes": "A"}},
            {"existing_book_id": 2, "fields": None},
            {"existing_book_id": 3, "fields": {"rating": 4}},
        ])
        assert result["applied"] == 2
        assert result["skipped"] == 1
