import httpx

BASE_URL = "https://openlibrary.org"

async def fetch_book_by_isbn(isbn: str) -> dict | None:
    """
    Appelle l'API Open Library pour récupérer les informations d'un livre via son ISBN.
    Retourne un dictionnaire avec les données du livre ou None si le livre n'est pas trouvé.
    """
    url = f"{BASE_URL}/isbn/{isbn}.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        if response.status_code == 200:
            return response.json()
        return None

async def fetch_author(author_key: str) -> str | None:
    """
    Appelle l'API Open Library pour récupérer le nom d'un auteur via sa clé.
    Retourne le nom de l'auteur ou None si l'auteur n'est pas trouvé.
    """
    url = f"{BASE_URL}{author_key}.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            return data.get("name")
        return None