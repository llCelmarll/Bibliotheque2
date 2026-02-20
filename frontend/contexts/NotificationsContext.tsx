import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { contactInvitationService } from '@/services/contactInvitationService';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { ContactInvitation } from '@/types/contactInvitation';
import { UserLoanRequest } from '@/types/userLoanRequest';

interface NotificationsContextValue {
    invitationPendingCount: number;
    loanRequestPendingCount: number;
    totalPendingCount: number;
    receivedInvitations: ContactInvitation[];
    sentInvitations: ContactInvitation[];
    incomingLoanRequests: UserLoanRequest[];
    outgoingLoanRequests: UserLoanRequest[];
    loading: boolean;
    refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [invitationPendingCount, setInvitationPendingCount] = useState(0);
    const [loanRequestPendingCount, setLoanRequestPendingCount] = useState(0);
    const [receivedInvitations, setReceivedInvitations] = useState<ContactInvitation[]>([]);
    const [sentInvitations, setSentInvitations] = useState<ContactInvitation[]>([]);
    const [incomingLoanRequests, setIncomingLoanRequests] = useState<UserLoanRequest[]>([]);
    const [outgoingLoanRequests, setOutgoingLoanRequests] = useState<UserLoanRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const [recv, snt, invCount, inc, out, loanCount] = await Promise.all([
                contactInvitationService.getReceived(),
                contactInvitationService.getSent(),
                contactInvitationService.getPendingCount(),
                userLoanRequestService.getIncoming(),
                userLoanRequestService.getOutgoing(),
                userLoanRequestService.getPendingCount(),
            ]);
            setReceivedInvitations(recv);
            setSentInvitations(snt);
            setInvitationPendingCount(invCount);
            setIncomingLoanRequests(inc);
            setOutgoingLoanRequests(out);
            setLoanRequestPendingCount(loanCount);
        } catch (err) {
            console.error('Erreur chargement notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <NotificationsContext.Provider value={{
            invitationPendingCount,
            loanRequestPendingCount,
            totalPendingCount: invitationPendingCount + loanRequestPendingCount,
            receivedInvitations,
            sentInvitations,
            incomingLoanRequests,
            outgoingLoanRequests,
            loading,
            refresh,
        }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationsContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
    return ctx;
}
