import pytest
import anyio
from app.clients.google_books import fetch_google_books

@pytest.mark.asyncio
async def test_fetch_google_books_found():
    isbn = "9782412028872"  # Python pour les nuls
    result = await fetch_google_books(isbn)
    assert result is not None
    assert "title" in result
    assert "Python" in result["title"]

@pytest.mark.asyncio
async def test_fetch_google_books_not_found():
    isbn = "0000000000000"
    result = await fetch_google_books(isbn)
    assert result is None