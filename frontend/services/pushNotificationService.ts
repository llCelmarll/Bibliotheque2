// services/pushNotificationService.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiClient } from '@/services/api/client';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  // Les push distants ne fonctionnent pas dans Expo Go (SDK 53+), uniquement en development build
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('[Push] Expo Go détecté — push notifications désactivées, utiliser un development build');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission refusée');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('[Push] Token obtenu :', tokenData.data.substring(0, 40) + '...');
    return tokenData.data;
  } catch (error) {
    console.log('[Push] Erreur lors de l\'enregistrement :', error);
    return null;
  }
}

export async function sendTokenToBackend(token: string): Promise<void> {
  try {
    await apiClient.post('/push-tokens', {
      token,
      platform: Platform.OS,
    });
    console.log('[Push] Token envoyé au backend');
  } catch (error) {
    console.log('[Push] Erreur envoi token au backend :', error);
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  try {
    // Appel DELETE direct car apiClient n'a pas de méthode delete générique
    const { apiClient: client } = await import('@/services/api/client');
    // On utilise fetch direct avec le token stocké
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    let SecureStore: any = null;
    if (Platform.OS !== 'web') {
      SecureStore = require('expo-secure-store');
    }
    const accessToken = Platform.OS === 'web'
      ? await AsyncStorage.getItem('access_token')
      : await SecureStore.getItemAsync('access_token');

    const { default: API_CONFIG } = await import('@/config/api');
    await fetch(`${API_CONFIG.BASE_URL}/push-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  } catch (error) {
    console.log('[Push] Erreur désenregistrement token :', error);
  }
}
