from typing import Optional, Dict, Any
from sqlmodel import SQLModel
from datetime import datetime
from app.models.Loan import LoanStatus
from app.schemas.Book import BookRead
from app.schemas.Borrower import BorrowerRead


class LoanRead(SQLModel):
    """Schéma de lecture pour un prêt"""
    id: int
    book_id: int
    book: Optional[BookRead] = None
    borrower_id: int
    borrower: Optional[BorrowerRead] = None
    loan_date: datetime
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    status: LoanStatus
    notes: Optional[str] = None


class LoanCreate(SQLModel):
    """
    Schéma de création pour un prêt.

    Le champ borrower accepte plusieurs formats :
    - int : ID d'un emprunteur existant
    - str : Nom d'un emprunteur (sera créé s'il n'existe pas)
    - dict : Objet avec 'name' et optionnellement 'id', 'email', 'phone', 'notes'

    Le service gérera automatiquement :
    - La réutilisation des emprunteurs existants (par ID ou nom)
    - La création de nouveaux emprunteurs

    Exemples :
    - borrower: 1  # ID existant
    - borrower: "Marie Dupont"  # Nouveau nom
    - borrower: {"name": "Jean Martin", "email": "jean@example.com", "phone": "0123456789"}
    """
    book_id: int
    borrower: int | str | Dict[str, Any]
    loan_date: Optional[datetime] = None  # Si None, utilise datetime.utcnow()
    due_date: Optional[datetime] = None
    notes: Optional[str] = None


class LoanUpdate(SQLModel):
    """Schéma de mise à jour pour un prêt"""
    due_date: Optional[datetime] = None
    return_date: Optional[datetime] = None
    status: Optional[LoanStatus] = None
    notes: Optional[str] = None


class LoanReturn(SQLModel):
    """Schéma simplifié pour marquer un livre comme retourné"""
    return_date: Optional[datetime] = None  # Si None, utilise datetime.utcnow()
