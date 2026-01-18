// services/api/authInterceptor.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import API_CONFIG from '@/config/api';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Flag pour éviter les refresh multiples en parallèle
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

async function clearAuthTokens(): Promise<void> {
  await removeItem(ACCESS_TOKEN_KEY);
  await removeItem(REFRESH_TOKEN_KEY);
  await AsyncStorage.removeItem('auth_user');
  await AsyncStorage.removeItem('auth_token');
}

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      // Refresh token invalide ou expiré
      return null;
    }

    const data: RefreshResponse = await response.json();

    if (data.access_token) {
      await setItem(ACCESS_TOKEN_KEY, data.access_token);
    }
    if (data.refresh_token) {
      await setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error('Erreur lors du refresh token:', error);
    return null;
  }
}

export function setupAuthInterceptor(apiClient: AxiosInstance) {
  // Intercepteur pour ajouter le token à chaque requête
  apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const token = await getItem(ACCESS_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du token:', error);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Intercepteur pour gérer les erreurs 401 avec refresh automatique
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Si ce n'est pas une erreur 401 ou si c'est déjà un retry, rejeter
      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      // Si c'est l'endpoint de refresh lui-même qui échoue, ne pas boucler
      if (originalRequest.url?.includes('/auth/refresh')) {
        await clearAuthTokens();
        return Promise.reject(error);
      }

      // Marquer cette requête comme un retry
      originalRequest._retry = true;

      // Si un refresh est déjà en cours, attendre son résultat
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          // Refresh réussi, rejouer la requête originale et toutes les requêtes en attente
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          // Refresh échoué (token invalide ou expiré), nettoyer et rejeter
          await clearAuthTokens();
          processQueue(new Error('Session expirée'), null);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Erreur pendant le refresh, nettoyer et rejeter
        await clearAuthTokens();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );
}

export default setupAuthInterceptor;
