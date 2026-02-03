from typing import List, Optional
from sqlmodel import Session, select, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime
from app.models.Loan import Loan, LoanStatus
from app.models.Book import Book
from app.models.Contact import Contact


class LoanRepository:
    """Repository pour les opérations de données des prêts"""

    def __init__(self, session: Session):
        self.session = session

    def create(self, loan: Loan) -> Loan:
        """Insère un prêt dans la base"""
        self.session.add(loan)
        self.session.commit()
        self.session.refresh(loan)
        return loan

    def get_by_id(self, loan_id: int, owner_id: int) -> Optional[Loan]:
        """Retourne un prêt en fonction de son ID et owner_id avec les relations chargées"""
        statement = (
            select(Loan)
            .where(Loan.id == loan_id, Loan.owner_id == owner_id)
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
        )
        return self.session.exec(statement).first()

    def get_all(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[Loan]:
        """Retourne tous les prêts d'un utilisateur avec pagination"""
        statement = (
            select(Loan)
            .where(Loan.owner_id == owner_id)
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
            .offset(skip)
            .limit(limit)
            .order_by(Loan.loan_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_active_loans(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[Loan]:
        """Retourne tous les prêts actifs d'un utilisateur (inclut les prêts en retard)
        Note: Un prêt OVERDUE est aussi considéré comme actif (non retourné)"""
        statement = (
            select(Loan)
            .where(
                Loan.owner_id == owner_id,
                or_(
                    Loan.status == LoanStatus.ACTIVE,
                    Loan.status == LoanStatus.OVERDUE
                )
            )
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
            .offset(skip)
            .limit(limit)
            .order_by(Loan.loan_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_overdue_loans(self, owner_id: int, skip: int = 0, limit: int = 100) -> List[Loan]:
        """Retourne tous les prêts en retard d'un utilisateur"""
        statement = (
            select(Loan)
            .where(
                Loan.owner_id == owner_id,
                or_(
                    Loan.status == LoanStatus.OVERDUE,
                    and_(
                        Loan.status == LoanStatus.ACTIVE,
                        Loan.due_date != None,
                        Loan.due_date < datetime.utcnow()
                    )
                )
            )
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
            .offset(skip)
            .limit(limit)
            .order_by(Loan.due_date)
        )
        results = self.session.exec(statement)
        return list(results)

    def get_loans_by_book(self, book_id: int, owner_id: int) -> List[Loan]:
        """Retourne tous les prêts pour un livre spécifique"""
        statement = (
            select(Loan)
            .where(
                Loan.book_id == book_id,
                Loan.owner_id == owner_id
            )
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
            .order_by(Loan.loan_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_loans_by_contact(self, contact_id: int, owner_id: int) -> List[Loan]:
        """Retourne tous les prêts pour un contact spécifique"""
        statement = (
            select(Loan)
            .where(
                Loan.contact_id == contact_id,
                Loan.owner_id == owner_id
            )
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
            .order_by(Loan.loan_date.desc())
        )
        results = self.session.exec(statement)
        return list(results)

    def get_active_loan_for_book(self, book_id: int, owner_id: int) -> Optional[Loan]:
        """Retourne le prêt actif pour un livre (s'il existe)
        Note: Un prêt OVERDUE est aussi considéré comme actif (non retourné)"""
        statement = (
            select(Loan)
            .where(
                Loan.book_id == book_id,
                Loan.owner_id == owner_id,
                or_(
                    Loan.status == LoanStatus.ACTIVE,
                    Loan.status == LoanStatus.OVERDUE
                )
            )
            .options(
                selectinload(Loan.book),
                selectinload(Loan.contact)
            )
        )
        return self.session.exec(statement).first()

    def update(self, loan: Loan) -> Loan:
        """Met à jour un prêt dans la base"""
        self.session.add(loan)
        self.session.commit()
        self.session.refresh(loan)
        return loan

    def delete(self, loan: Loan) -> None:
        """Supprime un prêt de la base"""
        self.session.delete(loan)
        self.session.commit()

    def count_by_owner(self, owner_id: int) -> int:
        """Compte le nombre total de prêts pour un utilisateur"""
        from sqlmodel import func
        statement = select(func.count(Loan.id)).where(Loan.owner_id == owner_id)
        return self.session.exec(statement).one()

    def count_active_by_owner(self, owner_id: int) -> int:
        """Compte le nombre de prêts actifs pour un utilisateur (inclut les prêts en retard)
        Note: Un prêt OVERDUE est aussi considéré comme actif (non retourné)"""
        from sqlmodel import func
        statement = select(func.count(Loan.id)).where(
            Loan.owner_id == owner_id,
            or_(
                Loan.status == LoanStatus.ACTIVE,
                Loan.status == LoanStatus.OVERDUE
            )
        )
        return self.session.exec(statement).one()
