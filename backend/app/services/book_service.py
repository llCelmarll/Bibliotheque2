from sqlmodel import Session
from app.models import Book
from app.repositories import book_repository
from app.schemas.Book import BookCreate, BookUpdate

def create_book(session: Session, book_data: BookCreate) -> Book:
	"""Créée un nouveau livre."""
	book = Book(
		title=book_data.title,
		isbn=book_data.isbn,
		published_date=book_data.published_date,
		page_count=book_data.page_count,
	)

