from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.series_model import Series
from app.models.book_series_link_model import BookSeriesLink

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

	def get_by_name(self, name: str) -> Optional[Series]:
		"""Retourne une série en fonction de son nom"""
		statement = select(Series).where(
			func.lower(Series.name) == name.lower()
		)
		result = self.session.exec(statement).first()
		return result

	def get_all(self) -> List[Series]:
		"""Retourne toutes les séries"""
		statement = select(Series).order_by(Series.name)
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

	def search_fuzzy(self, query: str, limit: int = 10) -> List[Series]:
		"""Recherche fuzzy de séries par nom"""
		if not query or len(query.strip()) < 2:
			statement = select(Series).limit(limit)
			results = self.session.exec(statement)
			return list(results)

		search_pattern = f"%{query.strip()}%"
		statement = (
			select(Series)
			.where(func.lower(Series.name).like(search_pattern.lower()))
			.limit(limit)
		)
		results = self.session.exec(statement)
		return list(results)

	def get_or_create(self, name: str) -> Series:
		"""Retourne une série existante ou en crée une nouvelle"""
		existing = self.get_by_name(name)
		if existing:
			return existing
		series = Series(name=name)
		return self.create(series)

	def get_book_series_links(self, series_id: int) -> List[BookSeriesLink]:
		"""Retourne tous les liens book-series pour une série donnée."""
		statement = select(BookSeriesLink).where(BookSeriesLink.series_id == series_id)
		return list(self.session.exec(statement))

	def get_book_series_link(self, book_id: int, series_id: int) -> Optional[BookSeriesLink]:
		"""Retourne le lien book-series pour une paire donnée, s'il existe."""
		statement = select(BookSeriesLink).where(
			BookSeriesLink.book_id == book_id,
			BookSeriesLink.series_id == series_id,
		)
		return self.session.exec(statement).first()

	def delete_book_series_link(self, link: BookSeriesLink) -> None:
		"""Supprime un lien book-series (sans commit)."""
		self.session.delete(link)

	def add_book_series_link(self, book_id: int, series_id: int, volume_number: Optional[int]) -> BookSeriesLink:
		"""Crée un nouveau lien book-series en préservant le numéro de tome (sans commit)."""
		link = BookSeriesLink(book_id=book_id, series_id=series_id, volume_number=volume_number)
		self.session.add(link)
		return link

	def delete_no_commit(self, series: Series) -> None:
		"""Supprime une série sans committer (pour transactions groupées, ex: fusion)."""
		self.session.delete(series)
