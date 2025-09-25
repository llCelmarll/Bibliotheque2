import pytest
from app.clients.openlibrary import fetch_openlibrary

@pytest.mark.asyncio
async def test_fetch_openlibrary_found():
    # ISBN qui déclenche une redirection mais existe bien dans OpenLibrary
    isbn = "9780141439518"  # Python pour les nuls
    result = await fetch_openlibrary(isbn)
    assert result is not None
    assert "title" in result
    assert "Pride" in result["title"]

@pytest.mark.asyncio
async def test_fetch_openlibrary_not_found():
    isbn = "0000000000000"
    result = await fetch_openlibrary(isbn)
    assert result is None
