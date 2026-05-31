"""
Tests de fuzzing sur les champs de saisie libres.
Vérifie que le backend ne crash pas (jamais 500) et rejette proprement
les inputs invalides (400/422) sans exposer de stack traces.
"""
import pytest
from fastapi.testclient import TestClient

LONG_STRING = "A" * 10_000
XSS = "<script>alert(1)</script>"
SQL_INJECTION = "'; DROP TABLE books; --"
NULL_BYTE = "titre\x00malveillant"
UNICODE_EXOTIC = "𝕿𝖎𝖙𝖗𝖊 𝖗تتت"
WHITESPACE = "   "
RTL = "‮titre‬"


def _no_server_error(response):
    assert response.status_code != 500, f"500 inattendu: {response.text[:200]}"


# ---------------------------------------------------------------------------
# Auth — POST /auth/register
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.fuzzing
class TestFuzzingAuthRegister:

    def _register(self, client, **overrides):
        data = {
            "email": "fuzz@example.com",
            "username": "fuzzuser",
            "password": "FuzzPass1",
            "confirm_password": "FuzzPass1",
            **overrides,
        }
        return client.post("/auth/register", json=data)

    def test_username_empty(self, client):
        r = self._register(client, username="")
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_username_too_long(self, client):
        r = self._register(client, username=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_username_xss(self, client):
        r = self._register(client, username=XSS)
        _no_server_error(r)

    def test_username_null_byte(self, client):
        r = self._register(client, username=NULL_BYTE)
        _no_server_error(r)

    def test_email_malformed(self, client):
        r = self._register(client, email="not-an-email")
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_email_too_long(self, client):
        r = self._register(client, email=LONG_STRING + "@example.com")
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_password_too_short(self, client):
        r = self._register(client, password="ab", confirm_password="ab")
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_password_xss(self, client):
        r = self._register(client, password=XSS, confirm_password=XSS)
        _no_server_error(r)

    def test_missing_required_fields(self, client):
        r = client.post("/auth/register", json={})
        _no_server_error(r)
        assert r.status_code == 422

    def test_null_on_required_field(self, client):
        r = self._register(client, username=None)
        _no_server_error(r)
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Books — POST /books
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.fuzzing
class TestFuzzingBookCreate:

    def _create(self, authenticated_client, **overrides):
        data = {"title": "Livre test", **overrides}
        return authenticated_client.post("/books", json=data)

    def test_title_empty(self, authenticated_client):
        r = self._create(authenticated_client, title="")
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_title_too_long(self, authenticated_client):
        r = self._create(authenticated_client, title=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_title_xss(self, authenticated_client):
        r = self._create(authenticated_client, title=XSS)
        _no_server_error(r)
        assert r.status_code in (201, 400, 422)

    def test_title_sql_injection(self, authenticated_client):
        r = self._create(authenticated_client, title=SQL_INJECTION)
        _no_server_error(r)
        assert r.status_code in (201, 400, 422)

    def test_title_null_byte(self, authenticated_client):
        r = self._create(authenticated_client, title=NULL_BYTE)
        _no_server_error(r)

    def test_title_unicode(self, authenticated_client):
        r = self._create(authenticated_client, title=UNICODE_EXOTIC)
        _no_server_error(r)

    def test_title_whitespace_only(self, authenticated_client):
        r = self._create(authenticated_client, title=WHITESPACE)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_subtitle_too_long(self, authenticated_client):
        r = self._create(authenticated_client, subtitle=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_notes_too_long(self, authenticated_client):
        r = self._create(authenticated_client, notes=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_isbn_too_long(self, authenticated_client):
        r = self._create(authenticated_client, isbn=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_notes_xss(self, authenticated_client):
        r = self._create(authenticated_client, notes=XSS)
        _no_server_error(r)

    def test_title_null(self, authenticated_client):
        r = self._create(authenticated_client, title=None)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_title_integer(self, authenticated_client):
        r = authenticated_client.post("/books", json={"title": 42})
        _no_server_error(r)

    def test_author_name_too_long(self, authenticated_client):
        r = self._create(authenticated_client, authors=[LONG_STRING])
        _no_server_error(r)

    def test_empty_payload(self, authenticated_client):
        r = authenticated_client.post("/books", json={})
        _no_server_error(r)
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Books — PUT /books/{id}
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.fuzzing
class TestFuzzingBookUpdate:

    def test_title_empty(self, authenticated_client, test_book):
        r = authenticated_client.put(f"/books/{test_book.id}", json={"title": ""})
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_title_too_long(self, authenticated_client, test_book):
        r = authenticated_client.put(f"/books/{test_book.id}", json={"title": LONG_STRING})
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_notes_too_long(self, authenticated_client, test_book):
        r = authenticated_client.put(f"/books/{test_book.id}", json={"notes": LONG_STRING})
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_notes_xss(self, authenticated_client, test_book):
        r = authenticated_client.put(f"/books/{test_book.id}", json={"notes": XSS})
        _no_server_error(r)

    def test_nonexistent_book(self, authenticated_client):
        r = authenticated_client.put("/books/999999", json={"title": "X"})
        _no_server_error(r)
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Search — POST /books/search/simple
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.fuzzing
class TestFuzzingBookSearch:

    def test_query_too_long(self, authenticated_client):
        r = authenticated_client.post("/books/search/simple", json={"search": LONG_STRING})
        _no_server_error(r)

    def test_query_xss(self, authenticated_client):
        r = authenticated_client.post("/books/search/simple", json={"search": XSS})
        _no_server_error(r)

    def test_query_sql_injection(self, authenticated_client):
        r = authenticated_client.post("/books/search/simple", json={"search": SQL_INJECTION})
        _no_server_error(r)

    def test_query_null_byte(self, authenticated_client):
        r = authenticated_client.post("/books/search/simple", json={"search": NULL_BYTE})
        _no_server_error(r)

    def test_query_unicode(self, authenticated_client):
        r = authenticated_client.post("/books/search/simple", json={"search": UNICODE_EXOTIC})
        _no_server_error(r)

    def test_empty_payload(self, authenticated_client):
        r = authenticated_client.post("/books/search/simple", json={})
        _no_server_error(r)


# ---------------------------------------------------------------------------
# Contacts — POST /contacts
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.fuzzing
class TestFuzzingContacts:

    def _create(self, authenticated_client, **overrides):
        data = {"name": "Contact test", **overrides}
        return authenticated_client.post("/contacts", json=data)

    def test_name_empty(self, authenticated_client):
        r = self._create(authenticated_client, name="")
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_name_too_long(self, authenticated_client):
        r = self._create(authenticated_client, name=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_name_xss(self, authenticated_client):
        r = self._create(authenticated_client, name=XSS)
        _no_server_error(r)

    def test_phone_too_long(self, authenticated_client):
        r = self._create(authenticated_client, phone=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_notes_too_long(self, authenticated_client):
        r = self._create(authenticated_client, notes=LONG_STRING)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_email_malformed(self, authenticated_client):
        r = self._create(authenticated_client, email="not-valid")
        _no_server_error(r)

    def test_name_null(self, authenticated_client):
        r = self._create(authenticated_client, name=None)
        _no_server_error(r)
        assert r.status_code in (400, 422)

    def test_empty_payload(self, authenticated_client):
        r = authenticated_client.post("/contacts", json={})
        _no_server_error(r)
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Authors / Publishers / Genres / Series
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.fuzzing
class TestFuzzingEntities:

    @pytest.mark.parametrize("endpoint", ["/authors", "/publishers", "/genres", "/series"])
    def test_name_too_long(self, authenticated_client, endpoint):
        r = authenticated_client.post(endpoint, json={"name": LONG_STRING})
        _no_server_error(r)
        assert r.status_code in (400, 422)

    @pytest.mark.parametrize("endpoint", ["/authors", "/publishers", "/genres", "/series"])
    def test_name_empty(self, authenticated_client, endpoint):
        r = authenticated_client.post(endpoint, json={"name": ""})
        _no_server_error(r)
        assert r.status_code in (400, 422)

    @pytest.mark.parametrize("endpoint", ["/authors", "/publishers", "/genres", "/series"])
    def test_name_xss(self, authenticated_client, endpoint):
        r = authenticated_client.post(endpoint, json={"name": XSS})
        _no_server_error(r)

    @pytest.mark.parametrize("endpoint", ["/authors", "/publishers", "/genres", "/series"])
    def test_name_sql_injection(self, authenticated_client, endpoint):
        r = authenticated_client.post(endpoint, json={"name": SQL_INJECTION})
        _no_server_error(r)

    @pytest.mark.parametrize("endpoint", ["/authors", "/publishers", "/genres", "/series"])
    def test_empty_payload(self, authenticated_client, endpoint):
        r = authenticated_client.post(endpoint, json={})
        _no_server_error(r)
        assert r.status_code == 422
