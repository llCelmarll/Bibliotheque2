// services/loanService.ts
import axios from 'axios';
import API_CONFIG from '@/config/api';
import { Loan, LoanCreate, LoanUpdate, LoanReturn, LoanStatistics } from '@/types/loan';
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

class LoanService {

  /**
   * Récupère tous les prêts de l'utilisateur connecté
   */
  async getAllLoans(): Promise<Loan[]> {
    console.log('📋 Récupération de tous les prêts');

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}`);
      console.log('✅ Prêts récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prêts:', error);
      throw error;
    }
  }

  /**
   * Récupère un prêt par son ID
   */
  async getLoanById(id: number): Promise<Loan> {
    console.log('🔍 Récupération prêt - ID:', id);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`);
      console.log('✅ Prêt récupéré:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du prêt:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les prêts actifs
   */
  async getActiveLoans(): Promise<Loan[]> {
    console.log('📋 Récupération des prêts actifs');

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}/active`);
      console.log('✅ Prêts actifs récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prêts actifs:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les prêts en retard
   */
  async getOverdueLoans(): Promise<Loan[]> {
    console.log('⚠️ Récupération des prêts en retard');

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}/overdue`);
      console.log('✅ Prêts en retard récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prêts en retard:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques des prêts
   */
  async getStatistics(): Promise<LoanStatistics> {
    console.log('📊 Récupération des statistiques');

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}/statistics`);
      console.log('✅ Statistiques récupérées:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des prêts pour un livre spécifique
   */
  async getLoansByBook(bookId: number): Promise<Loan[]> {
    console.log('📚 Récupération des prêts pour le livre - ID:', bookId);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}/by-book/${bookId}`);
      console.log('✅ Prêts du livre récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prêts du livre:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des prêts pour un emprunteur spécifique
   */
  async getLoansByBorrower(borrowerId: number): Promise<Loan[]> {
    console.log('👤 Récupération des prêts pour l\'emprunteur - ID:', borrowerId);

    try {
      const response = await apiClient.get(`${API_CONFIG.ENDPOINTS.LOANS}/by-borrower/${borrowerId}`);
      console.log('✅ Prêts de l\'emprunteur récupérés:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prêts de l\'emprunteur:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau prêt
   * Le champ borrower accepte 3 formats:
   * - number: ID d'un emprunteur existant
   * - string: Nom (sera créé automatiquement s'il n'existe pas)
   * - object: Données complètes pour créer un nouvel emprunteur
   */
  async createLoan(loanData: LoanCreate): Promise<Loan> {
    console.log('➕ Création prêt - données:', JSON.stringify(loanData, null, 2));

    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.LOANS, loanData);
      console.log('✅ Prêt créé avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la création du prêt:', error);
      throw error;
    }
  }

  /**
   * Met à jour un prêt existant
   */
  async updateLoan(id: number, loanData: LoanUpdate): Promise<Loan> {
    console.log('📝 Mise à jour prêt - ID:', id, 'données:', JSON.stringify(loanData, null, 2));

    try {
      const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`, loanData);
      console.log('✅ Prêt mis à jour avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du prêt:', error);
      throw error;
    }
  }

  /**
   * Enregistre le retour d'un livre
   */
  async returnLoan(id: number, returnData?: LoanReturn): Promise<Loan> {
    console.log('↩️ Retour du prêt - ID:', id);

    try {
      const response = await apiClient.put(`${API_CONFIG.ENDPOINTS.LOANS}/${id}/return`, returnData || {});
      console.log('✅ Retour enregistré avec succès:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du retour:', error);
      throw error;
    }
  }

  /**
   * Supprime un prêt
   */
  async deleteLoan(id: number): Promise<void> {
    console.log('🗑️ Suppression prêt - ID:', id);

    try {
      await apiClient.delete(`${API_CONFIG.ENDPOINTS.LOANS}/${id}`);
      console.log('✅ Prêt supprimé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du prêt:', error);
      throw error;
    }
  }

  /**
   * Valide les données du prêt avant envoi
   */
  validateLoanData(loanData: LoanCreate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // book_id obligatoire
    if (!loanData.book_id) {
      errors.push('Le livre est obligatoire');
    }

    // borrower obligatoire
    if (!loanData.borrower) {
      errors.push('L\'emprunteur est obligatoire');
    }

    // Si borrower est un objet, valider le nom
    if (typeof loanData.borrower === 'object' && !loanData.borrower.name?.trim()) {
      errors.push('Le nom de l\'emprunteur est obligatoire');
    }

    // Si borrower est une string, vérifier qu'elle n'est pas vide
    if (typeof loanData.borrower === 'string' && !loanData.borrower.trim()) {
      errors.push('Le nom de l\'emprunteur ne peut pas être vide');
    }

    // Valider les dates si fournies
    if (loanData.loan_date) {
      const loanDate = new Date(loanData.loan_date);
      if (isNaN(loanDate.getTime())) {
        errors.push('La date de prêt n\'est pas valide');
      }
    }

    if (loanData.due_date) {
      const dueDate = new Date(loanData.due_date);
      if (isNaN(dueDate.getTime())) {
        errors.push('La date d\'échéance n\'est pas valide');
      }

      // Vérifier que due_date est après loan_date
      if (loanData.loan_date) {
        const loanDate = new Date(loanData.loan_date);
        if (dueDate <= loanDate) {
          errors.push('La date d\'échéance doit être postérieure à la date de prêt');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcule si un prêt est en retard
   */
  isOverdue(loan: Loan): boolean {
    if (!loan.due_date || loan.return_date) {
      return false;
    }
    return new Date(loan.due_date) < new Date();
  }

  /**
   * Calcule le nombre de jours de retard
   */
  getDaysOverdue(loan: Loan): number {
    if (!this.isOverdue(loan)) {
      return 0;
    }
    const dueDate = new Date(loan.due_date!);
    const now = new Date();
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcule le nombre de jours restants avant échéance
   */
  getDaysRemaining(loan: Loan): number {
    if (!loan.due_date || loan.return_date) {
      return 0;
    }
    const dueDate = new Date(loan.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const loanService = new LoanService();
