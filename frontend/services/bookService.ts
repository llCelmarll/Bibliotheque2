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