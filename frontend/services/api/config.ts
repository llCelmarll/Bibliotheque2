// services/api/config.ts
import API_CONFIG from '@/config/api';

export const ENTITY_API_CONFIG = {
  BASE_URL: API_CONFIG.BASE_URL,
  TIMEOUT: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;

export const API_ENDPOINTS = {
  AUTHORS: {
    SEARCH: '/authors/search',
    CREATE: '/authors',
    GET_ALL: '/authors',
  },
  PUBLISHERS: {
    SEARCH: '/publishers/search',
    CREATE: '/publishers',
    GET_ALL: '/publishers',
  },
  GENRES: {
    SEARCH: '/genres/search',
    CREATE: '/genres',
    GET_ALL: '/genres',
  },
  SERIES: {
    SEARCH: '/series/search',
    CREATE: '/series',
    GET_ALL: '/series',
  },
} as const;