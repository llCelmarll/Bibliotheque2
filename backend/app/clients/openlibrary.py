import httpx

BASE_URL = "https://openlibrary.org"

async def fetch_openlibrary(isbn: str) -> dict | None:
    """Récupère les infos d'un livre via OpenLibrary"""
    url = f"{BASE_URL}/isbn/{isbn}.json"
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        response = await client.get(url)
        if response.status_code != 200:
            return None
        return response.json()