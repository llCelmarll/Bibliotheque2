from typing import Optional, List, ForwardRef, Dict, Any, Union
from pydantic import BaseModel
from sqlmodel import SQLModel
from enum import Enum
from datetime import datetime
from app.schemas.Author import AuthorRead
from app.schemas.Publisher import PublisherRead
from app.schemas.Genre import GenreRead
from app.schemas.Other import SortBy, SortOrder, Filter
from app.schemas.Borrower import BorrowerRead
from app.models.Loan import LoanStatus
from app.models.BorrowedBook import BorrowStatus


# Schéma simplifié pour le prêt actif (sans le champ book pour éviter la circularité)
class CurrentLoanRead(SQLModel):
    """Schéma simplifié pour afficher le prêt actif d'un livre"""
    id: int
    borrower_id: int
    borrower: Optional[BorrowerRead] = None
    loan_date: datetime
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    status: LoanStatus
    notes: Optional[str] = None


# Schéma simplifié pour l'emprunt actif
class CurrentBorrowRead(SQLModel):
    """Schéma simplifié pour afficher l'emprunt actif d'un livre"""
    id: int
    borrowed_from: str
    borrowed_date: datetime
    expected_return_date: Optional[datetime] = None
    status: BorrowStatus
    notes: Optional[str] = None


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
    current_loan: Optional[CurrentLoanRead] = None  # Prêt actif si le livre est prêté
    borrowed_book: Optional[CurrentBorrowRead] = None  # Emprunt actif si le livre est emprunté
    has_borrow_history: bool = False  # True si le livre a un historique d'emprunts (même retournés)

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_relationships(cls, book):
        """Créer un BookRead à partir d'un Book ORM avec gestion des emprunts actifs"""
        from app.models.BorrowedBook import BorrowStatus

        # Trouver l'emprunt actif s'il existe
        active_borrow = None
        if hasattr(book, 'borrows') and book.borrows:
            active_borrow = next(
                (b for b in book.borrows if b.status in [BorrowStatus.ACTIVE, BorrowStatus.OVERDUE]),
                None
            )

        # Créer le BookRead avec les données de base
        data = {
            "id": book.id,
            "title": book.title,
            "isbn": book.isbn,
            "published_date": book.published_date,
            "page_count": book.page_count,
            "barcode": book.barcode,
            "cover_url": book.cover_url,
            "created_at": book.created_at,
            "updated_at": book.updated_at,
            "authors": [AuthorRead.model_validate(a) for a in getattr(book, 'authors', [])],
            "publisher": PublisherRead.model_validate(book.publisher) if book.publisher else None,
            "genres": [GenreRead.model_validate(g) for g in getattr(book, 'genres', [])],
            "current_loan": None,  # TODO: gérer les prêts actifs
            "borrowed_book": CurrentBorrowRead.model_validate(active_borrow) if active_borrow else None,
        }

        # Gérer le prêt actif si disponible
        if hasattr(book, 'loans') and book.loans:
            from app.schemas.BorrowStatus import BorrowStatus as LoanStatus
            active_loan = next(
                (l for l in book.loans if hasattr(l, 'status') and l.status in ['ACTIVE', 'OVERDUE']),
                None
            )
            if active_loan:
                data["current_loan"] = CurrentLoanRead.model_validate(active_loan)

        return cls(**data)

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

    Champs d'emprunt optionnels (pour marquer le livre comme emprunté lors de la création) :
    - is_borrowed: Si True, crée automatiquement un enregistrement d'emprunt
    - borrowed_from: Source de l'emprunt (requis si is_borrowed=True)
    - borrowed_date: Date d'emprunt (défaut: maintenant)
    - expected_return_date: Date de retour prévue
    - borrow_notes: Notes sur l'emprunt
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

    # Champs optionnels pour marquer comme emprunté
    is_borrowed: Optional[bool] = False
    borrowed_from: Optional[str] = None
    borrowed_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    borrow_notes: Optional[str] = None

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
