from fastapi import HTTPException
from sqlmodel import Session

from app.models.audit_log_model import AuditLog
from app.repositories.audit_log_repository import AuditLogRepository
from app.repositories.author_repository import AuthorRepository
from app.repositories.genre_repository import GenreRepository
from app.repositories.publisher_repository import PublisherRepository
from app.repositories.series_repository import SeriesRepository
from app.schemas.admin_schemas import MergeEntitiesRequest

ENTITY_TYPES = ("author", "publisher", "genre", "series")


class AdminEntityService:
    def __init__(self, session: Session):
        self.session = session
        self.author_repository = AuthorRepository(session)
        self.publisher_repository = PublisherRepository(session)
        self.genre_repository = GenreRepository(session)
        self.series_repository = SeriesRepository(session)
        self.audit_log_repository = AuditLogRepository(session)

    def merge(self, entity_type: str, data: MergeEntitiesRequest, moderator_id: int) -> dict:
        if entity_type not in ENTITY_TYPES:
            raise HTTPException(status_code=400, detail=f"Type invalide. Valeurs: {', '.join(ENTITY_TYPES)}")
        if data.source_id == data.target_id:
            raise HTTPException(status_code=400, detail="source_id et target_id doivent être différents")

        if entity_type == "author":
            source_name = self._merge_author(data.source_id, data.target_id)
        elif entity_type == "publisher":
            source_name = self._merge_publisher(data.source_id, data.target_id)
        elif entity_type == "genre":
            source_name = self._merge_genre(data.source_id, data.target_id)
        else:
            source_name = self._merge_series(data.source_id, data.target_id)

        audit = AuditLog(
            actor_id=moderator_id,
            action="merge_entity",
            target_type=entity_type,
            target_id=data.target_id,
            detail={"source_id": data.source_id, "source_name": source_name, "target_id": data.target_id},
        )
        self.audit_log_repository.add_audit_log(audit)
        self.session.commit()

        return {"message": f"Fusion effectuée : '{source_name}' fusionné dans l'entité {data.target_id}"}

    def _merge_author(self, source_id: int, target_id: int) -> str:
        source = self.author_repository.get_by_id(source_id)
        target = self.author_repository.get_by_id(target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Auteur source ou cible introuvable")

        links = self.author_repository.get_book_author_links(source_id)
        for link in links:
            existing = self.author_repository.get_book_author_link(link.book_id, target_id)
            self.author_repository.delete_book_author_link(link)
            if not existing:
                self.author_repository.add_book_author_link(link.book_id, target_id)
        # Flush pour appliquer les liens avant de supprimer l'auteur source
        self.session.flush()

        source_name = source.name
        self.author_repository.delete_no_commit(source)
        return source_name

    def _merge_publisher(self, source_id: int, target_id: int) -> str:
        source = self.publisher_repository.get_by_id(source_id)
        target = self.publisher_repository.get_by_id(target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Éditeur source ou cible introuvable")

        books = self.publisher_repository.get_books_by_publisher(source_id)
        for book in books:
            self.publisher_repository.reassign_book_publisher(book, target_id)
        # Flush pour appliquer les réassignations avant de supprimer l'éditeur source
        # (sinon la suppression peut être exécutée avant l'UPDATE et invalider la FK)
        self.session.flush()

        source_name = source.name
        self.publisher_repository.delete_no_commit(source)
        return source_name

    def _merge_genre(self, source_id: int, target_id: int) -> str:
        source = self.genre_repository.get_by_id(source_id)
        target = self.genre_repository.get_by_id(target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Genre source ou cible introuvable")

        links = self.genre_repository.get_book_genre_links(source_id)
        for link in links:
            existing = self.genre_repository.get_book_genre_link(link.book_id, target_id)
            self.genre_repository.delete_book_genre_link(link)
            if not existing:
                self.genre_repository.add_book_genre_link(link.book_id, target_id)
        self.session.flush()

        source_name = source.name
        self.genre_repository.delete_no_commit(source)
        return source_name

    def _merge_series(self, source_id: int, target_id: int) -> str:
        source = self.series_repository.get_by_id(source_id)
        target = self.series_repository.get_by_id(target_id)
        if not source or not target:
            raise HTTPException(status_code=404, detail="Série source ou cible introuvable")

        links = self.series_repository.get_book_series_links(source_id)
        for link in links:
            existing = self.series_repository.get_book_series_link(link.book_id, target_id)
            volume_number = link.volume_number
            self.series_repository.delete_book_series_link(link)
            if not existing:
                self.series_repository.add_book_series_link(link.book_id, target_id, volume_number)
        self.session.flush()

        source_name = source.name
        self.series_repository.delete_no_commit(source)
        return source_name
