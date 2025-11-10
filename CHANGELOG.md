# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 2025-11-10 – UIScene lifecycle, EAS Updates, and Expo Go compatibility documentation
- **iOS Configuration:**
  - Added `UIApplicationSceneManifest` to Info.plist (required for iOS scene lifecycle)
  - Configured `UISceneDelegateClassName` as `RCTAppDelegate`
  - Prevents future iOS scene creation crashes and assertions
- **EAS Updates:**
  - Installed `expo-updates@^29.0.12` for over-the-air update support
  - Configured preview channel in eas.json for quick iterations
  - Added expo-updates plugin to app.json
- **Documentation:**
  - Created `docs/EXPO_GO_ERROR_ANALYSIS.md` - Comprehensive analysis of Expo Go limitations and errors
  - Created `RUNNING_THE_APP.md` - Quick reference guide for development workflow
  - Documented why standard Expo Go won't work (custom native modules)
  - Provided solutions for testing with custom dev client, EAS builds, and standalone builds
- **Developer Guidance:**
  - Clarified custom native module requirements (@shopify/react-native-skia, react-native-reanimated)
  - Explained difference between Expo Go and custom development client
  - Added troubleshooting section for common build issues

**Commits:** `42944df` - "fix: add UIScene lifecycle configuration and EAS Update support"

### 2025-11-09 – Tutorial Mode polish, online-first auth, and stability fixes
- Video player sizing: measure container and set iframe width/height for exact 16:9 — fixes cropping on iPad/tablets (`app/components/VideoPlayer.tsx`).
- Tutorial flow now online‑first: sync only when authenticated; clear banner CTA to sign in. Live progress updates during playback (`app/screens/TutorialScreen.tsx`, `app/stores/tutorialStore.ts`).
- Inline Auth Modal: email/password Sign In + Sign Up, Forgot Password, Resend Confirmation, and Magic Link actions (`app/components/AuthModal.tsx`, `app/utils/sync/supabaseClient.ts`).
- Settings UX: Move Cloud Sync (account) to top; show email and only relevant actions per auth state (`app/screens/SettingsScreen.tsx`).
- Supabase tutorialSync: use `onConflict` upsert and fallback fetch to avoid duplicate-key errors on `startLesson` (`app/utils/sync/tutorialSync.ts`).
- Live percent merge after position save; UI shows the max of session vs server percent (`app/stores/tutorialStore.ts`, `app/screens/TutorialScreen.tsx`).
- SuccessAnimation import fix + explicit `visible` prop (prevents invalid element type warning) (`app/screens/TutorialScreen.tsx`).
- Removed native random requirement causing RNGetRandomValues errors by replacing uuidv4 with JS-only IDs for the sync queue (`app/utils/id.ts`, `app/utils/sync/queue.ts`).
- Misc: Added `VideoPlayerWebView` and `VideoPlayerHybrid` variants for fallback embedding (not default-wired yet).

### Added
- Documentation and deployment preparation (PR11)

---

## [0.11.0] - 2024-11-08 (PR11: Documentation & Deployment Prep)

### Added
- **Documentation:**
  - `docs/FILE_STRUCTURE.md` - Complete project organization guide (17 components, 5 stores, 11 utils documented)
  - `docs/STATE_MANAGEMENT.md` - Zustand store patterns and MMKV persistence guide
  - `docs/SETUP.md` - Comprehensive developer onboarding guide
  - `docs/DEPLOYMENT.md` - iOS build procedures and App Store submission guide
  - `CONTRIBUTING.md` - Team contribution guidelines and code standards
  - `CHANGELOG.md` - Version history tracking (this file)

- **Build Automation:**
  - `scripts/build-ios.sh` - Automated iOS release build script with TestFlight upload option
  - `scripts/test.sh` - Test execution wrapper with coverage reporting and CLI options

- **Developer Experience:**
  - npm scripts: `build:ios`, `test:coverage`, `test:watch`
  - Executable permissions on all scripts
  - ExportOptions.plist template for iOS builds

