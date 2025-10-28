import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:8000',
      },
    },
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  
  const createMockIcon = (name) => ({ name: iconName, size, color, ...props }) => 
    React.createElement(Text, { 
      ...props, 
      testID: `icon-${iconName}`,
      style: { fontSize: size, color }
    }, iconName);
  
  return {
    Ionicons: createMockIcon('Ionicons'),
    MaterialIcons: createMockIcon('MaterialIcons'),
    AntDesign: createMockIcon('AntDesign'),
    Feather: createMockIcon('Feather'),
    FontAwesome: createMockIcon('FontAwesome'),
    MaterialCommunityIcons: createMockIcon('MaterialCommunityIcons')
  };
});

jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    Constants: {
      BarCodeType: {
        qr: 'qr',
        pdf417: 'pdf417',
        aztec: 'aztec',
        ean13: 'ean13',
        ean8: 'ean8',
        code39: 'code39',
        code93: 'code93',
        code128: 'code128',
        code39mod43: 'code39mod43',
        codabar: 'codabar',
        interleaved2of5: 'interleaved2of5',
        itf14: 'itf14',
        upc_e: 'upc_e',
      },
    },
  },
}));

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    Constants: {
      Type: {
        back: 'back',
        front: 'front',
      },
    },
  },
}));

// Mock specific react-native hooks without overriding the entire module
const originalRN = jest.requireActual('react-native');
originalRN.useColorScheme = jest.fn(() => 'light');

// Mock Axios
jest.mock('axios');

// Silence warnings
global.__DEV__ = true;

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: {
    Screen: 'Stack.Screen',
  },
  Tabs: {
    Screen: 'Tabs.Screen',
  },
}));

// Global test timeout
jest.setTimeout(10000);