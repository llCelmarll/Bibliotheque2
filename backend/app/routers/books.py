from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.db import get_session
from app.models.Book import Book
from app.schemas.Book import BookRead


router = APIRouter(prefix="/books", tags=["books"])

@router.get("", response_model=list[BookRead])
def list_books(
    skip: int = Query(0, ge=0, description="Nombre d’éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre max d’éléments à retourner"),
    session: Session = Depends(get_session),
):
    """
    List all books in the database with pagination.
    """
    stmt = select(Book).offset(skip).limit(limit)
    return session.exec(stmt).all()
    
@router.get("/{book_id}", response_model=BookRead)
def get_book(book_id: int, session: Session = Depends(get_session)):
    """
    Get a book by its ID.
    """
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="livre introuvable")
    return book