### Changed
- Updated .env.example with complete environment variable documentation
- Updated README.md with PR11 completion status and documentation links (pending)

---

## [0.10.0] - 2024-11-07 (PR10: Testing & Error Tracking)

### Added
- **Test Suite:**
  - 139 passing unit tests across 4 test suites
  - `tests/unit/hintUtils.test.ts` (54 tests) - Hint system
  - `tests/unit/mathValidation.test.ts` (21 tests) - Validation logic
  - `tests/unit/recognitionUtils.test.ts` (29 tests) - Recognition utilities
  - `tests/unit/storage.test.ts` (35 tests) - MMKV operations
  - `tests/jest.setup.js` - Comprehensive mocks for RN dependencies
  - `docs/TESTING.md` - 700+ line testing guide with patterns and examples

- **Error Tracking:**
  - Sentry integration (`@sentry/react-native@^7.5.0`)
  - `app/utils/sentry.ts` - Error tracking and performance monitoring
  - `app/components/ErrorBoundary.tsx` - React error boundary with fallback UI
  - Automatic crash reporting and performance tracing

- **Test Infrastructure:**
  - Jest configuration with 70% coverage thresholds
  - Enhanced babel.config.js for test environment
  - npm scripts: `test`, `test:watch`, `test:coverage`, `test:unit`, `test:component`

### Technical
- All 139 tests pass in <1 second
- 70%+ coverage achieved for critical business logic
- Mocks for MMKV, Reanimated, Skia, crypto-js, axios

### Deferred
- Component tests (require Skia canvas mocking)
- E2E tests with Detox (require native build configuration)
- CI/CD pipeline setup

**Commit:** `2ce5b7a` - "test: comprehensive unit testing suite with Sentry error tracking (139 tests)"

---

## [0.9.0] - 2024-11-06 (PR9: Navigation & App Structure)

### Added
- **React Navigation 7:**
  - `@react-navigation/native@^7.0.0`
  - `@react-navigation/native-stack@^7.0.0`
  - `react-native-screens@^4.0.0`
  - `app/navigation/AppNavigator.tsx` - Main navigation container
  - `app/navigation/types.ts` - Type-safe route parameters

- **Screens:**
  - `app/screens/HomeScreen.tsx` - Problem selection with difficulty filters (Easy/Medium/Hard)
  - `app/screens/TrainingModeScreen.tsx` - Full canvas + validation + hints workflow
  - `app/screens/ReviewScreen.tsx` - Attempt history, statistics, filters, export functionality
  - `app/screens/SettingsScreen.tsx` - App info, device info, API status, data management

- **Features:**
  - Type-safe navigation with TypeScript
  - Quick Start button for random problems
  - Modal presentation for Review and Settings screens
  - Proper attempt cleanup on navigation (ends incomplete attempts)
  - iOS-style navigation with large titles and slide transitions

### Fixed
- Infinite loop in ReviewScreen with Zustand selector optimization using React.useMemo

### Changed
- Migrated CanvasDemoScreen logic to TrainingModeScreen
- App.tsx updated with NavigationContainer

**Commit:** `fc23c3a` - "feat: implement React Navigation 7 and multi-screen app structure"

---

## [0.8.0] - 2024-11-05 (PR8: Animations & Style System)

### Added
- **Animation Components:**
  - `app/components/FeedbackAnimation.tsx` - ✅/⚠️/❌ state transitions with bounce/shake
  - `app/components/HintReveal.tsx` - Smooth hint escalation animation with slide-in
  - `app/components/SuccessAnimation.tsx` - Celebration confetti animation
  - React Native Reanimated 3 for UI thread animations

- **Style System:**
  - `app/styles/theme.ts` - Global theme configuration
  - `app/styles/colors.ts` - Color palette with semantic tokens (+ inactive color)
  - `app/styles/spacing.ts` - Spacing constants (xs to xxl)
  - `app/styles/typography.ts` - Text styles (h1-h3, body, button, caption, captionSmall)
  - `app/styles/index.ts` - Centralized exports

