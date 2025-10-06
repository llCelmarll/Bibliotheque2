from typing import Optional, List
from sqlmodel import Session, select, or_, and_, func
from sqlalchemy import desc, asc
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.schemas.Book import BookSearchParams, BookAdvancedSearchParams
from app.schemas.Other import Filter, FilterType, SortBy, SortOrder

class BookRepository:
	"""Repository pour les opérations de données de livres"""

	def __init__(self, session: Session):
		self.session = session

	def get_by_id(self, book_id: int) -> Optional[Book]:
		"""Retourne un livre en fonction de son ID."""
		return self.session.get(Book, book_id)

	def search_books(self, params: BookSearchParams) -> List[Book]:
		"""Recherche simple de tous les champs"""
		stmt = self._build_base_query()

		if params.search:
			stmt = self._apply_global_search(stmt, params.search)

		if params.filters:
			stmt = self._apply_filters(stmt, params.filters)

		stmt = self._apply_sorting(stmt, params.sort_by, params.sort_order)
		stmt = self._apply_pagination(stmt, params.skip, params.limit)

		return list(self.session.exec(stmt.distinct()).all())

	def advanced_search_books(self, params: BookAdvancedSearchParams) -> List[Book]:
		"""Recherche avancée avec filtres spécifiques"""
		stmt = self._build_base_query()
		conditions = self._build_advanced_conditions(params)

		if conditions:
			stmt = stmt.where(and_(*conditions))

		stmt = self._apply_sorting(stmt, params.sort_by, params.sort_order)
		stmt = self._apply_pagination(stmt, params.skip, params.limit)

		return list(self.session.exec(stmt.distinct()).all())

	def get_statistics(self) -> dict:
		"""Récupère les statistiques des livres"""
		# Requête pour le nombre total de livres
		total_books_stmt = select(func.count(Book.id))
		total_books = self.session.exec(total_books_stmt).first()

		# Requête pour la moyenne des pages
		avg_pages_stmt = select(func.avg(Book.page_count)).where(Book.page_count != None)
		avg_pages = self.session.exec(avg_pages_stmt).first()

		# Requête pour l'année la plus ancienne
		oldest_year_stmt = select(func.min(Book.published_date)).where(Book.published_date != None)
		oldest_year = self.session.exec(oldest_year_stmt).first()

		# Requête pour l'année la plus récente
		newest_year_stmt = select(func.max(Book.published_date)).where(Book.published_date != None)
		newest_year = self.session.exec(newest_year_stmt).first()

		return {
			"total_books": total_books or 0,
			"average_pages": round(avg_pages, 2) if avg_pages else None,
			"oldest_publication_year": oldest_year,
			"newest_publication_year": newest_year
		}

	def _build_base_query(self) -> select:
		"""Construit la requête de base avec les jointures"""
		return select(Book).join(Author, Book.authors, isouter=True) \
			.join(Publisher, Book.publisher, isouter=True) \
			.join(Genre, Book.genres, isouter=True)  # Corrigé : Book.genres au lieu de Book.genre

	def _apply_global_search(self, stmt, search_term: str) -> select:
		"""
		Applique la recherche globale sur les champs:
		- titre
		- ISBN
		- nom de l'auteur
		- nom de l'éditeur
		- nom du genre
		"""
		search_pattern = f"%{search_term.lower()}%"
		return stmt.where(
			or_(
				func.lower(Book.title).like(search_pattern),
				func.lower(Book.isbn).like(search_pattern),
				func.lower(Author.name).like(search_pattern),
				func.lower(Publisher.name).like(search_pattern),
				func.lower(Genre.name).like(search_pattern),
			)
		)

	def _apply_filters(self, stmt, filters: List[Filter]) -> select:
		"""
		Applique les filtres sur les champs:
		-auteurs
		-éditeur
		-genre
		"""
		if not filters:
			return stmt

		filter_conditions = []

		for filter in filters:
			if filter.type == FilterType.AUTHOR:
				filter_conditions.append(Author.id == filter.id)
			elif filter.type == FilterType.PUBLISHER:
				filter_conditions.append(Publisher.id == filter.id)
			elif filter.type == FilterType.GENRE:
				filter_conditions.append(Genre.id == filter.id)
			else:
				raise ValueError(f"Type de filtre inconnu: {filter.type}")

		if filter_conditions:
			stmt = stmt.where(and_(*filter_conditions))

		return stmt

	def _build_advanced_conditions(self, params: BookAdvancedSearchParams) -> List:
		"""Construit les conditions pour la recherche avancée"""
		conditions = []

		if params.title:
			conditions.append(func.lower(Book.title).like(f"%{params.title.lower()}%"))

		if params.author:
			conditions.append(func.lower(Author.name).like(f"%{params.author.lower()}%"))

		if params.publisher:
			conditions.append(func.lower(Publisher.name).like(f"%{params.publisher.lower()}%"))

		if params.genre:
			conditions.append(func.lower(Genre.name).like(f"%{params.genre.lower()}%"))

		if params.isbn:
			conditions.append(func.lower(Book.isbn).like(f"%{params.isbn.lower()}%"))

		if params.year_min:
			conditions.append(Book.published_date >= params.year_min)

		if params.year_max:
			conditions.append(Book.published_date <= params.year_max)

		if params.page_min:
			conditions.append(Book.page_count >= params.page_min)

		if params.page_max:
			conditions.append(Book.page_count <= params.page_max)

		return conditions

	def _apply_sorting(self, stmt, sort_by: SortBy, sort_order: SortOrder):
		"""Applique le tri"""
		order_field = self._get_order_field(sort_by)

		if sort_order == SortOrder.desc:
			order_clause = desc(order_field)
		else:
			order_clause = asc(order_field)

		return stmt.order_by(order_clause)

	def _get_order_field(self, sort_by: SortBy):
		"""Retourne le champ de tri"""
		field_mapping = {
			SortBy.title: Book.title,
			SortBy.published_date: Book.published_date,
			SortBy.page_count: Book.page_count,
			SortBy.isbn: Book.isbn,  # Ajouté ISBN manquant
			SortBy.created_at: Book.id,  # Proxy pour created_date (en attendant les timestamps)
			SortBy.updated_at: Book.id,  # Proxy pour updated_date (en attendant les timestamps)
			SortBy.author: Author.name,
			SortBy.publisher: Publisher.name,
			SortBy.genre: Genre.name
		}
		return field_mapping.get(sort_by, Book.title)

	def _apply_pagination(self, stmt, skip: int, limit: int):
		"""Applique la pagination"""
		return stmt.offset(skip).limit(limit)