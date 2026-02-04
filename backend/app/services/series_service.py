from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.Series import Series
from app.repositories.series_repository import SeriesRepository
from app.schemas.Series import SeriesCreate, SeriesRead, SeriesUpdate

class SeriesService:
	"""Service pour la logique metier des séries"""
	def __init__(self, session: Session):
		self.session = session
		self.series_repository = SeriesRepository(session)

	def get_all(self, owner_id: int) -> list[SeriesRead]:
		series_list = self.series_repository.get_all(owner_id)
		return [SeriesRead.model_validate(s) for s in series_list]

	def create(self, series_data: SeriesCreate, owner_id: int) -> SeriesRead:
		"""Crée une nouvelle série"""
		self._validate_series_create(series_data, owner_id)
		series = Series(name=series_data.name, owner_id=owner_id)
		series = self.series_repository.create(series)
		return SeriesRead.model_validate(series)

	def get_by_id(self, series_id: int, owner_id: int) -> SeriesRead:
		"""Récupère une série par son ID"""
		series = self.series_repository.get_by_id(series_id)
		if not series or series.owner_id != owner_id:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Série introuvable")
		return SeriesRead.model_validate(series)

	def update(self, series_data: SeriesUpdate, owner_id: int) -> SeriesRead:
		"""Met à jour une série"""
		self._validate_series_update(series_data, owner_id)
		series = Series.model_validate(series_data)
		series = SeriesRead.model_validate(self.series_repository.update(series))
		return series

	def delete(self, series_id: int, owner_id: int) -> None:
		"""Supprime une série"""
		series = self.series_repository.get_by_id(series_id)
		if not series or series.owner_id != owner_id:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Série introuvable")
		self.series_repository.delete(series)

	def _validate_series_create(self, series_data: SeriesCreate, owner_id: int):
		existing = self.series_repository.get_by_name(series_data.name, owner_id)
		if existing:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="La série existe déjà"
			)

	def _validate_series_update(self, series_data: SeriesUpdate, owner_id: int):
		existing = self.series_repository.get_by_name(series_data.name, owner_id)
		if existing and existing.id != series_data.id:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Une série avec ce nom existe déjà"
			)
		db_series = self.series_repository.get_by_id(series_data.id)
		if not db_series or db_series.owner_id != owner_id:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Série introuvable"
			)

	def search_fuzzy(self, query: str, owner_id: int, limit: int = 10) -> list[SeriesRead]:
		"""Recherche fuzzy de séries"""
		series_list = self.series_repository.search_fuzzy(query, owner_id, limit)
		return [SeriesRead.model_validate(s) for s in series_list]
