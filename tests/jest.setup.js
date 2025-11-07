// Jest setup file for React Native testing
// Note: @testing-library/react-native v12.4+ has built-in jest matchers

// Mock MMKV
jest.mock('react-native-mmkv', () => {
  const store = {};

  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn((key, value) => {
        store[key] = value;
      }),
      getString: jest.fn((key) => store[key]),
      getNumber: jest.fn((key) => {
        const value = store[key];
        return typeof value === 'number' ? value : undefined;
      }),
      getBoolean: jest.fn((key) => {
        const value = store[key];
        return typeof value === 'boolean' ? value : undefined;
      }),
      delete: jest.fn((key) => {
        delete store[key];
      }),
      clearAll: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      getAllKeys: jest.fn(() => Object.keys(store)),
    })),
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  // The mock for `call` immediately calls the callback which is incorrect
  Reanimated.default.call = () => {};

  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
// Note: Skipping mock for NativeAnimatedHelper as it's internal to React Native

// Mock @shopify/react-native-skia
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Path: jest.fn(() => ({
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadTo: jest.fn(),
      close: jest.fn(),
    })),
    Paint: jest.fn(() => ({
      setColor: jest.fn(),
      setStrokeWidth: jest.fn(),
      setStyle: jest.fn(),
      setStrokeCap: jest.fn(),
      setStrokeJoin: jest.fn(),
      setAntiAlias: jest.fn(),
    })),
  },
  Canvas: 'Canvas',
  useCanvasRef: jest.fn(),
  useTouchHandler: jest.fn(),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: {
      Pan: jest.fn(() => ({
        onBegin: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
      })),
      Tap: jest.fn(() => ({
        onBegin: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      })),
    },
  };
});

// Mock axios
jest.mock('axios');

// Mock crypto-js
jest.mock('crypto-js', () => ({
  default: {
    HmacSHA512: jest.fn(() => ({
      toString: jest.fn(() => 'mocked-signature'),
    })),
    MD5: jest.fn((input) => ({
      toString: jest.fn(() => {
        // Better hash using position-weighted character codes
        const hash = input.split('').reduce((acc, char, idx) => {
          return acc + char.charCodeAt(0) * (idx + 1);
        }, 0);
        return hash.toString(16).padStart(16, '0');
      }),
    })),
    enc: {
      Hex: {},
    },
  },
  HmacSHA512: jest.fn(() => ({
    toString: jest.fn(() => 'mocked-signature'),
  })),
  MD5: jest.fn((input) => ({
    toString: jest.fn(() => {
      // Better hash using position-weighted character codes
      const hash = input.split('').reduce((acc, char, idx) => {
        return acc + char.charCodeAt(0) * (idx + 1);
      }, 0);
      return hash.toString(16).padStart(16, '0');
    }),
  })),
  enc: {
    Hex: {},
  },
}));

// Mock react-native-katex
jest.mock('react-native-katex', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    default: ({ expression }) => React.createElement(View, null,
      React.createElement(Text, null, expression)
    ),
  };
});

// Mock WebView
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    default: () => React.createElement(View),
  };
});

// Global test utilities
global.flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Suppress console warnings in tests (optional)
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