### Changed
- **Refactored 13/13 components** to use centralized style system:
  - HandwritingCanvas, WelcomeModal, ToggleButton, ManualInputFallback
  - FormattedStep, RecognitionIndicator, FloatingToolbar
  - ValidationFeedback, ProblemDisplay, AppHeader
  - All components now use Colors, Spacing, TextStyles imports

- **Accessibility:**
  - Added 24 accessibility instances across components
  - Proper labels, hints, and roles for interactive elements

### Fixed
- Missing `TextStyles.captionSmall` style (added)
- Missing `Colors.ui.inactive` color (added)
- Canvas lag with ref-based drawing optimization

### Deferred
- Lottie/Skottie animations (using Reanimated 3 instead, better performance)
- Dark mode support (colors.ts has dark palette ready for future)
- Icons/images for tools (using emoji, sufficient for MVP)

**Commits:**
- `7751e9a` - "feat: complete PR8 - style system integration and critical bug fixes"
- `f833188` - "perf: eliminate canvas lag with ref-based drawing optimization"

---

## [0.7.0] - 2024-11-04 (PR7: State Management & Persistence)

### Added
- **Zustand Stores (5 stores, 52.9KB total):**
  - `app/stores/canvasStore.ts` (5.3KB) - Drawing state (PR3)
  - `app/stores/validationStore.ts` (9.6KB) - Validation and problem state (PR5)
  - `app/stores/hintStore.ts` (11KB) - Hint escalation and history (PR6)
  - `app/stores/progressStore.ts` (17KB) - **NEW** - Comprehensive attempt tracking
  - `app/stores/uiStore.ts` (10KB) - **NEW** - UI state and settings

- **Features:**
  - MMKV persistence built into progressStore, hintStore, and uiStore
  - Attempt history system with full stroke data, validation results, hint tracking
  - Analytics: accuracy rate, average time, step counts, problem stats
  - Progress tracking: completed problems, session management
  - UI state centralization: loading, modals (7 types), notifications with auto-hide
  - Toolbar preferences persist across app restarts
  - Export/import functionality for cloud sync preparation (PR12)

### Changed
- Integrated progressStore into CanvasDemoScreen with complete attempt tracking
- End-to-end tracking: problem load → steps → validation → completion/abandonment
- All stores use manual MMKV persistence (saveToStorage/loadFromStorage pattern)

### Technical
- Performance tested on iPad Pro simulator (smooth operation verified)
- Store middleware approach deferred (not needed with current pattern)

**Commits:**
- `9ce640e` - "feat: complete PR6 and PR7 - progressive hint system, state management, and persistence"
- `1249531` - "feat: integrate progressStore into CanvasDemoScreen for complete attempt tracking"

---

## [0.6.0] - 2024-11-03 (PR6: Feedback & Hints)

### Added
- **Hint Library:**
  - `hint-library/hints.ts` - 36 hints across 4 error types (SYNTAX, ARITHMETIC, LOGIC, METHOD) × 3 levels
  - `hint-library/hintMapper.ts` - Error type → hint selection logic

- **Progressive Hint System:**
  - Three-tier escalation: Concept → Direction → Micro step
  - Per-error-type escalation tracking (separate levels for each error type)
  - Inactivity timer for auto-hints (10 seconds after 2+ incorrect attempts)
  - Manual hint request via "Need a Hint?" button
  - KaTeX LaTeX rendering support in hints (using $ delimiters)

- **Hint State Management:**
  - `app/stores/hintStore.ts` - Hint history, escalation levels, inactivity timer
  - `app/utils/hintUtils.ts` - Hint selection and formatting utilities
  - `app/types/Hint.ts` - Hint type definitions

### Changed
- Updated `app/types/Attempt.ts` with HintHistory field
- Integrated hintStore into CanvasDemoScreen and ValidationFeedback
- Automatic hint clearing on problem change
- Cleaned up duplicate hint logic in validationStore

**Commit:** `9ce640e` (combined with PR7)

---

## [0.5.0] - 2024-11-02 (PR5: Math Validation & API Integration)

