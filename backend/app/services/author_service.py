from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.Author import Author
from app.repositories.author_repository import AuthorRepository
from app.schemas.Author import AuthorCreate, AuthorRead, AuthorUpdate


class AuthorService:
	"""Service pour la logique metier des auteurs"""
	def __init__(self, session: Session):
		self.session = session
		self.author_repository = AuthorRepository(session)

	def get_all(self, owner_id: int) -> list[AuthorRead]:
		authors = self.author_repository.get_all(owner_id)
		author_read_list = []
		for author in authors:
			author_read_list.append(AuthorRead.model_validate(author))

		return author_read_list


	def create(self, author_data: AuthorCreate, owner_id: int) -> AuthorRead:
		"""Crée un nouvel Auteur"""
		self._validate_author_create(author_data, owner_id)
		author = Author(name=author_data.name, owner_id=owner_id)
		author = self.author_repository.create(author)
		author = AuthorRead.model_validate(author)
		return author

	def get_by_id(self, author_id: int, owner_id: int) -> AuthorRead:
		"""Récupère un Auteur par son ID"""
		author = self.author_repository.get_by_id(author_id)
		if not author or author.owner_id != owner_id:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Auteur introuvable")
		author = AuthorRead.model_validate(author)
		return author

	def update(self, author: AuthorUpdate, owner_id: int) -> AuthorRead:
		"""Met à jour un Auteur"""
		self._validate_author_update(author, owner_id)
		author = Author.model_validate(author)
		author = AuthorRead.model_validate(self.author_repository.update(author))
		return author

	def delete(self, author_id: int, owner_id: int) -> None:
		"""Supprime un Auteur"""
		author = self.author_repository.get_by_id(author_id)
		if not author or author.owner_id != owner_id:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Auteur introuvable")
		self.author_repository.delete(author)

	def _validate_author_create(self, author_data: AuthorCreate, owner_id: int) -> None:
		existing_author = self.author_repository.get_by_name(author_data.name, owner_id)
		if existing_author:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="L'auteur existe déjà"
			)
	def _validate_author_update(self, author_data: AuthorUpdate, owner_id: int) -> None:
		existing_author = self.author_repository.get_by_name(author_data.name, owner_id)
		if existing_author and existing_author.id != author_data.id:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="Un auteur avec ce nom existe déjà."
			)
		db_author = self.author_repository.get_by_id(author_data.id)
		if not db_author or db_author.owner_id != owner_id:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Auteur introuvable"
			)

	def search_fuzzy(self, query: str, owner_id: int, limit: int = 10) -> list[AuthorRead]:
		"""Recherche fuzzy d'auteurs"""
		authors = self.author_repository.search_fuzzy(query, owner_id, limit)
		return [AuthorRead.model_validate(author) for author in authors]