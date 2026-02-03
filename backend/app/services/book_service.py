from typing import List, Optional, Dict, Any
import httpx
import re

from sqlmodel import Session
from fastapi import HTTPException
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.repositories.book_repository import BookRepository
from app.repositories.loan_repository import LoanRepository
from app.repositories.borrowed_book_repository import BorrowedBookRepository
from app.schemas.Book import BookCreate, BookUpdate, BookRead, CurrentLoanRead, CurrentBorrowRead, BookSearchParams, BookAdvancedSearchParams
from app.schemas.Other import Filter, FilterType
from app.clients.openlibrary import fetch_openlibrary
from app.clients.google_books import fetch_google_books
from datetime import datetime
import logging
from time import perf_counter

class BookService:
    """Service pour la logique métier des livres"""

    def __init__(self, session: Session, user_id: Optional[int] = None):
        self.session = session
        self.user_id = user_id
        self.book_repository = BookRepository(session)
        self.loan_repository = LoanRepository(session)
        self.borrowed_book_repository = BorrowedBookRepository(session)

    def create_book(self, book_data: BookCreate) -> Book:
        """Crée un nouveau livre avec ses relations ou gère un livre existant"""
        logger = logging.getLogger("app.books")
        start = perf_counter()
        logger.info("Create book: title=%s isbn=%s", book_data.title, getattr(book_data, "isbn", None))

        # 1. Validation is_borrowed
        if book_data.is_borrowed and not book_data.contact and not book_data.borrowed_from:
            raise HTTPException(
                status_code=400,
                detail="Le champ 'contact' est requis si 'is_borrowed' est True"
            )

        # Validation des données
        self._validate_book_data(book_data)

        # 2. Vérifier si le livre existe déjà
        existing_book = self.book_repository.get_by_title_isbn_owner(
            book_data.title, book_data.isbn or "", self.user_id
        )

        if existing_book:
            book = existing_book
            logger.info("Book already exists: id=%s", book.id)

            # Vérifier si le livre a un historique d'emprunt
            all_borrows = self.borrowed_book_repository.get_by_book(book.id, self.user_id)

            if not all_borrows:
                # Livre possédé sans historique d'emprunt → Bloquer
                raise HTTPException(
                    status_code=400,
                    detail=f"Ce livre existe déjà dans votre bibliothèque (ID: {book.id})"
                )
            # Si all_borrows existe → C'est un livre avec historique d'emprunt
            # → On continue (permettre ré-emprunt ou achat)
        else:
            # Le livre n'existe pas → Le créer via le repository
            # Traitement de l'éditeur
            publisher_id = None
            if book_data.publisher:
                publisher_id = self._process_publisher_for_book(book_data.publisher)

            # Créer avec le publisher_id
            book_data_dict = book_data.model_dump()
            book_data_dict["publisher_id"] = publisher_id
            # Reconstruire BookCreate avec publisher_id
            from app.schemas.Book import BookCreate
            book_data_with_publisher = BookCreate(**{**book_data_dict, "publisher_id": publisher_id})

            book = self.book_repository.create(book_data_with_publisher, self.user_id)

            # Gestion des relations many-to-many
            if book_data.authors:
                self._process_authors_for_book(book, book_data.authors)

            if book_data.genres:
                self._process_genres_for_book(book, book_data.genres)

        # 3. Vérifier emprunt actif existant
        active_borrow = self.borrowed_book_repository.get_active_borrow_for_book(
            book.id, self.user_id
        )

        if active_borrow:
            # Un emprunt ACTIF existe
            if book_data.is_borrowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Un emprunt actif existe déjà pour ce livre depuis {active_borrow.contact.name if active_borrow.contact else active_borrow.borrowed_from}"
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ce livre est actuellement emprunté à {active_borrow.contact.name if active_borrow.contact else active_borrow.borrowed_from}. Retournez-le d'abord avant de le marquer comme possédé."
                )

        # 4. Gérer is_borrowed
        if book_data.is_borrowed:
            # Résoudre le contact
            contact_input = book_data.contact or book_data.borrowed_from
            contact_id = None
            contact_name = str(contact_input) if contact_input else ""
            if contact_input:
                from app.services.contact_service import ContactService
                contact_svc = ContactService(self.session, self.user_id)
                if isinstance(contact_input, int):
                    from app.repositories.contact_repository import ContactRepository
                    contact_repo = ContactRepository(self.session)
                    c = contact_repo.get_by_id(contact_input, self.user_id)
                    if c:
                        contact_id = c.id
                        contact_name = c.name
                elif isinstance(contact_input, str):
                    c = contact_svc.get_or_create_by_name(contact_input)
                    contact_id = c.id
                    contact_name = c.name
                elif isinstance(contact_input, dict):
                    name = contact_input.get("name", "")
                    c = contact_svc.get_or_create_by_name(name)
                    contact_id = c.id
                    contact_name = c.name

            # Créer nouvel emprunt via le repository
            self.borrowed_book_repository.create_from_params(
                book_id=book.id,
                user_id=self.user_id,
                borrowed_from=contact_name,
                contact_id=contact_id,
                borrowed_date=book_data.borrowed_date,
                expected_return_date=book_data.expected_return_date,
                notes=book_data.borrow_notes
            )
            logger.info("Create borrowed book: book_id=%s", book.id)
        else:
            # is_borrowed=False → Supprimer TOUS les emprunts (achat du livre)
            deleted_count = self.borrowed_book_repository.delete_all_for_book(book.id, self.user_id)
            if deleted_count > 0:
                logger.info("Deleted %d borrow records for book: book_id=%s", deleted_count, book.id)

        # 5. Commit final
        self.session.commit()
        self.session.refresh(book)
        duration_ms = int((perf_counter() - start) * 1000)
        logger.info("Create book OK: id=%s duration_ms=%d", book.id, duration_ms)

        return book

    async def get_book_by_id(self, book_id: int) -> Dict[str, Any]:
        """Récupère un livre par son ID (seulement si l'utilisateur en est propriétaire)"""
        book_data = {}

        base_book = self.book_repository.get_by_id(book_id, self.user_id)
        #print("Livre renvoyé par le repository" , base_book)
        if not base_book:
           raise HTTPException(status_code=404, detail="Livre introuvable")

        from app.schemas.Book import BookRead
        book_read = BookRead.from_orm(base_book)

        # Récupérer le prêt actif pour ce livre
        active_loan = self.loan_repository.get_active_loan_for_book(base_book.id, self.user_id)
        if active_loan:
            book_read.current_loan = CurrentLoanRead.model_validate(active_loan)

        # Récupérer l'emprunt actif pour ce livre (seulement ACTIF ou OVERDUE, pas RETURNED)
        active_borrow = self.borrowed_book_repository.get_active_borrow_for_book(base_book.id, self.user_id)
        if active_borrow:
            book_read.borrowed_book = CurrentBorrowRead.model_validate(active_borrow)

        # Vérifier si le livre a un historique d'emprunts (même retournés)
        all_borrows = self.borrowed_book_repository.get_by_book(base_book.id, self.user_id)
        book_read.has_borrow_history = len(all_borrows) > 0

        book_data['base'] = book_read.model_dump()
        book_data['google_books'] = await fetch_google_books(base_book.isbn)
        book_data['open_library'] = await fetch_openlibrary(base_book.isbn)
        return book_data

    def update_book(self, book_id: int, book_data: BookUpdate) -> Book:
        """Met à jour un livre (seulement si l'utilisateur en est propriétaire)"""
        # Utiliser le repository pour obtenir l'objet Book directement avec vérification de propriété
        book = self.book_repository.get_by_id(book_id, self.user_id)
        if not book:
            raise HTTPException(status_code=404, detail="Livre introuvable")
        
        # Validation des nouvelles données
        if book_data.title or book_data.isbn:
            new_title = book_data.title or book.title
            new_isbn = book_data.isbn or book.isbn
            
            if self._book_exists(new_title, new_isbn, exclude_id=book_id):
                raise HTTPException(
                    status_code=400,
                    detail="Un autre livre avec ce titre et cet ISBN existe déjà"
                )

        # Mise à jour des champs simples (excluant les entités)
        update_data = book_data.model_dump(exclude_unset=True, exclude={'authors', 'publisher', 'genres'})
        for field, value in update_data.items():
            setattr(book, field, value)

        # Mise à jour du timestamp
        book.updated_at = datetime.utcnow()

        # Gestion des auteurs si fourni (avec support des objets et IDs)
        if book_data.authors is not None:
            # Supprimer les anciennes relations
            book.authors.clear()
            # Ajouter les nouvelles relations avec traitement d'entités
            if book_data.authors:
                self._process_authors_for_book(book, book_data.authors)

        # Gestion de l'éditeur si fourni (avec support des objets et IDs)
        if book_data.publisher is not None:
            if book_data.publisher:
                publisher_id = self._process_publisher_for_book(book_data.publisher)
                book.publisher_id = publisher_id
            else:
                book.publisher_id = None

        # Gestion des genres si fourni (avec support des objets et IDs)
        if book_data.genres is not None:
            # Supprimer les anciennes relations
            book.genres.clear()
            # Ajouter les nouvelles relations avec traitement d'entités
            if book_data.genres:
                self._process_genres_for_book(book, book_data.genres)

        self.session.commit()
        self.session.refresh(book)
        
        return book

    def delete_book(self, book_id: int) -> None:
        """Supprime un livre (seulement si l'utilisateur en est propriétaire)"""
        # Utiliser le repository pour obtenir l'objet Book directement avec vérification de propriété
        book = self.book_repository.get_by_id(book_id, self.user_id)
        if not book:
            raise HTTPException(status_code=404, detail="Livre introuvable")
        
        # Les relations many-to-many seront supprimées automatiquement
        # grâce aux contraintes de la base de données
        self.session.delete(book)
        self.session.commit()

    def _enrich_book_read(self, book: Book) -> BookRead:
        """Helper pour enrichir un livre avec prêt actif et emprunt actif"""
        book_read = BookRead.model_validate(book)

        # Récupérer le prêt actif pour ce livre
        active_loan = self.loan_repository.get_active_loan_for_book(book.id, self.user_id)
        if active_loan:
            book_read.current_loan = CurrentLoanRead.model_validate(active_loan)

        # Récupérer l'emprunt actif pour ce livre
        active_borrow = self.borrowed_book_repository.get_active_borrow_for_book(book.id, self.user_id)
        if active_borrow:
            book_read.borrowed_book = CurrentBorrowRead.model_validate(active_borrow)

        # Vérifier si le livre a un historique d'emprunts (même retournés)
        all_borrows = self.borrowed_book_repository.get_by_book(book.id, self.user_id)
        book_read.has_borrow_history = len(all_borrows) > 0

        return book_read

    def search_books(self, params: BookSearchParams) -> List[BookRead]:
        """Recherche simple de livres pour l'utilisateur actuel"""
        self._validate_pagination(params.skip, params.limit)
        self._validate_filters(params.filters)
        books = self.book_repository.search_books(params, self.user_id)

        # Enrichir chaque livre avec les informations de prêt et emprunt actifs
        return [self._enrich_book_read(book) for book in books]

    def advanced_search_books(self, params: BookAdvancedSearchParams) -> List[BookRead]:
        """Recherche avancée de livres pour l'utilisateur actuel"""
        self._validate_pagination(params.skip, params.limit)
        self._validate_date_range(params.year_min, params.year_max)
        self._validate_page_range(params.page_min, params.page_max)

        books = self.book_repository.advanced_search_books(params, self.user_id)

        # Enrichir chaque livre avec les informations de prêt et emprunt actifs
        return [self._enrich_book_read(book) for book in books]

    def get_statistics(self) -> Dict[str, Any]:
        """Récupère les statistiques des livres de l'utilisateur actuel"""
        return self.book_repository.get_statistics(self.user_id)

    def get_books_by_author(self, author_id: int) -> List[BookRead]:
        """Récupère tous les livres d'un auteur"""
        # Vérification que l'auteur existe
        author = self.session.get(Author, author_id)
        if not author:
            raise HTTPException(status_code=404, detail="Auteur non trouvé")

        # Enrichir chaque livre avec les informations de prêt et emprunt actifs
        return [self._enrich_book_read(book) for book in author.books]

    def get_books_by_publisher(self, publisher_id: int) -> List[BookRead]:
        """Récupère tous les livres d'un éditeur"""
        publisher = self.session.get(Publisher, publisher_id)
        if not publisher:
            raise HTTPException(status_code=404, detail="Éditeur non trouvé")

        # Enrichir chaque livre avec les informations de prêt et emprunt actifs
        return [self._enrich_book_read(book) for book in publisher.books]

    def get_books_by_genre(self, genre_id: int) -> List[BookRead]:
        """Récupère tous les livres d'un genre"""
        genre = self.session.get(Genre, genre_id)
        if not genre:
            raise HTTPException(status_code=404, detail="Genre non trouvé")

        # Enrichir chaque livre avec les informations de prêt et emprunt actifs
        return [self._enrich_book_read(book) for book in genre.books]
    
    def bulk_create_books(self, books_data: List[BookCreate], skip_errors: bool = False, populate_covers: bool = False) -> Dict[str, Any]:
        """
        Crée plusieurs livres en une seule opération (Import CSV).
        
        Modes de fonctionnement :
        - skip_errors=False : Transaction atomique, si un livre échoue, tout est annulé
        - skip_errors=True : Import partiel, les livres valides sont créés malgré les erreurs
        
        Args:
            books_data: Liste des données de livres à créer
            skip_errors: Si True, continue malgré les erreurs
            
        Returns:
            Dict contenant :
            - success: nombre de livres créés
            - failed: nombre d'échecs
            - total: nombre total de livres
            - created: liste des livres créés (si skip_errors=True)
            - errors: détails des erreurs (si skip_errors=True)
        """
        logger = logging.getLogger("app.bulk")
        logger.info("Bulk service start: total=%d skip_errors=%s populate_covers=%s", len(books_data), skip_errors, populate_covers)

        # Optionnel: enrichir les URLs de couvertures à partir de l'ISBN
        if populate_covers:
            enrich_start = perf_counter()
            for bd in books_data:
                try:
                    if getattr(bd, "cover_url", None):
                        continue
                    isbn = getattr(bd, "isbn", None)
                    if not isbn:
                        continue
                    cover = self._find_cover_url_sync(isbn)
                    if cover:
                        bd.cover_url = cover
                except Exception:
                    # Ne pas bloquer l'import sur l'enrichissement de couverture
                    continue
            logger.info("Bulk cover enrichment finished in %d ms", int((perf_counter() - enrich_start) * 1000))

        if not skip_errors:
            # Mode transaction atomique
            created_books = []
            try:
                for book_data in books_data:
                    book = self.create_book(book_data)
                    created_books.append(book)
                
                return {
                    "success": len(created_books),
                    "failed": 0,
                    "total": len(books_data),
                    "created": created_books,
                    "errors": []
                }
                
            except Exception as e:
                # Rollback automatique via la session
                self.session.rollback()
                raise HTTPException(
                    status_code=400,
                    detail=f"Erreur lors de la création en lot : {str(e)}"
                )
        
        else:
            # Mode import partiel (pour CSV)
            created_books = []
            errors = []
            
            for idx, book_data in enumerate(books_data):
                try:
                    book = self.create_book(book_data)
                    created_books.append(book)
                except Exception as e:
                    # Rollback de ce livre uniquement
                    self.session.rollback()
                    
                    # Amélioration des messages d'erreur pour l'utilisateur
                    error_msg = str(e)
                    user_friendly_error = self._format_error_message(e, book_data)
                    
                    errors.append({
                        "line": idx + 1,
                        "title": book_data.title if hasattr(book_data, 'title') else "N/A",
                        "isbn": book_data.isbn if hasattr(book_data, 'isbn') else "N/A",
                        "error": user_friendly_error
                    })
            logger.info("Bulk service done: success=%d failed=%d total=%d", len(created_books), len(errors), len(books_data))
            
            return {
                "success": len(created_books),
                "failed": len(errors),
                "total": len(books_data),
                "created": created_books,
                "errors": errors
            }

    def _find_cover_url_sync(self, isbn: str) -> Optional[str]:
        """Tente de trouver une URL de couverture via Google Books puis OpenLibrary (synchrone, court timeout)."""
        # Google Books
        try:
            with httpx.Client(timeout=5.0) as client:
                resp = client.get(
                    "https://www.googleapis.com/books/v1/volumes",
                    params={"q": f"isbn:{isbn}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("items") or []
                    if items:
                        volume = items[0].get("volumeInfo") or {}
                        image_links = volume.get("imageLinks") or {}
                        thumb = image_links.get("thumbnail")
                        if thumb:
                            # Forcer HTTPS pour compatibilité mobile
                            if thumb.startswith('http://'):
                                thumb = thumb.replace('http://', 'https://', 1)
                            return thumb
        except httpx.HTTPError:
            pass

        # OpenLibrary
        try:
            with httpx.Client(timeout=5.0, follow_redirects=True) as client:
                resp = client.get(f"https://openlibrary.org/isbn/{isbn}.json")
                if resp.status_code == 200:
                    # Si le livre existe, utiliser le service de covers
                    return f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
        except httpx.HTTPError:
            pass

        return None
    
    async def scan_book(self, isbn: str) -> Dict[str, Any]:
        """Scanne un livre par son ISBN ou code-barre"""
        book_data = {}
       

        # Validation du code scanné (ISBN ou code-barre)
        if not isbn or not isbn.strip():
            raise HTTPException(
                status_code=400,
                detail="Le code scanné ne peut pas être vide"
            )
        
        # Recherche du livre dans la base via le repository (ISBN ou code-barre)
        # Filtré par utilisateur pour assurer l'isolation
        existing_book = self.book_repository.get_by_isbn_or_barcode(isbn, self.user_id)
        
        if existing_book:
            # Si le livre existe, retourner les données comme pour get_book_by_id
            from app.schemas.Book import BookRead
            book_dict = BookRead.from_orm(existing_book).model_dump()
            book_data['base'] = book_dict
            return book_data
        else:
            # Si le livre n'existe pas, chercher sur les APIs externes
            book_data['base'] = None
        
        # Récupérer les données des APIs externes dans tous les cas
        book_data['google_books'] = await fetch_google_books(isbn)
        book_data['open_library'] = await fetch_openlibrary(isbn)

        # Extraire le titre pour la recherche de similarités (vérifier que les APIs ont retourné des données)
        google_title = book_data['google_books'].get('title') if book_data['google_books'] else None
        openlibrary_title = book_data['open_library'].get('title') if book_data['open_library'] else None
        title = google_title or openlibrary_title

        if title:
            # Recherche d'un potentiel livre similaire dans la base (même titre, même auteur mais ISBN différent)
            similar_books = self.book_repository.search_title_match(title, isbn, self.user_id)
            # Conversion des livres similaires - import local pour éviter les conflits avec les tests mockés
            from app.schemas.Book import BookRead as BookReadSchema
            title_match_list = []
            for similar_book in similar_books:
                book_read = BookReadSchema.model_validate(similar_book)
                title_match_list.append(book_read.model_dump())
            book_data['title_match'] = title_match_list


        return book_data

    # Méthodes privées pour la validation et la logique interne

    def _validate_book_data(self, book_data: BookCreate) -> None:
        """Valide les données du livre"""
        if not book_data.title.strip():
            raise HTTPException(status_code=400, detail="Le titre est obligatoire")
        
        if book_data.isbn and len(book_data.isbn.replace('-', '')) not in [10, 13]:
            raise HTTPException(
                status_code=400, 
                detail="L'ISBN doit faire 10 ou 13 caractères (sans les tirets)"
            )
        
        if book_data.published_date:
            # La date de publication peut être dans différents formats :
            # - Année seule (ex: "2023")
            # - Date complète (ex: "2023-01-15")
            # - Texte descriptif (ex: "circa 1850", "fin XIXe siècle")
            # On accepte toute chaîne non vide, pas de validation stricte
            if not book_data.published_date.strip():
                raise HTTPException(
                    status_code=400,
                    detail="La date de publication ne peut pas être vide"
                )
        
        if book_data.page_count and book_data.page_count <= 0:
            raise HTTPException(status_code=400, detail="Le nombre de pages doit être positif")

    def _book_exists(self, title: str, isbn: Optional[str] = None, exclude_id: Optional[int] = None) -> bool:
        """Vérifie si un livre existe déjà avec le même titre et ISBN pour l'utilisateur actuel"""
        from sqlmodel import select
        
        stmt = select(Book).where(Book.title == title)
        
        # Filtrer par propriétaire pour éviter les conflits entre utilisateurs
        if self.user_id:
            stmt = stmt.where(Book.owner_id == self.user_id)
        
        if isbn:
            stmt = stmt.where(Book.isbn == isbn)
        
        if exclude_id:
            stmt = stmt.where(Book.id != exclude_id)
            
        existing_book = self.session.exec(stmt).first()
        return existing_book is not None

    def _process_authors_for_book(self, book: Book, authors_data) -> None:
        """
        Traite les auteurs (création si nécessaire) et les ajoute au livre.

        Gère intelligemment les différents formats d'entrée :
        - int : ID d'un auteur existant (récupération directe)
        - str : Nom d'auteur (création directe sans recherche préalable)
        - dict : Objet avec clé 'id' (utilisation de l'ID) ou 'name' (création directe)

        Args:
            book (Book): Le livre auquel ajouter les auteurs
            authors_data: Liste des données d'auteurs (mix d'IDs, noms, objets)

        Raises:
            HTTPException: Si un ID référencé n'existe pas ou si données invalides
        """
        from app.repositories.author_repository import AuthorRepository
        author_repo = AuthorRepository(self.session)
        logger = logging.getLogger("app.books")

        for author_item in authors_data:
            author = None

            # Si c'est un entier (ID), récupérer l'auteur existant
            if isinstance(author_item, int):
                author = self.session.get(Author, author_item)
                if not author:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Auteur avec l'ID {author_item} non trouvé"
                    )
                logger.info("✅ Auteur existant utilisé (ID): id=%s name='%s'", author.id, author.name)

            # Si c'est une chaîne (nom), créer directement
            elif isinstance(author_item, str):
                logger.info("🆕 Création nouvel auteur (str): name='%s'", author_item)
                author = Author(name=author_item, owner_id=self.user_id)
                author_repo.create(author)

            # Si c'est un objet (dict)
            elif isinstance(author_item, dict):
                # Si l'objet contient un ID, l'utiliser directement
                if 'id' in author_item and author_item['id']:
                    author = self.session.get(Author, author_item['id'])
                    if not author:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Auteur avec l'ID {author_item['id']} non trouvé"
                        )
                    logger.info("✅ Auteur existant utilisé (dict.id): id=%s name='%s'", author.id, author.name)
                # Si exists=true sans ID valide, c'est une erreur
                elif author_item.get('exists', False):
                    logger.error("❌ Entité marquée exists=true sans ID: %s", author_item)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Auteur marqué comme existant mais sans ID valide: {author_item.get('name', 'inconnu')}"
                    )
                # Sinon, créer directement avec le nom fourni (pas de recherche pour éviter les associations incorrectes)
                elif 'name' in author_item:
                    author_name = author_item['name']
                    logger.info("🆕 Création nouvel auteur (dict.name): name='%s'", author_name)
                    author = Author(name=author_name, owner_id=self.user_id)
                    author_repo.create(author)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Objet auteur invalide (doit contenir 'id' ou 'name'): {author_item}"
                    )

            if author:
                book.authors.append(author)

    def _process_genres_for_book(self, book: Book, genres_data) -> None:
        """
        Traite les genres (création si nécessaire) et les ajoute au livre.

        Gère intelligemment les différents formats d'entrée :
        - int : ID d'un genre existant (récupération directe)
        - str : Nom de genre (création directe sans recherche préalable)
        - dict : Objet avec clé 'id' (utilisation de l'ID) ou 'name' (création directe)

        Args:
            book (Book): Le livre auquel ajouter les genres
            genres_data: Liste des données de genres (mix d'IDs, noms, objets)

        Raises:
            HTTPException: Si un ID référencé n'existe pas ou si données invalides
        """
        from app.repositories.genre_repository import GenreRepository
        genre_repo = GenreRepository(self.session)
        logger = logging.getLogger("app.books")

        for genre_item in genres_data:
            genre = None

            # Si c'est un entier (ID), récupérer le genre existant
            if isinstance(genre_item, int):
                genre = self.session.get(Genre, genre_item)
                if not genre:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Genre avec l'ID {genre_item} non trouvé"
                    )
                logger.info("✅ Genre existant utilisé (ID): id=%s name='%s'", genre.id, genre.name)

            # Si c'est une chaîne (nom), créer directement
            elif isinstance(genre_item, str):
                logger.info("🆕 Création nouveau genre (str): name='%s'", genre_item)
                genre = Genre(name=genre_item, owner_id=self.user_id)
                genre_repo.create(genre)

            # Si c'est un objet (dict)
            elif isinstance(genre_item, dict):
                # Si l'objet contient un ID, l'utiliser directement
                if 'id' in genre_item and genre_item['id']:
                    genre = self.session.get(Genre, genre_item['id'])
                    if not genre:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Genre avec l'ID {genre_item['id']} non trouvé"
                        )
                    logger.info("✅ Genre existant utilisé (dict.id): id=%s name='%s'", genre.id, genre.name)
                # Si exists=true sans ID valide, c'est une erreur
                elif genre_item.get('exists', False):
                    logger.error("❌ Entité marquée exists=true sans ID: %s", genre_item)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Genre marqué comme existant mais sans ID valide: {genre_item.get('name', 'inconnu')}"
                    )
                # Sinon, créer directement avec le nom fourni (pas de recherche pour éviter les associations incorrectes)
                elif 'name' in genre_item:
                    genre_name = genre_item['name']
                    logger.info("🆕 Création nouveau genre (dict.name): name='%s'", genre_name)
                    genre = Genre(name=genre_name, owner_id=self.user_id)
                    genre_repo.create(genre)
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Objet genre invalide (doit contenir 'id' ou 'name'): {genre_item}"
                    )

            if genre:
                book.genres.append(genre)

    def _process_publisher_for_book(self, publisher_data) -> Optional[int]:
        """
        Traite l'éditeur (création si nécessaire) et retourne son ID.

        Gère intelligemment les différents formats d'entrée :
        - int : ID d'un éditeur existant (récupération directe)
        - str : Nom d'éditeur (création directe sans recherche préalable)
        - dict : Objet avec clé 'id' (utilisation de l'ID) ou 'name' (création directe)

        Args:
            publisher_data: Données de l'éditeur (ID, nom, ou objet)

        Returns:
            Optional[int]: ID de l'éditeur (existant ou nouvellement créé), ou None

        Raises:
            HTTPException: Si un ID référencé n'existe pas ou si données invalides
        """
        from app.repositories.publisher_repository import PublisherRepository
        publisher_repo = PublisherRepository(self.session)
        logger = logging.getLogger("app.books")

        publisher = None

        # Si c'est un entier (ID), vérifier qu'il existe
        if isinstance(publisher_data, int):
            publisher = self.session.get(Publisher, publisher_data)
            if not publisher:
                raise HTTPException(
                    status_code=400,
                    detail=f"Éditeur avec l'ID {publisher_data} non trouvé"
                )
            logger.info("✅ Éditeur existant utilisé (ID): id=%s name='%s'", publisher.id, publisher.name)
            return publisher.id

        # Si c'est une chaîne (nom), créer directement
        elif isinstance(publisher_data, str):
            logger.info("🆕 Création nouvel éditeur (str): name='%s'", publisher_data)
            publisher = Publisher(name=publisher_data, owner_id=self.user_id)
            publisher_repo.create(publisher)
            return publisher.id

        # Si c'est un objet (dict)
        elif isinstance(publisher_data, dict):
            # Si l'objet contient un ID, l'utiliser directement
            if 'id' in publisher_data and publisher_data['id']:
                publisher = self.session.get(Publisher, publisher_data['id'])
                if not publisher:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Éditeur avec l'ID {publisher_data['id']} non trouvé"
                    )
                logger.info("✅ Éditeur existant utilisé (dict.id): id=%s name='%s'", publisher.id, publisher.name)
                return publisher.id
            # Si exists=true sans ID valide, c'est une erreur
            elif publisher_data.get('exists', False):
                logger.error("❌ Entité marquée exists=true sans ID: %s", publisher_data)
                raise HTTPException(
                    status_code=400,
                    detail=f"Éditeur marqué comme existant mais sans ID valide: {publisher_data.get('name', 'inconnu')}"
                )
            # Sinon, créer directement avec le nom fourni (pas de recherche pour éviter les associations incorrectes)
            elif 'name' in publisher_data:
                publisher_name = publisher_data['name']
                logger.info("🆕 Création nouvel éditeur (dict.name): name='%s'", publisher_name)
                publisher = Publisher(name=publisher_name, owner_id=self.user_id)
                publisher_repo.create(publisher)
                return publisher.id
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Objet éditeur invalide (doit contenir 'id' ou 'name'): {publisher_data}"
                )

        return None

    def _format_error_message(self, error: Exception, book_data: BookCreate) -> str:
        """
        Formate les messages d'erreur pour qu'ils soient plus clairs pour l'utilisateur.
        
        Args:
            error: L'exception levée
            book_data: Les données du livre qui a causé l'erreur
            
        Returns:
            Un message d'erreur formaté et compréhensible
        """
        error_str = str(error)
        
        # Erreur de contrainte UNIQUE sur les auteurs
        if "UNIQUE constraint failed: authors.name" in error_str:
            # Extraire le nom de l'auteur du message d'erreur SQL
            match = re.search(r"\('([^']+)'\)", error_str)
            author_name = match.group(1) if match else "inconnu"
            return (f"⚠️ Conflit de doublon : L'auteur '{author_name}' existe déjà dans la base de données "
                   f"mais ne peut pas être associé (problème de casse ou caractères spéciaux). "
                   f"Vérifiez que le nom est exactement identique à celui dans la base.")
        
        # Erreur de contrainte UNIQUE sur les éditeurs
        if "UNIQUE constraint failed: publishers.name" in error_str:
            match = re.search(r"\('([^']+)'\)", error_str)
            publisher_name = match.group(1) if match else "inconnu"
            return (f"⚠️ Conflit de doublon : L'éditeur '{publisher_name}' existe déjà dans la base de données "
                   f"mais ne peut pas être associé (problème de casse ou caractères spéciaux). "
                   f"Vérifiez que le nom est exactement identique à celui dans la base.")
        
        # Erreur de contrainte UNIQUE sur les genres
        if "UNIQUE constraint failed: genres.name" in error_str:
            match = re.search(r"\('([^']+)'\)", error_str)
            genre_name = match.group(1) if match else "inconnu"
            return (f"⚠️ Conflit de doublon : Le genre '{genre_name}' existe déjà dans la base de données "
                   f"mais ne peut pas être associé (problème de casse ou caractères spéciaux). "
                   f"Vérifiez que le nom est exactement identique à celui dans la base.")
        
        # Erreur de validation d'ISBN
        if "ISBN" in error_str and ("10 ou 13" in error_str or "caractères" in error_str):
            isbn_value = book_data.isbn if hasattr(book_data, 'isbn') else "N/A"
            return f"❌ ISBN invalide : '{isbn_value}' - L'ISBN doit contenir exactement 10 ou 13 chiffres (sans tirets ni espaces)"
        
        # Erreur HTTPException
        if isinstance(error, HTTPException):
            return f"❌ {error.detail}"
        
        # Erreur de livre existant
        if "existe déjà" in error_str:
            return f"⚠️ Ce livre existe déjà dans votre bibliothèque"
        
        # Erreur générique mais formatée
        return f"❌ Erreur : {error_str}"

    # Anciennes fonctions conservées pour compatibilité ascendante
    def _add_authors_to_book(self, book: Book, author_ids: List[int]) -> None:
        """Ajoute des auteurs à un livre (version legacy - IDs seulement)"""
        for author_id in author_ids:
            author = self.session.get(Author, author_id)
            if not author:
                raise HTTPException(
                    status_code=400,
                    detail=f"Auteur avec l'ID {author_id} non trouvé"
                )
            book.authors.append(author)

    def _add_genres_to_book(self, book: Book, genre_ids: List[int]) -> None:
        """Ajoute des genres à un livre (version legacy - IDs seulement)"""
        for genre_id in genre_ids:
            genre = self.session.get(Genre, genre_id)
            if not genre:
                raise HTTPException(
                    status_code=400,
                    detail=f"Genre avec l'ID {genre_id} non trouvé"
                )
            book.genres.append(genre)

    def _validate_pagination(self, skip: int, limit: int) -> None:
        """Valide les paramètres de pagination"""
        if skip < 0:
            raise HTTPException(status_code=400, detail="skip ne peut pas être négatif")
        
        if limit <= 0 or limit > 1000:
            raise HTTPException(
                status_code=400,
                detail="limit doit être entre 1 et 1000"
            )

    def _validate_date_range(self, year_min: Optional[int], year_max: Optional[int]) -> None:
        """Valide la plage de dates"""
        if year_min and year_max and year_min > year_max:
            raise HTTPException(
                status_code=400,
                detail="L'année minimale ne peut pas être supérieure à l'année maximale"
            )

    def _validate_page_range(self, page_min: Optional[int], page_max: Optional[int]) -> None:
        """Valide la plage de pages"""
        if page_min and page_min <= 0:
            raise HTTPException(status_code=400, detail="Le nombre minimum de pages doit être positif")
        
        if page_max and page_max <= 0:
            raise HTTPException(status_code=400, detail="Le nombre maximum de pages doit être positif")
        
        if page_min and page_max and page_min > page_max:
            raise HTTPException(
                status_code=400,
                detail="Le nombre minimum de pages ne peut pas être supérieur au maximum"
            )

    def _validate_filters(self, filters: Optional[List[Filter]]) -> None:
        """
        Valide les filtres de recherche.

        Args:
            filters: Liste des filtres à valider

        Raises:
            HTTPException: Si un filtre est invalide
        """
        if not filters:
            return

        # Vérification des doublons
        filter_types_seen = set()
        for filter in filters:
            if filter.type in filter_types_seen:
                raise HTTPException(
                    status_code=400,
                    detail=f"Filtre en double pour le type {filter.type}"
                )
            filter_types_seen.add(filter.type)

        # Vérification que les entités existent
        for filter in filters:
            if filter.id <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"ID invalide ({filter.id}) pour le filtre de type {filter.type}"
                )

            try:
                if filter.type == FilterType.AUTHOR:
                    author = self.session.get(Author, filter.id)
                    if not author:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Auteur avec l'ID {filter.id} non trouvé"
                        )

                elif filter.type == FilterType.PUBLISHER:
                    publisher = self.session.get(Publisher, filter.id)
                    if not publisher:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Éditeur avec l'ID {filter.id} non trouvé"
                        )

                elif filter.type == FilterType.GENRE:
                    genre = self.session.get(Genre, filter.id)
                    if not genre:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Genre avec l'ID {filter.id} non trouvé"
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Type de filtre inconnu : {filter.type}"
                    )

            except ValueError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Erreur de validation pour le filtre {filter.type}: {str(e)}"
                )