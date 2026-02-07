import httpx

BASE_URL = "https://www.googleapis.com/books/v1/volumes"

async def fetch_google_books(isbn: str) -> tuple[dict | None, str | None]:
    """Récupère les infos d'un livre via Google Books API en cherchant par ISBN.

    Returns:
        tuple: (data, error) — data est le volumeInfo ou None, error est un message d'erreur ou None.
    """
    params = {"q": f"isbn:{isbn}"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(BASE_URL, params=params)
            if response.status_code != 200:
                print(f"Erreur Google Books pour ISBN {isbn}: HTTP {response.status_code}")
                return None, f"Google Books est temporairement indisponible (erreur {response.status_code})"
            data = response.json()
            if data.get("error"):
                error_msg = data["error"].get("message", "Erreur inconnue")
                print(f"Erreur Google Books pour ISBN {isbn}: {error_msg}")
                return None, f"Google Books est temporairement indisponible"
            if not data.get("items"):
                return None, None  # Livre non trouvé (pas une erreur)
            return data["items"][0]["volumeInfo"], None
    except (httpx.ConnectTimeout, httpx.ReadTimeout) as e:
        print(f"Erreur Google Books pour ISBN {isbn}: {e}")
        return None, "Google Books est temporairement indisponible (délai d'attente dépassé)"
    except httpx.RequestError as e:
        print(f"Erreur Google Books pour ISBN {isbn}: {e}")
        return None, "Google Books est temporairement indisponible (erreur réseau)"