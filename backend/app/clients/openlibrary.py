import httpx

BASE_URL = "https://openlibrary.org"

async def fetch_openlibrary(isbn: str) -> tuple[dict | None, str | None]:
    """Récupère les infos d'un livre via OpenLibrary.

    Returns:
        tuple: (data, error) — data est le dict ou None, error est un message d'erreur ou None.
    """
    url = f"{BASE_URL}/isbn/{isbn}.json"
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code == 404:
                return None, None  # Livre non trouvé (pas une erreur)
            if response.status_code != 200:
                print(f"Erreur OpenLibrary pour ISBN {isbn}: HTTP {response.status_code}")
                return None, f"OpenLibrary est temporairement indisponible (erreur {response.status_code})"
            return response.json(), None
    except (httpx.ConnectTimeout, httpx.ReadTimeout) as e:
        print(f"Erreur OpenLibrary pour ISBN {isbn}: {e}")
        return None, "OpenLibrary est temporairement indisponible (délai d'attente dépassé)"
    except httpx.RequestError as e:
        print(f"Erreur OpenLibrary pour ISBN {isbn}: {e}")
        return None, "OpenLibrary est temporairement indisponible (erreur réseau)"