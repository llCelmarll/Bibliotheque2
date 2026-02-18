import { useState, useCallback, useEffect } from 'react';
import { ContactInvitation } from '@/types/contactInvitation';
import { contactInvitationService } from '@/services/contactInvitationService';
import { useAuth } from '@/contexts/AuthContext';

export function useContactInvitations({ autoLoad = true }: { autoLoad?: boolean } = {}) {
    const { isAuthenticated } = useAuth();
    const [received, setReceived] = useState<ContactInvitation[]>([]);
    const [sent, setSent] = useState<ContactInvitation[]>([]);
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
            const [recv, snt, count] = await Promise.all([
                contactInvitationService.getReceived(),
                contactInvitationService.getSent(),
                contactInvitationService.getPendingCount(),
            ]);
            setReceived(recv);
            setSent(snt);
            setPendingCount(count);
        } catch (err) {
            console.error('Erreur chargement ContactInvitations:', err);
            setError('Impossible de charger les invitations');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const refresh = useCallback(async () => {
        await load();
    }, [load]);

    const accept = useCallback(async (id: number) => {
        await contactInvitationService.accept(id);
        await refresh();
    }, [refresh]);

    const decline = useCallback(async (id: number) => {
        await contactInvitationService.decline(id);
        await refresh();
    }, [refresh]);

    const cancel = useCallback(async (id: number) => {
        await contactInvitationService.cancel(id);
        await refresh();
    }, [refresh]);

    useEffect(() => {
        if (autoLoad) load();
    }, [autoLoad, load]);

    return {
        received,
        sent,
        pendingCount,
        loading,
        error,
        refresh,
        accept,
        decline,
        cancel,
    };
}
