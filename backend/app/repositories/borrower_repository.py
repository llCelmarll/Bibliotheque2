from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.Borrower import Borrower


class BorrowerRepository:
    """Repository pour les emprunteurs"""

    def __init__(self, session: Session):
        self.session = session

    def create(self, borrower: Borrower) -> Borrower:
        """Insère un emprunteur dans la base"""
        self.session.add(borrower)
        self.session.commit()
        self.session.refresh(borrower)
        return borrower

    def get_by_id(self, borrower_id: int, owner_id: int) -> Optional[Borrower]:
        """Retourne un emprunteur en fonction de son ID et owner_id"""
        statement = select(Borrower).where(
            Borrower.id == borrower_id,
            Borrower.owner_id == owner_id
        )
        return self.session.exec(statement).first()

    def get_by_name(self, name: str, owner_id: int) -> Optional[Borrower]:
        """Retourne un emprunteur en fonction de son nom et owner_id (insensible à la casse)"""
        if not name:
            return None
        statement = select(Borrower).where(
            func.lower(Borrower.name) == name.lower(),
            Borrower.owner_id == owner_id
        )
        return self.session.exec(statement).first()

    def get_all(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[Borrower]:
        """Retourne tous les emprunteurs d'un utilisateur avec pagination"""
        statement = (
            select(Borrower)
            .where(Borrower.owner_id == owner_id)
            .offset(skip)
            .limit(limit)
        )
        results = self.session.exec(statement)
        return list(results)

    def update(self, borrower: Borrower) -> Borrower:
        """Met à jour un emprunteur dans la base"""
        self.session.add(borrower)
        self.session.commit()
        self.session.refresh(borrower)
        return borrower

    def delete(self, borrower: Borrower) -> None:
        """Supprime un emprunteur de la base"""
        self.session.delete(borrower)
        self.session.commit()

    def search_fuzzy(self, query: str, owner_id: int, limit: int = 10) -> List[Borrower]:
        """Recherche fuzzy d'emprunteurs par nom pour un utilisateur"""
        if not query or len(query.strip()) < 2:
            # Si requête trop courte, retourner les premiers résultats
            statement = select(Borrower).where(Borrower.owner_id == owner_id).limit(limit)
            results = self.session.exec(statement)
            return list(results)

        # Recherche avec LIKE (insensible à la casse)
        search_pattern = f"%{query.strip()}%"
        statement = (
            select(Borrower)
            .where(
                func.lower(Borrower.name).like(search_pattern.lower()),
                Borrower.owner_id == owner_id
            )
            .limit(limit)
        )
        results = self.session.exec(statement)
        return list(results)

    def count_by_owner(self, owner_id: int) -> int:
        """Compte le nombre d'emprunteurs pour un utilisateur"""
        statement = select(func.count(Borrower.id)).where(Borrower.owner_id == owner_id)
        return self.session.exec(statement).one()
