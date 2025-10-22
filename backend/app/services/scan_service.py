from typing import List
from sqlmodel import Session, SQLModel
from app.clients.google_books import fetch_google_books
from app.clients.openlibrary import fetch_openlibrary
from app.repositories.book_repository import BookRepository
from app.repositories.author_repository import AuthorRepository
from app.repositories.publisher_repository import PublisherRepository
from app.schemas.Book import BookCreate, BookRead
from app.schemas.Author import AuthorRead
from app.schemas.Publisher import PublisherRead


class ScanResult(SQLModel):

      base : BookRead | None = None
      suggested : BookCreate | None = None
      title_match : List[BookRead] | None = None
      google_book : dict | None= None
      openlibrary : dict | None= None


class ScanService:
    """Service pour le scan de livres"""

    def __init__(self, session: Session):
        self.session = session
        self.book_repository = BookRepository(session)
        self.author_repository = AuthorRepository(session)
        self.publisher_repository = PublisherRepository(session)


    async def scan_isbn(self, isbn: str):

        result = ScanResult()


        #Check si dans la base
        base_book = self.book_repository.get_by_isbn(isbn)


        #Check google_books et openLibrary
        result.google_book = await fetch_google_books(isbn)
        result.openlibrary = await fetch_openlibrary(isbn)

        print(result)

        if base_book:
            result.base = BookRead.model_validate(base_book)
            result.suggested = BookCreate.model_validate(base_book)
        else:
            # Récupération des données à suggerer
            google_title = result.google_book.get("title") if result.google_book else None
            google_date = result.google_book.get("publishedDate") if result.google_book else None
            google_pages = result.google_book.get("pageCount") if result.google_book else None
            google_cover = result.google_book.get("imageLinks", {}).get("thumbnail") if result.google_book else None
            google_publisher = result.google_book.get("publisher") if result.google_book else None

            openlibrary_title = result.openlibrary.get("title") if result.openlibrary else None
            openlibrary_date = result.openlibrary.get("publish_date") if result.openlibrary else None
            openlibrary_pages = result.openlibrary.get("number_of_pages") if result.openlibrary else None
            openlibrary_cover = f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg" if result.openlibrary else None
            openlibrary_publisher = result.openlibrary.get("publishers")[0] if result.openlibrary else None

            authors_list = []
            suggested_publisher = None
            if result.google_book:
                # Gestion des auteurs
                if authors := result.google_book.get("authors"):
                    for author in authors:
                        author_db = self.author_repository.get_by_name(author)
                        if author_db:
                            authors_list.append(AuthorRead.model_validate(author_db))
                        else:
                            authors_list.append(author)

            publisher_db = self.publisher_repository.get_by_name(google_publisher or openlibrary_publisher)
            if publisher_db:
                suggested_publisher = PublisherRead.model_validate(publisher_db)
            else:
                suggested_publisher = google_publisher or openlibrary_publisher


            result.suggested = BookCreate(
                isbn=isbn,
                title=google_title or openlibrary_title,
                published_date=google_date or openlibrary_date,
                page_count=google_pages or openlibrary_pages,
                barcode=isbn,
                cover_url=google_cover or openlibrary_cover,
                authors=authors_list,
                publisher=suggested_publisher,
                genre=[],
            )

            result.title_match= self.book_repository.search_title_match(title=result.suggested.title, isbn=isbn)

        return result
