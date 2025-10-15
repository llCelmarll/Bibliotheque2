from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlmodel import Session
from app.db import get_session
from app.services.book_service import BookService
from app.schemas.Book import (
    BookRead, 
    BookCreate, 
    BookUpdate, 
    BookSearchParams, 
    BookAdvancedSearchParams,
    SortBy,
    SortOrder
)
from app.schemas.Other import Filter

router = APIRouter(prefix="/books", tags=["books"])

def get_book_service(session: Session = Depends(get_session)) -> BookService:
    """Dependency injection pour le service des livres"""
    return BookService(session)

# ================================
# SEARCH ENDPOINTS
# ================================

@router.post("/search/simple", response_model=List[BookRead])
def search_books(
    q: Optional[str] = Query(None, description="Terme de recherche"),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre max d'éléments à retourner"),
    sort_by: SortBy = Query(SortBy.title, description="Champ de tri"),
    sort_order: SortOrder = Query(SortOrder.asc, description="Ordre de tri"),
    filters: Optional[List[Filter]] = Body(default=None, description="Filtres de recherche"),
    service: BookService = Depends(get_book_service)
):
    """
Recherche simple dans tous les champs des livres.

Recherche dans : titre, ISBN, nom de l'auteur, nom de l'éditeur, nom du genre.

Paramètres de requête :
    - q (str, optionnel) : Terme de recherche (min. 1 caractère)
    - skip (int) : Nombre d'éléments à ignorer (défaut: 0)
    - limit (int) : Nombre max d'éléments à retourner (défaut: 100, max: 1000)
    - sort_by (SortBy) : Champ de tri (title, published_date, page_count, isbn, etc.)
    - sort_order (SortOrder) : Ordre de tri (asc ou desc)

Corps de la requête :
    - filters (List[Filter], optionnel) : Liste des filtres à appliquer
      Chaque filtre contient :
      - type : "AUTHOR", "PUBLISHER" ou "GENRE"
      - id : ID de l'entité correspondante

Retours :
    - 200 : Liste des livres correspondants aux critères
    - 400 : Paramètres invalides
    - 422 : Corps de la requête invalide

Notes :
    - La recherche est insensible à la casse
    - Les filtres sont appliqués en AND (tous les critères doivent être satisfaits)
    - Les résultats sont triés après l'application des filtres
    - La pagination est appliquée sur les résultats filtrés
"""

    params = BookSearchParams(
        search=q,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        filters=filters
    )
    print("Requete reçue : " + str(params))

    return service.search_books(params)

