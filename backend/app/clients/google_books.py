import asyncio
import os
import httpx

BASE_URL = "https://www.googleapis.com/books/v1/volumes"

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


async def fetch_google_books(isbn: str) -> tuple[dict | None, str | None]:
    """Récupère les infos d'un livre via Google Books API en cherchant par ISBN.

    Effectue jusqu'à 3 tentatives avec backoff exponentiel sur les erreurs transitoires
    (429, 5xx). Les erreurs définitives (4xx hors 429) ne sont pas retentées.

    Returns:
        tuple: (data, error) — data est le volumeInfo ou None, error est un message d'erreur ou None.
    """
    api_key = os.getenv("GOOGLE_BOOKS_API_KEY")
    params = {"q": f"isbn:{isbn}"}
    if api_key:
        params["key"] = api_key

    last_error: str | None = None

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(BASE_URL, params=params)

                if response.status_code == 200:
                    data = response.json()
                    if data.get("error"):
                        error_msg = data["error"].get("message", "Erreur inconnue")
                        print(f"Erreur Google Books pour ISBN {isbn}: {error_msg}")
                        return None, "Google Books est temporairement indisponible"
                    if not data.get("items"):
                        return None, None  # Livre non trouvé (pas une erreur)
                    return data["items"][0]["volumeInfo"], None

                print(f"Erreur Google Books pour ISBN {isbn}: HTTP {response.status_code} (tentative {attempt + 1}/3)")

                if response.status_code not in _RETRYABLE_STATUS:
                    return None, f"Google Books est temporairement indisponible (erreur {response.status_code})"

                last_error = f"Google Books est temporairement indisponible (erreur {response.status_code})"

        except (httpx.ConnectTimeout, httpx.ReadTimeout) as e:
            print(f"Erreur Google Books pour ISBN {isbn}: {e} (tentative {attempt + 1}/3)")
            last_error = "Google Books est temporairement indisponible (délai d'attente dépassé)"
        except httpx.RequestError as e:
            print(f"Erreur Google Books pour ISBN {isbn}: {e} (tentative {attempt + 1}/3)")
            last_error = "Google Books est temporairement indisponible (erreur réseau)"

        if attempt < 2:
            await asyncio.sleep(2 ** attempt)  # 1s, 2s

    return None, last_error
