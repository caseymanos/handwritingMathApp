const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * Compatible with both Expo and React Native CLI
 * https://reactnative.dev/docs/metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

module.exports = config;
