from typing import List, Optional

from sqlmodel import Session, func, select

from app.models.book_model import Book
from app.models.loan_model import Loan, LoanStatus
from app.models.user_model import User


class AdminRepository:
    """Repository pour les opérations de données d'administration (stats, users, loans)."""

    def __init__(self, session: Session):
        self.session = session

    def count_users(self) -> int:
        return self.session.scalar(select(func.count(User.id)))

    def count_active_users(self) -> int:
        return self.session.scalar(select(func.count(User.id)).where(User.is_active == True))

    def count_books(self) -> int:
        return self.session.scalar(select(func.count(Book.id)))

    def count_active_loans(self) -> int:
        return self.session.scalar(select(func.count(Loan.id)).where(Loan.status == LoanStatus.ACTIVE))

    def search_users(
        self,
        search: Optional[str],
        is_active: Optional[bool],
        role: Optional[str],
        offset: int,
        limit: int,
    ) -> List[User]:
        query = select(User)
        if search:
            query = query.where(
                (User.email.ilike(f"%{search}%")) | (User.username.ilike(f"%{search}%"))
            )
        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if role:
            query = query.where(User.role == role)
        query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
        return self.session.exec(query).all()

    def get_user(self, user_id: int) -> Optional[User]:
        return self.session.get(User, user_id)

    def get_loans_by_owner(self, user_id: int, limit: int) -> List[Loan]:
        query = (
            select(Loan)
            .where(Loan.owner_id == user_id)
            .order_by(Loan.loan_date.desc())
            .limit(limit)
        )
        return self.session.exec(query).all()

    def get_book(self, book_id: int) -> Optional[Book]:
        return self.session.get(Book, book_id)

    def update_user(self, user: User) -> User:
        self.session.add(user)
        return user

    def delete_user(self, user: User) -> None:
        self.session.delete(user)
