// services/accountService.ts
import API_CONFIG from '@/config/api';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/services/authService';

let SecureStore: any = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

const ACCESS_TOKEN_KEY = 'access_token';

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}

class AccountService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const { headers: optionHeaders, ...restOptions } = options;
    const response = await fetch(url, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...optionHeaders,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      if (response.status === 422 && Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((err: any) => err.msg).join(', ');
        throw new Error(messages);
      }
      throw new Error(errorData.detail || errorData.message || `Erreur ${response.status}`);
    }

    return await response.json();
  }

  private async makeAuthRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await getItem(ACCESS_TOKEN_KEY);
    const { headers: optionHeaders, ...restOptions } = options;
    return this.makeRequest<T>(endpoint, {
      ...restOptions,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...optionHeaders,
      },
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.makeRequest('/account/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string, confirmNewPassword: string): Promise<{ message: string }> {
    return this.makeRequest('/account/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        token,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<{ message: string }> {
    return this.makeAuthRequest('/account/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      }),
    });
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    return this.makeAuthRequest('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(password: string): Promise<{ message: string }> {
    return this.makeAuthRequest('/account/', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirmation: 'SUPPRIMER' }),
    });
  }
}

export const accountService = new AccountService();
