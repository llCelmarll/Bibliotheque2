from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import get_session
from app.models.Book import Book
from app.schemas.Book import BookRead


router = APIRouter(prefix="/books", tags=["books"])

@router.get("", response_model=list[BookRead])
def list_books(session: Session = Depends(get_session)):
    """
    List all books in the database.
    """
    return session.exec(select(Book)).all()
    
@router.get("/{book_id}", response_model=BookRead)
def get_book(book_id: int, session: Session = Depends(get_session)):
    """
    Get a book by its ID.
    """
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="livre introuvable")
    return book

