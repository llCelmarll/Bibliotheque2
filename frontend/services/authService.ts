// services/authService.ts
import API_CONFIG from '@/config/api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: any = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}
// Abstraction cross-platform pour le stockage sécurisé
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface RegisterResponse {
  user: User;
  token: LoginResponse;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`
      }));
      
      // Pour 422, afficher les détails de validation
      if (response.status === 422 && errorData.detail) {
        console.error('Validation error details:', errorData.detail);
        if (Array.isArray(errorData.detail)) {
          const emailError = errorData.detail.find((err: any) => 
            err.loc?.includes('email') && err.msg?.includes('valid email')
          );
          
          if (emailError) {
            throw new Error('Veuillez entrer une adresse email valide (exemple: user@example.com)');
          }
          
          const messages = errorData.detail.map((err: any) => 
            `${err.loc?.join('.') || 'field'}: ${err.msg}`
          ).join(', ');
          throw new Error(messages);
        }
      }
      
      // Récupérer le message d'erreur du backend
      const errorMessage = errorData.detail || errorData.message || `Erreur ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Ajout du paramètre remember_me et stockage sécurisé
    const response = await this.makeRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(credentials.email)}&password=${encodeURIComponent(credentials.password)}&remember_me=${(credentials as any).remember_me ? 'true' : 'false'}`,
    });
    if (response.access_token) {
      await setItem(ACCESS_TOKEN_KEY, response.access_token);
    }
    if (response.refresh_token) {
      await setItem(REFRESH_TOKEN_KEY, response.refresh_token);
    }
    return response;
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    const response = await this.makeRequest<LoginResponse>('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (response.access_token) {
      await setItem(ACCESS_TOKEN_KEY, response.access_token);
      // Stocker aussi le nouveau refresh_token pour prolonger la session
      if (response.refresh_token) {
        await setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      }
      return response.access_token;
    }
    return null;
  }

  async getStoredAccessToken(): Promise<string | null> {
  return await getItem(ACCESS_TOKEN_KEY);
  }

  async getStoredRefreshToken(): Promise<string | null> {
  return await getItem(REFRESH_TOKEN_KEY);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.makeRequest<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentUser(token: string): Promise<User> {
    return this.makeRequest<User>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const authService = new AuthService();