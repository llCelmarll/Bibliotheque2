// config/api.ts
import { Platform } from 'react-native';

const getBaseUrl = () => {
  // App native (iOS/Android) : toujours utiliser l'URL complète du backend
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_API_URL || 'https://mabibliotheque.ovh/api';
  }

  // Web production : utiliser /api (proxifié par Nginx)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api';
  }

  // Développement local (web) : utiliser localhost
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
};

// URL de base pour les fichiers statiques (covers) — inclut root_path /api en dev direct
const getStaticUrl = () => {
  const base = getBaseUrl();
  // En dev natif/web direct sur le backend, les statics sont sous /api/covers
  // En prod (via nginx), BASE_URL est déjà https://mabibliotheque.ovh/api
  if (base.endsWith('/api')) return base;
  // Base sans /api : c'est le dev local direct (http://host:8000)
  return `${base}/api`;
};

const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  STATIC_URL: getStaticUrl(),
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