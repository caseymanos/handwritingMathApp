# Developer Setup Guide

Complete step-by-step guide for setting up the Handwriting Math App development environment from zero to running app.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Environment Configuration](#environment-configuration)
4. [Running the App](#running-the-app)
5. [Verification Steps](#verification-steps)
6. [Common Setup Issues](#common-setup-issues)
7. [Next Steps](#next-steps)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Installation |
|----------|----------------|--------------|
| **Node.js** | 20.0.0+ | [nodejs.org](https://nodejs.org) |
| **npm** | 10.0.0+ | Included with Node.js |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com) |

### iOS Development (Required for MVP)

| Software | Version | Installation |
|----------|---------|--------------|
| **macOS** | 13.0+ (Ventura) | Required for iOS development |
| **Xcode** | 15.0+ | Mac App Store |
| **CocoaPods** | 1.12+ | `sudo gem install cocoapods` |
| **Xcode Command Line Tools** | Latest | `xcode-select --install` |

**Target Devices:** iPad 9th gen+, iPad Pro (8-10" tablets)

### Android Development (Descoped for MVP)

Android development is descoped for the MVP, but the codebase supports it for future development. To set up Android:

| Software | Version | Installation |
|----------|---------|--------------|
| **Android Studio** | Latest | [developer.android.com](https://developer.android.com/studio) |
| **JDK** | 17+ | Bundled with Android Studio |
| **Android SDK** | API 33+ | Android Studio SDK Manager |

---

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be >= 20.0.0

# Check npm version
npm --version   # Should be >= 10.0.0

# Check Git
git --version   # Should be >= 2.30

# Check Xcode (macOS only)
xcodebuild -version  # Should be >= 15.0

# Check CocoaPods (macOS only)
pod --version   # Should be >= 1.12
```

---

## Repository Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/handwriting-math-app.git
cd handwriting-math-app
```

If you don't have repository access, contact the project admin.

---

### 2. Install Dependencies

```bash
# Install npm packages (React Native, dependencies)
npm install

# This may take 2-5 minutes depending on your network speed
```

**What gets installed:**
- React Native 0.76.6
- Expo SDK 52.0.0
- Zustand, MMKV, Skia, Reanimated, Navigation
- TypeScript, Jest, Testing Library
- See `package.json` for complete list

---

### 3. iOS Setup (Required for MVP)

```bash
# Navigate to iOS directory
cd ios

# Install CocoaPods dependencies
pod install

# Return to project root
cd ..
```

**Expected output:**
```
Analyzing dependencies
Downloading dependencies
Installing ...
Generating Pods project
Pod installation complete! XX pods installed
```

**Time:** 3-10 minutes (first time)

**Troubleshooting:**
- If `pod install` fails, try `pod repo update` first
- Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- For M1/M2 Macs, ensure Rosetta 2 is installed: `softwareupdate --install-rosetta`

---

## Environment Configuration

### 1. Create Environment File

```bash
# Copy environment template
cp .env.example .env
```

---

### 2. Configure API Keys

Open `.env` in your text editor and fill in the API keys:

```bash
# MyScript Cloud API (Handwriting Recognition)
# Get keys from: https://developer.myscript.com/
MYSCRIPT_APPLICATION_KEY=your_actual_app_key_here
# MYSCRIPT_HMAC_KEY is optional for testing, can leave commented

# UpStudy API (Math Validation) - Contact team for key
UPSTUDY_API_KEY=your_upstudy_api_key_here

# CameraMath API (Hints) - Contact team for key
CAMERAMATH_API_KEY=your_cameramath_api_key_here

# Supabase (Cloud Sync) - Optional for local development
# Get from: https://app.supabase.com/
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Sentry (Error Tracking) - Optional for local development
# Get from: https://sentry.io/
# SENTRY_DSN=your_sentry_dsn_here

# App Configuration
APP_ENV=development
```

---

### 3. API Setup Guides

**Required for Full Functionality:**

#### MyScript Cloud API (Handwriting Recognition)
See [docs/MYSCRIPT_SETUP.md](MYSCRIPT_SETUP.md) for:
- Account creation
- Application registration
- Obtaining `MYSCRIPT_APPLICATION_KEY`
- Optional HMAC key setup

**Estimated time:** 10 minutes

---

#### UpStudy API (Math Validation)
See [docs/UPSTUDY_API_INTEGRATION.md](UPSTUDY_API_INTEGRATION.md) for:
- API endpoint configuration
- Obtaining API key
- Testing validation

**Note:** Contact project team for API credentials.

---

#### CameraMath API (Hints - Optional for Basic Testing)
See [docs/CAMERAMATH_SETUP.md](CAMERAMATH_SETUP.md) for:
- API registration
- Obtaining API key

**Note:** Hints will not work without this key, but core app functions.

---

#### Supabase (Cloud Sync - Optional)
See [docs/CLOUD_SYNC.md](CLOUD_SYNC.md) for:
- Project creation
- Database schema setup
- Obtaining `SUPABASE_URL` and `SUPABASE_ANON_KEY`

**Note:** App works offline without Supabase. Cloud sync is optional.

---

### 4. Minimum Configuration for Testing

To run the app with minimal setup (without full functionality):

```bash
# .env minimal config
MYSCRIPT_APPLICATION_KEY=your_myscript_key_here
APP_ENV=development
```

**What works:**
- Canvas drawing
- Handwriting recognition (MyScript)
- Problem display

**What doesn't work:**
- Step validation (requires UpStudy API)
- Hints (requires CameraMath API)
- Cloud sync (requires Supabase)

---

## Running the App

### iOS Simulator (Recommended for Development)

```bash
# Start Metro bundler in one terminal
npm start

# In another terminal, run iOS app
npm run ios
```

**Alternative (single command):**
```bash
# Starts Metro and builds iOS app
npm run ios
```

**Expected behavior:**
1. Metro bundler starts and compiles JavaScript
2. Xcode builds native app
3. iOS Simulator launches (iPad Pro 11" recommended)
4. App installs and opens

**Time:**
- First build: 2-5 minutes
- Subsequent builds: 30-60 seconds

---

### Specific Simulator Device

```bash
# List available simulators
xcrun simctl list devices

# Run on specific device
npx react-native run-ios --simulator="iPad Pro (11-inch) (6th generation)"
```

---

### Physical iOS Device

**Prerequisites:**
- Xcode configured with Apple Developer account
- Device connected via USB
- Device trusted on Mac

```bash
# Run on connected device
npx react-native run-ios --device
```

**Note:** Code signing may require configuration in Xcode project.

---

### Android Emulator (Future Support)

```bash
# Start Android emulator first
# Then run:
npm run android
```

**Note:** Android is descoped for MVP but codebase supports it.

---

### Development Mode Features

When running with `npm start`, you get:

- **Hot Reload:** Changes apply automatically (Cmd+R to refresh manually)
- **Dev Menu:** Shake device or Cmd+D (iOS) / Cmd+M (Android)
- **Element Inspector:** Select elements to inspect (Cmd+D → "Toggle Inspector")
- **Performance Monitor:** View FPS, memory usage (Cmd+D → "Show Perf Monitor")

---

## Verification Steps

### 1. Home Screen Loads

**Expected:**
- App Header with "Write Math" branding
- "Quick Start" button
- Problem difficulty filters (Easy, Medium, Hard)
- Welcome modal on first launch (tap "Got it!" to dismiss)

**Screenshot:**
```
┌─────────────────────────────────────┐
│        Write Math                    │
├─────────────────────────────────────┤
│                                      │
│   [Quick Start]                      │
│                                      │
│   Choose Difficulty:                 │
│   [Easy] [Medium] [Hard]            │
│                                      │
└─────────────────────────────────────┘
```

---

### 2. Canvas Drawing Works

**Test Steps:**
1. Tap "Quick Start" or select a problem
2. TrainingMode screen loads with canvas
3. Draw on canvas with finger/stylus
4. Strokes appear smoothly (60+ FPS)
5. Floating toolbar visible with colors and tools

**Expected Behavior:**
- Smooth drawing without lag
- Pressure sensitivity (if using Apple Pencil)
- Color changes work (5 color options)
- Eraser tool works (3x pen width)
- Line guides visible (horizontal guides for organization)

---

### 3. Handwriting Recognition Works

**Test Steps:**
1. Draw "x + 5 = 12" on canvas
2. Pause for 500ms
3. Recognition indicator shows "Recognizing..."
4. Recognized text appears as LaTeX: "x + 5 = 12"

**Expected:**
- MyScript API call succeeds (check terminal logs)
- Recognition indicator in top-right corner
- KaTeX renders recognized math

**If Recognition Fails:**
- Check `MYSCRIPT_APPLICATION_KEY` in `.env`
- Check terminal for API errors
- Verify internet connection (MyScript is online API)
- See [MYSCRIPT_SETUP.md](MYSCRIPT_SETUP.md) for troubleshooting

---

### 4. Problem Display

**Test Steps:**
1. Start a new problem
2. Problem statement appears at top of screen
3. KaTeX renders math notation correctly
4. Difficulty badge shows (Easy/Medium/Hard)

**Expected:**
```
┌─────────────────────────────────────┐
│  [EASY]  Solve for x:                │
│  x + 5 = 12                          │
│  (LaTeX-rendered math)               │
└─────────────────────────────────────┘
```

---

### 5. Step Validation (Requires UpStudy API)

**Test Steps:**
1. Draw "x + 5 = 12"
2. Recognize (wait for recognition to complete)
3. Draw "x = 7" as next step
4. Tap "Validate Step" button
5. Validation feedback appears

**Expected:**
- Loading indicator during API call
- ✅ Green checkmark for correct step
- ⚠️ Yellow warning for correct but not useful
- ❌ Red X for incorrect step

**If Validation Fails:**
- Check `UPSTUDY_API_KEY` in `.env`
- Check terminal logs for API errors
- See [UPSTUDY_API_INTEGRATION.md](UPSTUDY_API_INTEGRATION.md)

---

### 6. Sentry Error Tracking (Optional)

**Test Steps:**
1. Trigger an error (e.g., draw invalid math, break something intentionally)
2. Check Sentry dashboard for error report

**Configuration:**
- Uncomment `SENTRY_DSN` in `.env`
- See [app/utils/sentry.ts](../app/utils/sentry.ts:1) for initialization

---

## Common Setup Issues

### Issue: `npm install` Fails

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
```

---

### Issue: `pod install` Fails

**Symptoms:**
```
[!] CocoaPods could not find compatible versions for pod "X"
```

**Solutions:**
```bash
# Update CocoaPods repo
pod repo update

# Clear CocoaPods cache
rm -rf ~/Library/Caches/CocoaPods
rm -rf Pods
rm Podfile.lock

# Reinstall
pod install

# For M1/M2 Macs with architecture issues
sudo arch -x86_64 gem install ffi
arch -x86_64 pod install
```

---

### Issue: Metro Bundler Cache Errors

**Symptoms:**
```
error: Error: Unable to resolve module X
```

**Solutions:**
```bash
# Clear Metro cache
npm start -- --reset-cache

# Or manually clear cache
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*
```

---

### Issue: Xcode Build Fails

**Symptoms:**
```
Command PhaseScriptExecution failed with a nonzero exit code
```

**Solutions:**
```bash
# Clean Xcode build folder
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
rm -rf Pods Podfile.lock
pod install

# Rebuild
cd ..
npm run ios
```

---

### Issue: Environment Variables Not Loading

**Symptoms:**
- API calls fail with "undefined" keys
- `process.env.MYSCRIPT_APPLICATION_KEY` is undefined

**Solutions:**
```bash
# Verify .env file exists
ls -la .env

# Check babel.config.js has dotenv plugin
cat babel.config.js  # Should include "react-native-dotenv"

# Restart Metro bundler (environment variables loaded at start)
# Kill Metro, then restart: npm start -- --reset-cache
```

---

### Issue: Simulator Won't Launch

**Symptoms:**
- iOS Simulator hangs on launch
- Black screen

**Solutions:**
```bash
# Reset iOS Simulator
xcrun simctl erase all

# Reboot device
xcrun simctl shutdown all
xcrun simctl boot "iPad Pro (11-inch) (6th generation)"

# If all fails, restart Xcode and Mac
```

---

### Issue: MMKV Native Module Linking

**Symptoms:**
```
Error: Native module 'MMKV' was not found
```

**Solutions:**
```bash
# iOS: Reinstall pods
cd ios && pod install && cd ..

# Clear cache and rebuild
npm start -- --reset-cache
npm run ios
```

---

### Issue: TypeScript Errors

**Symptoms:**
```
error TS2304: Cannot find name 'process'
```

**Solutions:**
```bash
# Ensure @types/node is installed
npm install --save-dev @types/node

# Check tsconfig.json includes necessary types
cat tsconfig.json  # Should have "types": ["node", "jest"]

# Restart TypeScript server in IDE
# VSCode: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## Next Steps

### After Successful Setup

1. **Explore the Codebase**
   - Read [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for project organization
   - Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design

2. **Understand State Management**
   - Read [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) for Zustand patterns
   - Explore `app/stores/*.ts` files

3. **Run Tests**
   ```bash
   npm test                  # Run all 139 tests
   npm test -- --coverage    # With coverage report
   ```
   - See [TESTING.md](TESTING.md) for testing guide

4. **Read Development Guidelines**
   - See [CONTRIBUTING.md](../CONTRIBUTING.md) for code standards
   - See [CLAUDE.md](../CLAUDE.md) for AI pair programming guidance

5. **Review Task List**
   - See [TASK_LIST.md](TASK_LIST.md) for PR workflow and roadmap

---

### Development Workflow

```bash
# Start Metro bundler
npm start

# In another terminal, run app
npm run ios

# Make code changes
# App hot-reloads automatically

# Run tests before committing
npm test

# Format code
npm run format

# Type check
npm run typecheck
```

---

### Useful Commands

```bash
# Clean everything (nuclear option)
npm run clean  # Removes node_modules, Pods, build folders
npm install
cd ios && pod install && cd ..

# iOS-specific clean
npm run clean:ios

# Start fresh Metro bundler
npm start -- --reset-cache

# View device logs
npx react-native log-ios      # iOS logs
npx react-native log-android  # Android logs (future)
```

---

## Getting Help

### Project Documentation
- [README.md](../README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [TASK_LIST.md](TASK_LIST.md) - Development roadmap
- [TESTING.md](TESTING.md) - Test patterns

### API Documentation
- [MYSCRIPT_SETUP.md](MYSCRIPT_SETUP.md) - Handwriting recognition
- [UPSTUDY_API_INTEGRATION.md](UPSTUDY_API_INTEGRATION.md) - Math validation
- [CAMERAMATH_SETUP.md](CAMERAMATH_SETUP.md) - Hint system
- [CLOUD_SYNC.md](CLOUD_SYNC.md) - Supabase integration

### Community & Support
- **Team Slack:** Gauntlet Slack workspace (for urgent issues)
- **Project Lead:** Rafal Szulejko (rafal.szulejko@superbuilders.school, UTC+1)
- **Issues:** GitHub Issues (for bug reports, feature requests)

---

## Appendix: Development Tools

### Recommended IDE: Visual Studio Code

**Extensions:**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **React Native Tools** - Debugging
- **TypeScript** - Language support
- **GitLens** - Git integration

---

### React Native Debugger

**Installation:**
```bash
brew install react-native-debugger
```

**Usage:**
1. Open React Native Debugger app
2. Enable Debug JS Remotely in Dev Menu (Cmd+D)
3. Debugger connects automatically

---

### Flipper (Advanced Debugging)

**Note:** Flipper disabled by default in `.env` for performance

**To Enable:**
```bash
# .env
ENABLE_FLIPPER=true
```

**Features:**
- Network inspector
- Layout inspector
- Database viewer (MMKV plugin available)

---

### iOS Development Profile

**For Physical Device Testing:**

1. Open `ios/handwritingMathApp.xcworkspace` in Xcode
2. Select project in navigator
3. Select "handwritingMathApp" target
4. Go to "Signing & Capabilities"
5. Select your team
6. Xcode generates provisioning profile automatically

---

**Setup Complete! 🎉**

You should now have a fully functional development environment. If you encounter issues not covered here, check the [Common Issues](#common-setup-issues) section or contact the team.

Happy coding!
