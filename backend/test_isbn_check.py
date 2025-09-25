import asyncio
import httpx

GOOGLE_BASE = "https://www.googleapis.com/books/v1/volumes"
OPENLIB_BASE = "https://openlibrary.org"

async def check_google(isbn: str):
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(GOOGLE_BASE, params={"q": f"isbn:{isbn}"})
        print("Google Books status:", resp.status_code)
        data = resp.json()
        if data.get("items"):
            volume = data["items"][0]["volumeInfo"]
            print("Google Books found:", volume.get("title"), "-", volume.get("authors"))
        else:
            print("Google Books: no result")

async def check_openlib(isbn: str):
    url = f"{OPENLIB_BASE}/isbn/{isbn}.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        print("OpenLibrary status:", resp.status_code)
        if resp.status_code == 200:
            data = resp.json()
            print("OpenLibrary found:", data.get("title"))
        elif resp.status_code in (301, 302, 303, 307, 308):
            print("OpenLibrary redirect ->", resp.headers.get("location"))
        else:
            print("OpenLibrary: no result")

async def main():
    isbn = "9782412028872"
    await check_google(isbn)
    await check_openlib(isbn)

if __name__ == "__main__":
    asyncio.run(main())
