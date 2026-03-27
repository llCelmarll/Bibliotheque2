import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { contactInvitationService } from '@/services/contactInvitationService';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { apiClient } from '@/services/api/client';
import { ContactInvitation } from '@/types/contactInvitation';
import { UserLoanRequest } from '@/types/userLoanRequest';

const SEEN_DECLINED_KEY = 'seen_declined_loan_request_ids';

let Notifications: any = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
}

interface NotificationsContextValue {
    invitationPendingCount: number;
    loanRequestPendingCount: number;
    declinedLoanRequestCount: number;
    totalPendingCount: number;
    receivedInvitations: ContactInvitation[];
    sentInvitations: ContactInvitation[];
    incomingLoanRequests: UserLoanRequest[];
    outgoingLoanRequests: UserLoanRequest[];
    seenDeclinedIds: Set<number>;
    loading: boolean;
    refresh: () => Promise<void>;
    markDeclinedAsSeen: (id: number) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [invitationPendingCount, setInvitationPendingCount] = useState(0);
    const [loanRequestPendingCount, setLoanRequestPendingCount] = useState(0);
    const [declinedLoanRequestCount, setDeclinedLoanRequestCount] = useState(0);
    const [receivedInvitations, setReceivedInvitations] = useState<ContactInvitation[]>([]);
    const [sentInvitations, setSentInvitations] = useState<ContactInvitation[]>([]);
    const [incomingLoanRequests, setIncomingLoanRequests] = useState<UserLoanRequest[]>([]);
    const [outgoingLoanRequests, setOutgoingLoanRequests] = useState<UserLoanRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [seenDeclinedIds, setSeenDeclinedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        AsyncStorage.getItem(SEEN_DECLINED_KEY).then(raw => {
            if (raw) setSeenDeclinedIds(new Set(JSON.parse(raw)));
        });
    }, []);

    const markDeclinedAsSeen = useCallback(async (id: number) => {
        if (seenDeclinedIds.has(id)) return;
        const updated = new Set(seenDeclinedIds).add(id);
        setSeenDeclinedIds(updated);
        await AsyncStorage.setItem(SEEN_DECLINED_KEY, JSON.stringify([...updated]));
        setDeclinedLoanRequestCount(prev => Math.max(0, prev - 1));
    }, [seenDeclinedIds]);

    const fetchData = useCallback(async () => {
        if (!isAuthenticated) return;
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
            const seenRaw = await AsyncStorage.getItem(SEEN_DECLINED_KEY);
            const seen = seenRaw ? new Set<number>(JSON.parse(seenRaw)) : new Set<number>();
            const unseenDeclined = out.filter(r => r.status === 'declined' && !seen.has(r.id));
            setDeclinedLoanRequestCount(unseenDeclined.length);
        } catch (err) {
            console.error('Erreur chargement notifications:', err);
        }
    }, [isAuthenticated]);

    const refresh = useCallback(async () => {
        setLoading(true);
        await fetchData();
        setLoading(false);
    }, [fetchData]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Rafraîchir automatiquement quand une notification push est reçue en foreground
    useEffect(() => {
        if (!isAuthenticated || !Notifications) return;
        const subscription = Notifications.addNotificationReceivedListener(() => {
            fetchData();
        });
        return () => subscription.remove();
    }, [isAuthenticated, fetchData]);

    // Polling silencieux toutes les 30s sur web : une seule requête légère pour les compteurs
    const fetchCounts = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const counts = await apiClient.get<{
                invitation_pending: number;
                loan_pending: number;
                declined_outgoing_ids: number[];
            }>('/notifications/counts');
            setInvitationPendingCount(counts.invitation_pending);
            setLoanRequestPendingCount(counts.loan_pending);
            const seenRaw = await AsyncStorage.getItem(SEEN_DECLINED_KEY);
            const seen = seenRaw ? new Set<number>(JSON.parse(seenRaw)) : new Set<number>();
            const unseen = counts.declined_outgoing_ids.filter(id => !seen.has(id));
            setDeclinedLoanRequestCount(unseen.length);
        } catch (err) {
            console.error('Erreur polling counts:', err);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || Platform.OS !== 'web') return;
        const interval = setInterval(() => { fetchCounts(); }, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated, fetchCounts]);

    return (
        <NotificationsContext.Provider value={{
            invitationPendingCount,
            loanRequestPendingCount,
            declinedLoanRequestCount,
            totalPendingCount: invitationPendingCount + loanRequestPendingCount + declinedLoanRequestCount,
            receivedInvitations,
            sentInvitations,
            incomingLoanRequests,
            outgoingLoanRequests,
            seenDeclinedIds,
            loading,
            refresh,
            markDeclinedAsSeen,
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
