// Minimal setup file - most mocks moved to individual test files
// to avoid pollution between tests

import 'react-native-gesture-handler/jestSetup';

// AsyncStorage must stay global - required by React Native
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-secure-store (EventEmitter undefined in Jest)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-calendar (ESM not transformed by Jest)
jest.mock('expo-calendar', () => ({}));

// Mock expo-constants (expo-modules-core EventEmitter unavailable in Jest)
jest.mock('expo-constants', () => ({
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { Bare: 'bare', StoreClient: 'storeClient', StandaloneApp: 'standalone' },
}));

// Silence warnings
global.__DEV__ = true;

// Global test timeout
jest.setTimeout(20000);