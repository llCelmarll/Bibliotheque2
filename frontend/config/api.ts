// config/api.ts
import { Platform } from 'react-native';

const getApkUrl = () => {
  // Web : construire l'URL depuis l'origine courante (fonctionne en prod et staging)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const filename = process.env.EXPO_PUBLIC_APK_FILENAME || 'bibliotheque.apk';
    return `${window.location.origin}/${filename}`;
  }
  // Natif (APK) : utiliser l'URL complète depuis env
  return process.env.EXPO_PUBLIC_APK_URL || 'https://mabibliotheque.ovh/bibliotheque.apk';
};

const getWebUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://mabibliotheque.ovh';
};

const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Dev local : hostname = localhost → backend sur port 8000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    // Production web : proxy Nginx /api
    return '/api';
  }
  // App native : variable d'env (EAS build, Expo Go)
  return process.env.EXPO_PUBLIC_API_URL || 'https://mabibliotheque.ovh/api';
};

const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  WEB_URL: getWebUrl(),
  STATIC_URL: getBaseUrl(),
  APK_URL: getApkUrl(),
  AMAZON_STORE_ID: 'mabibliothe08-21',
  CGU_VERSION: '2026-07',
  ENDPOINTS: {
    SCAN: '/scan',
    BOOKS: '/books',
    AUTHORS: '/authors',
    PUBLISHERS: '/publishers',
    GENRES: '/genres',
    SERIES: '/series',
    LOANS: '/loans',
    CONTACTS: '/contacts',
    USER_LOANS: '/user-loans',
    CONTACT_INVITATIONS: '/contact-invitations',
    USERS_SEARCH: '/users/search',
    USER_LIBRARY: (userId: number) => `/users/${userId}/library`,
    USER_LIBRARY_BOOK: (userId: number, bookId: number) => `/users/${userId}/library/${bookId}`,
  }
};


export default API_CONFIG;