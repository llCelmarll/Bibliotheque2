import { useState, useEffect, useCallback } from 'react';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { borrowedBookService } from '@/services/borrowedBookService';

interface UseBorrowsOptions {
  filterStatus?: BorrowStatus | 'all';
}

export function useBorrows({ filterStatus = 'all' }: UseBorrowsOptions = {}) {
  const [borrows, setBorrows] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBorrows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await borrowedBookService.fetchBorrowedBooks();

      // Filtrer selon le statut
      let filteredData = data;
      if (filterStatus !== 'all') {
        filteredData = data.filter(borrow => borrow.status === filterStatus);
      }

      setBorrows(filteredData);
    } catch (err: any) {
      console.error('Error fetching borrows:', err);
      setError(err.message || 'Impossible de charger les emprunts');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchBorrows();
  }, [fetchBorrows]);

  return {
    borrows,
    loading,
    error,
    refresh: fetchBorrows,
  };
}
