from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.genre_model import Genre
from app.models.book_genre_link_model import BookGenreLink

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
		statement = select(Genre).where(
			func.lower(Genre.name) == name.lower()
		)
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
			statement = select(Genre).limit(limit)
			results = self.session.exec(statement)
			return list(results)

		search_pattern = f"%{query.strip()}%"
		statement = (
			select(Genre)
			.where(func.lower(Genre.name).like(search_pattern.lower()))
			.limit(limit)
		)
		results = self.session.exec(statement)
		return list(results)

	def get_book_genre_links(self, genre_id: int) -> List[BookGenreLink]:
		"""Retourne tous les liens book-genre pour un genre donné."""
		statement = select(BookGenreLink).where(BookGenreLink.genre_id == genre_id)
		return list(self.session.exec(statement))

	def get_book_genre_link(self, book_id: int, genre_id: int) -> Optional[BookGenreLink]:
		"""Retourne le lien book-genre pour une paire donnée, s'il existe."""
		statement = select(BookGenreLink).where(
			BookGenreLink.book_id == book_id,
			BookGenreLink.genre_id == genre_id,
		)
		return self.session.exec(statement).first()

	def delete_book_genre_link(self, link: BookGenreLink) -> None:
		"""Supprime un lien book-genre (sans commit)."""
		self.session.delete(link)

	def add_book_genre_link(self, book_id: int, genre_id: int) -> BookGenreLink:
		"""Crée un nouveau lien book-genre (sans commit)."""
		link = BookGenreLink(book_id=book_id, genre_id=genre_id)
		self.session.add(link)
		return link

	def delete_no_commit(self, genre: Genre) -> None:
		"""Supprime un genre sans committer (pour transactions groupées, ex: fusion)."""
		self.session.delete(genre)
