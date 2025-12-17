import { useState, useCallback, useEffect } from 'react';
import { Loan, LoanUpdate } from '@/types/loan';
import { loanService } from '@/services/loanService';
import { useAuth } from '@/contexts/AuthContext';

interface UseLoanDetailParams {
  loanId: number;
  autoLoad?: boolean;
}

export function useLoanDetail({
  loanId,
  autoLoad = true,
}: UseLoanDetailParams) {
  const { isAuthenticated } = useAuth();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge les détails d'un prêt
   */
  const loadLoan = useCallback(async () => {
    if (!isAuthenticated || !loanId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await loanService.getLoanById(loanId);
      setLoan(data);
    } catch (err) {
      console.error('Erreur lors du chargement du prêt:', err);
      setError('Impossible de charger les détails du prêt');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loanId]);

  /**
   * Met à jour le prêt
   */
  const updateLoan = useCallback(async (updateData: LoanUpdate) => {
    if (!loanId) return;

    try {
      const updated = await loanService.updateLoan(loanId, updateData);
      setLoan(updated);
      return updated;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du prêt:', err);
      throw err;
    }
  }, [loanId]);

  /**
   * Enregistre le retour du livre
   */
  const returnLoan = useCallback(async () => {
    if (!loanId) return;

    try {
      const returned = await loanService.returnLoan(loanId);
      setLoan(returned);
      return returned;
    } catch (err) {
      console.error('Erreur lors du retour du prêt:', err);
      throw err;
    }
  }, [loanId]);

  /**
   * Supprime le prêt
   */
  const deleteLoan = useCallback(async () => {
    if (!loanId) return;

    try {
      await loanService.deleteLoan(loanId);
      setLoan(null);
    } catch (err) {
      console.error('Erreur lors de la suppression du prêt:', err);
      throw err;
    }
  }, [loanId]);

  /**
   * Calcule si le prêt est en retard
   */
  const isOverdue = useCallback(() => {
    if (!loan) return false;
    return loanService.isOverdue(loan);
  }, [loan]);

  /**
   * Calcule le nombre de jours de retard
   */
  const getDaysOverdue = useCallback(() => {
    if (!loan) return 0;
    return loanService.getDaysOverdue(loan);
  }, [loan]);

  /**
   * Calcule le nombre de jours restants
   */
  const getDaysRemaining = useCallback(() => {
    if (!loan) return 0;
    return loanService.getDaysRemaining(loan);
  }, [loan]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadLoan();
    }
  }, [autoLoad, loadLoan]);

  return {
    loan,
    loading,
    error,
    loadLoan,
    updateLoan,
    returnLoan,
    deleteLoan,
    isOverdue,
    getDaysOverdue,
    getDaysRemaining,
  };
}
