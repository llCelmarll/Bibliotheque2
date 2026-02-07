// services/api/authInterceptor.ts
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { router } from 'expo-router';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function setupAuthInterceptor(apiClient: AxiosInstance) {
  // Intercepteur pour ajouter le token à chaque requête
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        let token;
        if (Platform.OS === 'web') {
          token = await AsyncStorage.getItem(TOKEN_KEY);
        } else {
          token = await SecureStore.getItemAsync(TOKEN_KEY);
        }
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

  // Intercepteur pour gérer les erreurs d'authentification
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Token expiré ou invalide, supprimer tous les tokens et rediriger vers login
        try {
          if (Platform.OS === 'web') {
            await AsyncStorage.removeItem(TOKEN_KEY);
            await AsyncStorage.removeItem(USER_KEY);
            await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            await AsyncStorage.removeItem(USER_KEY);
          }
          // Rediriger vers la page de connexion
          router.replace('/auth/login');
        } catch (storageError) {
          console.error('Erreur lors de la suppression du token:', storageError);
        }
      }
      return Promise.reject(error);
    }
  );
}

export default setupAuthInterceptor;