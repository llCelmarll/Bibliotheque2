// services/api/client.ts
import { ENTITY_API_CONFIG } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

const TOKEN_KEY = 'access_token';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = ENTITY_API_CONFIG.BASE_URL;
    this.timeout = ENTITY_API_CONFIG.TIMEOUT;
    this.headers = ENTITY_API_CONFIG.HEADERS;
  }

  /**
   * Récupère le token d'authentification depuis le stockage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return await AsyncStorage.getItem(TOKEN_KEY);
      } else {
        return await SecureStore.getItemAsync(TOKEN_KEY);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();

    // Récupérer le token d'authentification
    const token = await this.getAuthToken();

    // Timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {
      const headers: Record<string, string> = {
        ...this.headers,
        ...(options.headers as Record<string, string>),
      };

      // Ajouter le token Bearer si disponible
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Si 401 (Unauthorized), supprimer le token expiré
        if (response.status === 401) {
          try {
            await AsyncStorage.removeItem(TOKEN_KEY);
            await AsyncStorage.removeItem('auth_user');
            console.warn('Token expiré, supprimé du stockage');
          } catch (storageError) {
            console.error('Erreur lors de la suppression du token:', storageError);
          }
        }

        throw new ApiError(
          `API Error: ${response.status}`,
          response.status,
          response.statusText
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408, 'Timeout');
      }

      throw new ApiError('Network error', 0, 'Network Error');
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    return this.makeRequest<T>(url, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };