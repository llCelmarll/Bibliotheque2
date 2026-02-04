// utils/featureFlags.ts
export const FEATURE_FLAGS = {
  // EntitySelector System
  USE_ENTITY_SELECTORS: true,
  
  // API Integration
  USE_API_AUTHORS: true,
  USE_API_PUBLISHERS: true,  // ✅ Activé pour tester
  USE_API_GENRES: true,      // ✅ Activé pour tester
  USE_API_SERIES: true,      // ✅ Activé pour tester
  
  // Debug & Development
  ENABLE_DEBUG_LOGS: __DEV__,
  SHOW_MOCK_INDICATORS: __DEV__,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;