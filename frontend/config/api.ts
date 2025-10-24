// config/api.ts
import Constants from 'expo-constants';

console.log('🔧 Configuration API:');
console.log('process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('Constants.expoConfig?.extra?.apiUrl:', Constants.expoConfig?.extra?.apiUrl);

const API_CONFIG = {
  // Changez cette URL pour pointer vers votre backend
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000',
  ENDPOINTS: {
    SCAN: '/scan',
    BOOKS: '/books',
    AUTHORS: '/authors',
    PUBLISHERS: '/publishers',
    GENRES: '/genres',
  }
};

console.log('📡 API BASE_URL configurée:', API_CONFIG.BASE_URL);

export default API_CONFIG;