@router.get("/search/advanced", response_model=List[BookRead])
def advanced_search_books(
    title: str = Query(None, description="Recherche dans le titre"),
    author: str = Query(None, description="Recherche dans le nom de l'auteur"),
    publisher: str = Query(None, description="Recherche dans le nom de l'éditeur"),
    genre: str = Query(None, description="Recherche dans le nom du genre"),
    isbn: str = Query(None, description="Recherche dans l'ISBN"),
    year_min: int = Query(None, ge=0, description="Année de publication minimale"),
    year_max: int = Query(None, ge=0, description="Année de publication maximale"),
    page_min: int = Query(None, ge=1, description="Nombre de pages minimal"),
    page_max: int = Query(None, ge=1, description="Nombre de pages maximal"),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre max d'éléments à retourner"),
    sort_by: SortBy = Query(SortBy.title, description="Champ de tri"),
    sort_order: SortOrder = Query(SortOrder.asc, description="Ordre de tri"),
    service: BookService = Depends(get_book_service)
):
    """
    Recherche avancée avec filtres spécifiques.
    
    Permet de combiner plusieurs critères de recherche.
    Tous les paramètres sont optionnels.
    """
    params = BookAdvancedSearchParams(
        title=title,
        author=author,
        publisher=publisher,
        genre=genre,
        isbn=isbn,
        year_min=year_min,
        year_max=year_max,
        page_min=page_min,
        page_max=page_max,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return service.advanced_search_books(params)

@router.get("/scan/{isbn}", response_model=Dict[str, Any])
async def scan_book(
        isbn: str,
        service: BookService = Depends(get_book_service)
):
    """
    Scanne un livre par son ISBN.

    - Si le livre existe dans la base, retourne ses données + les données des APIs externes
    - Si le livre n'existe pas, retourne uniquement les données des APIs externes

    Retourne :
    - **exists**: booléen indiquant si le livre existe dans la base
    - **base**: données du livre de la base (si exists=True)
    - **google_books**: données de l'API Google Books
    - **open_library**: données de l'API OpenLibrary
    """
    return await service.scan_book(isbn)

# ================================
# STATISTICS ENDPOINT
# ================================

@router.get("/statistics", response_model=Dict[str, Any])
def get_books_statistics(
    service: BookService = Depends(get_book_service)
):
    """
    Récupère les statistiques des livres.
    
    Retourne :
    - **total_books**: Nombre total de livres
    - **average_pages**: Nombre moyen de pages
    - **oldest_publication_year**: Année de publication la plus ancienne
    - **newest_publication_year**: Année de publication la plus récente
    """
    return service.get_statistics()

# ================================
# RELATED ENTITIES ENDPOINTS
# ================================

@router.get("/by-author/{author_id}", response_model=List[BookRead])
def get_books_by_author(
    author_id: int,
    service: BookService = Depends(get_book_service)
):
    """
    Récupère tous les livres d'un auteur spécifique.
    """
    return service.get_books_by_author(author_id)

@router.get("/by-publisher/{publisher_id}", response_model=List[BookRead])
def get_books_by_publisher(
    publisher_id: int,
    service: BookService = Depends(get_book_service)
):
    """
    Récupère tous les livres d'un éditeur spécifique.
    """
    return service.get_books_by_publisher(publisher_id)

@router.get("/by-genre/{genre_id}", response_model=List[BookRead])
def get_books_by_genre(
    genre_id: int,
    service: BookService = Depends(get_book_service)
):
    """
    Récupère tous les livres d'un genre spécifique.
    """
    return service.get_books_by_genre(genre_id)

# ================================
# BULK OPERATIONS (Bonus)
# ================================

@router.post("/bulk", response_model=List[BookRead])
def create_multiple_books(
    books_data: List[BookCreate],
    service: BookService = Depends(get_book_service)
):
    """
    Crée plusieurs livres en une seule requête.
    
    Attention : si un livre échoue, toute l'opération est annulée (transaction).
    """
    created_books = []
    
    try:
        for book_data in books_data:
            book = service.create_book(book_data)
            created_books.append(book)
        
        return created_books
        
    except Exception as e:
        # En cas d'erreur, la transaction sera rollback automatiquement
        raise HTTPException(
            status_code=400,
            detail=f"Erreur lors de la création en lot : {str(e)}"
        )

# ================================
# HEALTH CHECK
# ================================

@router.get("/health")
def books_health_check():
    """
    Point de contrôle de santé pour l'API des livres.
    """
    return {
        "status": "healthy",
        "service": "books",
        "version": "1.0.0"
    }


# ================================
# LISTING & PAGINATION
# ================================

@router.get("/", response_model=List[BookRead])
def list_books(
        skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
        limit: int = Query(100, ge=1, le=1000, description="Nombre max d'éléments à retourner"),
        sort_by: SortBy = Query(SortBy.title, description="Champ de tri"),
        sort_order: SortOrder = Query(SortOrder.asc, description="Ordre de tri"),
        service: BookService = Depends(get_book_service)
):
    """
    Liste tous les livres avec pagination et tri.

    - **skip**: Nombre d'éléments à ignorer (défaut: 0)
    - **limit**: Nombre maximum d'éléments à retourner (défaut: 100, max: 1000)
    - **sort_by**: Champ de tri (title, published_date, page_count, isbn, created_at, updated_at)
    - **sort_order**: Ordre de tri (asc ou desc)
    """
    params = BookSearchParams(
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return service.search_books(params)


# ================================
# CRUD ENDPOINTS
# ================================

@router.get("/{book_id}" , response_model=Dict[str, Any])
async def get_book(
        book_id: int,
        service: BookService = Depends(get_book_service)
):
    """
    Récupère un livre par son ID.
    """
    return await service.get_book_by_id(book_id)


@router.put("/{book_id}", response_model=BookRead)
def update_book(
        book_id: int,
        book_data: BookUpdate,
        service: BookService = Depends(get_book_service)
):
    """
    Met à jour un livre existant.

    Tous les champs sont optionnels. Seuls les champs fournis seront mis à jour.
    """
    return service.update_book(book_id, book_data)


@router.delete("/{book_id}", status_code=204)
def delete_book(
        book_id: int,
        service: BookService = Depends(get_book_service)
):
    """
    Supprime un livre.
    """
    service.delete_book(book_id)


@router.post("", response_model=BookRead, status_code=201)
def create_book(
        book_data: BookCreate,
        service: BookService = Depends(get_book_service)
):
    """
    Crée un nouveau livre.

    - **title**: Titre du livre (obligatoire)
    - **isbn**: Code ISBN (optionnel, 10 ou 13 caractères)
    - **published_date**: Année de publication (optionnel)
    - **page_count**: Nombre de pages (optionnel)
    - **barcode**: Code-barres (optionnel)
    - **cover_url**: URL de la couverture (optionnel)
    - **authors**: Liste des IDs des auteurs (optionnel)
    - **publisher**: ID de l'éditeur (optionnel)
    - **genre**: Liste des IDs des genres (optionnel)
    """
    return service.create_book(book_data)
