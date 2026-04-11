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

const getBaseUrl = () => {
  // Web production : utiliser /api (proxifié par Nginx)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api';
  }

  // App native (iOS/Android) ou dev local : utiliser l'URL complète
  // EXPO_PUBLIC_API_URL doit toujours être défini pour le natif staging/prod
  return process.env.EXPO_PUBLIC_API_URL || 'https://mabibliotheque.ovh/api';
};

const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  STATIC_URL: getBaseUrl(),
  APK_URL: getApkUrl(),
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