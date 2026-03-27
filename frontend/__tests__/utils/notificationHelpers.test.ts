/**
 * Tests pour les helpers showAlert et showConfirm (platform-aware)
 */

// Mock react-native minimal — seuls Alert et Platform sont nécessaires
// Note: jest.mock est hoisté, donc on ne peut pas référencer mockAlertFn dans la factory.
// On expose Alert.alert comme jest.fn() directement dans le mock.
jest.mock('react-native', () => ({
    Alert: { alert: jest.fn() },
    Platform: { OS: 'ios' },
}));

import { showAlert, showConfirm } from '../../utils/notificationHelpers';
import { Alert, Platform as RNPlatform } from 'react-native';

const mockAlertFn = Alert.alert as jest.Mock;
// Accès à Platform mutable pour changer OS par test
const Platform = RNPlatform as unknown as { OS: string };

describe('notificationHelpers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Platform.OS = 'ios';
        // Réinitialiser window.alert et window.confirm si définis
        (global as any).window = {
            alert: jest.fn(),
            confirm: jest.fn(),
        };
    });

    // ─── showAlert ────────────────────────────────────────────────────────────

    describe('showAlert', () => {
        it('appelle Alert.alert sur mobile (iOS)', () => {
            Platform.OS = 'ios';
            showAlert('Titre', 'Message');
            expect(mockAlertFn).toHaveBeenCalledWith('Titre', 'Message');
        });

        it('appelle Alert.alert sur mobile (Android)', () => {
            Platform.OS = 'android';
            showAlert('Titre', 'Message');
            expect(mockAlertFn).toHaveBeenCalledWith('Titre', 'Message');
        });

        it('appelle window.alert sur web', () => {
            Platform.OS = 'web';
            const mockWindowAlert = jest.fn();
            (global as any).window.alert = mockWindowAlert;
            showAlert('Titre', 'Message');
            expect(mockWindowAlert).toHaveBeenCalledWith('Titre\nMessage');
            expect(mockAlertFn).not.toHaveBeenCalled();
        });
    });

    // ─── showConfirm ─────────────────────────────────────────────────────────

    describe('showConfirm', () => {
        it('appelle Alert.alert avec 2 boutons sur mobile', () => {
            Platform.OS = 'ios';
            const onConfirm = jest.fn();
            showConfirm('Titre', 'Message', onConfirm);
            expect(mockAlertFn).toHaveBeenCalledWith(
                'Titre',
                'Message',
                expect.arrayContaining([
                    expect.objectContaining({ style: 'cancel' }),
                    expect.objectContaining({ style: 'destructive' }),
                ]),
            );
        });

        it('appelle onConfirm quand le bouton "Confirmer" est pressé (mobile)', () => {
            Platform.OS = 'ios';
            const onConfirm = jest.fn();
            showConfirm('Titre', 'Message', onConfirm);

            // Récupérer les boutons passés à Alert.alert
            const buttons: any[] = mockAlertFn.mock.calls[0][2];
            const confirmButton = buttons.find((b: any) => b.style === 'destructive');
            confirmButton?.onPress?.();

            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        it("n'appelle pas onConfirm quand le bouton Annuler est pressé (mobile)", () => {
            Platform.OS = 'ios';
            const onConfirm = jest.fn();
            showConfirm('Titre', 'Message', onConfirm);

            const buttons: any[] = mockAlertFn.mock.calls[0][2];
            const cancelButton = buttons.find((b: any) => b.style === 'cancel');
            cancelButton?.onPress?.();

            expect(onConfirm).not.toHaveBeenCalled();
        });

        it('appelle onConfirm si window.confirm retourne true (web)', () => {
            Platform.OS = 'web';
            const onConfirm = jest.fn();
            (global as any).window.confirm = jest.fn(() => true);

            showConfirm('Titre', 'Message', onConfirm);

            expect((global as any).window.confirm).toHaveBeenCalledWith('Titre\nMessage');
            expect(onConfirm).toHaveBeenCalledTimes(1);
            expect(mockAlertFn).not.toHaveBeenCalled();
        });

        it("n'appelle pas onConfirm si window.confirm retourne false (web)", () => {
            Platform.OS = 'web';
            const onConfirm = jest.fn();
            (global as any).window.confirm = jest.fn(() => false);

            showConfirm('Titre', 'Message', onConfirm);

            expect(onConfirm).not.toHaveBeenCalled();
        });
    });
});
