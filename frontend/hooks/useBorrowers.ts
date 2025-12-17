import { useState, useCallback, useEffect } from 'react';
import { Borrower, BorrowerCreate, BorrowerUpdate } from '@/types/borrower';
import { borrowerService } from '@/services/borrowerService';
import { useAuth } from '@/contexts/AuthContext';

interface UseBorrowersParams {
  autoLoad?: boolean;
}

export function useBorrowers({
  autoLoad = true,
}: UseBorrowersParams = {}) {
  const { isAuthenticated } = useAuth();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Charge tous les emprunteurs
   */
  const loadBorrowers = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await borrowerService.getAllBorrowers();
      setBorrowers(data);
    } catch (err) {
      console.error('Erreur lors du chargement des emprunteurs:', err);
      setError('Impossible de charger les emprunteurs');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Recherche des emprunteurs par nom
   */
  const searchBorrowers = useCallback(async (query: string) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const data = await borrowerService.searchBorrowers(query);
      setBorrowers(data);
    } catch (err) {
      console.error('Erreur lors de la recherche d\'emprunteurs:', err);
      setError('Impossible de rechercher les emprunteurs');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Crée un nouvel emprunteur
   */
  const createBorrower = useCallback(async (borrowerData: BorrowerCreate) => {
    try {
      const newBorrower = await borrowerService.createBorrower(borrowerData);
      setBorrowers(prev => [newBorrower, ...prev]);
      return newBorrower;
    } catch (err) {
      console.error('Erreur lors de la création de l\'emprunteur:', err);
      throw err;
    }
  }, []);

  /**
   * Met à jour un emprunteur
   */
  const updateBorrower = useCallback(async (id: number, borrowerData: BorrowerUpdate) => {
    try {
      const updated = await borrowerService.updateBorrower(id, borrowerData);
      setBorrowers(prev => prev.map(b => b.id === id ? updated : b));
      return updated;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'emprunteur:', err);
      throw err;
    }
  }, []);

  /**
   * Supprime un emprunteur
   */
  const deleteBorrower = useCallback(async (id: number) => {
    try {
      await borrowerService.deleteBorrower(id);
      setBorrowers(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'emprunteur:', err);
      throw err;
    }
  }, []);

  /**
   * Gère le changement de la requête de recherche
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Exécute la recherche
   */
  const handleSearch = useCallback(async () => {
    if (searchQuery.trim()) {
      await searchBorrowers(searchQuery);
    } else {
      await loadBorrowers();
    }
  }, [searchQuery, searchBorrowers, loadBorrowers]);

  /**
   * Recharge la liste des emprunteurs
   */
  const refresh = useCallback(async () => {
    await loadBorrowers();
  }, [loadBorrowers]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadBorrowers();
    }
  }, [autoLoad, loadBorrowers]);

  return {
    borrowers,
    loading,
    error,
    searchQuery,
    setSearchQuery: handleSearchChange,
    loadBorrowers,
    searchBorrowers,
    createBorrower,
    updateBorrower,
    deleteBorrower,
    handleSearch,
    refresh,
  };
}
