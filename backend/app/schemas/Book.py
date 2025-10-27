from typing import Optional, List, ForwardRef, Dict, Any, Union
from pydantic import BaseModel
from sqlmodel import SQLModel
from enum import Enum
from datetime import datetime
from app.schemas.Author import AuthorRead
from app.schemas.Publisher import PublisherRead
from app.schemas.Genre import GenreRead
from app.schemas.Other import SortBy, SortOrder, Filter


# Schema de lecture
class BookRead(SQLModel):
    id: int
    title: str
    isbn: Optional[str] = None
    published_date: Optional[str] = None
    page_count: Optional[int] = None
    barcode: Optional[str] = None
    cover_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    authors: List[AuthorRead] = []
    publisher: Optional[PublisherRead] = None
    genres: List[GenreRead] = []

# Schema de création
class BookCreate(SQLModel):
    """
    Schéma pour la création d'un livre.
    
    Les champs authors, publisher et genres acceptent plusieurs formats :
    - int : ID d'une entité existante
    - str : Nom d'une entité (sera créée si elle n'existe pas)  
    - dict : Objet avec 'name' et optionnellement 'id' et 'exists'
           (format utilisé par le frontend avec EntitySelectors)
    
    Le service _process_*_for_book() gère automatiquement :
    - La réutilisation des entités existantes (par ID)
    - La création des nouvelles entités (par nom/objet)
    - La validation et la déduplication
    
    Exemples :
    - authors: [1, "Nouvel Auteur", {"name": "Victor Hugo", "id": 5, "exists": true}]
    - publisher: {"name": "Gallimard", "id": 12, "exists": true}  
    - genres: ["Science-Fiction", {"name": "Roman", "id": 3, "exists": true}]
    """
    title: str
    isbn: Optional[str] = None
    published_date: Optional[str] = None
    page_count: Optional[int] = None
    barcode: Optional[str] = None
    cover_url: Optional[str] = None
    authors: List[int | str | Dict[str, Any]] = []
    publisher: Optional[int | str | Dict[str, Any]] = None
    genres: List[int | str | Dict[str, Any]] = []

# Schema de mise à jour
class BookUpdate(SQLModel):
    """
    Schéma pour la modification d'un livre.
    
    Supporte la même flexibilité que BookCreate :
    - Entités par ID (int) pour réutiliser des entités existantes
    - Entités par objet (Dict) pour créer de nouvelles entités
    - Format mixte supporté
    
    Exemples :
        # Avec IDs existants
        {"authors": [1, 2], "publisher": 3}
        
        # Avec nouveaux objets  
        {"authors": [{"name": "Nouvel Auteur"}], "publisher": {"name": "Nouvel Editeur"}}
        
        # Format mixte
        {"authors": [1, {"name": "Nouvel Auteur"}], "publisher": {"name": "Editeur"}}
    """
    title: Optional[str] = None
    isbn: Optional[str] = None
    published_date: Optional[str] = None
    page_count: Optional[int] = None
    barcode: Optional[str] = None
    cover_url: Optional[str] = None
    authors: Optional[List[Union[int, Dict[str, Any]]]] = None
    publisher: Optional[Union[int, Dict[str, Any]]] = None
    genres: Optional[List[Union[int, Dict[str, Any]]]] = None

#Schema de recherche

class BookSearchParams(BaseModel):
    search: Optional[str] = None
    sort_by: SortBy = SortBy.title
    sort_order: SortOrder = SortOrder.asc
    filters: Optional[List[Filter]] = None
    skip: int = 0
    limit: int = 100

class BookAdvancedSearchParams(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    genre: Optional[str] = None
    isbn: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    page_min: Optional[int] = None
    page_max: Optional[int] = None
    sort_by: SortBy = SortBy.title
    sort_order: SortOrder = SortOrder.asc
    skip: int = 0
    limit: int = 100