### Added
- **UpStudy API Integration:**
  - `app/utils/apiConfig.ts` - API configuration
  - `app/utils/mathValidation.ts` - Math step validation logic
  - `app/stores/validationStore.ts` - Zustand state for validation
  - `app/types/Validation.ts` - Validation result types

- **Validation Features:**
  - Correctness checking (is math valid?)
  - Usefulness checking (does step advance solution?)
  - Error type classification (SYNTAX, ARITHMETIC, LOGIC, METHOD)
  - Three-tier feedback: ✅ Correct & Useful | ⚠️ Correct but Not Useful | ❌ Incorrect
  - Progressive hint system (concept → direction → micro steps)
  - Debounced API calls with timeout and error handling

- **Caching & Storage:**
  - MMKV integration (`react-native-mmkv@^3.3.3`)
  - `app/utils/storage.ts` - MMKV wrapper utilities
  - Validation result caching to avoid duplicate API calls
  - Cache statistics tracking

- **UI Components:**
  - `app/components/ValidationFeedback.tsx` - Animated validation feedback
  - `app/components/AppHeader.tsx` - App branding ("Write Math")

### Dependencies Added
- `react-native-mmkv@^3.3.3`
- `react-native-katex@^1.3.0` (math rendering)
- `react-native-webview@^13.16.0` (KaTeX dependency)
- `react-native-dotenv@^3.4.11` (environment variables)

### Changed
- Updated RecognitionIndicator with KaTeX rendering and repositioning
- Updated CanvasDemoScreen with validation integration
- Added babel.config.js dotenv plugin
- Updated .env.example with UpStudy API configuration
- App.tsx SafeAreaView configuration for iOS status bar

### Documentation
- `docs/UPSTUDY_API_INTEGRATION.md` - UpStudy API integration guide
- `docs/CAMERAMATH_SETUP.md` - CameraMath API setup guide

**Commit:** `52f8218` - "feat: complete PR4 and PR5 - problem display, validation, and UI improvements"

---

## [0.4.0] - 2024-11-01 (PR4: Problem Display & Math Rendering)

### Added
- **Problem Data:**
  - `app/utils/problemData.ts` - 25 linear equation problems (5 easy, 10 medium, 10 hard)
  - Helper functions: getProblemById, getRandomProblem, getNextProblem, getProblemStats
  - `app/types/Problem.ts` - Problem type definitions

- **Components:**
  - `app/components/ProblemDisplay.tsx` - Problem statement with KaTeX rendering
  - `app/components/FormattedStep.tsx` - Solution step display with feedback icons
  - Difficulty badges (Easy/Medium/Hard)
  - LaTeX math rendering with fallback text formatting

- **Features:**
  - Problem stays fixed at top of screen during solving
  - Full accessibility support with text alternatives
  - Next Problem button for testing
  - Clean, professional UI with proper spacing

### Dependencies Added
- `react-native-katex@^1.3.0` - LaTeX rendering

### Changed
- Updated CanvasDemoScreen with ProblemDisplay integration

### Documentation
- `docs/PROBLEM_DATA_FORMAT.md` - Problem data structure guide

**Commit:** `52f8218` (combined with PR5)

---

## [0.3.0] - 2024-10-31 (PR3: Handwriting Recognition)

### Added
- **MyScript Cloud API Integration:**
  - `app/types/MyScript.ts` - MyScript API type definitions
  - `app/utils/myScriptUtils.ts` - Stroke conversion utilities
  - `app/utils/myScriptClient.ts` - API client with HMAC authentication
  - `app/utils/recognitionUtils.ts` - Recognition utilities (pause detection, debouncing)

- **Recognition Features:**
  - Automatic pause detection (250-500ms trigger)
  - Confidence threshold filtering (>85% accuracy)
  - KaTeX rendering for recognized math expressions
  - Line splitting for multi-line equations
  - Debouncing and rate limiting for API efficiency

- **State Management:**
  - `app/stores/canvasStore.ts` - Zustand store for canvas state
  - `app/hooks/useRecognition.ts` - Recognition hook for managing flow

