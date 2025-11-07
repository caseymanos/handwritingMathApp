module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|react-native-gesture-handler|react-native-screens|@shopify/react-native-skia|react-native-mmkv)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@screens/(.*)$': '<rootDir>/app/screens/$1',
    '^@stores/(.*)$': '<rootDir>/app/stores/$1',
    '^@utils/(.*)$': '<rootDir>/app/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/app/hooks/$1',
    '^@types/(.*)$': '<rootDir>/app/types/$1',
    '^@styles/(.*)$': '<rootDir>/app/styles/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/index.ts',
    '!app/types/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,tsx}',
    '<rootDir>/tests/**/*.spec.{ts,tsx}',
  ],
};
