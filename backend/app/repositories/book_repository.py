from sqlmodel import Session, select
from app.models import Book


def get_all_books(session: Session):
    """Retrieve all books from the database."""
    return session.exec(select(Book)).all()

def get_book_by_id(session: Session, book_id: int):
    """Retrieve a book by its ID."""
    return session.get(Book, book_id)

def get_book_by_isbn(session: Session, isbn: str):
    """Retrieve a book by its ISBN."""
    return session.exec(select(Book).where(Book.isbn == isbn)).first()

def create_book(session: Session, book: Book):
    """Create a new book in the database."""
    session.add(book)
    session.commit()
    session.refresh(book)
    return book

def update_book(session: Session, book: Book):
    """Update an existing book in the database."""
    session.add(book)
    session.commit()
    session.refresh(book)
    return book

def delete_book(session: Session, book: Book):
    """Delete a book from the database."""
    session.delete(book)
    session.commit()