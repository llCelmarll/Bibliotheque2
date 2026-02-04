// services/api/types.ts
export interface ApiSearchResult<T> {
  results: T[];
  total: number;
  query: string;
  limit: number;
}

export interface ApiAuthor {
  id: number;
  name: string;
}

export interface ApiPublisher {
  id: number;
  name: string;
}

export interface ApiGenre {
  id: number;
  name: string;
}

export interface CreateAuthorRequest {
  name: string;
}

export interface CreatePublisherRequest {
  name: string;
}

export interface CreateGenreRequest {
  name: string;
}

export interface ApiSeries {
  id: number;
  name: string;
}

export interface CreateSeriesRequest {
  name: string;
}

export type AuthorSearchResult = ApiSearchResult<ApiAuthor>;
export type PublisherSearchResult = ApiSearchResult<ApiPublisher>;
export type GenreSearchResult = ApiSearchResult<ApiGenre>;
export type SeriesSearchResult = ApiSearchResult<ApiSeries>;