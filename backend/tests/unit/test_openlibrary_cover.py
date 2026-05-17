"""
Tests unitaires pour get_openlibrary_cover_url() :
- Image valide (> 100 octets) → retourne l'URL
- GIF 1×1 pixel (≤ 100 octets) → retourne None
- Réponse HTTP non-200 → retourne None
- Timeout réseau → retourne None
"""
import pytest
from unittest.mock import patch, MagicMock
import httpx

from app.clients.openlibrary import get_openlibrary_cover_url


ISBN = "9782266211222"
EXPECTED_URL = f"https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg"


def _mock_response(status_code=200, content=b"x" * 200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.content = content
    return resp


@pytest.mark.unit
class TestGetOpenlibraryAcoverUrl:

    def test_image_valide_retourne_url(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = \
                _mock_response(content=b"x" * 200)
            result = get_openlibrary_cover_url(ISBN)
        assert result == EXPECTED_URL

    def test_image_1x1_retourne_none(self):
        # Le GIF 1×1 transparent d'OpenLibrary fait 35 octets
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = \
                _mock_response(content=b"x" * 35)
            result = get_openlibrary_cover_url(ISBN)
        assert result is None

    def test_image_exactement_100_octets_retourne_none(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = \
                _mock_response(content=b"x" * 100)
            result = get_openlibrary_cover_url(ISBN)
        assert result is None

    def test_image_101_octets_retourne_url(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = \
                _mock_response(content=b"x" * 101)
            result = get_openlibrary_cover_url(ISBN)
        assert result == EXPECTED_URL

    def test_statut_404_retourne_none(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = \
                _mock_response(status_code=404, content=b"")
            result = get_openlibrary_cover_url(ISBN)
        assert result is None

    def test_statut_500_retourne_none(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.return_value = \
                _mock_response(status_code=500, content=b"")
            result = get_openlibrary_cover_url(ISBN)
        assert result is None

    def test_timeout_retourne_none(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.side_effect = \
                httpx.TimeoutException("timeout")
            result = get_openlibrary_cover_url(ISBN)
        assert result is None

    def test_erreur_reseau_retourne_none(self):
        with patch("app.clients.openlibrary.httpx.Client") as mock_client_cls:
            mock_client_cls.return_value.__enter__.return_value.get.side_effect = \
                httpx.NetworkError("network error")
            result = get_openlibrary_cover_url(ISBN)
        assert result is None
