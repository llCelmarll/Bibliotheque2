from typing import Optional
from sqlmodel import SQLModel
from datetime import datetime


class BorrowerRead(SQLModel):
    """Schéma de lecture pour un emprunteur"""
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    active_loans_count: int = 0


class BorrowerCreate(SQLModel):
    """Schéma de création pour un emprunteur"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class BorrowerUpdate(SQLModel):
    """Schéma de mise à jour pour un emprunteur"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
