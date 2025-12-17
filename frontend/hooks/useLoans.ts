import { useState, useCallback, useEffect } from 'react';
import { Loan, LoanStatistics, LoanStatus } from '@/types/loan';
import { loanService } from '@/services/loanService';
import { useAuth } from '@/contexts/AuthContext';

interface UseLoansParams {
  filterStatus?: LoanStatus | 'all';
  autoLoad?: boolean;
}

export function useLoans({
  filterStatus = 'all',
  autoLoad = true,
}: UseLoansParams = {}) {
  const { isAuthenticated } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [statistics, setStatistics] = useState<LoanStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge les prêts selon le filtre de statut
   */
  const loadLoans = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let data: Loan[];

      switch (filterStatus) {
        case LoanStatus.ACTIVE:
          data = await loanService.getActiveLoans();
          break;
        case LoanStatus.OVERDUE:
          data = await loanService.getOverdueLoans();
          break;
        case 'all':
        default:
          data = await loanService.getAllLoans();
          break;
      }

      setLoans(data);
    } catch (err) {
      console.error('Erreur lors du chargement des prêts:', err);
      setError('Impossible de charger les prêts');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filterStatus]);

  /**
   * Charge les statistiques des prêts
   */
  const loadStatistics = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const stats = await loanService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
    }
  }, [isAuthenticated]);

  /**
   * Recharge les prêts et les statistiques
   */
  const refresh = useCallback(async () => {
    await Promise.all([loadLoans(), loadStatistics()]);
  }, [loadLoans, loadStatistics]);

  /**
   * Enregistre le retour d'un livre
   */
  const returnLoan = useCallback(async (loanId: number) => {
    try {
      await loanService.returnLoan(loanId);
      await refresh();
    } catch (err) {
      console.error('Erreur lors du retour du prêt:', err);
      throw err;
    }
  }, [refresh]);

  /**
   * Supprime un prêt
   */
  const deleteLoan = useCallback(async (loanId: number) => {
    try {
      await loanService.deleteLoan(loanId);
      await refresh();
    } catch (err) {
      console.error('Erreur lors de la suppression du prêt:', err);
      throw err;
    }
  }, [refresh]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadLoans();
      loadStatistics();
    }
  }, [autoLoad, loadLoans, loadStatistics]);

  return {
    loans,
    statistics,
    loading,
    error,
    loadLoans,
    loadStatistics,
    refresh,
    returnLoan,
    deleteLoan,
  };
}
