from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select
from app.db import engine
from app.models.User import User
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.models.Series import Series
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink
from app.models.BookSeriesLink import BookSeriesLink
from app.models.Book import Book
from app.models.AuditLog import AuditLog
from app.schemas.Admin import MergeEntitiesRequest
from app.services.auth_service import get_current_moderator_user_sync as get_current_moderator_user

router = APIRouter(prefix="/admin/entities", tags=["admin"])

ENTITY_TYPES = ("author", "publisher", "genre", "series")


@router.post("/{entity_type}/merge")
def merge_entities(
    entity_type: str = Path(..., description="author | publisher | genre | series"),
    data: MergeEntitiesRequest = ...,
    current_user: User = Depends(get_current_moderator_user),
):
    with Session(engine) as session:
     return _do_merge(entity_type, data, current_user, session)


def _do_merge(entity_type, data, current_user, session):
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Type invalide. Valeurs: {', '.join(ENTITY_TYPES)}")
    if data.source_id == data.target_id:
        raise HTTPException(status_code=400, detail="source_id et target_id doivent être différents")

    if entity_type == "author":
        source = session.get(Author, data.source_id)
        target = session.get(Author, data.target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Auteur source ou cible introuvable")
        links = session.exec(select(BookAuthorLink).where(BookAuthorLink.author_id == data.source_id)).all()
        for link in links:
            existing = session.exec(
                select(BookAuthorLink).where(
                    BookAuthorLink.book_id == link.book_id,
                    BookAuthorLink.author_id == data.target_id
                )
            ).first()
            if not existing:
                link.author_id = data.target_id
                session.add(link)
            else:
                session.delete(link)
        session.delete(source)
        source_name = source.name

    elif entity_type == "publisher":
        source = session.get(Publisher, data.source_id)
        target = session.get(Publisher, data.target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Éditeur source ou cible introuvable")
        books = session.exec(select(Book).where(Book.publisher_id == data.source_id)).all()
        for book in books:
            book.publisher_id = data.target_id
            session.add(book)
        session.delete(source)
        source_name = source.name

    elif entity_type == "genre":
        source = session.get(Genre, data.source_id)
        target = session.get(Genre, data.target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Genre source ou cible introuvable")
        links = session.exec(select(BookGenreLink).where(BookGenreLink.genre_id == data.source_id)).all()
        for link in links:
            existing = session.exec(
                select(BookGenreLink).where(
                    BookGenreLink.book_id == link.book_id,
                    BookGenreLink.genre_id == data.target_id
                )
            ).first()
            if not existing:
                link.genre_id = data.target_id
                session.add(link)
            else:
                session.delete(link)
        session.delete(source)
        source_name = source.name

    elif entity_type == "series":
        source = session.get(Series, data.source_id)
        target = session.get(Series, data.target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Série source ou cible introuvable")
        links = session.exec(select(BookSeriesLink).where(BookSeriesLink.series_id == data.source_id)).all()
        for link in links:
            existing = session.exec(
                select(BookSeriesLink).where(
                    BookSeriesLink.book_id == link.book_id,
                    BookSeriesLink.series_id == data.target_id
                )
            ).first()
            if not existing:
                link.series_id = data.target_id
                session.add(link)
            else:
                session.delete(link)
        session.delete(source)
        source_name = source.name

    audit = AuditLog(
        actor_id=current_user.id,
        action="merge_entity",
        target_type=entity_type,
        target_id=data.target_id,
        detail={"source_id": data.source_id, "source_name": source_name, "target_id": data.target_id},
    )
    session.add(audit)
    session.commit()

    return {"message": f"Fusion effectuée : '{source_name}' fusionné dans l'entité {data.target_id}"}