- **UI Components:**
  - `app/components/RecognitionIndicator.tsx` - Recognition status display (compact, top-right)
  - `app/components/ManualInputFallback.tsx` - Manual text input fallback

### Dependencies Added
- `axios@^1.13.2` - HTTP client
- `crypto-js@^4.2.0` - HMAC authentication
- `zustand@^5.0.8` - State management

### Changed
- Updated HandwritingCanvas with Zustand integration and recognition triggers
- Updated CanvasDemoScreen with recognition UI
- Added Node and Jest types to tsconfig.json
- Switched to `/iink/batch` endpoint (standard, best accuracy)

### Fixed
- Closure bug preventing last stroke from being recognized

### Documentation
- `docs/MYSCRIPT_SETUP.md` - MyScript API setup instructions
- `docs/PR3_SUMMARY.md` - PR3 implementation summary

**Approach Change:** Switched from ML Kit native bridge (5-7 days, offline) to MyScript Cloud API (1-2 days, online) for faster MVP delivery and superior math recognition.

**Commits:**
- `d4a5db8` - "feat: implement MyScript Cloud API for handwriting recognition (PR3 core infrastructure)"
- `8fb968b` - "feat: complete PR3 integration - wire recognition into canvas and demo screen"
- `fe2fe1c` - "fix: resolve closure bug preventing last stroke from being recognized"

---

## [0.2.0] - 2024-10-30 (PR2: Canvas & Handwriting Input)

### Added
- **Core Canvas Features:**
  - `app/components/HandwritingCanvas.tsx` - Skia-based canvas with gesture handling
  - `app/hooks/useStylus.ts` - Stylus detection and pressure handling
  - `app/utils/pressureUtils.ts` - Pressure-sensitive stroke sizing
  - Hardware-accelerated drawing (120 FPS capability)
  - Pressure-sensitive stylus/touch input (iOS & Android)
  - 5 color options (black, blue, red, green, purple)
  - Eraser tool with 3x pen width
  - Horizontal line guides for organized writing
  - Smooth stroke rendering using quadratic curves

- **Tablet UI Enhancement:**
  - `app/components/FloatingToolbar.tsx` - Draggable toolbar with 9 snap positions
  - `app/components/WelcomeModal.tsx` - First-launch tutorial modal
  - `app/components/ToggleButton.tsx` - Show/hide toolbar button
  - `app/screens/CanvasDemoScreen.tsx` - Full-screen tablet-optimized demo
  - True edge-to-edge fullscreen canvas (no letterboxing on iPad)
  - Native iPad support (TARGETED_DEVICE_FAMILY = "1,2")
  - Responsive toolbar sizing (80px × 400px iPad, 60px × 200px iPhone)
  - Full portrait and landscape orientation support with auto-rotation
  - Professional tablet-first UI design
  - Accessibility labels for all interactive elements

### Dependencies Added
- `@shopify/react-native-skia@~1.5.6` - Hardware-accelerated canvas
- `react-native-gesture-handler@~2.20.0` - Gesture handling
- `@react-native-async-storage/async-storage@^2.2.0` - WelcomeModal persistence

### Changed
- `App.tsx` - SafeAreaProvider with edges=[], StatusBar translucent
- `ios/Podfile.lock` - Updated after pod install
- `ios/handwritingMathApp/Info.plist` - Added UIDeviceFamily, orientation settings, UIRequiresFullScreen
- `ios/handwritingMathApp/AppDelegate.swift` - Added orientation support method
- `ios/handwritingMathApp/LaunchScreen.storyboard` - Removed portrait-only constraint
- `ios/handwritingMathApp.xcodeproj/project.pbxproj` - Added TARGETED_DEVICE_FAMILY

### Documentation
- Comprehensive code documentation in all files

**Commit:** `811e73f` - "feat: implement handwriting canvas with Skia, gesture handling, and tablet-optimized UI"

---

## [0.1.0] - 2024-10-29 (PR1: Project Setup)

