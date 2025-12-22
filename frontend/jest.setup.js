// Minimal setup file - most mocks moved to individual test files
// to avoid pollution between tests

import 'react-native-gesture-handler/jestSetup';

// AsyncStorage must stay global - required by React Native
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Silence warnings
global.__DEV__ = true;

// Global test timeout
jest.setTimeout(20000);