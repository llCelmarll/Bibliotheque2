/**
 * Tests pour NotificationsContext
 * Couvre : fetchData, refresh (loading), fetchCounts (polling web), markDeclinedAsSeen
 */

// --- Mocks module-level (avant tous les imports) ---

jest.mock('@/contexts/AuthContext', () => ({
    useAuth: jest.fn(() => ({ isAuthenticated: true })),
}));

jest.mock('@/services/contactInvitationService', () => ({
    contactInvitationService: {
        getReceived: jest.fn(),
        getSent: jest.fn(),
        getPendingCount: jest.fn(),
    },
}));

jest.mock('@/services/userLoanRequestService', () => ({
    userLoanRequestService: {
        getIncoming: jest.fn(),
        getOutgoing: jest.fn(),
        getPendingCount: jest.fn(),
    },
}));

jest.mock('@/services/api/client', () => ({
    apiClient: { get: jest.fn() },
}));

// react-native mocké minimalement (seul Platform est utilisé dans le context)
jest.mock('react-native', () => ({
    Platform: { OS: 'ios' },
}));

// expo-notifications mocké pour éviter les imports ESM non transformés
jest.mock('expo-notifications', () => ({
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// --- Imports ---

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationsProvider, useNotifications } from '../../contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { contactInvitationService } from '@/services/contactInvitationService';
import { userLoanRequestService } from '@/services/userLoanRequestService';
import { apiClient } from '@/services/api/client';

// --- Helpers ---

const mockUseAuth = useAuth as jest.Mock;
const mockGetReceived = contactInvitationService.getReceived as jest.Mock;
const mockGetSent = contactInvitationService.getSent as jest.Mock;
const mockGetInvitationCount = contactInvitationService.getPendingCount as jest.Mock;
const mockGetIncoming = userLoanRequestService.getIncoming as jest.Mock;
const mockGetOutgoing = userLoanRequestService.getOutgoing as jest.Mock;
const mockGetLoanCount = userLoanRequestService.getPendingCount as jest.Mock;
const mockApiGet = apiClient.get as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationsProvider>{children}</NotificationsProvider>
);

const mockInvitation = (id: number) => ({
    id,
    sender_id: 10,
    sender_username: 'alice',
    recipient_id: 1,
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
});

const mockLoanRequest = (id: number, status: string) => ({
    id,
    requester_id: 1,
    lender_id: 2,
    book_id: 99,
    status,
    request_date: '2026-01-01T00:00:00Z',
});

// --- Setup par défaut ---

const setupDefaultMocks = () => {
    mockGetReceived.mockResolvedValue([mockInvitation(1)]);
    mockGetSent.mockResolvedValue([]);
    mockGetInvitationCount.mockResolvedValue(1);
    mockGetIncoming.mockResolvedValue([mockLoanRequest(10, 'pending')]);
    mockGetOutgoing.mockResolvedValue([]);
    mockGetLoanCount.mockResolvedValue(1);
};

describe('NotificationsContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.clear as jest.Mock)?.();
        mockUseAuth.mockReturnValue({ isAuthenticated: true });
    });

    // ─── a) fetchData — chargement initial ───────────────────────────────────

    it('charge les données au montage et expose les listes', async () => {
        setupDefaultMocks();

        const { result } = renderHook(() => useNotifications(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        }, { timeout: 5000 });

        expect(result.current.receivedInvitations).toHaveLength(1);
        expect(result.current.incomingLoanRequests).toHaveLength(1);
        expect(result.current.invitationPendingCount).toBe(1);
        expect(result.current.loanRequestPendingCount).toBe(1);
        expect(mockGetReceived).toHaveBeenCalledTimes(1);
        expect(mockGetIncoming).toHaveBeenCalledTimes(1);
    });

    // ─── b) refresh() — bascule loading true → false ─────────────────────────

    it('refresh() passe par loading: true puis false', async () => {
        setupDefaultMocks();

        const { result } = renderHook(() => useNotifications(), { wrapper });

        // Attendre le chargement initial
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

        // Déclencher un refresh manuel
        act(() => { result.current.refresh(); });

        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 });

        // getReceived doit avoir été appelé 2x (init + refresh)
        expect(mockGetReceived).toHaveBeenCalledTimes(2);
    });

    // ─── c) markDeclinedAsSeen — décrémente et persiste ─────────────────────

    it('markDeclinedAsSeen décrémente declinedLoanRequestCount et persiste dans AsyncStorage', async () => {
        mockGetReceived.mockResolvedValue([]);
        mockGetSent.mockResolvedValue([]);
        mockGetInvitationCount.mockResolvedValue(0);
        mockGetIncoming.mockResolvedValue([]);
        mockGetOutgoing.mockResolvedValue([
            mockLoanRequest(5, 'declined'),
            mockLoanRequest(6, 'declined'),
        ]);
        mockGetLoanCount.mockResolvedValue(0);

        const { result } = renderHook(() => useNotifications(), { wrapper });

        await waitFor(() => {
            expect(result.current.declinedLoanRequestCount).toBe(2);
        }, { timeout: 5000 });

        await act(async () => {
            await result.current.markDeclinedAsSeen(5);
        });

        expect(result.current.declinedLoanRequestCount).toBe(1);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            'seen_declined_loan_request_ids',
            expect.stringContaining('5'),
        );
    });

    // ─── d) declinedLoanRequestCount — DECLINED non vus seulement ────────────

    it('declinedLoanRequestCount exclut les IDs déjà vus dans AsyncStorage', async () => {
        // Simuler que l'ID 5 a déjà été vu
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
            if (key === 'seen_declined_loan_request_ids') return Promise.resolve('[5]');
            return Promise.resolve(null);
        });

        mockGetReceived.mockResolvedValue([]);
        mockGetSent.mockResolvedValue([]);
        mockGetInvitationCount.mockResolvedValue(0);
        mockGetIncoming.mockResolvedValue([]);
        mockGetOutgoing.mockResolvedValue([
            mockLoanRequest(5, 'declined'),  // déjà vu
            mockLoanRequest(6, 'declined'),  // non vu
        ]);
        mockGetLoanCount.mockResolvedValue(0);

        const { result } = renderHook(() => useNotifications(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        }, { timeout: 5000 });

        // Seul l'ID 6 est non vu
        expect(result.current.declinedLoanRequestCount).toBe(1);
    });

    // ─── e) fetchCounts — polling web toutes les 30s ─────────────────────────

    it('fetchCounts met à jour les compteurs toutes les 30s sur web', async () => {
        // Overrider Platform.OS → web pour ce test
        const rn = require('react-native');
        const originalOS = rn.Platform.OS;
        rn.Platform.OS = 'web';

        jest.useFakeTimers();

        setupDefaultMocks();
        mockApiGet.mockResolvedValue({
            invitation_pending: 3,
            loan_pending: 2,
            declined_outgoing_ids: [7, 8],
        });

        const { result } = renderHook(() => useNotifications(), { wrapper });

        // Chargement initial
        await act(async () => {
            await Promise.resolve();
        });

        // Avancer de 30 secondes pour déclencher le polling
        await act(async () => {
            jest.advanceTimersByTime(30000);
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(result.current.invitationPendingCount).toBe(3);
        }, { timeout: 5000 });

        expect(result.current.loanRequestPendingCount).toBe(2);
        expect(result.current.declinedLoanRequestCount).toBe(2);
        expect(mockApiGet).toHaveBeenCalledWith('/notifications/counts');

        jest.useRealTimers();
        rn.Platform.OS = originalOS;
    });

    // ─── f) Non authentifié — ne charge rien ─────────────────────────────────

    it('ne charge rien si non authentifié', async () => {
        mockUseAuth.mockReturnValue({ isAuthenticated: false });

        const { result } = renderHook(() => useNotifications(), { wrapper });

        // Laisser passer un tick
        await act(async () => { await Promise.resolve(); });

        expect(result.current.loading).toBe(false);
        expect(mockGetReceived).not.toHaveBeenCalled();
        expect(mockGetIncoming).not.toHaveBeenCalled();
    });

    // ─── g) Erreur réseau — ne crashe pas ────────────────────────────────────

    it('gère les erreurs sans crasher et logue dans console.error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        mockGetReceived.mockRejectedValue(new Error('Network error'));
        mockGetSent.mockResolvedValue([]);
        mockGetInvitationCount.mockResolvedValue(0);
        mockGetIncoming.mockResolvedValue([]);
        mockGetOutgoing.mockResolvedValue([]);
        mockGetLoanCount.mockResolvedValue(0);

        const { result } = renderHook(() => useNotifications(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        }, { timeout: 5000 });

        expect(consoleSpy).toHaveBeenCalled();
        expect(result.current.receivedInvitations).toEqual([]);
        expect(result.current.incomingLoanRequests).toEqual([]);

        consoleSpy.mockRestore();
    });
});
