from typing import List
from sqlmodel import Session, SQLModel
from app.clients.google_books import fetch_google_books
from app.clients.openlibrary import fetch_openlibrary
from app.repositories.book_repository import BookRepository
from app.repositories.author_repository import AuthorRepository
from app.repositories.publisher_repository import PublisherRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.borrowed_book_repository import BorrowedBookRepository
from app.schemas.Book import BookCreate, BookRead, CurrentLoanRead
from app.schemas.Author import AuthorRead
from app.schemas.Publisher import PublisherRead
from app.schemas.BorrowedBook import BorrowedBookRead


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

    # Flags et données pour emprunts
    previously_borrowed: bool = False        # Tous emprunts sont RETURNED
    currently_borrowed: bool = False         # Au moins un emprunt ACTIVE/OVERDUE
    borrowed_book: BorrowedBookRead | None = None  # Détails emprunt actif
    can_add_to_library: bool = False         # Peut ajouter en possession permanente


class ScanService:
    """Service pour le scan de livres"""

    def __init__(self, session: Session, user_id: int = None):
        self.session = session
        self.user_id = user_id
        self.book_repository = BookRepository(session)
        self.author_repository = AuthorRepository(session)
        self.publisher_repository = PublisherRepository(session)
        self.loan_repository = LoanRepository(session)
        self.borrowed_book_repository = BorrowedBookRepository(session)



    async def scan_isbn(self, isbn: str):

        result = ScanResult()


        #Check si dans la base (pour l'utilisateur connecté uniquement)
        base_book = self.book_repository.get_by_isbn(isbn, user_id=self.user_id)


        #Check google_books et openLibrary
        result.google_book = await fetch_google_books(isbn)
        result.openlibrary = await fetch_openlibrary(isbn)

        if base_book:
            # Récupérer le prêt actif pour ce livre
            active_loan = self.loan_repository.get_active_loan_for_book(base_book.id, self.user_id)

            # Vérifier le statut d'emprunt
            has_only_returned, has_active, active_borrow = self.borrowed_book_repository.get_borrow_status(
                base_book.id,
                self.user_id
            )

            if has_only_returned:
                # Cas 1: Livre retourné - ne pas l'afficher comme possédé
                result.previously_borrowed = True
                result.can_add_to_library = True
                result.currently_borrowed = False
                result.base = None  # Ne pas inclure dans base
            elif has_active:
                # Cas 2: Livre actuellement emprunté
                result.currently_borrowed = True
                result.borrowed_book = BorrowedBookRead.model_validate(active_borrow)
                result.previously_borrowed = False
                result.can_add_to_library = False
                result.base = None  # Ne pas inclure dans base (pas possédé)
            else:
                # Cas 3: Livre possédé - comportement normal
                result.base = BookRead.model_validate(base_book)
                if active_loan:
                    result.base.current_loan = CurrentLoanRead.model_validate(active_loan)

            # Créer un SuggestedBook à partir du livre existant (dans tous les cas)
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
                        # Vérifier si l'auteur existe déjà dans la base pour cet utilisateur
                        existing_author = self.author_repository.get_by_name(api_author_name, self.user_id)
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
            
            # Vérification si l'éditeur existe déjà dans la base de données pour cet utilisateur
            final_publisher = None
            if api_publisher_name:
                existing_publisher = self.publisher_repository.get_by_name(api_publisher_name, self.user_id)
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

            # Forcer HTTPS pour les URLs de couverture (fix pour les apps mobiles)
            cover_url = google_cover or openlibrary_cover
            if cover_url and cover_url.startswith('http://'):
                cover_url = cover_url.replace('http://', 'https://', 1)

            result.suggested = SuggestedBook(
                isbn=isbn,
                title=google_title or openlibrary_title,
                published_date=google_date or openlibrary_date,
                page_count=google_pages or openlibrary_pages,
                barcode=isbn,
                cover_url=cover_url,
                authors=authors_list,
                publisher=final_publisher,
                genres=[],  # TODO: Enrichir les genres plus tard si nécessaire
            )

            if result.suggested and result.suggested.title:
                result.title_match = self.book_repository.search_title_match(title=result.suggested.title, isbn=isbn, user_id=self.user_id)

        return result
