from typing import Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.Publisher import Publisher
from app.models.Book import Book
from app.repositories.publisher_repository import PublisherRepository
from app.schemas.Publisher import PublisherCreate, PublisherRead, PublisherUpdate

class PublisherService:
	"""Service pour la logique metier des éditeurs"""
	def __init__(self, session: Session):
		self.session = session
		self.publisher_repository = PublisherRepository(session)

	def get_all(self) -> list[PublisherRead]:
		"""Retourne tous les éditeurs"""
		publishers = self.publisher_repository.get_all()
		return [PublisherRead.model_validate(publisher) for publisher in publishers]

	def create(self, publisher_data: PublisherCreate) -> PublisherRead:
		"""Créé un nouvel éditeur"""
		self._validate_publisher_create(publisher_data)
		publisher = Publisher(name=publisher_data.name)
		publisher = self.publisher_repository.create(publisher)
		return PublisherRead.model_validate(publisher)

	def get_by_id(self, publisher_id: int) -> PublisherRead:
		"""Récupère un Editeur par son ID"""
		publisher = self.publisher_repository.get_by_id(publisher_id)
		if not publisher:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Editeur introuvable")
		return PublisherRead.model_validate(publisher)

	def update(self, publisher: PublisherUpdate) -> PublisherRead:
		"""Met à jour un éditeur"""
		self._validate_publisher_update(publisher)
		publisher = Publisher.model_validate(publisher)
		return PublisherRead.model_validate(self.publisher_repository.update(publisher))

	def delete(self, publisher_id: int, replacement_id: Optional[int] = None) -> None:
		"""Supprime un éditeur. Si utilisé par des livres, nécessite un replacement_id."""
		publisher = self.publisher_repository.get_by_id(publisher_id)
		if not publisher:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Editeur introuvable")

		books = self.session.exec(
			select(Book).where(Book.publisher_id == publisher_id)
		).all()

		if books:
			if replacement_id is None:
				raise HTTPException(
					status_code=status.HTTP_409_CONFLICT,
					detail=f"Cet éditeur est utilisé par {len(books)} livre(s). Fournissez un replacement_id."
				)
			replacement = self.publisher_repository.get_by_id(replacement_id)
			if not replacement:
				raise HTTPException(
					status_code=status.HTTP_404_NOT_FOUND,
					detail="Editeur de remplacement introuvable")
			for book in books:
				book.publisher_id = replacement_id
				self.session.add(book)
			self.session.commit()

		self.publisher_repository.delete(publisher)

	def _validate_publisher_create(self, publisher_data: PublisherCreate) -> None:
		existing_publisher = self.publisher_repository.get_by_name(publisher_data.name)
		if existing_publisher:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Un éditeur avec ce nom existe déjà."
			)

	def _validate_publisher_update(self, publisher_data: PublisherUpdate) -> None:
		existing_publisher = self.publisher_repository.get_by_name(publisher_data.name)
		if existing_publisher and existing_publisher.id != publisher_data.id:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Un éditeur avec ce nom existe déjà."
			)
		db_publisher = self.publisher_repository.get_by_id(publisher_data.id)
		if not db_publisher:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Editeur introuvable"
			)

	def search_fuzzy(self, query: str, limit: int = 10) -> list[PublisherRead]:
		"""Recherche fuzzy d'éditeurs"""
		publishers = self.publisher_repository.search_fuzzy(query, limit)
		return [PublisherRead.model_validate(publisher) for publisher in publishers]
