// services/entityService.ts - Service unifié avec fallback mock/API
import { Author, Publisher, Genre } from '@/types/entityTypes';
import { FEATURE_FLAGS } from '@/utils/featureFlags';

// Import des services
import { entityService as apiEntityService } from './api/entityService';
import { 
  searchMockAuthors, 
  searchMockPublishers, 
  searchMockGenres,
  MOCK_AUTHORS,
  MOCK_PUBLISHERS,
  MOCK_GENRES
} from '@/data/mockEntities';

class UnifiedEntityService {
  // === AUTHORS ===
  async searchAuthors(query: string, limit: number = 10): Promise<Author[]> {
    if (FEATURE_FLAGS.USE_API_AUTHORS) {
      console.log('🌐 Utilisation API pour auteurs:', query);
      try {
        const results = await apiEntityService.searchAuthors(query, limit);
        console.log('✅ API auteurs réussie:', results.length, 'résultats');
        return results;
      } catch (error) {
        console.warn('❌ API Authors failed, falling back to mock:', error);
        const mockResults = searchMockAuthors(query, limit);
        console.log('🔄 Fallback mock auteurs:', mockResults.length, 'résultats');
        return mockResults;
      }
    }
    
    console.log('📋 Utilisation MOCK pour auteurs:', query);
    return searchMockAuthors(query, limit);
  }

  async createAuthor(name: string): Promise<Author> {
    if (FEATURE_FLAGS.USE_API_AUTHORS) {
      try {
        return await apiEntityService.createAuthor(name);
      } catch (error) {
        console.warn('API Author creation failed, falling back to mock:', error);
        // Simuler la création en mock
        return this.createMockAuthor(name);
      }
    }
    
    return this.createMockAuthor(name);
  }

  // === PUBLISHERS ===
  async searchPublishers(query: string, limit: number = 10): Promise<Publisher[]> {
    if (FEATURE_FLAGS.USE_API_PUBLISHERS) {
      console.log('🌐 Utilisation API pour éditeurs:', query);
      try {
        const results = await apiEntityService.searchPublishers(query, limit);
        console.log('✅ API éditeurs réussie:', results.length, 'résultats');
        return results;
      } catch (error) {
        console.warn('❌ API Publishers failed, falling back to mock:', error);
        const mockResults = searchMockPublishers(query, limit);
        console.log('🔄 Fallback mock éditeurs:', mockResults.length, 'résultats');
        return mockResults;
      }
    }
    
    console.log('📋 Utilisation MOCK pour éditeurs:', query);
    return searchMockPublishers(query, limit);
  }

  async createPublisher(name: string): Promise<Publisher> {
    if (FEATURE_FLAGS.USE_API_PUBLISHERS) {
      try {
        return await apiEntityService.createPublisher(name);
      } catch (error) {
        console.warn('API Publisher creation failed, falling back to mock:', error);
        return this.createMockPublisher(name);
      }
    }
    
    return this.createMockPublisher(name);
  }

  // === GENRES ===
  async searchGenres(query: string, limit: number = 10): Promise<Genre[]> {
    if (FEATURE_FLAGS.USE_API_GENRES) {
      try {
        return await apiEntityService.searchGenres(query, limit);
      } catch (error) {
        console.warn('API Genres failed, falling back to mock:', error);
        return searchMockGenres(query, limit);
      }
    }
    
    return searchMockGenres(query, limit);
  }

  async createGenre(name: string): Promise<Genre> {
    if (FEATURE_FLAGS.USE_API_GENRES) {
      try {
        return await apiEntityService.createGenre(name);
      } catch (error) {
        console.warn('API Genre creation failed, falling back to mock:', error);
        return this.createMockGenre(name);
      }
    }
    
    return this.createMockGenre(name);
  }

  // === MOCK CREATORS (pour fallback) ===
  private createMockAuthor(name: string): Author {
    const existingIds = MOCK_AUTHORS.map(a => a.id).filter((id): id is number => id != null);
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return {
      id: newId,
      name,
      exists: false, // Marqué comme nouveau
    };
  }

  private createMockPublisher(name: string): Publisher {
    const existingIds = MOCK_PUBLISHERS.map(p => p.id).filter((id): id is number => id != null);
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return {
      id: newId,
      name,
      exists: false,
    };
  }

  private createMockGenre(name: string): Genre {
    const existingIds = MOCK_GENRES.map(g => g.id).filter((id): id is number => id != null);
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    return {
      id: newId,
      name,
      exists: false,
    };
  }

  // === UTILS ===
  isUsingApiFor(entityType: 'authors' | 'publishers' | 'genres'): boolean {
    switch (entityType) {
      case 'authors': return FEATURE_FLAGS.USE_API_AUTHORS;
      case 'publishers': return FEATURE_FLAGS.USE_API_PUBLISHERS;
      case 'genres': return FEATURE_FLAGS.USE_API_GENRES;
      default: return false;
    }
  }
}

export const entityService = new UnifiedEntityService();