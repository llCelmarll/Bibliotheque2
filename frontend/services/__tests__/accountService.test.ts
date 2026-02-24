/**
 * Tests unitaires pour accountService.ts
 *
 * Stratégie : mock global.fetch pour vérifier que le service
 * construit les bonnes requêtes et gère correctement les réponses.
 */

// Mock des dépendances natives avant tout import
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

jest.mock('@/config/api', () => ({
  __esModule: true,
  default: { BASE_URL: 'http://localhost:8000' },
}));

import { accountService } from '../accountService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper : crée un mock fetch qui retourne une réponse JSON
function mockFetch(status: number, body: object) {
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValueOnce(body),
  } as unknown as Response);
}

// Helper : récupère les options passées à fetch
function lastFetchCall() {
  const mockFn = global.fetch as jest.Mock;
  return {
    url: mockFn.mock.calls[0][0] as string,
    options: mockFn.mock.calls[0][1] as RequestInit,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// forgotPassword
// ---------------------------------------------------------------------------
describe('accountService.forgotPassword', () => {
  it("appelle POST /account/forgot-password avec l'email", async () => {
    mockFetch(200, { message: 'Si un compte existe, un lien a été envoyé.' });

    await accountService.forgotPassword('user@example.com');

    const { url, options } = lastFetchCall();
    expect(url).toBe('http://localhost:8000/account/forgot-password');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({ email: 'user@example.com' });
  });

  it('retourne le message de succès', async () => {
    const msg = 'Si un compte existe, un lien a été envoyé.';
    mockFetch(200, { message: msg });

    const result = await accountService.forgotPassword('user@example.com');
    expect(result.message).toBe(msg);
  });

  it('lève une erreur sur réponse non-OK', async () => {
    mockFetch(429, { detail: 'Trop de tentatives.' });

    await expect(accountService.forgotPassword('user@example.com')).rejects.toThrow(
      'Trop de tentatives.'
    );
  });
});

// ---------------------------------------------------------------------------
// resetPassword
// ---------------------------------------------------------------------------
describe('accountService.resetPassword', () => {
  it('appelle POST /account/reset-password avec les bons champs', async () => {
    mockFetch(200, { message: 'Mot de passe modifié.' });

    await accountService.resetPassword('mon-token', 'NewPass456', 'NewPass456');

    const { url, options } = lastFetchCall();
    expect(url).toBe('http://localhost:8000/account/reset-password');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toEqual({
      token: 'mon-token',
      new_password: 'NewPass456',
      confirm_new_password: 'NewPass456',
    });
  });

  it('lève une erreur pour token invalide (400)', async () => {
    mockFetch(400, { detail: 'Token invalide ou expiré.' });

    await expect(
      accountService.resetPassword('bad-token', 'NewPass456', 'NewPass456')
    ).rejects.toThrow('Token invalide ou expiré.');
  });

  it('lève une erreur de validation (422) en concatenant les messages', async () => {
    mockFetch(422, {
      detail: [
        { msg: 'Le mot de passe doit contenir au moins 8 caractères' },
        { msg: 'Le mot de passe doit contenir une majuscule' },
      ],
    });

    await expect(
      accountService.resetPassword('tok', 'weak', 'weak')
    ).rejects.toThrow(
      'Le mot de passe doit contenir au moins 8 caractères, Le mot de passe doit contenir une majuscule'
    );
  });
});

// ---------------------------------------------------------------------------
// changePassword
// ---------------------------------------------------------------------------
describe('accountService.changePassword', () => {
  beforeEach(async () => {
    // Simuler un token stocké
    await (AsyncStorage.setItem as jest.Mock)('access_token', 'fake-jwt');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fake-jwt');
  });

  it('appelle POST /account/change-password avec Authorization header', async () => {
    mockFetch(200, { message: 'Mot de passe modifié.' });

    await accountService.changePassword('OldPass123', 'NewPass456', 'NewPass456');

    const { url, options } = lastFetchCall();
    expect(url).toBe('http://localhost:8000/account/change-password');
    expect(options.method).toBe('POST');
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer fake-jwt');
    expect(JSON.parse(options.body as string)).toEqual({
      current_password: 'OldPass123',
      new_password: 'NewPass456',
      confirm_new_password: 'NewPass456',
    });
  });

  it('lève une erreur si le mot de passe actuel est incorrect (400)', async () => {
    mockFetch(400, { detail: 'Mot de passe actuel incorrect.' });

    await expect(
      accountService.changePassword('wrong', 'NewPass456', 'NewPass456')
    ).rejects.toThrow('Mot de passe actuel incorrect.');
  });
});

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------
describe('accountService.updateProfile', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fake-jwt');
  });

  it('appelle PATCH /account/profile avec uniquement les champs fournis', async () => {
    const updatedUser = { id: 1, email: 'test@example.com', username: 'nouveau_nom', is_active: true };
    mockFetch(200, updatedUser);

    await accountService.updateProfile({ username: 'nouveau_nom' });

    const { url, options } = lastFetchCall();
    expect(url).toBe('http://localhost:8000/account/profile');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body as string)).toEqual({ username: 'nouveau_nom' });
  });

  it('retourne les données utilisateur mises à jour', async () => {
    const updatedUser = { id: 1, email: 'new@example.com', username: 'testuser', is_active: true };
    mockFetch(200, updatedUser);

    const result = await accountService.updateProfile({ email: 'new@example.com' });
    expect(result.email).toBe('new@example.com');
  });

  it('lève une erreur si email non whitelisté (403)', async () => {
    mockFetch(403, { detail: "Cette adresse email n'est pas autorisée." });

    await expect(
      accountService.updateProfile({ email: 'blocked@other.com' })
    ).rejects.toThrow("Cette adresse email n'est pas autorisée.");
  });
});

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------
describe('accountService.deleteAccount', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fake-jwt');
  });

  it('appelle DELETE /account/ avec le mot de passe et la confirmation', async () => {
    mockFetch(200, { message: 'Compte supprimé.' });

    await accountService.deleteAccount('MonMotDePasse');

    const { url, options } = lastFetchCall();
    expect(url).toBe('http://localhost:8000/account/');
    expect(options.method).toBe('DELETE');
    expect(JSON.parse(options.body as string)).toEqual({
      password: 'MonMotDePasse',
      confirmation: 'SUPPRIMER',
    });
  });

  it('lève une erreur si le mot de passe est incorrect (400)', async () => {
    mockFetch(400, { detail: 'Mot de passe incorrect.' });

    await expect(accountService.deleteAccount('wrong')).rejects.toThrow(
      'Mot de passe incorrect.'
    );
  });

  it('envoie toujours "SUPPRIMER" comme confirmation', async () => {
    mockFetch(200, { message: 'Compte supprimé.' });

    await accountService.deleteAccount('MonMotDePasse');

    const body = JSON.parse((lastFetchCall().options.body as string));
    expect(body.confirmation).toBe('SUPPRIMER');
  });
});

// ---------------------------------------------------------------------------
// Comportement commun : Content-Type header
// ---------------------------------------------------------------------------
describe('headers Content-Type', () => {
  it('inclut Content-Type: application/json sur toutes les requêtes', async () => {
    mockFetch(200, { message: 'ok' });

    await accountService.forgotPassword('test@example.com');

    const { options } = lastFetchCall();
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });
});
