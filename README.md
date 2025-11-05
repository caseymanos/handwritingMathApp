# Handwriting Math App

A React Native tablet application that enables students to solve math problems through handwriting input with real-time step-by-step validation and intelligent tutoring.

## 🎯 Project Overview

Students write mathematical solutions line-by-line on a digital canvas using a stylus or touch input. The app provides immediate feedback on each step's correctness and usefulness, guiding students toward proper problem-solving methodology through progressive hints.

**Target Devices:** iPad 9th gen+, Samsung Galaxy Tab S9+ (8-10" tablets with optional stylus support)

## ✨ Core Features (MVP)

- ✍️ **Handwriting Canvas** - Hardware-accelerated Skia canvas with stylus/touch input (120 FPS)
- 🤖 **ML Kit Recognition** - Offline handwriting recognition via Google ML Kit Digital Ink
- ✅ **Step Validation** - Real-time correctness and usefulness checking via CameraMath API
- 💡 **Progressive Hints** - Three-tier hint system (concept → direction → micro step)
- 🎨 **Multi-color Input** - Multiple colors and eraser tool for organized work
- 💾 **Local Storage** - All attempts persisted locally with MMKV (encrypted)
- 🎭 **Smooth Animations** - UI thread animations via Reanimated 3

## 🏗️ Architecture

```
User Input → Skia Canvas → ML Kit Recognition (offline) →
CameraMath Validation → State Update (Zustand) →
UI Feedback (Reanimated) → MMKV Persistence
```

### Tech Stack

- **Framework:** React Native 0.82+ with New Architecture (Fabric + TurboModules)
- **Canvas:** @shopify/react-native-skia
- **Recognition:** Google ML Kit Digital Ink Recognition (native bridge)
- **State:** Zustand
- **Storage:** react-native-mmkv
- **Math Display:** react-native-katex
- **Animations:** React Native Reanimated 3 + react-native-skottie
- **Navigation:** React Navigation 7
- **Validation:** CameraMath API (MVP) → Wolfram Alpha (production)
- **Testing:** Jest + React Native Testing Library + Detox
- **Monitoring:** Sentry

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Xcode 14+ (for iOS)
- CocoaPods
- React Native CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd handwritingMath

# Install dependencies
npm install

# Install iOS pods
cd ios && bundle exec pod install && cd ..

# Copy environment template
cp .env.example .env
# Edit .env and add your CameraMath API key
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android (when available)
npm run android
```

### Development Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage

# Run specific test suites
npm run test:unit
npm run test:component

# Clean build artifacts
npm run clean
npm run clean:ios
```

## 📁 Project Structure

```
/app
  /components       # Reusable UI components (Canvas, Hints, Feedback)
  /screens         # Full-screen views (TrainingMode, Home, Review)
  /stores          # Zustand state stores (canvas, validation, hints)
  /utils           # Pure functions (validation, recognition, storage)
  /hooks           # Custom React hooks
  /types           # TypeScript type definitions
  /navigation      # React Navigation setup
  /assets          # Images, Lottie animations, icons
  /styles          # Theme, colors, spacing

/native-modules    # Native bridge for ML Kit
  MLKitBridge.kt   # Android (when implemented)
  MLKitBridge.swift # iOS (when implemented)

/hint-library      # Hint data and mapping logic

/tests
  /unit           # Unit tests for utilities
  /component      # Component tests (RNTL)
  /e2e            # E2E tests (Detox)
  /__mocks__      # Mocks for testing

/docs             # Documentation
  ARCHITECTURE.md  # System architecture and data flows
  TASK_LIST.md    # PR-by-PR development roadmap
  PRD-*.md        # Product requirements
  CLAUDE.md       # AI assistant guidance
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available environment variables. Key variables:

- `CAMERAMATH_API_KEY` - Required for math validation
- `SENTRY_DSN` - Optional for error tracking
- `APP_ENV` - Environment (development/staging/production)

### iOS Configuration

React Native 0.82+ has New Architecture enabled by default. Verify in `ios/Podfile`:

```ruby
use_frameworks! :linkage => :static
$RNNewArchEnabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Component tests only
npm run test:component

# E2E tests (when implemented)
npm run test:e2e:ios

# Coverage report
npm test:coverage
```

Target: 70%+ coverage for critical paths

## 📊 PR Development Workflow

This project follows a structured 11-PR workflow:

1. **PR1** - Project setup & configuration ✅ (Current)
2. **PR2** - Canvas & handwriting input
3. **PR3** - ML Kit recognition bridge
4. **PR4** - Problem display & math rendering
5. **PR5** - Math validation & API integration
6. **PR6** - Hint system
7. **PR7** - State management & persistence
8. **PR8** - Animation & UI polish
9. **PR9** - Navigation structure
10. **PR10** - Testing suite
11. **PR11** - Documentation

See `docs/TASK_LIST.md` for detailed breakdown.

## 🎨 Design Principles

1. **Paper-like Experience** - Smooth, responsive, natural handwriting feel
2. **Performance First** - 60+ FPS on 3-year-old tablets, 120 FPS target
3. **Progressive Hints** - Never reveal full solution, guide learning
4. **Offline-first** - ML Kit works offline, validation queued when online
5. **Type-safe** - Full TypeScript coverage
6. **Test-driven** - Comprehensive unit, component, and E2E tests

## 🐛 Troubleshooting

### Canvas Performance Issues
- Ensure using Skia (not SVG)
- Check canvas resolution settings
- Profile on actual device, not just simulator

### Recognition Accuracy < 85%
- Test with diverse handwriting samples
- Adjust ML Kit confidence threshold
- Implement manual fallback input

### iOS Build Fails
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### State Not Persisting
- Check MMKV middleware configuration
- Verify Zustand store setup
- Inspect MMKV storage in debugger

## 📚 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed system design and data flows
- **[TASK_LIST.md](docs/TASK_LIST.md)** - Complete PR development roadmap
- **[PRD](docs/PRD-Updated-2025%20(1).md)** - Full product requirements
- **[CLAUDE.md](CLAUDE.md)** - AI development assistant guidance

## 🔗 External Resources

- [React Native Docs](https://reactnative.dev)
- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [ML Kit Digital Ink](https://developers.google.com/ml-kit/vision/digital-ink-recognition)
- [CameraMath API](https://cameramath.com/api)
- [Zustand](https://github.com/pmndrs/zustand)
- [MMKV](https://github.com/mrousavy/react-native-mmkv)

## 👥 Contact

**Rafal Szulejko** - rafal.szulejko@superbuilders.school (UTC+1)
Slack: Gauntlet Slack (for urgent issues)

## 📄 License

UNLICENSED - Private project for Superbuilders

---

**Status:** PR1 Complete - Project Setup ✅
**Next:** PR2 - Canvas & Handwriting Input Implementation
