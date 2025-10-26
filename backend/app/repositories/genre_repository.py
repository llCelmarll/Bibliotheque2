from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.Genre import Genre

class GenreRepository:
	"""Repository des genres"""
	def __init__(self, session: Session):
		self.session = session

	def create(self, genre: Genre) -> Genre:
		"""Ajoute un genre à la base"""
		self.session.add(genre)
		self.session.commit()
		self.session.refresh(genre)
		return genre

	def get_by_id(self, genre_id: int) -> Optional[Genre]:
		"""Retourne un genre en fonction de son ID"""
		return self.session.get(Genre, genre_id)

	def get_by_name(self, name: str) -> Optional[Genre]:
		"""Retourne un genre en fonction de son nom"""
		statement = select(Genre).where(func.lower(Genre.name) == name.lower())
		result =  self.session.exec(statement).first()
		return result

	def get_all(self) -> List[Genre]:
		"""Retourne tous les genres"""
		statement = select(Genre)
		results = self.session.exec(statement)
		return list(results)

	def update(self, genre: Genre) -> Genre:
		"""Met à jour un genre dans la base"""
		db_genre = self.get_by_id(genre.id)
		if not db_genre:
			raise ValueError("Genre not found")
		db_genre.name = genre.name
		self.session.add(db_genre)
		self.session.commit()
		self.session.refresh(db_genre)
		return db_genre

	def delete(self, genre: Genre) -> None:
		"""Supprime un genre de la base"""
		self.session.delete(genre)
		self.session.commit()

	def search_fuzzy(self, query: str, limit: int = 10) -> List[Genre]:
		"""Recherche fuzzy de genres par nom"""
		if not query or len(query.strip()) < 2:
			# Si requête trop courte, retourner les premiers résultats
			statement = select(Genre).limit(limit)
			results = self.session.exec(statement)
			return list(results)
		
		# Recherche avec LIKE (insensible à la casse)
		search_pattern = f"%{query.strip()}%"
		statement = (
			select(Genre)
			.where(func.lower(Genre.name).like(search_pattern.lower()))
			.limit(limit)
		)
		results = self.session.exec(statement)
		return list(results)