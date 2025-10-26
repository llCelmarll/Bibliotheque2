// services/bookService.ts
import API_CONFIG from '@/config/api';
import { BookCreate, BookRead } from '@/types/scanTypes';

class BookService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  /**
   * Crée un nouveau livre
   */
  async createBook(bookData: BookCreate): Promise<BookRead> {
    console.log('📚 Création livre - données envoyées:', JSON.stringify(bookData, null, 2));
    
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.ENDPOINTS.BOOKS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      });

      console.log('📡 Réponse API - status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API création livre:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const createdBook = await response.json();
      console.log('✅ Livre créé avec succès:', createdBook);
      
      return createdBook;
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