# Running handwritingMathApp - Quick Reference

## ⚠️ Important: Do NOT Use Standard Expo Go

This app uses custom native modules (`@shopify/react-native-skia`, `react-native-reanimated`, etc.) that require native compilation. Standard Expo Go **will not work**.

## ✅ Recommended: Use Custom Development Client

### Option 1: Quick Start (Development Build)

```bash
# iOS (requires Mac with Xcode)
npx expo run:ios

# iOS on specific device
npx expo run:ios --device "iPad Pro"

# Android
npx expo run:android
```

This creates a custom development build with all native modules pre-compiled.

### Option 2: Standard React Native CLI

```bash
# Ensure pods are installed
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Option 3: EAS Build (Cloud Build Service)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Create development build for iOS
eas build --profile development --platform ios

# Create development build for Android
eas build --profile development --platform android
```

The development build will include all custom native modules and can be installed on your device for testing with live reload.

## 🔧 Troubleshooting

### Metro Bundler Not Running
```bash
# Start Metro bundler manually
npm start
# or
npx react-native start
```

### Clean Build Issues
```bash
# Full clean and reinstall
npm run clean
npm install
cd ios && pod install && cd ..

# Then rebuild
npm run ios
```

### iOS Build Errors
```bash
# Clean Xcode build
npm run clean:ios

# Reinstall pods
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..

# Rebuild
npm run ios
```

### Android Build Errors
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..

# Rebuild
npm run android
```

## 📱 Device-Specific Commands

### iOS Simulator
```bash
# List available simulators
xcrun simctl list devices

# Run on specific simulator
npx react-native run-ios --simulator="iPad Pro (12.9-inch) (6th generation)"
```

### iOS Physical Device
```bash
# Run on connected device
npx react-native run-ios --device

# Or use specific device name
npx react-native run-ios --device "Casey's iPad"
```

### Android Emulator
```bash
# List available emulators
emulator -list-avds

# Start specific emulator
emulator -avd Pixel_5_API_33

# Run app (automatically finds running emulator)
npm run android
```

### Android Physical Device
```bash
# Check connected devices
adb devices

# Run on specific device
npx react-native run-android --deviceId=<device-id>
```

## 🚀 Development Workflow

1. **First Time Setup**
   ```bash
   npm install
   cd ios && pod install && cd ..
   ```

2. **Start Metro Bundler** (Terminal 1)
   ```bash
   npm start
   ```

3. **Run App** (Terminal 2)
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

4. **Make Changes**
   - Edit source files
   - Save (⌘+S / Ctrl+S)
   - App reloads automatically

5. **Debugging**
   - Shake device or press ⌘+D (iOS) / ⌘+M (Android)
   - Select "Debug JS Remotely" or "Open React DevTools"

## 📦 Building for Distribution

### iOS TestFlight
```bash
# Build archive in Xcode
# Product > Archive
# Upload to App Store Connect
# Distribute via TestFlight
```

### Android Internal Testing
```bash
# Generate release APK
cd android && ./gradlew assembleRelease

# Find APK at:
# android/app/build/outputs/apk/release/app-release.apk
```

### EAS Build (Recommended for Distribution)
```bash
# Production build for iOS
eas build --profile production --platform ios

# Production build for Android
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run unit tests only
npm run test:unit

# Run component tests only
npm run test:component

# Generate coverage report
npm run test:coverage
```

## 🔍 Useful Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format

# Check bundle size
npx react-native-bundle-visualizer

# Clean everything (nuclear option)
npm run clean && rm -rf node_modules package-lock.json && npm install
```

## 📚 Additional Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Project Documentation](./docs/)
- [Architecture Guide](./ARCHITECTURE.md)
- [Expo Go Error Analysis](./docs/EXPO_GO_ERROR_ANALYSIS.md)

## 🆘 Getting Help

If you encounter issues:

1. Check [EXPO_GO_ERROR_ANALYSIS.md](./docs/EXPO_GO_ERROR_ANALYSIS.md)
2. Review recent commits: `git log --oneline -10`
3. Check build logs in `.expo/xcodebuild.log` or `android/build/`
4. Search GitHub issues
5. Contact team on Slack

---

**Last Updated**: November 10, 2025
**Configuration**: Expo SDK 52, React Native 0.76.6
