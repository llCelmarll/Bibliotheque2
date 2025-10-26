from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.Genre import Genre
from app.repositories.genre_repository import GenreRepository
from app.schemas.Genre import GenreCreate, GenreRead, GenreUpdate

class GenreService:
	"""Service pour la logique metier des genres"""
	def __init__(self, session: Session):
		self.session = session
		self.genre_repository = GenreRepository(session)

	def get_all(self) -> list[GenreRead]:
		genres = self.genre_repository.get_all()
		genre_read_list = []
		for genre in genres:
			genre_read_list.append(GenreRead.model_validate(genre))

		return genre_read_list

	def create(self, genre_data: GenreCreate) -> GenreRead:
		"""Créé un nouveau Genre"""
		self._validate_genre_create(genre_data)
		genre = Genre(name=genre_data.name)
		genre = self.genre_repository.create(genre)
		genre = GenreRead.model_validate(genre)
		return genre

	def get_by_id(self, genre_id: int) -> GenreRead:
		"""Récupère un Genre par son ID"""
		genre = self.genre_repository.get_by_id(genre_id)
		if not genre :
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Genre introuvable")
		genre = GenreRead.model_validate(genre)
		return genre

	def update(self, genre: GenreUpdate) -> GenreRead:
		"""Met à jour un Genre"""
		self._validate_genre_update(genre)
		genre = Genre.model_validate(genre)
		genre = GenreRead.model_validate(self.genre_repository.update(genre))
		return genre

	def delete(self, genre_id: int) -> None:
		"""Supprime un Genre"""
		genre = self.genre_repository.get_by_id(genre_id)
		if not genre:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Genre introuvable")
		self.genre_repository.delete(genre)

	def _validate_genre_create(self, genre_data : GenreCreate):
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