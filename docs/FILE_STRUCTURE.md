# File Structure

Complete reference for the Handwriting Math App project organization. This document explains the purpose of each directory, module, and key file.

---

## Table of Contents

1. [Root Directory Overview](#root-directory-overview)
2. [App Directory Deep Dive](#app-directory-deep-dive)
3. [Component Organization](#component-organization)
4. [Store Responsibilities](#store-responsibilities)
5. [Utility Module Breakdown](#utility-module-breakdown)
6. [Documentation Directory](#documentation-directory)
7. [Navigation Structure](#navigation-structure)
8. [Testing Structure](#testing-structure)

---

## Root Directory Overview

```
/handwritingMath
├── __tests__/           # Root-level app tests
├── android/             # Android native code (descoped for MVP)
├── ios/                 # iOS native code and Xcode project
├── app/                 # Main application code (React Native)
├── docs/                # Project documentation
├── hint-library/        # Hint data and mapping logic
├── native-modules/      # Empty (ML Kit descoped - using MyScript Cloud API)
├── scripts/             # Build and automation scripts
├── tests/               # Test suites (unit, component, e2e)
├── .env.example         # Environment variable template
├── .gitignore           # Git exclusions
├── App.tsx              # Root React component
├── app.json             # Expo/RN app configuration
├── babel.config.js      # Babel transpiler configuration
├── eas.json             # Expo Application Services config
├── index.js             # App entry point
├── jest.config.js       # Jest test runner configuration
├── metro.config.js      # Metro bundler configuration
├── package.json         # NPM dependencies and scripts
├── CLAUDE.md            # AI assistant instructions
├── README.md            # Project overview and quick start
└── tsconfig.json        # TypeScript compiler configuration
```

### Key Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts, metadata |
| `tsconfig.json` | TypeScript configuration (strict mode enabled) |
| `jest.config.js` | Test runner configuration (139 passing tests) |
| `babel.config.js` | Transpiler configuration (Reanimated, dotenv plugins) |
| `metro.config.js` | React Native bundler configuration |
| `app.json` | Expo configuration (display name, slug, orientation) |
| `eas.json` | Expo build service configuration |
| `.env.example` | Environment variable template (API keys, feature flags) |
| `CLAUDE.md` | Development guidelines for AI pair programming |

---

## App Directory Deep Dive

The `app/` directory contains all React Native application code, organized by responsibility:

```
app/
├── assets/              # Static resources
├── components/          # Reusable UI components (17 files)
├── hooks/               # Custom React hooks (2 files)
├── navigation/          # React Navigation setup (2 files)
├── screens/             # Full-screen views (5 files)
├── stores/              # Zustand state stores (5 files)
├── styles/              # Centralized style system (6 files)
├── types/               # TypeScript type definitions (8 files)
└── utils/               # Pure utility functions (11 files + sync/)
```

### Assets (`app/assets/`)

```
assets/
├── images/              # Image assets (empty for MVP)
│   └── .gitkeep
└── lottie/              # Lottie animation files (empty - using Reanimated)
    └── .gitkeep
```

**Note:** MVP uses emoji-based animations with React Native Reanimated instead of Lottie files for better performance.

---

## Component Organization

### All Components (17 files)

#### Canvas & Interaction (2 components)
- `HandwritingCanvas.tsx` (13KB) - Skia-based canvas with gesture handling
  - Hardware-accelerated drawing
  - Pressure-sensitive stylus support
  - Stroke management and undo functionality
- `FloatingToolbar.tsx` (7KB) - Draggable toolbar with 9 snap positions
  - Color selection (5 colors)
  - Eraser tool
  - Undo controls (last stroke, last line)

#### Recognition & Validation (4 components)
- `RecognitionIndicator.tsx` (5KB) - Recognition status display
  - Idle/recognizing/recognized states
  - KaTeX rendering of recognized math
  - Compact top-right positioning
- `InlineRecognitionDisplay.tsx` (3KB) - Inline recognition results
- `ValidationFeedback.tsx` (11KB) - Validation result display
  - Three-tier feedback: ✅ Correct & Useful | ⚠️ Correct but Not Useful | ❌ Incorrect
  - Progressive hint display
  - Animated feedback with Reanimated
- `StepResultDisplay.tsx` (4KB) - Step-by-step solution display

#### Feedback & Hints (4 components)
- `FeedbackAnimation.tsx` (3KB) - Animated validation feedback
  - Bounce animation for success
  - Shake animation for errors
- `HintReveal.tsx` (4KB) - Hint escalation animations
  - Slide-in reveal animation
  - Progressive hint display (concept → direction → micro)
- `SuccessAnimation.tsx` (2KB) - Celebration confetti animation
- `ManualInputFallback.tsx` (4KB) - Manual text input fallback

#### Problem Display (3 components)
- `ProblemDisplay.tsx` (7KB) - Problem statement with KaTeX
  - Difficulty badges (Easy/Medium/Hard)
  - LaTeX math rendering
  - Fixed top positioning
- `FormattedStep.tsx` (6KB) - Solution step with feedback icons
- `InlineMath.tsx` (2KB) - Inline KaTeX rendering utility

#### UI Primitives (4 components)
- `AppHeader.tsx` (4KB) - App branding header
- `WelcomeModal.tsx` (9KB) - First-launch tutorial modal
  - MMKV persistence for "don't show again"
- `ToggleButton.tsx` (2KB) - Toolbar show/hide button
- `ErrorBoundary.tsx` (4KB) - React error boundary with fallback UI

### Component Categorization by Responsibility

| Category | Components | Purpose |
|----------|------------|---------|
| Canvas | HandwritingCanvas, FloatingToolbar | Drawing and tool interaction |
| Recognition | RecognitionIndicator, InlineRecognitionDisplay | Handwriting recognition feedback |
| Validation | ValidationFeedback, StepResultDisplay | Math validation and feedback |
| Hints | HintReveal, ManualInputFallback | Progressive hint system |
| Animations | FeedbackAnimation, SuccessAnimation | User feedback animations |
| Problem Display | ProblemDisplay, FormattedStep, InlineMath | Math problem rendering |
| UI Primitives | AppHeader, WelcomeModal, ToggleButton, ErrorBoundary | Reusable UI elements |

---

## Store Responsibilities

### 5 Zustand Stores (52.9KB total)

All stores use manual MMKV persistence with `saveToStorage`/`loadFromStorage` pattern.

#### 1. `canvasStore.ts` (5.3KB)
**Domain:** Drawing canvas state

**State:**
- `strokes: Stroke[]` - Current drawing strokes
- `recognizedText: string` - Latest MyScript recognition result
- `isRecognizing: boolean` - Recognition in progress

**Actions:**
- `addStroke(stroke)` - Add new stroke to canvas
- `undoLastStroke()` - Remove last stroke
- `undoLastLine()` - Remove all strokes from last line
- `clearCanvas()` - Clear all strokes
- `setRecognizedText(text)` - Update recognition result

**Persistence:** None (ephemeral canvas state)

**Usage:** HandwritingCanvas, FloatingToolbar, RecognitionIndicator

---

#### 2. `validationStore.ts` (9.6KB)
**Domain:** Math validation and problem state

**State:**
- `currentProblem: Problem | null` - Active math problem
- `userSteps: Step[]` - User's solution steps
- `validationResults: Map<stepId, ValidationResult>` - Validation cache
- `isValidating: boolean` - API call in progress

**Actions:**
- `setProblem(problem)` - Load new problem
- `addStep(step)` - Add user step
- `validateStep(stepId)` - Call UpStudy API for validation
- `clearValidation()` - Reset validation state

**Persistence:** Validation results cached in MMKV (via storage.ts)

**Integration:** Uses `mathValidation.ts` utility for UpStudy API calls

**Usage:** TrainingModeScreen, ValidationFeedback, ProblemDisplay

---

#### 3. `hintStore.ts` (11KB)
**Domain:** Hint escalation and history

**State:**
- `hintLevels: Map<errorType, level>` - Per-error-type escalation levels
- `hintHistory: HintHistory[]` - All hints shown
- `inactivityTimer: number | null` - Auto-hint countdown
- `hintsUsedCount: number` - Total hints consumed

**Actions:**
- `requestHint(errorType)` - Get next hint for error type
- `escalateHint(errorType)` - Move to next level (concept → direction → micro)
- `resetEscalation()` - Reset all hint levels on problem change
- `startInactivityTimer()` - Begin 10-second auto-hint countdown

**Persistence:** Hint history and levels saved to MMKV

**Integration:** Uses `hintUtils.ts` for hint selection from `hint-library/`

**Usage:** ValidationFeedback, HintReveal, TrainingModeScreen

---

#### 4. `progressStore.ts` (17KB)
**Domain:** User progress and attempt tracking

**State:**
- `attempts: Attempt[]` - All problem attempts (complete history)
- `completedProblems: Set<problemId>` - Solved problem IDs
- `stats: ProgressStats` - Accuracy, avg time, step counts
- `xp: number` - Experience points (future gamification)
- `level: number` - User level (future gamification)

**Actions:**
- `startAttempt(problemId)` - Begin new attempt
- `endAttempt(attemptId, status)` - Mark attempt complete/abandoned
- `addStepToAttempt(attemptId, step)` - Track step within attempt
- `getAttemptById(attemptId)` - Retrieve attempt data
- `exportProgress()` - Export all progress for cloud sync

**Persistence:** ALL state persisted to MMKV (critical user data)

**Integration:** Syncs to Supabase via `app/utils/sync/syncClient.ts` (PR12)

**Usage:** TrainingModeScreen, ReviewScreen, SettingsScreen, cloud sync

---

#### 5. `uiStore.ts` (10KB)
**Domain:** UI state and settings

**State:**
- `theme: 'light' | 'dark'` - Theme mode (light only for MVP)
- `activeModal: ModalType | null` - Currently displayed modal
- `isLoading: boolean` - Global loading state
- `notifications: Notification[]` - Toast notifications
- `settings: AppSettings` - User preferences

**Actions:**
- `showModal(type, data)` - Display modal (7 types: welcome, settings, review, etc.)
- `hideModal()` - Close active modal
- `showNotification(message, type)` - Display toast
- `updateSettings(settings)` - Update user preferences

**Persistence:** Theme and settings saved to MMKV

**Usage:** All screens, WelcomeModal, navigation components

---

### Store Communication

Stores are intentionally isolated. Cross-store communication happens via:

1. **Component composition** - Components subscribe to multiple stores
2. **Action triggers** - One store action triggers another (e.g., `setProblem` → `resetEscalation`)
3. **Shared utilities** - Both `validationStore` and `hintStore` use `hintUtils.ts`

**Anti-pattern:** Direct store-to-store imports (not used in this codebase)

---

## Utility Module Breakdown

### 11 Utility Files (+ `sync/` subdirectory)

All utilities are pure functions (no side effects except API calls and storage).

#### API Integration (4 files)

**1. `myScriptClient.ts` (8KB)**
- MyScript Cloud API client with HMAC authentication
- Stroke-to-JSON conversion
- POST requests to `/iink/batch` endpoint
- Error handling and timeout (5s)

**2. `mathValidation.ts` (7KB)**
- UpStudy API integration for step validation
- Correctness checking (is math valid?)
- Usefulness checking (does step advance solution?)
- Error type classification (SYNTAX, ARITHMETIC, LOGIC, METHOD)
- Response parsing for hints and next steps

**3. `hintUtils.ts` (6KB)**
- Progressive hint selection from hint library
- Error type → hint mapping
- Escalation logic (concept → direction → micro)
- Hint formatting with KaTeX support

**4. `apiConfig.ts` (2KB)**
- API endpoint configuration
- Environment variable loading
- Timeout and retry settings

---

#### Recognition & Canvas (4 files)

**5. `recognitionUtils.ts` (4KB)**
- Pause detection (250-500ms trigger)
- Confidence threshold filtering (>85%)
- Line splitting for multi-line equations
- Debouncing and rate limiting

**6. `myScriptUtils.ts` (3KB)**
- Stroke data transformation
- Pressure normalization
- Coordinate conversion

**7. `pressureUtils.ts` (2KB)**
- Stylus pressure detection
- Pressure-to-stroke-width mapping

**8. `lineDetectionUtils.ts` (3KB)**
- Line boundary detection for multi-line problems
- Y-coordinate clustering for line separation

---

#### Data & Storage (3 files)

**9. `storage.ts` (11.9KB)**
- MMKV wrapper utilities
- Cache management (set, get, delete, clear)
- Statistics tracking (cache hits, misses)
- JSON serialization/deserialization
- Export/import for debugging

**10. `problemData.ts` (15KB)**
- 25 hardcoded linear equation problems
  - 5 Easy (one-step: x + 5 = 12)
  - 10 Medium (two-step: 2x + 3 = 11)
  - 10 Hard (variables both sides: 3x + 7 = 2x + 15)
- Helper functions:
  - `getProblemById(id)`
  - `getRandomProblem(difficulty?)`
  - `getNextProblem(currentId)`
  - `getProblemStats()`

**11. `sentry.ts` (4KB)**
- Sentry SDK initialization
- Error tracking and breadcrumbs
- Performance monitoring
- Custom context (user, tags, extras)

---

#### Cloud Sync Utilities (`app/utils/sync/`)

**Created in PR12 - Supabase Integration**

```
utils/sync/
├── supabaseClient.ts    (3KB) - Supabase initialization + auth
├── serializer.ts        (5KB) - Delta+gzip stroke compression
├── queue.ts             (4KB) - MMKV-backed retry queue
├── syncClient.ts        (8KB) - Idempotent upsert methods
└── hydrate.ts           (3KB) - App launch data restore
```

**Purpose:** Local-first cloud synchronization with 70-90% bandwidth reduction

**Integration:** Called by `progressStore.ts` and `hintStore.ts` actions

**Documentation:** See `docs/CLOUD_SYNC.md`

---

## Documentation Directory

### Existing Documentation (13 files)

```
docs/
├── ARCHITECTURE.md                   # System design and data flows
├── CAMERAMATH_SETUP.md              # CameraMath API integration guide
├── CLOUD_SYNC.md                    # Supabase cloud sync documentation
├── DB_SCHEMA.sql                    # Supabase database schema with RLS
├── FILE_STRUCTURE.md                # This file
├── MYSCRIPT_SETUP.md                # MyScript API setup instructions
├── MyScript_WebSocket_vs_REST.md    # API protocol comparison
├── PR3_SUMMARY.md                   # PR3 implementation summary
├── PRD-Updated-2025 (1).md          # Product requirements document
├── PROBLEM_DATA_FORMAT.md           # Problem data structure guide
├── TASK_LIST.md                     # 11-PR workflow tracker
├── TESTING.md                       # Test strategy and patterns
├── Superbuilders - Handwriting Math Project.md  # Original project spec
└── UPSTUDY_API_INTEGRATION.md       # UpStudy API integration guide
```

### Documentation Coverage

| Topic | Files | Purpose |
|-------|-------|---------|
| Architecture | ARCHITECTURE.md, FILE_STRUCTURE.md | System design and organization |
| API Setup | MYSCRIPT_SETUP.md, UPSTUDY_API_INTEGRATION.md, CAMERAMATH_SETUP.md | API credentials and integration |
| Cloud Sync | CLOUD_SYNC.md, DB_SCHEMA.sql | Supabase setup and schema |
| Testing | TESTING.md | Test patterns and guidelines |
| Development | TASK_LIST.md, PR3_SUMMARY.md | PR workflow and progress |
| Data Formats | PROBLEM_DATA_FORMAT.md | Problem data structure |
| Product | PRD-Updated-2025 (1).md | Requirements and specifications |

---

## Navigation Structure

### React Navigation 7 Setup

**Files:**
- `app/navigation/AppNavigator.tsx` (5KB) - Navigation container and stack
- `app/navigation/types.ts` (2KB) - TypeScript route parameter types

**Stack Structure:**
```typescript
type RootStackParamList = {
  Home: undefined;
  TrainingMode: { problemId: string; difficulty: ProblemDifficulty };
  Review: undefined;
  Settings: undefined;
};
```

**Screen Hierarchy:**
```
NavigationContainer
└── Native Stack Navigator
    ├── Home (initial route)
    ├── TrainingMode (push)
    ├── Review (modal)
    └── Settings (modal)
```

**Navigation Patterns:**

1. **Home → Training Mode:** Push navigation with problem parameters
   ```typescript
   navigation.navigate('TrainingMode', { problemId, difficulty });
   ```

2. **Modal Screens:** Review and Settings use modal presentation
   ```typescript
   <Stack.Screen
     name="Review"
     component={ReviewScreen}
     options={{ presentation: 'modal' }}
   />
   ```

3. **Type Safety:** All navigation uses typed hooks
   ```typescript
   type TrainingModeScreenProps = NativeStackScreenProps<RootStackParamList, 'TrainingMode'>;
   ```

**Deep Linking:** Not implemented for MVP (placeholder for future teacher app integration)

---

## Testing Structure

### Test Organization (tests/ directory)

```
tests/
├── __mocks__/           # Module mocks
│   └── .gitkeep
├── component/           # Component tests (deferred to post-MVP)
│   └── .gitkeep
├── e2e/                 # End-to-end tests (deferred to post-MVP)
│   └── .gitkeep
├── unit/                # Unit tests (139 passing tests)
│   ├── hintUtils.test.ts           (54 tests)
│   ├── mathValidation.test.ts      (21 tests)
│   ├── recognitionUtils.test.ts    (29 tests)
│   └── storage.test.ts             (35 tests)
└── jest.setup.js        # Global test setup and mocks
```

### Test Coverage

**Current Status:** 139 passing unit tests

**Coverage Targets (jest.config.js):**
```javascript
coverageThresholds: {
  global: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70
  }
}
```

**Test Execution:**
```bash
npm test                  # Run all tests (~0.3-0.5s)
npm test -- --coverage    # With coverage report
npm test -- --watch       # Watch mode
```

**Deferred to Post-MVP:**
- Component tests (require Skia canvas mocking)
- E2E tests with Detox (require native build configuration)

**Documentation:** See `docs/TESTING.md` for detailed test patterns

---

## Hint Library Structure

### Hint Data Organization

```
hint-library/
├── hints.ts             # 36 hints across 4 error types × 3 levels
└── hintMapper.ts        # Error type → hint selection logic
```

**Hint Levels:**
1. **Concept** (most abstract) - "Think about inverse operations"
2. **Direction** (intermediate) - "Try adding 5 to both sides"
3. **Micro** (most specific, no full answer) - "Add 5 to the left side of the equation"

**Error Types:**
- `SYNTAX` - Notation errors (missing operators, invalid symbols)
- `ARITHMETIC` - Calculation mistakes
- `LOGIC` - Incorrect reasoning (wrong operation choice)
- `METHOD` - Inefficient or unconventional approaches

**Total Hints:** 36 (12 per error type, 3 per level)

**Integration:** Used by `hintUtils.ts` → `hintStore.ts` → `ValidationFeedback.tsx`

---

## Native Modules (Future)

```
native-modules/
└── .gitkeep
```

**Status:** Empty (ML Kit native bridge descoped for MVP)

**Current Approach:**
- MyScript Cloud API integration via REST (app/utils/myScriptClient.ts)
- Cloud-based recognition (requires internet connection)
- Faster MVP delivery (1-2 days vs 5-7 days for native bridge)
- Superior math recognition accuracy

**Future Consideration:**
- Could implement ML Kit native bridge for offline capability in future releases
- Would require Android (Kotlin) and iOS (Swift) native modules

---

## Scripts Directory

```
scripts/
└── .gitkeep
```

**Planned Scripts (PR11):**
- `build-ios.sh` - Automated iOS release builds
- `test.sh` - Test execution wrapper with coverage

---

## iOS Native Structure

```
ios/
├── handwritingMathApp/              # Main app target
│   ├── Images.xcassets/             # App icons
│   ├── AppDelegate.swift            # App lifecycle + orientation support
│   ├── Info.plist                   # App configuration
│   ├── LaunchScreen.storyboard      # Launch screen
│   └── PrivacyInfo.xcprivacy        # Privacy manifest
├── handwritingMathApp.xcodeproj/    # Xcode project
├── handwritingMathApp.xcworkspace/  # Xcode workspace (CocoaPods)
├── Podfile                          # CocoaPods dependencies
├── Podfile.lock                     # Locked dependency versions
└── .xcode.env                       # Xcode environment variables
```

**Key Configurations:**
- `TARGETED_DEVICE_FAMILY = "1,2"` - iPhone + iPad support
- `UIRequiresFullScreen = YES` - No split-view multitasking
- All orientations enabled (portrait, landscape, upside down)
- New Architecture enabled (Fabric + TurboModules)

---

## File Naming Conventions

### TypeScript/TSX Files
- **Components:** PascalCase with `.tsx` extension (e.g., `HandwritingCanvas.tsx`)
- **Utilities:** camelCase with `.ts` extension (e.g., `mathValidation.ts`)
- **Stores:** camelCase with `Store` suffix (e.g., `canvasStore.ts`)
- **Types:** PascalCase with `.ts` extension (e.g., `Problem.ts`)
- **Hooks:** camelCase with `use` prefix (e.g., `useRecognition.ts`)

### Test Files
- **Pattern:** `[filename].test.ts` (e.g., `hintUtils.test.ts`)
- **Location:** Mirror source structure in `tests/unit/`, `tests/component/`, `tests/e2e/`

### Documentation
- **Pattern:** SCREAMING_SNAKE_CASE with `.md` extension (e.g., `TASK_LIST.md`)
- **Exception:** README.md (all caps by convention)

---

## Quick Reference

### Find a Component
```bash
ls app/components/          # List all 17 components
```

### Find a Utility
```bash
ls app/utils/               # List all 11 utilities
ls app/utils/sync/          # List cloud sync utilities
```

### Find a Store
```bash
ls app/stores/              # List all 5 stores
```

### Find Documentation
```bash
ls docs/                    # List all 13+ docs
```

### Run Tests
```bash
npm test                    # All 139 tests
npm test -- hintUtils       # Specific test file
```

---

## Summary Statistics

| Category | Count | Total Size |
|----------|-------|------------|
| **Components** | 17 files | ~90KB |
| **Stores** | 5 files | 52.9KB |
| **Utilities** | 11 files + 5 sync files | ~95KB |
| **Screens** | 5 files | ~60KB |
| **Hooks** | 2 files | ~5KB |
| **Types** | 8 files | ~15KB |
| **Styles** | 6 files | ~10KB |
| **Tests** | 4 test suites | 139 passing tests |
| **Documentation** | 13+ files | N/A |

**Total React Native Code:** ~330KB across 58 TypeScript files

---

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System design and data flows
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) - Zustand store patterns
- [TESTING.md](TESTING.md) - Test strategy and patterns
- [SETUP.md](SETUP.md) - Developer onboarding guide
- [TASK_LIST.md](TASK_LIST.md) - PR workflow and progress tracker
