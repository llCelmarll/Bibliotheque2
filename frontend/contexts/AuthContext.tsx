// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}
import { authService, LoginRequest, RegisterRequest, User } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'auth_user';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Vérifie l'expiration d'un JWT
  function isTokenExpired(token: string): boolean {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Vérifier l'authentification au démarrage
  useEffect(() => {
  checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Essaye d'abord SecureStore (remember me)
      let storedToken = await getItem(ACCESS_TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      // Si pas de token, l'utilisateur n'est pas connecté
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      // Si token expiré, essayer de le renouveler
      if (isTokenExpired(storedToken)) {
        const storedRefreshToken = await getItem(REFRESH_TOKEN_KEY);
        if (storedRefreshToken) {
          try {
            const newToken = await authService.refreshAccessToken();
            if (newToken) {
              storedToken = newToken;
              setToken(newToken);
            } else {
              // Refresh token invalide ou expiré - seul cas où on logout
              await logout();
              setIsLoading(false);
              return;
            }
          } catch (refreshError) {
            // Erreur réseau pendant le refresh - NE PAS logout, garder l'état actuel
            console.warn('Erreur réseau pendant le refresh, on garde la session:', refreshError);
            if (storedUser) {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
            }
            setIsLoading(false);
            return;
          }
        } else {
          // Pas de refresh token - logout
          await logout();
          setIsLoading(false);
          return;
        }
      }

      // Token valide, récupérer les infos utilisateur
      if (storedToken) {
        try {
          const currentUser = await authService.getCurrentUser(storedToken);
          setToken(storedToken);
          setUser(currentUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        } catch (error: any) {
          // Distinguer erreur réseau vs erreur auth
          const isNetworkError = !error?.message?.includes('401') &&
                                 !error?.message?.includes('403') &&
                                 (error?.message?.includes('Network') ||
                                  error?.message?.includes('fetch') ||
                                  error?.message?.includes('timeout') ||
                                  error?.name === 'AbortError');

          if (isNetworkError) {
            // Erreur réseau - NE PAS logout, utiliser les données en cache
            console.warn('Erreur réseau, utilisation du cache:', error);
            if (storedUser) {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
            }
          } else {
            // Erreur d'authentification (401/403) - logout
            console.warn('Erreur auth, déconnexion:', error);
            await logout();
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
  try {
      setIsLoading(true);
      // Connexion avec remember_me si présent
      const loginResponse = await authService.login(credentials as any);
      const userResponse = await authService.getCurrentUser(loginResponse.access_token);
      // Stockage sécurisé des tokens
      if (loginResponse.access_token) {
        await setItem(ACCESS_TOKEN_KEY, loginResponse.access_token);
      }
      if (loginResponse.refresh_token) {
        await setItem(REFRESH_TOKEN_KEY, loginResponse.refresh_token);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userResponse));
      setToken(loginResponse.access_token);
      setUser(userResponse);
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  // Vérifie l'expiration d'un JWT
  function isTokenExpired(token: string): boolean {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload));
      return decoded.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  };

  const register = async (data: RegisterRequest) => {
  try {
      setIsLoading(true);

      // Inscription
      const registerResponse = await authService.register(data);

      // Stocker le token dans ACCESS_TOKEN_KEY (même clé que login pour cohérence)
      await setItem(ACCESS_TOKEN_KEY, registerResponse.token.access_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(registerResponse.user));

      setToken(registerResponse.token.access_token);
      setUser(registerResponse.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      // Supprimer TOUS les tokens du stockage
      await AsyncStorage.removeItem(USER_KEY);
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
      // Nettoyer aussi les anciennes clés pour migration
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');

      // Réinitialiser l'état
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}