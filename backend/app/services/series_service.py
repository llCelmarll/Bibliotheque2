from typing import Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.Series import Series
from app.models.BookSeriesLink import BookSeriesLink
from app.repositories.series_repository import SeriesRepository
from app.schemas.Series import SeriesCreate, SeriesRead, SeriesUpdate

class SeriesService:
	"""Service pour la logique metier des séries"""
	def __init__(self, session: Session):
		self.session = session
		self.series_repository = SeriesRepository(session)

	def get_all(self) -> list[SeriesRead]:
		series_list = self.series_repository.get_all()
		return [SeriesRead.model_validate(s) for s in series_list]

	def create(self, series_data: SeriesCreate) -> SeriesRead:
		"""Crée une nouvelle série"""
		self._validate_series_create(series_data)
		series = Series(name=series_data.name)
		series = self.series_repository.create(series)
		return SeriesRead.model_validate(series)

	def get_by_id(self, series_id: int) -> SeriesRead:
		"""Récupère une série par son ID"""
		series = self.series_repository.get_by_id(series_id)
		if not series:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Série introuvable")
		return SeriesRead.model_validate(series)

	def update(self, series_data: SeriesUpdate) -> SeriesRead:
		"""Met à jour une série"""
		self._validate_series_update(series_data)
		series = Series.model_validate(series_data)
		return SeriesRead.model_validate(self.series_repository.update(series))

	def delete(self, series_id: int, replacement_id: Optional[int] = None) -> None:
		"""Supprime une série. Si utilisée par des livres, nécessite un replacement_id."""
		series = self.series_repository.get_by_id(series_id)
		if not series:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Série introuvable")

		links = self.session.exec(
			select(BookSeriesLink).where(BookSeriesLink.series_id == series_id)
		).all()

		if links:
			if replacement_id is None:
				raise HTTPException(
					status_code=status.HTTP_409_CONFLICT,
					detail=f"Cette série est utilisée par {len(links)} livre(s). Fournissez un replacement_id."
				)
			replacement = self.series_repository.get_by_id(replacement_id)
			if not replacement:
				raise HTTPException(
					status_code=status.HTTP_404_NOT_FOUND,
					detail="Série de remplacement introuvable")
			for link in links:
				link.series_id = replacement_id
				self.session.add(link)
			self.session.commit()

		self.series_repository.delete(series)

	def _validate_series_create(self, series_data: SeriesCreate):
		existing = self.series_repository.get_by_name(series_data.name)
		if existing:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="La série existe déjà"
			)

	def _validate_series_update(self, series_data: SeriesUpdate):
		existing = self.series_repository.get_by_name(series_data.name)
		if existing and existing.id != series_data.id:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Une série avec ce nom existe déjà"
			)
		db_series = self.series_repository.get_by_id(series_data.id)
		if not db_series:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Série introuvable"
			)

	def search_fuzzy(self, query: str, limit: int = 10) -> list[SeriesRead]:
		"""Recherche fuzzy de séries"""
		series_list = self.series_repository.search_fuzzy(query, limit)
		return [SeriesRead.model_validate(s) for s in series_list]
