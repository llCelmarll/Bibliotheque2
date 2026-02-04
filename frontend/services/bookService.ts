// services/bookService.ts
import axios from 'axios';
import API_CONFIG from '@/config/api';
import { BookCreate, BookRead } from '@/types/scanTypes';
import { BookUpdate } from '@/types/book';
import { setupAuthInterceptor } from '@/services/api/authInterceptor';

// Configuration axios avec intercepteur d'authentification
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter l'intercepteur d'authentification
setupAuthInterceptor(apiClient);

class BookService {

  /**
   * Met à jour un livre existant
   */
  async updateBook(bookId: string, bookData: BookUpdate): Promise<BookRead> {
    console.log('📝 Mise à jour livre - ID:', bookId, 'données:', JSON.stringify(bookData, null, 2));
    
    try {
      const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`, bookData);
      console.log('✅ Livre mis à jour avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du livre:', error);
      throw error;
    }
  }

  /**
   * Supprime un livre
   */
  async deleteBook(bookId: string): Promise<void> {
    console.log('🗑️ Suppression livre - ID:', bookId);
    
    try {
      await apiClient.delete(`${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}`);
      console.log('✅ Livre supprimé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du livre:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau livre
   */
  async createBook(bookData: BookCreate): Promise<BookRead> {
    console.log('📚 Création livre - données envoyées:', JSON.stringify(bookData, null, 2));
    
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.BOOKS, bookData);
      console.log('✅ Livre créé avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la création du livre:', error);
      throw error;
    }
  }

  /**
   * Import en masse de livres depuis un CSV
   */
  async bulkCreateBooks(booksData: BookCreate[], skipErrors: boolean = true, populateCovers: boolean = false): Promise<{
    success: number;
    failed: number;
    total: number;
    created: BookRead[];
    errors: Array<{
      line: number;
      title: string;
      isbn: string;
      error: string;
    }>;
  }> {
    console.log('📦 Import en masse - livres:', booksData.length, 'skip_errors:', skipErrors);
    
    try {
      const url = `${API_CONFIG.ENDPOINTS.BOOKS}/bulk?skip_errors=${skipErrors}&populate_covers=${populateCovers}`;
      console.log('➡️ Appel API bulkCreateBooks', {
        baseURL: apiClient.defaults.baseURL,
        url,
        timeout: apiClient.defaults.timeout,
      });

      // Pour de très gros imports, envoyer en lots pour éviter les limites réseau/proxy
      const CHUNK_SIZE = 10;
      if (booksData.length > CHUNK_SIZE) {
        console.log(`🔀 Envoi par lots: ${booksData.length} éléments, taille lot=${CHUNK_SIZE}`);
        let aggregate = {
          success: 0,
          failed: 0,
          total: booksData.length,
          created: [] as BookRead[],
          errors: [] as Array<{
            line: number;
            title: string;
            isbn: string;
            error: string;
          }>,
        };

        for (let start = 0; start < booksData.length; start += CHUNK_SIZE) {
          const end = Math.min(start + CHUNK_SIZE, booksData.length);
          const batch = booksData.slice(start, end);
          const batchIndex = start / CHUNK_SIZE + 1;
          console.log(`➡️ Envoi lot ${batchIndex}: items ${start + 1}..${end}`, { count: batch.length });
          console.time(`lot_${batchIndex}`);
          const response = await apiClient.post(url, batch, { timeout: 300000 });
          console.timeEnd(`lot_${batchIndex}`);
          const data = response.data as typeof aggregate;
          aggregate.success += data.success || 0;
          aggregate.failed += data.failed || 0;
          if (Array.isArray(data.created)) aggregate.created.push(...(data.created as any));
          if (Array.isArray(data.errors)) {
            // Réindexer les lignes au global
            aggregate.errors.push(
              ...data.errors.map((e) => ({
                ...e,
                line: (e.line || 0) + start,
              }))
            );
          }
          // Laisser l'UI respirer entre les lots
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        console.log('✅ Import terminé (lots):', aggregate);
        return aggregate as any;
      } else {
        const response = await apiClient.post(
          url,
          booksData,
          {
            // Import de CSV peut prendre longtemps selon le volume et les traitements backend
            timeout: 300000, // 5 minutes
          }
        );
        console.log('✅ Import terminé:', response.data);
        return response.data;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Erreur lors de l\'import en masse (Axios):', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          timeout: error.config?.timeout,
          method: error.config?.method,
        });
      } else {
        console.error('❌ Erreur lors de l\'import en masse (Unknown):', error);
      }
      throw error;
    }
  }

  /**
   * Met à jour le statut de lecture d'un livre
   */
  async toggleReadStatus(bookId: string, isRead: boolean | null, readDate?: string | null): Promise<BookRead> {
    try {
      const response = await apiClient.patch(
        `${API_CONFIG.ENDPOINTS.BOOKS}/${bookId}/read-status`,
        { is_read: isRead, read_date: readDate || null }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut de lecture:', error);
      throw error;
    }
  }

  /**
   * Valide les données du livre avant envoi
   */
  validateBookData(bookData: BookCreate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Titre obligatoire
    if (!bookData.title?.trim()) {
      errors.push('Le titre est obligatoire');
    }

    // ISBN optionnel mais doit être valide si fourni
    if (bookData.isbn && !/^\d{10}(\d{3})?$/.test(bookData.isbn.replace(/-/g, ''))) {
      errors.push('L\'ISBN doit contenir 10 ou 13 chiffres');
    }

    // Page count positif si fourni
    if (bookData.page_count && bookData.page_count <= 0) {
      errors.push('Le nombre de pages doit être positif');
    }

    // URL de couverture valide si fournie  
    if (bookData.cover_url && !bookData.cover_url.match(/^https?:\/\/.+/)) {
      errors.push('L\'URL de couverture doit être valide');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const bookService = new BookService();