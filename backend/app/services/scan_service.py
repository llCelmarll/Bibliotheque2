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


class SuggestedAuthor(SQLModel):
    """Auteur suggéré avec information d'existence"""
    name: str
    exists: bool = False
    id: int | None = None

class SuggestedPublisher(SQLModel):
    """Éditeur suggéré avec information d'existence"""
    name: str
    exists: bool = False
    id: int | None = None

class SuggestedGenre(SQLModel):
    """Genre suggéré avec information d'existence"""
    name: str
    exists: bool = False
    id: int | None = None

class SuggestedBook(SQLModel):
    """Modèle pour le livre suggéré dans le scan - avec entités enrichies"""
    isbn: str | None = None
    title: str | None = None
    published_date: str | None = None
    page_count: int | None = None
    barcode: str | None = None
    cover_url: str | None = None
    authors: List[SuggestedAuthor] = []
    publisher: SuggestedPublisher | None = None
    genres: List[SuggestedGenre] = []


class ScanResult(SQLModel):
    base : BookRead | None = None
    suggested : SuggestedBook | None = None
    title_match : List[BookRead] = []
    google_book : dict | None= None
    openlibrary : dict | None= None


class ScanService:
    """Service pour le scan de livres"""

    def __init__(self, session: Session, user_id: int = None):
        self.session = session
        self.user_id = user_id
        self.book_repository = BookRepository(session)
        self.author_repository = AuthorRepository(session)
        self.publisher_repository = PublisherRepository(session)



    async def scan_isbn(self, isbn: str):

        result = ScanResult()


        #Check si dans la base (pour l'utilisateur connecté uniquement)
        base_book = self.book_repository.get_by_isbn(isbn, user_id=self.user_id)


        #Check google_books et openLibrary
        result.google_book = await fetch_google_books(isbn)
        result.openlibrary = await fetch_openlibrary(isbn)

        if base_book:
            result.base = BookRead.model_validate(base_book)
            # Créer un SuggestedBook à partir du livre existant
            result.suggested = SuggestedBook(
                isbn=base_book.isbn,
                title=base_book.title,
                published_date=base_book.published_date,
                page_count=base_book.page_count,
                barcode=base_book.barcode,
                cover_url=base_book.cover_url,
                authors=[
                    SuggestedAuthor(name=author.name, exists=True, id=author.id) 
                    for author in base_book.authors
                ] if base_book.authors else [],
                publisher=SuggestedPublisher(
                    name=base_book.publisher.name, 
                    exists=True, 
                    id=base_book.publisher.id
                ) if base_book.publisher else None,
                genres=[
                    SuggestedGenre(name=genre.name, exists=True, id=genre.id)
                    for genre in base_book.genres
                ] if base_book.genres else []
            )
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
            openlibrary_publisher = None
            if result.openlibrary and result.openlibrary.get("publishers") and len(result.openlibrary.get("publishers")) > 0:
                openlibrary_publisher = result.openlibrary.get("publishers")[0]

            # Gestion des auteurs avec vérification en base
            authors_list = []
            if result.google_book:
                if api_authors := result.google_book.get("authors"):
                    for api_author_name in api_authors:
                        # Vérifier si l'auteur existe déjà dans la base
                        existing_author = self.author_repository.get_by_name(api_author_name)
                        if existing_author:
                            authors_list.append(SuggestedAuthor(
                                name=existing_author.name,
                                exists=True,
                                id=existing_author.id
                            ))
                            print(f"✅ Auteur trouvé en base: '{existing_author.name}' (API: '{api_author_name}')")
                        else:
                            authors_list.append(SuggestedAuthor(
                                name=api_author_name,
                                exists=False,
                                id=None
                            ))
                            print(f"🆕 Nouvel auteur détecté: '{api_author_name}'")
            
            # Récupération du nom de l'éditeur depuis les APIs
            api_publisher_name = google_publisher or openlibrary_publisher
            
            # Vérification si l'éditeur existe déjà dans la base de données
            final_publisher = None
            if api_publisher_name:
                existing_publisher = self.publisher_repository.get_by_name(api_publisher_name)
                if existing_publisher:
                    final_publisher = SuggestedPublisher(
                        name=existing_publisher.name,
                        exists=True,
                        id=existing_publisher.id
                    )
                    print(f"✅ Éditeur trouvé en base: '{existing_publisher.name}' (API: '{api_publisher_name}')")
                else:
                    final_publisher = SuggestedPublisher(
                        name=api_publisher_name,
                        exists=False,
                        id=None
                    )
                    print(f"🆕 Nouvel éditeur détecté: '{api_publisher_name}'")

            result.suggested = SuggestedBook(
                isbn=isbn,
                title=google_title or openlibrary_title,
                published_date=google_date or openlibrary_date,
                page_count=google_pages or openlibrary_pages,
                barcode=isbn,
                cover_url=google_cover or openlibrary_cover,
                authors=authors_list,
                publisher=final_publisher,
                genres=[],  # TODO: Enrichir les genres plus tard si nécessaire
            )

            if result.suggested and result.suggested.title:
                result.title_match = self.book_repository.search_title_match(title=result.suggested.title, isbn=isbn, user_id=self.user_id)

        return result
