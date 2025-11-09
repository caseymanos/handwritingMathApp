# Handwriting Math App

A React Native tablet application that enables students to solve math problems through handwriting input with real-time step-by-step validation and intelligent tutoring.

## 📊 Project Status

**MVP Complete** - 11/11 PRs Finished (as of November 8, 2024)

✅ PR1-10: Core functionality, testing suite (139 passing tests)
✅ PR11: Documentation and deployment prep
✅ PR12: Cloud sync with Supabase (bonus feature)
✅ Production-ready iOS build process

**Next:** User testing, App Store submission preparation

---

## 🎯 Project Overview

Students write mathematical solutions line-by-line on a digital canvas using a stylus or touch input. The app provides immediate feedback on each step's correctness and usefulness, guiding students toward proper problem-solving methodology through progressive hints.

**Target Devices:** iPad 9th gen+, iPad Pro (8-10" tablets with optional Apple Pencil support)

## ✨ Core Features (MVP)

### Canvas & Input
- ✍️ **Handwriting Canvas** - Hardware-accelerated Skia canvas with stylus/touch input (120 FPS capable)
- 🎨 **Multi-color Input** - 5 color options and eraser tool for organized work
- ⏪ **Undo Controls** - Undo last stroke or entire last line
- 📏 **Line Guides** - Horizontal guides for organized writing

### Recognition & Validation
- 🤖 **MyScript Cloud API** - Real-time handwriting recognition with >85% accuracy
- ✅ **UpStudy Validation** - Step-by-step correctness and usefulness checking
- 💡 **Progressive Hints** - Three-tier hint system (concept → direction → micro step)
- 🎯 **Error Classification** - Syntax, arithmetic, logic, and method error detection

### Learning & Progress
- 📚 **25 Practice Problems** - Linear equations (5 easy, 10 medium, 10 hard)
- 📊 **Progress Tracking** - Attempt history, accuracy rates, statistics
- 💾 **Local Storage** - All attempts persisted with MMKV (20x faster than AsyncStorage)
- ☁️ **Cloud Sync** - Optional Supabase integration with 70-90% compression

### User Experience
- 🎭 **Smooth Animations** - UI thread animations via Reanimated 3
- 📱 **4 Screens** - Home, Training Mode, Review, Settings
- 🎨 **Professional UI** - Centralized style system (colors, spacing, typography)
- 🔍 **Error Tracking** - Sentry integration for production monitoring

### Documentation & DevEx
- 📚 **Comprehensive Docs** - Setup, architecture, testing, deployment guides
- 🤖 **AI-Assisted Dev** - Claude Code integration with CLAUDE.md
- 🛠️ **Build Automation** - iOS build and test scripts
- 🧪 **139 Passing Tests** - Unit tests with 70%+ coverage

## 🏗️ Architecture

```
User Input (Stylus/Touch)
  ↓
Skia Canvas (120 FPS, pressure-sensitive)
  ↓
MyScript Cloud API (handwriting → LaTeX)
  ↓
UpStudy API (step validation + hints)
  ↓
Zustand Stores (5 domain stores)
  ↓
MMKV Persistence + Supabase Sync (optional)
  ↓
UI Feedback (Reanimated 3 animations)
```

### Tech Stack

- **Framework:** React Native 0.76.6 with New Architecture (Fabric + TurboModules + JSI)
- **JavaScript Engine:** Hermes (30% faster startup)
- **Canvas:** @shopify/react-native-skia (~1.5.6)
- **Recognition:** MyScript Cloud API (REST)
- **Validation:** UpStudy API
- **Hints:** CameraMath API (optional)
- **State:** Zustand (5 stores)
- **Storage:** react-native-mmkv (20x faster than AsyncStorage)
- **Cloud Sync:** Supabase (@supabase/supabase-js)
- **Math Display:** react-native-katex
- **Animations:** React Native Reanimated 3 (~3.15.4)
- **Navigation:** React Navigation 7
- **Testing:** Jest + React Native Testing Library (139 tests)
- **Error Tracking:** Sentry (@sentry/react-native)
- **Build:** Expo SDK 52.0.0

## 🚀 Quick Start

**New developers:** See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

### Prerequisites

- Node.js 20.0.0+
- Xcode 15.0+ (for iOS)
- CocoaPods 1.12+
- Git 2.30+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd handwritingMath

# Install dependencies
npm install

# Install iOS pods
cd ios && pod install && cd ..

# Copy environment template
cp .env.example .env
# Edit .env and add your API keys (see docs/SETUP.md)
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios
```

**Note:** Android is descoped for MVP but codebase supports it.

### Development Commands

```bash
# Development
npm start                    # Start Metro bundler
npm run ios                  # Run on iOS simulator
npm run typecheck            # TypeScript type checking
npm run lint                 # ESLint
npm run format               # Prettier formatting

# Testing
npm test                     # Run all 139 tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report
./scripts/test.sh -c         # Test with coverage (via script)

# Building
npm run build:ios            # Build iOS release (uses scripts/build-ios.sh)
./scripts/build-ios.sh       # Direct script execution

# Cleanup
npm run clean                # Clean node_modules and build folders
npm run clean:ios            # Clean iOS build artifacts
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

/native-modules    # Empty (ML Kit native bridge descoped - using MyScript Cloud API)

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

See `.env.example` for all available environment variables. **Required** for full functionality:

- `MYSCRIPT_APPLICATION_KEY` - Handwriting recognition ([setup guide](docs/MYSCRIPT_SETUP.md))
- `UPSTUDY_API_KEY` - Math validation (contact team)
- `CAMERAMATH_API_KEY` - Hints (optional)
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` - Cloud sync (optional)
- `SENTRY_DSN` - Error tracking (optional)
- `APP_ENV` - Environment (development/staging/production)

See API setup guides in `docs/` for obtaining keys.

### iOS Configuration

React Native 0.76.6 has New Architecture enabled by default. Verify in `ios/Podfile`:

```ruby
use_frameworks! :linkage => :static
# New Architecture enabled
```

**Target Devices:** iPad 9th gen+, iPad Pro (TARGETED_DEVICE_FAMILY = "1,2")

## 🧪 Testing

**139 passing tests** covering stores, utilities, and business logic.

```bash
npm test                     # Run all tests (~0.3-0.5s)
npm test -- --coverage       # With coverage report
npm test -- --watch          # Watch mode
./scripts/test.sh -c         # Test with coverage (opens report)
```

**Coverage Target:** 70%+ for critical paths ✅ ACHIEVED

See [docs/TESTING.md](docs/TESTING.md) for testing strategy and patterns.

## 📊 PR Development Workflow

This project follows a structured 11-PR workflow (100% complete):

1. ✅ **PR1** - Project setup & configuration
2. ✅ **PR2** - Canvas & handwriting input
3. ✅ **PR3** - MyScript Cloud API recognition
4. ✅ **PR4** - Problem display & math rendering
5. ✅ **PR5** - UpStudy API validation
6. ✅ **PR6** - Progressive hint system
7. ✅ **PR7** - Zustand state & MMKV persistence
8. ✅ **PR8** - Animations & style system
9. ✅ **PR9** - React Navigation 7
10. ✅ **PR10** - Testing & error tracking (139 tests, Sentry)
11. ✅ **PR11** - Documentation & deployment prep

**Bonus:** PR12 - Supabase cloud sync ✅

See [docs/TASK_LIST.md](docs/TASK_LIST.md) for detailed breakdown.

## 🎨 Design Principles

1. **Paper-like Experience** - Smooth, responsive, natural handwriting feel
2. **Performance First** - 60+ FPS on 3-year-old tablets, 120 FPS target
3. **Progressive Hints** - Never reveal full solution, guide learning
4. **Local-first** - MMKV local storage, cloud sync optional via Supabase
5. **Type-safe** - Full TypeScript coverage
6. **Test-driven** - Comprehensive unit, component, and E2E tests

## 🐛 Troubleshooting

### Canvas Performance Issues
- Ensure using Skia (not SVG)
- Check canvas resolution settings
- Profile on actual device, not just simulator

### Recognition Accuracy < 85%
- Test with diverse handwriting samples
- Adjust MyScript confidence threshold in .env
- Check internet connectivity
- Use manual fallback input if needed

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

### Core Documentation
- **[SETUP.md](docs/SETUP.md)** - Developer onboarding guide (start here!)
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and data flows
- **[FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md)** - Project organization (17 components, 5 stores, 11 utils)
- **[STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md)** - Zustand store patterns and MMKV persistence
- **[TESTING.md](docs/TESTING.md)** - Test strategy and patterns (139 tests)
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - iOS build procedures and App Store submission
- **[TASK_LIST.md](docs/TASK_LIST.md)** - Complete 11-PR development roadmap
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Team contribution guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

### API Integration Guides
- **[MYSCRIPT_SETUP.md](docs/MYSCRIPT_SETUP.md)** - MyScript Cloud API setup
- **[UPSTUDY_API_INTEGRATION.md](docs/UPSTUDY_API_INTEGRATION.md)** - UpStudy API integration
- **[CAMERAMATH_SETUP.md](docs/CAMERAMATH_SETUP.md)** - CameraMath API setup
- **[CLOUD_SYNC.md](docs/CLOUD_SYNC.md)** - Supabase cloud sync implementation

### Product Documentation
- **[PRD](docs/PRD-Updated-2025%20(1).md)** - Full product requirements
- **[PROBLEM_DATA_FORMAT.md](docs/PROBLEM_DATA_FORMAT.md)** - Problem data structure guide
- **[CLAUDE.md](CLAUDE.md)** - AI development assistant guidance

## 🔗 External Resources

- [React Native Docs](https://reactnative.dev)
- [React Native Skia](https://shopify.github.io/react-native-skia/)
- [MyScript Cloud API](https://developer.myscript.com)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [MMKV Storage](https://github.com/mrousavy/react-native-mmkv)
- [React Navigation 7](https://reactnavigation.org)
- [Supabase Docs](https://supabase.com/docs)

## 👥 Contact

**Rafal Szulejko** - rafal.szulejko@superbuilders.school (UTC+1)

**Slack:** Gauntlet Slack (for urgent issues)

**GitHub:** [Issues](https://github.com/your-org/handwriting-math-app/issues) for bug reports and feature requests

## 📄 License

UNLICENSED - Private project for Superbuilders

---

## Status Update

**✅ MVP COMPLETE - 11/11 PRs Finished (November 8, 2024)**

- ✅ All core functionality implemented
- ✅ 139 passing tests with 70%+ coverage
- ✅ Complete documentation suite
- ✅ Production-ready iOS build process
- ✅ Bonus: Cloud sync with Supabase

**Next Steps:**
1. User testing on target devices (iPad 9th gen, iPad Pro)
2. App Store metadata preparation (screenshots, description)
3. TestFlight beta testing
4. App Store submission

**Future Enhancements (Post-MVP):**
- Teacher/Guide app (PR13)
- Tutorial mode with video lessons (PR14)
- Assessment mode (PR15)
- Redo functionality and gesture-based undo (PR16)
- Voice hints
- Android support

---

**Built with ❤️ for students learning mathematics**
