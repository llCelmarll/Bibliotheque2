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

        # Traitement de l'éditeur
        publisher_id = None
        if book_data.publisher:
            publisher_id = self._process_publisher_for_book(book_data.publisher)

        # Création du livre
        book = Book(
            title=book_data.title,
            isbn=book_data.isbn,
            published_date=book_data.published_date,
            page_count=book_data.page_count,
            barcode=book_data.barcode,
            cover_url=book_data.cover_url,
            publisher_id=publisher_id
        )

        # Ajout à la session
        self.session.add(book)
        self.session.flush()  # Pour obtenir l'ID du livre

        # Gestion des relations many-to-many
        if book_data.authors:
            self._process_authors_for_book(book, book_data.authors)
        
        if book_data.genres:
            self._process_genres_for_book(book, book_data.genres)

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
        # Utiliser le repository pour obtenir l'objet Book directement
        book = self.book_repository.get_by_id(book_id)
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
                processed_authors = self._process_authors_for_book(book_data.authors)
                book.authors.extend(processed_authors)

        # Gestion de l'éditeur si fourni (avec support des objets et IDs)
        if book_data.publisher is not None:
            if book_data.publisher:
                processed_publisher = self._process_publisher_for_book(book_data.publisher)
                book.publisher = processed_publisher
            else:
                book.publisher = None

        # Gestion des genres si fourni (avec support des objets et IDs)
        if book_data.genres is not None:
            # Supprimer les anciennes relations
            book.genres.clear()
            # Ajouter les nouvelles relations avec traitement d'entités
            if book_data.genres:
                processed_genres = self._process_genres_for_book(book_data.genres)
                book.genres.extend(processed_genres)

        self.session.commit()
        self.session.refresh(book)
        
        return book

    def delete_book(self, book_id: int) -> None:
        """Supprime un livre"""
        # Utiliser le repository pour obtenir l'objet Book directement
        book = self.book_repository.get_by_id(book_id)
        if not book:
            raise HTTPException(status_code=404, detail="Livre introuvable")
        
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
        """Scanne un livre par son ISBN ou code-barre"""
        book_data = {}
       

        # Validation du code scanné (ISBN ou code-barre)
        if not isbn or not isbn.strip():
            raise HTTPException(
                status_code=400,
                detail="Le code scanné ne peut pas être vide"
            )
        
        # Recherche du livre dans la base via le repository (ISBN ou code-barre)
        existing_book = self.book_repository.get_by_isbn_or_barcode(isbn)
        
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
        """Vérifie si un livre existe déjà avec le même titre et ISBN"""
        from sqlmodel import select
        
        stmt = select(Book).where(Book.title == title)
        
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
        - str : Nom d'auteur (recherche puis création si nécessaire)
        - dict : Objet avec clé 'name' (recherche puis création si nécessaire)
        
        Args:
            book (Book): Le livre auquel ajouter les auteurs
            authors_data: Liste des données d'auteurs (mix d'IDs, noms, objets)
            
        Raises:
            HTTPException: Si un ID référencé n'existe pas
        """
        from app.repositories.author_repository import AuthorRepository
        author_repo = AuthorRepository(self.session)
        
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
            
            # Si c'est une chaîne (nom), chercher ou créer
            elif isinstance(author_item, str):
                author = author_repo.get_by_name(author_item)
                if not author:
                    print(f"🆕 Création nouvel auteur: '{author_item}'")
                    author = Author(name=author_item)
                    author_repo.create(author)
                else:
                    print(f"✅ Auteur existant trouvé: '{author.name}'")
            
            # Si c'est un objet (dict), utiliser le nom
            elif isinstance(author_item, dict) and 'name' in author_item:
                author_name = author_item['name']
                author = author_repo.get_by_name(author_name)
                if not author:
                    print(f"🆕 Création nouvel auteur: '{author_name}'")
                    author = Author(name=author_name)
                    author_repo.create(author)
                else:
                    print(f"✅ Auteur existant trouvé: '{author.name}'")
            
            if author:
                book.authors.append(author)

    def _process_genres_for_book(self, book: Book, genres_data) -> None:
        """Traite les genres (création si nécessaire) et les ajoute au livre"""
        from app.repositories.genre_repository import GenreRepository
        genre_repo = GenreRepository(self.session)
        
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
            
            # Si c'est une chaîne (nom), chercher ou créer
            elif isinstance(genre_item, str):
                genre = genre_repo.get_by_name(genre_item)
                if not genre:
                    print(f"🆕 Création nouveau genre: '{genre_item}'")
                    genre = Genre(name=genre_item)
                    genre_repo.create(genre)
                else:
                    print(f"✅ Genre existant trouvé: '{genre.name}'")
            
            # Si c'est un objet (dict), utiliser le nom
            elif isinstance(genre_item, dict) and 'name' in genre_item:
                genre_name = genre_item['name']
                genre = genre_repo.get_by_name(genre_name)
                if not genre:
                    print(f"🆕 Création nouveau genre: '{genre_name}'")
                    genre = Genre(name=genre_name)
                    genre_repo.create(genre)
                else:
                    print(f"✅ Genre existant trouvé: '{genre.name}'")
            
            if genre:
                book.genres.append(genre)

    def _process_publisher_for_book(self, publisher_data) -> Optional[int]:
        """Traite l'éditeur (création si nécessaire) et retourne son ID"""
        from app.repositories.publisher_repository import PublisherRepository
        publisher_repo = PublisherRepository(self.session)
        
        publisher = None
        
        # Si c'est un entier (ID), vérifier qu'il existe
        if isinstance(publisher_data, int):
            publisher = self.session.get(Publisher, publisher_data)
            if not publisher:
                raise HTTPException(
                    status_code=400,
                    detail=f"Éditeur avec l'ID {publisher_data} non trouvé"
                )
            return publisher.id
        
        # Si c'est une chaîne (nom), chercher ou créer
        elif isinstance(publisher_data, str):
            publisher = publisher_repo.get_by_name(publisher_data)
            if not publisher:
                print(f"🆕 Création nouvel éditeur: '{publisher_data}'")
                publisher = Publisher(name=publisher_data)
                publisher_repo.create(publisher)
            else:
                print(f"✅ Éditeur existant trouvé: '{publisher.name}'")
            return publisher.id
        
        # Si c'est un objet (dict), utiliser le nom
        elif isinstance(publisher_data, dict) and 'name' in publisher_data:
            publisher_name = publisher_data['name']
            publisher = publisher_repo.get_by_name(publisher_name)
            if not publisher:
                print(f"🆕 Création nouvel éditeur: '{publisher_name}'")
                publisher = Publisher(name=publisher_name)
                publisher_repo.create(publisher)
            else:
                print(f"✅ Éditeur existant trouvé: '{publisher.name}'")
            return publisher.id
        
        return None

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