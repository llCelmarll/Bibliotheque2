from enum import Enum

from pydantic import BaseModel


class SortBy(str, Enum):
	"""Enum pour les champs de tri."""
	title = "title"
	published_date = "published_date"
	page_count = "page_count"
	isbn = "isbn"
	author = "author"
	publisher = "publisher"
	genre = "genre"
	created_at = "created_at"
	updated_at = "updated_at"

class SortOrder(str, Enum):
	asc = "asc"
	desc = "desc"

class FilterType(Enum):
	AUTHOR = "author"
	PUBLISHER = "publisher"
	GENRE = "genre"
	SERIES = "series"

class Filter(BaseModel):
	type: FilterType
	id: int

