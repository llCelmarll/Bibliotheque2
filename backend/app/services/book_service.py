from typing import List, Optional, Dict, Any

from sqlmodel import Session
from fastapi import HTTPException
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.repositories.book_repository import BookRepository
from app.schemas.Book import BookCreate, BookUpdate, BookRead, BookSearchParams, BookAdvancedSearchParams
from app.schemas.Other import Filter, FilterType
from app.clients.openlibrary import fetch_openlibrary
from app.clients.google_books import fetch_google_books
from datetime import datetime

class BookService:
    """Service pour la logique métier des livres"""

    def __init__(self, session: Session):
        self.session = session
        self.book_repository = BookRepository(session)

    def create_book(self, book_data: BookCreate) -> Book:
        """Crée un nouveau livre avec ses relations"""
        # Validation des données
        self._validate_book_data(book_data)
        
        # Vérification de l'unicité du titre + ISBN
        if self._book_exists(book_data.title, book_data.isbn):
            raise HTTPException(
                status_code=400, 
                detail="Un livre avec ce titre et cet ISBN existe déjà"
            )

        # Création du livre
        book = Book(
            title=book_data.title,
            isbn=book_data.isbn,
            published_date=book_data.published_date,
            page_count=book_data.page_count,
            barcode=book_data.barcode,
            cover_url=book_data.cover_url,
            publisher_id=book_data.publisher
        )

        # Ajout à la session
        self.session.add(book)
        self.session.flush()  # Pour obtenir l'ID du livre

        # Gestion des relations many-to-many
        if book_data.authors:
            self._add_authors_to_book(book, book_data.authors)
        
        if book_data.genre:
            self._add_genres_to_book(book, book_data.genre)

        # Commit final
        self.session.commit()
        self.session.refresh(book)
        
        return book

    async def get_book_by_id(self, book_id: int) -> Dict[str, Any]:
        """Récupère un livre par son ID"""
        book_data = {}

        base_book = self.book_repository.get_by_id(book_id)
        #print("Livre renvoyé par le repository" , base_book)
        if not base_book:
           raise HTTPException(status_code=404, detail="Livre introuvable")

        from app.schemas.Book import BookRead
        book_dict = BookRead.from_orm(base_book).model_dump()

        book_data['base'] = book_dict
        book_data['google_books'] = await fetch_google_books(base_book.isbn)
        book_data['open_library'] = await fetch_openlibrary(base_book.isbn)
        return book_data

    def update_book(self, book_id: int, book_data: BookUpdate) -> Book:
        """Met à jour un livre"""
        book = self.get_book_by_id(book_id)
        
        # Validation des nouvelles données
        if book_data.title or book_data.isbn:
            new_title = book_data.title or book.title
            new_isbn = book_data.isbn or book.isbn
            
            if self._book_exists(new_title, new_isbn, exclude_id=book_id):
                raise HTTPException(
                    status_code=400,
                    detail="Un autre livre avec ce titre et cet ISBN existe déjà"
                )

        # Mise à jour des champs simples
        update_data = book_data.model_dump(exclude_unset=True, exclude={'authors'})
        for field, value in update_data.items():
            setattr(book, field, value)

        # Mise à jour du timestamp
        book.updated_at = datetime.utcnow()

        # Gestion des auteurs si fourni
        if book_data.authors is not None:
            # Supprimer les anciennes relations
            book.authors.clear()
            # Ajouter les nouvelles relations
            if book_data.authors:
                self._add_authors_to_book(book, book_data.authors)

        self.session.commit()
        self.session.refresh(book)
        
        return book

    def delete_book(self, book_id: int) -> None:
        """Supprime un livre"""
        book = self.get_book_by_id(book_id)
        
        # Les relations many-to-many seront supprimées automatiquement
        # grâce aux contraintes de la base de données
        self.session.delete(book)
        self.session.commit()

    def search_books(self, params: BookSearchParams) -> List[Book]:
        """Recherche simple de livres"""
        self._validate_pagination(params.skip, params.limit)
        self._validate_filters(params.filters)
        return self.book_repository.search_books(params)

    def advanced_search_books(self, params: BookAdvancedSearchParams) -> List[Book]:
        """Recherche avancée de livres"""
        self._validate_pagination(params.skip, params.limit)
        self._validate_date_range(params.year_min, params.year_max)
        self._validate_page_range(params.page_min, params.page_max)
        
        return self.book_repository.advanced_search_books(params)

    def get_statistics(self) -> Dict[str, Any]:
        """Récupère les statistiques des livres"""
        return self.book_repository.get_statistics()

    def get_books_by_author(self, author_id: int) -> List[Book]:
        """Récupère tous les livres d'un auteur"""
        # Vérification que l'auteur existe
        author = self.session.get(Author, author_id)
        if not author:
            raise HTTPException(status_code=404, detail="Auteur non trouvé")
        
        return author.books

    def get_books_by_publisher(self, publisher_id: int) -> List[Book]:
        """Récupère tous les livres d'un éditeur"""
        publisher = self.session.get(Publisher, publisher_id)
        if not publisher:
            raise HTTPException(status_code=404, detail="Éditeur non trouvé")

        return publisher.books

    def get_books_by_genre(self, genre_id: int) -> List[Book]:
        """Récupère tous les livres d'un genre"""
        genre = self.session.get(Genre, genre_id)
        if not genre:
            raise HTTPException(status_code=404, detail="Genre non trouvé")
        
        return genre.books
    
    async def scan_book(self, isbn: str) -> Dict[str, Any]:
        """Scanne un livre par son ISBN"""
        book_data = {}
       

        # Validation de l'ISBN
        if not isbn or len(isbn.replace('-', '')) not in [10, 13]:
            raise HTTPException(
                status_code=400,
                detail="L'ISBN doit faire 10 ou 13 caractères (sans les tirets)"
            )
        
        # Recherche du livre dans la base via le repository
        existing_book = self.book_repository.get_by_isbn(isbn)
        
        if existing_book:
            # Si le livre existe, retourner les données comme pour get_book_by_id
            from app.schemas.Book import BookRead
            book_dict = BookRead.from_orm(existing_book).model_dump()
            book_data['base'] = book_dict
            book_data['exists'] = True
        else:
            # Si le livre n'existe pas, chercher sur les APIs externes
            book_data['exists'] = False
            book_data['base'] = None
        
        # Récupérer les données des APIs externes dans tous les cas
        book_data['google_books'] = await fetch_google_books(isbn)
        book_data['open_library'] = await fetch_openlibrary(isbn)
        
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
        
        if book_data.published_date and (book_data.published_date < 0 or book_data.published_date > datetime.now().year):
            raise HTTPException(
                status_code=400,
                detail="L'année de publication n'est pas valide"
            )
        
        if book_data.page_count and book_data.page_count <= 0:
            raise HTTPException(status_code=400, detail="Le nombre de pages doit être positif")

    def _book_exists(self, title: str, isbn: Optional[str] = None, exclude_id: Optional[int] = None) -> bool:
        """Vérifie si un livre existe déjà avec le même titre et ISBN"""
        from sqlmodel import select
        
        stmt = select(Book).where(Book.title == title)
        
        if isbn:
            stmt = stmt.where(Book.isbn == isbn)
        
        if exclude_id:
            stmt = stmt.where(Book.id != exclude_id)
            
        existing_book = self.session.exec(stmt).first()
        return existing_book is not None

    def _add_authors_to_book(self, book: Book, author_ids: List[int]) -> None:
        """Ajoute des auteurs à un livre"""
        for author_id in author_ids:
            author = self.session.get(Author, author_id)
            if not author:
                raise HTTPException(
                    status_code=400,
                    detail=f"Auteur avec l'ID {author_id} non trouvé"
                )
            book.authors.append(author)

    def _add_genres_to_book(self, book: Book, genre_ids: List[int]) -> None:
        """Ajoute des genres à un livre"""
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