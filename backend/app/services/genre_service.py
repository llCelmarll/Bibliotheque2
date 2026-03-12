from typing import Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.Genre import Genre
from app.models.BookGenreLink import BookGenreLink
from app.repositories.genre_repository import GenreRepository
from app.schemas.Genre import GenreCreate, GenreRead, GenreUpdate

class GenreService:
	"""Service pour la logique metier des genres"""
	def __init__(self, session: Session):
		self.session = session
		self.genre_repository = GenreRepository(session)

	def get_all(self) -> list[GenreRead]:
		genres = self.genre_repository.get_all()
		return [GenreRead.model_validate(genre) for genre in genres]

	def create(self, genre_data: GenreCreate) -> GenreRead:
		"""Créé un nouveau Genre"""
		self._validate_genre_create(genre_data)
		genre = Genre(name=genre_data.name)
		genre = self.genre_repository.create(genre)
		return GenreRead.model_validate(genre)

	def get_by_id(self, genre_id: int) -> GenreRead:
		"""Récupère un Genre par son ID"""
		genre = self.genre_repository.get_by_id(genre_id)
		if not genre:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Genre introuvable")
		return GenreRead.model_validate(genre)

	def update(self, genre: GenreUpdate) -> GenreRead:
		"""Met à jour un Genre"""
		self._validate_genre_update(genre)
		genre = Genre.model_validate(genre)
		return GenreRead.model_validate(self.genre_repository.update(genre))

	def delete(self, genre_id: int, replacement_id: Optional[int] = None) -> None:
		"""Supprime un Genre. Si utilisé par des livres, nécessite un replacement_id."""
		genre = self.genre_repository.get_by_id(genre_id)
		if not genre:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Genre introuvable")

		links = self.session.exec(
			select(BookGenreLink).where(BookGenreLink.genre_id == genre_id)
		).all()

		if links:
			if replacement_id is None:
				raise HTTPException(
					status_code=status.HTTP_409_CONFLICT,
					detail=f"Ce genre est utilisé par {len(links)} livre(s). Fournissez un replacement_id."
				)
			replacement = self.genre_repository.get_by_id(replacement_id)
			if not replacement:
				raise HTTPException(
					status_code=status.HTTP_404_NOT_FOUND,
					detail="Genre de remplacement introuvable")
			for link in links:
				link.genre_id = replacement_id
				self.session.add(link)
			self.session.commit()

		self.genre_repository.delete(genre)

	def _validate_genre_create(self, genre_data: GenreCreate):
		existing_genre = self.genre_repository.get_by_name(genre_data.name)
		if existing_genre:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Le genre existe déjà"
			)

	def _validate_genre_update(self, genre_data: GenreUpdate):
		existing_genre = self.genre_repository.get_by_name(genre_data.name)
		if existing_genre and existing_genre.id != genre_data.id:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Un genre avec ce nom existe déjà"
			)
		db_genre = self.genre_repository.get_by_id(genre_data.id)
		if not db_genre:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Genre introuvable"
			)

	def search_fuzzy(self, query: str, limit: int = 10) -> list[GenreRead]:
		"""Recherche fuzzy de genres"""
		genres = self.genre_repository.search_fuzzy(query, limit)
		return [GenreRead.model_validate(genre) for genre in genres]
