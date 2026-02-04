// services/api/entityService.ts
import { apiClient } from './client';
import { API_ENDPOINTS } from './config';
import {
  AuthorSearchResult,
  PublisherSearchResult,
  GenreSearchResult,
  SeriesSearchResult,
  ApiAuthor,
  ApiPublisher,
  ApiGenre,
  ApiSeries,
  CreateAuthorRequest,
  CreatePublisherRequest,
  CreateGenreRequest,
  CreateSeriesRequest,
} from './types';
import { Author, Publisher, Genre, Series } from '@/types/entityTypes';

class EntityService {
  // === AUTHORS ===
  async searchAuthors(query: string, limit: number = 10): Promise<Author[]> {
    try {
      const result = await apiClient.get<AuthorSearchResult>(
        API_ENDPOINTS.AUTHORS.SEARCH,
        { query, limit }
      );
      
      return result.results.map(this.mapApiAuthorToAuthor);
    } catch (error) {
      console.error('Error searching authors:', error);
      throw error;
    }
  }

  async createAuthor(name: string): Promise<Author> {
    try {
      const apiAuthor = await apiClient.post<ApiAuthor>(
        API_ENDPOINTS.AUTHORS.CREATE,
        { name } as CreateAuthorRequest
      );
      
      return this.mapApiAuthorToAuthor(apiAuthor);
    } catch (error) {
      console.error('Error creating author:', error);
      throw error;
    }
  }

  // === PUBLISHERS ===
  async searchPublishers(query: string, limit: number = 10): Promise<Publisher[]> {
    try {
      const result = await apiClient.get<PublisherSearchResult>(
        API_ENDPOINTS.PUBLISHERS.SEARCH,
        { query, limit }
      );
      
      return result.results.map(this.mapApiPublisherToPublisher);
    } catch (error) {
      console.error('Error searching publishers:', error);
      throw error;
    }
  }

  async createPublisher(name: string): Promise<Publisher> {
    try {
      const apiPublisher = await apiClient.post<ApiPublisher>(
        API_ENDPOINTS.PUBLISHERS.CREATE,
        { name } as CreatePublisherRequest
      );
      
      return this.mapApiPublisherToPublisher(apiPublisher);
    } catch (error) {
      console.error('Error creating publisher:', error);
      throw error;
    }
  }

  // === GENRES ===
  async searchGenres(query: string, limit: number = 10): Promise<Genre[]> {
    try {
      const result = await apiClient.get<GenreSearchResult>(
        API_ENDPOINTS.GENRES.SEARCH,
        { query, limit }
      );
      
      return result.results.map(this.mapApiGenreToGenre);
    } catch (error) {
      console.error('Error searching genres:', error);
      throw error;
    }
  }

  async createGenre(name: string): Promise<Genre> {
    try {
      const apiGenre = await apiClient.post<ApiGenre>(
        API_ENDPOINTS.GENRES.CREATE,
        { name } as CreateGenreRequest
      );
      
      return this.mapApiGenreToGenre(apiGenre);
    } catch (error) {
      console.error('Error creating genre:', error);
      throw error;
    }
  }

  // === SERIES ===
  async searchSeries(query: string, limit: number = 10): Promise<Series[]> {
    try {
      const result = await apiClient.get<SeriesSearchResult>(
        API_ENDPOINTS.SERIES.SEARCH,
        { query, limit }
      );

      return result.results.map(this.mapApiSeriesToSeries);
    } catch (error) {
      console.error('Error searching series:', error);
      throw error;
    }
  }

  async createSeries(name: string): Promise<Series> {
    try {
      const apiSeries = await apiClient.post<ApiSeries>(
        API_ENDPOINTS.SERIES.CREATE,
        { name } as CreateSeriesRequest
      );

      return this.mapApiSeriesToSeries(apiSeries);
    } catch (error) {
      console.error('Error creating series:', error);
      throw error;
    }
  }

  // === MAPPERS ===
  private mapApiAuthorToAuthor(apiAuthor: ApiAuthor): Author {
    return {
      id: apiAuthor.id,
      name: apiAuthor.name,
      exists: true,
      // Pas de metadata pour le moment
    };
  }

  private mapApiPublisherToPublisher(apiPublisher: ApiPublisher): Publisher {
    return {
      id: apiPublisher.id,
      name: apiPublisher.name,
      exists: true,
      // Pas de metadata pour le moment
    };
  }

  private mapApiGenreToGenre(apiGenre: ApiGenre): Genre {
    return {
      id: apiGenre.id,
      name: apiGenre.name,
      exists: true,
    };
  }

  private mapApiSeriesToSeries(apiSeries: ApiSeries): Series {
    return {
      id: apiSeries.id,
      name: apiSeries.name,
      exists: true,
    };
  }
}

export const entityService = new EntityService();