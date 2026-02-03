from typing import Optional
from sqlmodel import SQLModel
from datetime import datetime


class ContactRead(SQLModel):
    """Schéma de lecture pour un contact"""
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    active_loans_count: int = 0
    active_borrows_count: int = 0


class ContactCreate(SQLModel):
    """Schéma de création pour un contact"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class ContactUpdate(SQLModel):
    """Schéma de mise à jour pour un contact"""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
