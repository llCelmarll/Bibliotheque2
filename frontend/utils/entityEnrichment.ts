// utils/entityEnrichment.ts - Utilitaires pour enrichir les entités avec leur statut d'existence
import { Author, Publisher, Genre, Entity, AuthorMetadata, PublisherMetadata, GenreMetadata } from '@/types/entityTypes';
import { entityService } from '@/services/entityService';

/**
 * Enrichit une liste de noms d'auteurs en vérifiant leur existence en base
 */
export async function enrichAuthors(authorNames: string[]): Promise<Author[]> {
  const enrichedAuthors: Author[] = [];
  
  for (const name of authorNames) {
    // Recherche exacte pour voir si l'auteur existe
    try {
      const searchResults = await entityService.searchAuthors(name, 1);
      const exactMatch = searchResults.find(author => 
        author.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (exactMatch) {
        // Auteur existe en base
        enrichedAuthors.push({
          id: exactMatch.id,
          name: exactMatch.name, // Utilise le nom exact de la base
          exists: true,
          metadata: exactMatch.metadata
        });
      } else {
        // Nouvel auteur
        enrichedAuthors.push({
          id: null,
          name: name.trim(),
          exists: false
        });
      }
    } catch (error) {
      console.warn('Erreur lors de la vérification auteur:', name, error);
      // En cas d'erreur, traiter comme nouveau
      enrichedAuthors.push({
        id: null,
        name: name.trim(),
        exists: false
      });
    }
  }
  
  return enrichedAuthors;
}

/**
 * Enrichit un nom d'éditeur en vérifiant son existence en base
 */
export async function enrichPublisher(publisherName: string): Promise<Entity<PublisherMetadata>[]> {
  if (!publisherName?.trim()) {
    return [];
  }
  
  try {
    // Recherche exacte pour voir si l'éditeur existe
    const searchResults = await entityService.searchPublishers(publisherName.trim(), 1);
    const exactMatch = searchResults.find(publisher => 
      publisher.name.toLowerCase().trim() === publisherName.toLowerCase().trim()
    );
    
    if (exactMatch) {
      // Éditeur existe en base
      return [{
        id: exactMatch.id,
        name: exactMatch.name, // Utilise le nom exact de la base
        exists: true,
        metadata: exactMatch.metadata
      }];
    } else {
      // Nouvel éditeur
      return [{
        id: null,
        name: publisherName.trim(),
        exists: false
      }];
    }
  } catch (error) {
    console.warn('Erreur lors de la vérification éditeur:', publisherName, error);
    // En cas d'erreur, traiter comme nouveau
    return [{
      id: null,
      name: publisherName.trim(),
      exists: false
    }];
  }
}

/**
 * Enrichit une liste de noms de genres en vérifiant leur existence en base
 */
export async function enrichGenres(genreNames: string[]): Promise<Entity<GenreMetadata>[]> {
  const enrichedGenres: Entity<GenreMetadata>[] = [];
  
  for (const name of genreNames) {
    // Recherche exacte pour voir si le genre existe
    try {
      const searchResults = await entityService.searchGenres(name, 1);
      const exactMatch = searchResults.find(genre => 
        genre.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (exactMatch) {
        // Genre existe en base
        enrichedGenres.push({
          id: exactMatch.id,
          name: exactMatch.name, // Utilise le nom exact de la base
          exists: true,
          metadata: exactMatch.metadata
        });
      } else {
        // Nouveau genre
        enrichedGenres.push({
          id: null,
          name: name.trim(),
          exists: false
        });
      }
    } catch (error) {
      console.warn('Erreur lors de la vérification genre:', name, error);
      // En cas d'erreur, traiter comme nouveau
      enrichedGenres.push({
        id: null,
        name: name.trim(),
        exists: false
      });
    }
  }
  
  return enrichedGenres;
}