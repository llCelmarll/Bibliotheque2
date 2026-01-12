import { useState, useEffect, useCallback } from 'react';
import { BorrowedBook, BorrowStatus } from '@/types/borrowedBook';
import { borrowedBookService } from '@/services/borrowedBookService';

interface UseBorrowDetailProps {
  borrowId: number;
}

export function useBorrowDetail({ borrowId }: UseBorrowDetailProps) {
  const [borrow, setBorrow] = useState<BorrowedBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBorrow = useCallback(async () => {
    try {
      setLoading(true);
      const data = await borrowedBookService.getBorrowedBookById(borrowId);
      setBorrow(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching borrow:', err);
      setError(err.message || 'Impossible de charger les détails de l\'emprunt');
    } finally {
      setLoading(false);
    }
  }, [borrowId]);

  useEffect(() => {
    fetchBorrow();
  }, [fetchBorrow]);

  const returnBorrow = useCallback(async () => {
    if (!borrow) return;

    try {
      await borrowedBookService.returnBorrowedBook(borrow.id);
      // Rafraîchir les données
      await fetchBorrow();
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Impossible de retourner le livre');
    }
  }, [borrow, fetchBorrow]);

  const deleteBorrow = useCallback(async () => {
    if (!borrow) return;

    try {
      await borrowedBookService.deleteBorrowedBook(borrow.id);
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Impossible de supprimer l\'emprunt');
    }
  }, [borrow]);

  const getDaysOverdue = useCallback((): number => {
    if (!borrow?.expected_return_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(borrow.expected_return_date);
    dueDate.setHours(0, 0, 0, 0);

    if (today <= dueDate) return 0;

    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [borrow]);

  const getDaysRemaining = useCallback((): number => {
    if (!borrow?.expected_return_date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(borrow.expected_return_date);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) return 0;

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [borrow]);

  const isOverdue = useCallback((): boolean => {
    if (!borrow?.expected_return_date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(borrow.expected_return_date);
    dueDate.setHours(0, 0, 0, 0);

    return today > dueDate && borrow.status === BorrowStatus.ACTIVE;
  }, [borrow]);

  return {
    borrow,
    loading,
    error,
    returnBorrow,
    deleteBorrow,
    getDaysOverdue,
    getDaysRemaining,
    isOverdue,
    refetch: fetchBorrow,
  };
}
