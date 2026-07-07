# schemas/Search.py
from typing import List, Optional, Generic, TypeVar
from sqlmodel import SQLModel
from app.schemas.author_schemas import AuthorRead
from app.schemas.publisher_schemas import PublisherRead
from app.schemas.genre_schemas import GenreRead
from app.schemas.series_schemas import SeriesRead

T = TypeVar('T')

class SearchResult(SQLModel, Generic[T]):
    """Résultat de recherche générique"""
    results: List[T]
    total: int
    query: str
    limit: int

class EntitySearchQuery(SQLModel):
    """Paramètres de recherche d'entité"""
    query: str
    limit: Optional[int] = 10
    exact_match: Optional[bool] = False

# Types de résultats spécialisés
class AuthorSearchResult(SQLModel):
    results: List[AuthorRead]
    total: int
    query: str
    limit: int

class PublisherSearchResult(SQLModel):
    results: List[PublisherRead]
    total: int
    query: str
    limit: int

class GenreSearchResult(SQLModel):
    results: List[GenreRead]
    total: int
    query: str
    limit: int

class SeriesSearchResult(SQLModel):
    results: List[SeriesRead]
    total: int
    query: str
    limit: int