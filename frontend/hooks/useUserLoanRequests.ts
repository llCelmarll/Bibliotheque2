import { useState, useCallback, useEffect } from 'react';
import { UserLoanRequest, UserLoanRequestAccept, UserLoanRequestDecline } from '@/types/userLoanRequest';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { useAuth } from '@/contexts/AuthContext';

export function useUserLoanRequests({ autoLoad = true }: { autoLoad?: boolean } = {}) {
    const { isAuthenticated } = useAuth();
    const [incoming, setIncoming] = useState<UserLoanRequest[]>([]);
    const [outgoing, setOutgoing] = useState<UserLoanRequest[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [inc, out, count] = await Promise.all([
                userLoanRequestService.getIncoming(),
                userLoanRequestService.getOutgoing(),
                userLoanRequestService.getPendingCount(),
            ]);
            setIncoming(inc);
            setOutgoing(out);
            setPendingCount(count);
        } catch (err) {
            console.error('Erreur chargement UserLoanRequests:', err);
            setError('Impossible de charger les demandes de prêt');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const refresh = useCallback(async () => {
        await load();
    }, [load]);

    const accept = useCallback(async (id: number, data?: UserLoanRequestAccept) => {
        await userLoanRequestService.accept(id, data);
        await refresh();
    }, [refresh]);

    const decline = useCallback(async (id: number, data?: UserLoanRequestDecline) => {
        await userLoanRequestService.decline(id, data);
        await refresh();
    }, [refresh]);

    const cancel = useCallback(async (id: number) => {
        await userLoanRequestService.cancel(id);
        await refresh();
    }, [refresh]);

    const returnBook = useCallback(async (id: number) => {
        await userLoanRequestService.returnBook(id);
        await refresh();
    }, [refresh]);

    useEffect(() => {
        if (autoLoad) load();
    }, [autoLoad, load]);

    return {
        incoming,
        outgoing,
        pendingCount,
        loading,
        error,
        refresh,
        accept,
        decline,
        cancel,
        returnBook,
    };
}
