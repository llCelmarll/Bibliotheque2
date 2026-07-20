from typing import List, Optional, Tuple

from sqlalchemy.orm import selectinload
from sqlmodel import Session, func, or_, select

from app.models.author_model import Author
from app.models.book_model import Book
from app.models.contact_model import Contact
from app.models.genre_model import Genre
from app.models.loan_model import Loan
from app.models.publisher_model import Publisher
from app.models.user_model import User


class UserRepository:
    """Repository pour les opérations de données sur les utilisateurs et leur bibliothèque partagée."""

    def __init__(self, session: Session):
        self.session = session

    def search_active_users(self, exclude_user_id: int) -> List[User]:
        return self.session.exec(
            select(User).where(
                User.is_active == True,
                User.id != exclude_user_id,
            )
        ).all()

    def find_shared_contact(self, target_owner_id: int, viewer_user_id: int) -> Optional[Contact]:
        return self.session.exec(
            select(Contact).where(
                Contact.owner_id == target_owner_id,
                Contact.linked_user_id == viewer_user_id,
                Contact.library_shared == True,
            )
        ).first()

    def search_shared_library(
        self,
        owner_id: int,
        search: Optional[str],
        title: Optional[str],
        author: Optional[str],
        publisher: Optional[str],
        genre: Optional[str],
        isbn: Optional[str],
        year_min: Optional[int],
        year_max: Optional[int],
        page_min: Optional[int],
        page_max: Optional[int],
        sort_by: str,
        sort_order: str,
        skip: int,
        limit: int,
    ) -> Tuple[List[Book], int]:
        needs_author_join = bool(search or author)
        needs_publisher_join = bool(publisher)
        needs_genre_join = bool(genre)

        stmt = (
            select(Book)
            .where(Book.owner_id == owner_id, Book.is_lendable == True)
            .options(
                selectinload(Book.authors),
                selectinload(Book.publisher),
                selectinload(Book.genres),
            )
        )

        if needs_author_join:
            stmt = stmt.outerjoin(Book.authors)
        if needs_publisher_join:
            stmt = stmt.outerjoin(Book.publisher)
        if needs_genre_join:
            stmt = stmt.outerjoin(Book.genres)

        if search:
            pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Book.title).like(pattern),
                    func.lower(Book.isbn).like(pattern),
                    func.lower(Author.name).like(pattern),
                )
            )

        if title:
            stmt = stmt.where(func.lower(Book.title).like(f"%{title.lower()}%"))
        if author:
            stmt = stmt.where(func.lower(Author.name).like(f"%{author.lower()}%"))
        if publisher:
            stmt = stmt.where(func.lower(Publisher.name).like(f"%{publisher.lower()}%"))
        if genre:
            stmt = stmt.where(func.lower(Genre.name).like(f"%{genre.lower()}%"))
        if isbn:
            stmt = stmt.where(func.lower(Book.isbn).like(f"%{isbn.lower()}%"))
        if year_min is not None:
            stmt = stmt.where(func.extract('year', Book.published_date) >= year_min)
        if year_max is not None:
            stmt = stmt.where(func.extract('year', Book.published_date) <= year_max)
        if page_min is not None:
            stmt = stmt.where(Book.page_count >= page_min)
        if page_max is not None:
            stmt = stmt.where(Book.page_count <= page_max)

        if needs_author_join or needs_publisher_join or needs_genre_join:
            stmt = stmt.distinct()

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = self.session.exec(count_stmt).one()

        sort_col = {
            "title": Book.title,
            "published_date": Book.published_date,
            "page_count": Book.page_count,
            "created_at": Book.created_at,
        }.get(sort_by, Book.title)

        order_col = sort_col.desc() if sort_order == "desc" else sort_col.asc()

        books = self.session.exec(
            stmt.order_by(order_col).offset(skip).limit(limit)
        ).all()

        return books, total

    def get_shared_book_detail(self, owner_id: int, book_id: int) -> Optional[Book]:
        return self.session.exec(
            select(Book)
            .where(Book.id == book_id, Book.owner_id == owner_id, Book.is_lendable == True)
            .options(
                selectinload(Book.authors),
                selectinload(Book.publisher),
                selectinload(Book.genres),
                selectinload(Book.loans).selectinload(Loan.contact),
            )
        ).first()
