import asyncio
from app.clients.openlibrary import fetch_openlibrary

async def main():
    isbn = "9782412028872"
    result = await fetch_openlibrary(isbn)
    print("Résultat:", result)

if __name__ == "__main__":
    asyncio.run(main())
