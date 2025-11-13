// services/api/authInterceptor.ts
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let SecureStore: any;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

const TOKEN_KEY = 'access_token';

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
        // Token expiré ou invalide, supprimer le token stocké
        try {
          await AsyncStorage.removeItem(TOKEN_KEY);
          await AsyncStorage.removeItem('auth_user');
          // Rediriger vers la page de connexion pourrait être géré ici
          // mais on laisse le contexte Auth s'en occuper
        } catch (storageError) {
          console.error('Erreur lors de la suppression du token:', storageError);
        }
      }
      return Promise.reject(error);
    }
  );
}

export default setupAuthInterceptor;