from sqlmodel import Session
from app.models import Book
from app.repositories import book_repository
from app.clients import openlibrary_client

async def scan_or_get_book(session: Session, isbn: str):
    # Vérifier si le livre existe déjà dans la base de données
    existing_book = book_repository.get_book_by_isbn(session, isbn)
    if existing_book:
        return {"source": "local", "book": existing_book}
    
    # Si le livre n'existe pas, chercher les informations via l'API externe
    data = await openlibrary_client.fetch_book_by_isbn(isbn)
    if not data:
        return None
    
    # Nettoyage minimal des données reçues
    title = data.get("title")
    publisher = ", ".join(data.get("publishers", ["Éditeur inconnu"])) if "publishers" in data else None
    published_date = data.get("publish_date")
    authors = []

    if "authors" in data:
        for author in data["authors"]:
            name = await openlibrary_client.fetch_author(author["key"])
            if name:
                authors.append(name)

    return {
        "source": "openlibrary",
        "data": {
            "title": title,
            "authors": ", ".join(authors) if authors else None,
            "publisher": publisher,
            "published_date": published_date,
            "isbn": isbn
        },
    }