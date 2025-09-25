from app.clients.google_books import fetch_google_books
from app.clients.openlibrary import fetch_openlibrary

async def scan_isbn(isbn:str):
    #1. Essayer Google Books
    google_result = await fetch_google_books(isbn)
    if google_result:
        return {
            "source": "google_books",
            "data": google_result
        }
    
    #2. Sinon fallback sur openlib
    openlib_result = await fetch_openlibrary(isbn)
    if openlib_result:
        return {
            "source" : "openlibrary",
            "data" : openlib_result
        }
    
    #3. Rien trouvé
    return None