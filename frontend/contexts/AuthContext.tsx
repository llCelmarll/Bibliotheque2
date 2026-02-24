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
  updateUser: (updatedUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
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
      let storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken) {
        try {
          const [, payload] = storedToken.split('.');
          const decoded = JSON.parse(atob(payload));
        } catch (e) {
        }
      }
      // Si pas de token, essaye AsyncStorage (session simple)
      if (!storedToken) {
        storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      }
      // Si pas de token ou expiré, essaye de renouveler avec le refresh token
      if (!storedToken || isTokenExpired(storedToken)) {
        const storedRefreshToken = await getItem(REFRESH_TOKEN_KEY);
        if (storedRefreshToken) {
          const newToken = await authService.refreshAccessToken();
          if (newToken) {
            setToken(newToken);
            storedToken = newToken;
            // Après refresh, récupérer et stocker l'utilisateur
            try {
              const currentUser = await authService.getCurrentUser(newToken);
              setUser(currentUser);
              await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
              storedUser = JSON.stringify(currentUser);
            } catch (error) {
              await logout();
              setIsLoading(false);
              return;
            }
          } else {
            await logout();
            setIsLoading(false);
            return;
          }
        } else {
          await logout();
          setIsLoading(false);
          return;
        }
      }
      if (storedToken && storedUser) {
        try {
          const currentUser = await authService.getCurrentUser(storedToken);
          setToken(storedToken);
          setUser(currentUser);
        } catch (error: any) {
          if (error && typeof error === 'object' && 'response' in error) {
            // Axios-like error
            // @ts-ignore
          } else {
          }
          await logout();
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

  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  const logout = async () => {
  try {
      setIsLoading(true);

      // Supprimer TOUS les tokens du stockage (ancien et nouveau format)
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }

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
    updateUser,
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