### Added
- **Initial Project Structure:**
  - React Native 0.76.6 with New Architecture enabled (Fabric + TurboModules + JSI)
  - Hermes JavaScript engine (default)
  - TypeScript configuration with strict mode
  - Expo SDK 52.0.0 integration
  - Directory structure: app/, docs/, native-modules/, tests/, hint-library/, scripts/

- **Development Tools:**
  - ESLint and Prettier configuration
  - Git repository initialization
  - .gitignore for React Native, build artifacts, API keys
  - .env.example template

- **Documentation Foundation:**
  - README.md with project overview
  - CLAUDE.md for AI development assistance
  - docs/PRD-Updated-2025 (1).md - Product requirements
  - docs/ARCHITECTURE.md - System design
  - docs/TASK_LIST.md - 11-PR workflow tracker

### Technical
- iOS: Podfile with New Architecture dependencies
- package.json with base dependencies and scripts
- npm and CocoaPods dependencies installed
- Xcode workspace configuration verified

**Commit:** `fba0c73` - "chore: initial React Native project setup for handwriting math app"

---

## Future Releases

### PR12: Cloud Storage Integration (Completed)
- Supabase project and schema with RLS policies
- Client SDK integration (supabaseClient.ts)
- Stroke serialization with delta+gzip compression (70-90% reduction)
- Sync queue with retry/backoff
- Email magic link authentication
- Store integrations (progressStore, hintStore)
- Settings UI with Cloud Sync section
- Documentation (CLOUD_SYNC.md, DB_SCHEMA.sql)

### PR13: Teacher/Guide App (Future)
- WebSocket real-time infrastructure
- Teacher dashboard
- Live progress monitoring
- Direct write-into-workspace capability

### PR14: Tutorial Mode (Future)
- Video playback library integration
- Lesson/skill content structure
- Progress tracking per skill

### PR15: Assessment Mode (Future)
- Submit-then-validate workflow
- Full solution checking
- Defer validation until submit button

### PR16: Undo/Redo & Advanced Features (Partial - Undo Complete)
- ✅ Undo last stroke (toolbar button)
- ✅ Undo last line (toolbar button)
- 🔜 Redo (per stroke/line)
- 🔜 Gesture-based undo (swipe)
- 🔜 Voice hints (optional)

---

## Version History Summary

| Version | PR | Description | Status | Commit |
|---------|----|-----------|---------| -------|
| 0.1.0 | PR1 | Project Setup | ✅ Complete | `fba0c73` |
| 0.2.0 | PR2 | Canvas & Handwriting Input | ✅ Complete | `811e73f` |
| 0.3.0 | PR3 | MyScript Recognition | ✅ Complete | `d4a5db8` |
| 0.4.0 | PR4 | Problem Display | ✅ Complete | `52f8218` |
| 0.5.0 | PR5 | Math Validation | ✅ Complete | `52f8218` |
| 0.6.0 | PR6 | Hints & Feedback | ✅ Complete | `9ce640e` |
| 0.7.0 | PR7 | State & Persistence | ✅ Complete | `9ce640e` |
| 0.8.0 | PR8 | Animations & UI | ✅ Complete | `7751e9a` |
| 0.9.0 | PR9 | Navigation | ✅ Complete | `fc23c3a` |
| 0.10.0 | PR10 | Testing & Error Tracking | ✅ Complete | `2ce5b7a` |
| 0.11.0 | PR11 | Documentation & Deployment | ✅ Complete | (pending) |

**MVP Status:** 11/11 PRs Complete (100%) 🎉

---

## Links

- **Repository:** [GitHub Repository URL]
- **Documentation:** [docs/](docs/)
- **Issue Tracker:** [GitHub Issues]
- **Releases:** [GitHub Releases]

---

[Unreleased]: https://github.com/your-org/handwriting-math-app/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.11.0
[0.10.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.10.0
[0.9.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.9.0
[0.8.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.8.0
[0.7.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.7.0
[0.6.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.6.0
[0.5.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.5.0
[0.4.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.4.0
[0.3.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.3.0
[0.2.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.2.0
[0.1.0]: https://github.com/your-org/handwriting-math-app/releases/tag/v0.1.0
