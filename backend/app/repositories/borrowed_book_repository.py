from typing import List, Optional
from sqlmodel import Session, select, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime
from app.models.BorrowedBook import BorrowedBook, BorrowStatus


class BorrowedBookRepository:
    """Repository pour les opérations de données des livres empruntés"""

    def __init__(self, session: Session):
        self.session = session

    def create(self, borrowed_book: BorrowedBook) -> BorrowedBook:
        """Insère un emprunt dans la base"""
        self.session.add(borrowed_book)
        self.session.commit()
        self.session.refresh(borrowed_book)
        return borrowed_book

    def get_by_id(self, borrow_id: int, user_id: int) -> Optional[BorrowedBook]:
        """Retourne un emprunt en fonction de son ID et user_id avec les relations chargées"""
        statement = (
            select(BorrowedBook)
            .where(BorrowedBook.id == borrow_id, BorrowedBook.user_id == user_id)
            .options(selectinload(BorrowedBook.book))
        )
        return self.session.exec(statement).first()

    def get_all(self, user_id: int, skip: int = 0, limit: int = 100) -> List[BorrowedBook]:
        """Retourne tous les emprunts d'un utilisateur avec pagination"""
        statement = (
            select(BorrowedBook)
            .where(BorrowedBook.user_id == user_id)
            .options(selectinload(BorrowedBook.book))
            .offset(skip)
            .limit(limit)
            .order_by(BorrowedBook.borrowed_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_active(self, user_id: int, skip: int = 0, limit: int = 100) -> List[BorrowedBook]:
        """Retourne tous les emprunts actifs d'un utilisateur (inclut les emprunts en retard)
        Note: Un emprunt OVERDUE est aussi considéré comme actif (non retourné)"""
        statement = (
            select(BorrowedBook)
            .where(
                BorrowedBook.user_id == user_id,
                or_(
                    BorrowedBook.status == BorrowStatus.ACTIVE,
                    BorrowedBook.status == BorrowStatus.OVERDUE
                )
            )
            .options(selectinload(BorrowedBook.book))
            .offset(skip)
            .limit(limit)
            .order_by(BorrowedBook.borrowed_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_overdue(self, user_id: int, skip: int = 0, limit: int = 100) -> List[BorrowedBook]:
        """Retourne tous les emprunts en retard d'un utilisateur"""
        statement = (
            select(BorrowedBook)
            .where(
                BorrowedBook.user_id == user_id,
                or_(
                    BorrowedBook.status == BorrowStatus.OVERDUE,
                    and_(
                        BorrowedBook.status == BorrowStatus.ACTIVE,
                        BorrowedBook.expected_return_date != None,
                        BorrowedBook.expected_return_date < datetime.utcnow()
                    )
                )
            )
            .options(selectinload(BorrowedBook.book))
            .offset(skip)
            .limit(limit)
            .order_by(BorrowedBook.expected_return_date)
        )
        results = self.session.exec(statement)
        return list(results)

    def get_by_book(self, book_id: int, user_id: int) -> List[BorrowedBook]:
        """Retourne tous les emprunts pour un livre spécifique"""
        statement = (
            select(BorrowedBook)
            .where(
                BorrowedBook.book_id == book_id,
                BorrowedBook.user_id == user_id
            )
            .options(selectinload(BorrowedBook.book))
            .order_by(BorrowedBook.borrowed_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_active_borrow_for_book(self, book_id: int, user_id: int) -> Optional[BorrowedBook]:
        """Retourne l'emprunt actif pour un livre (s'il existe)
        Note: Un emprunt OVERDUE est aussi considéré comme actif (non retourné)"""
        statement = (
            select(BorrowedBook)
            .where(
                BorrowedBook.book_id == book_id,
                BorrowedBook.user_id == user_id,
                or_(
                    BorrowedBook.status == BorrowStatus.ACTIVE,
                    BorrowedBook.status == BorrowStatus.OVERDUE
                )
            )
            .options(selectinload(BorrowedBook.book))
        )
        return self.session.exec(statement).first()

    def update(self, borrowed_book: BorrowedBook) -> BorrowedBook:
        """Met à jour un emprunt dans la base"""
        borrowed_book.updated_at = datetime.utcnow()
        self.session.add(borrowed_book)
        self.session.commit()
        self.session.refresh(borrowed_book)
        return borrowed_book

    def delete(self, borrowed_book: BorrowedBook) -> None:
        """Supprime un emprunt de la base"""
        self.session.delete(borrowed_book)
        self.session.commit()

    def count_by_user(self, user_id: int) -> int:
        """Compte le nombre total d'emprunts pour un utilisateur"""
        from sqlmodel import func
        statement = select(func.count(BorrowedBook.id)).where(
            BorrowedBook.user_id == user_id
        )
        return self.session.exec(statement).one()

    def count_active_by_user(self, user_id: int) -> int:
        """Compte le nombre d'emprunts actifs pour un utilisateur (inclut les emprunts en retard)
        Note: Un emprunt OVERDUE est aussi considéré comme actif (non retourné)"""
        from sqlmodel import func
        statement = select(func.count(BorrowedBook.id)).where(
            BorrowedBook.user_id == user_id,
            or_(
                BorrowedBook.status == BorrowStatus.ACTIVE,
                BorrowedBook.status == BorrowStatus.OVERDUE
            )
        )
        return self.session.exec(statement).one()
