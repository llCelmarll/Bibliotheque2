from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.Series import Series

class SeriesRepository:
	"""Repository des séries"""
	def __init__(self, session: Session):
		self.session = session

	def create(self, series: Series) -> Series:
		"""Ajoute une série à la base"""
		self.session.add(series)
		self.session.commit()
		self.session.refresh(series)
		return series

	def get_by_id(self, series_id: int) -> Optional[Series]:
		"""Retourne une série en fonction de son ID"""
		return self.session.get(Series, series_id)

	def get_by_name(self, name: str, owner_id: int) -> Optional[Series]:
		"""Retourne une série en fonction de son nom et owner_id"""
		statement = select(Series).where(
			func.lower(Series.name) == name.lower(),
			Series.owner_id == owner_id
		)
		result = self.session.exec(statement).first()
		return result

	def get_all(self, owner_id: int) -> List[Series]:
		"""Retourne toutes les séries d'un utilisateur"""
		statement = select(Series).where(Series.owner_id == owner_id).order_by(Series.name)
		results = self.session.exec(statement)
		return list(results)

	def update(self, series: Series) -> Series:
		"""Met à jour une série dans la base"""
		db_series = self.get_by_id(series.id)
		if not db_series:
			raise ValueError("Series not found")
		db_series.name = series.name
		self.session.add(db_series)
		self.session.commit()
		self.session.refresh(db_series)
		return db_series

	def delete(self, series: Series) -> None:
		"""Supprime une série de la base"""
		self.session.delete(series)
		self.session.commit()

	def search_fuzzy(self, query: str, owner_id: int, limit: int = 10) -> List[Series]:
		"""Recherche fuzzy de séries par nom pour un utilisateur"""
		if not query or len(query.strip()) < 2:
			statement = select(Series).where(Series.owner_id == owner_id).limit(limit)
			results = self.session.exec(statement)
			return list(results)

		search_pattern = f"%{query.strip()}%"
		statement = (
			select(Series)
			.where(
				func.lower(Series.name).like(search_pattern.lower()),
				Series.owner_id == owner_id
			)
			.limit(limit)
		)
		results = self.session.exec(statement)
		return list(results)

	def get_or_create(self, name: str, owner_id: int) -> Series:
		"""Retourne une série existante ou en crée une nouvelle"""
		existing = self.get_by_name(name, owner_id)
		if existing:
			return existing
		series = Series(name=name, owner_id=owner_id)
		return self.create(series)
