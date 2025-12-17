// services/borrowerService.ts
import axios from 'axios';
import API_CONFIG from '@/config/api';
import { Borrower, BorrowerCreate, BorrowerUpdate } from '@/types/borrower';
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

class BorrowerService {

  /**
   * Récupère tous les emprunteurs de l'utilisateur connecté
   */
  async getAllBorrowers(): Promise<Borrower[]> {
    console.log('📋 Récupération de tous les emprunteurs');

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.BORROWERS}`);
      console.log('✅ Emprunteurs récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des emprunteurs:', error);
      throw error;
    }
  }

  /**
   * Récupère un emprunteur par son ID
   */
  async getBorrowerById(id: number): Promise<Borrower> {
    console.log('🔍 Récupération emprunteur - ID:', id);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.BORROWERS}/${id}`);
      console.log('✅ Emprunteur récupéré:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'emprunteur:', error);
      throw error;
    }
  }

  /**
   * Recherche fuzzy d'emprunteurs par nom
   */
  async searchBorrowers(query: string): Promise<Borrower[]> {
    console.log('🔎 Recherche emprunteurs - query:', query);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.BORROWERS}/search`, {
        params: { query }
      });
      console.log('✅ Résultats de recherche:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche d\'emprunteurs:', error);
      throw error;
    }
  }

  /**
   * Crée un nouvel emprunteur
   */
  async createBorrower(borrowerData: BorrowerCreate): Promise<Borrower> {
    console.log('➕ Création emprunteur - données:', JSON.stringify(borrowerData, null, 2));

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.BORROWERS, borrowerData);
      console.log('✅ Emprunteur créé avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'emprunteur:', error);
      throw error;
    }
  }

  /**
   * Met à jour un emprunteur existant
   */
  async updateBorrower(id: number, borrowerData: BorrowerUpdate): Promise<Borrower> {
    console.log('📝 Mise à jour emprunteur - ID:', id, 'données:', JSON.stringify(borrowerData, null, 2));

    try {
      const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.BORROWERS}/${id}`, borrowerData);
      console.log('✅ Emprunteur mis à jour avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'emprunteur:', error);
      throw error;
    }
  }

  /**
   * Supprime un emprunteur
   */
  async deleteBorrower(id: number): Promise<void> {
    console.log('🗑️ Suppression emprunteur - ID:', id);

    try {
      await apiClient.delete(`${API_CONFIG.ENDPOINTS.BORROWERS}/${id}`);
      console.log('✅ Emprunteur supprimé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l\'emprunteur:', error);
      throw error;
    }
  }

  /**
   * Valide les données de l'emprunteur avant envoi
   */
  validateBorrowerData(borrowerData: BorrowerCreate | BorrowerUpdate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Nom obligatoire pour la création
    if ('name' in borrowerData && borrowerData.name !== undefined) {
      if (!borrowerData.name?.trim()) {
        errors.push('Le nom est obligatoire');
      }
    }

    // Email valide si fourni
    if (borrowerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(borrowerData.email)) {
      errors.push('L\'adresse email doit être valide');
    }

    // Téléphone valide si fourni (format flexible)
    if (borrowerData.phone && !/^[\d\s\-\+\(\)\.]+$/.test(borrowerData.phone)) {
      errors.push('Le numéro de téléphone contient des caractères invalides');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const borrowerService = new BorrowerService();
