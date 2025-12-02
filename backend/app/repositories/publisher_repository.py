from typing import List, Optional
from sqlmodel import Session, select, func
from app.models.Publisher import Publisher

class PublisherRepository:
	"""Repository de éditeurs"""
	def __init__(self, session: Session):
		self.session = session

	def create(self, publisher: Publisher) -> Publisher:
		"""Methode pour insérer un éditeur dans la base"""
		self.session.add(publisher)
		self.session.commit()
		self.session.refresh(publisher)
		return publisher

	def get_by_id(self, publisher_id: int) -> Optional[Publisher]:
		"""Retourne un éditeur en fonction de son ID"""
		return self.session.get(Publisher, publisher_id)

	def get_by_name(self, name: str, owner_id: int) -> Optional[Publisher]:
		"""Retourne un éditeur en fonction de son nom et owner_id"""
		if not name:
			return None
		statement = select(Publisher).where(
			func.lower(Publisher.name) == name.lower(),
			Publisher.owner_id == owner_id
		)
		result =  self.session.exec(statement).first()
		return result

	def get_all(self, owner_id: int) -> List[Publisher]:
		"""Retourne tous les éditeurs d'un utilisateur"""
		statement = select(Publisher).where(Publisher.owner_id == owner_id)
		results = self.session.exec(statement)
		return list(results)

	def update(self, publisher: Publisher) -> Publisher:
		"""Met à jour un éditeur dans la base"""
		db_publisher = self.get_by_id(publisher.id)
		db_publisher.name = publisher.name
		self.session.add(db_publisher)
		self.session.commit()
		self.session.refresh(db_publisher)
		return db_publisher

	def delete(self, publisher: Publisher) -> None:
		"""Supprime un éditeur de la base"""
		self.session.delete(publisher)
		self.session.commit()

	def search_fuzzy(self, query: str, owner_id: int, limit: int = 10) -> List[Publisher]:
		"""Recherche fuzzy d'éditeurs par nom pour un utilisateur"""
		if not query or len(query.strip()) < 2:
			# Si requête trop courte, retourner les premiers résultats de l'utilisateur
			statement = select(Publisher).where(Publisher.owner_id == owner_id).limit(limit)
			results = self.session.exec(statement)
			return list(results)

		# Recherche avec LIKE (insensible à la casse) pour cet utilisateur
		search_pattern = f"%{query.strip()}%"
		statement = (
			select(Publisher)
			.where(
				func.lower(Publisher.name).like(search_pattern.lower()),
				Publisher.owner_id == owner_id
			)
			.limit(limit)
		)
		results = self.session.exec(statement)
		return list(results)