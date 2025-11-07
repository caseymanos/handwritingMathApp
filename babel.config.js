module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: false,
        blocklist: null,
        allowlist: null,
        verbose: false,
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
