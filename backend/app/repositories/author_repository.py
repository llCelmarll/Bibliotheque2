from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.Author import Author
from app.schemas.Author import AuthorRead, AuthorCreate

class AuthorRepository:
	"""Repository pour les auteurs"""
	def __init__(self, session: Session):
		self.session = session

	def create (self, author: Author) -> Author:
		"""Méthode pour inserer un auteur dans la base"""
		self.session.add(author)
		self.session.commit()
		self.session.refresh(author)
		return author

	def get_by_id(self, author_id: int) -> Optional[Author]:
		"""Retourne un auteur en fonction de son ID."""
		return self.session.get(Author, author_id)

	def get_by_name(self, name: str) -> Optional[Author]:
		"""Retourne un auteur en fonction de son nom."""
		if not name:
			return None
		statement = select(Author).where(func.lower(Author.name) == name.lower())
		result =  self.session.exec(statement).first()
		return result

	def get_all(self) -> List[Author]:
		"""Retourne tous les auteurs."""
		statement = select(Author)
		results = self.session.exec(statement)
		return list(results)

	def update(self, author: Author) -> Author:
		"""Met à jour un auteur dans la base."""
		db_author = self.get_by_id(author.id)
		db_author.name = author.name
		self.session.add(db_author)
		self.session.commit()
		self.session.refresh(db_author)
		return db_author

	def delete(self, author: Author) -> None:
		"""Supprime un auteur de la base"""
		self.session.delete(author)
		self.session.commit()