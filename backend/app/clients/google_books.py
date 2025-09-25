import httpx

BASE_URL = "https://www.googleapis.com/books/v1/volumes"

async def fetch_google_books(isbn: str) -> dict | None:
    """Récupère les infos d'un livre via Google Books API en cherchant par ISBN."""
    params = {"q": f"isbn:{isbn}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(BASE_URL, params=params)
        print(response.url, response.status_code)   # DEBUG
        print(response.text[:500])                      # DEBUG limité
        if response.status_code != 200:
            return None
        data = response.json()
        if not data.get("items"):
            return None
        return data["items"][0]["volumeInfo"]