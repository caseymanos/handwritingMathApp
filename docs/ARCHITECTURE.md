# Handwriting Math App - Architecture Breakdown by Task

This document maps each PR task list to specific architectural components and data flows. Use this to understand how tasks relate to the overall system.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Native App (New Arch)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Navigation     │  │   Screens        │  │  Components  │  │
│  │  (React Nav 7)   │  │                  │  │              │  │
│  │                  │  │ - TrainingMode   │  │ - Canvas     │  │
│  └──────────────────┘  │ - Home           │  │ - Hints      │  │
│                        │ - Review         │  │ - Problem    │  │
│                        │ - Settings       │  │ - Feedback   │  │
│                        └──────────────────┘  └──────────────┘  │
│                              ▲                       ▲           │
│                              │                       │           │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Zustand State Stores                     │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │       │
│  │  │ canvasStore  │  │validationStor│  │hintStore  │  │       │
│  │  │              │  │              │  │           │  │       │
│  │  │- strokes     │  │- results     │  │- escalat. │  │       │
│  │  │- recognized  │  │- feedback    │  │- history  │  │       │
│  │  │- colors      │  │- caching     │  │- pending  │  │       │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │       │
│  └──────────────────────────────────────────────────────┘       │
│                         Persistence ▼                           │
│  ┌──────────────────────────────────────────────────────┐       │
│  │    MMKV Local Storage (Encrypted)                    │       │
│  │  - Attempt history                                   │       │
│  │  - Validation cache                                  │       │
│  │  - User progress                                     │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
         │                        │                    │
         ▼                        ▼                    ▼
    ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐
    │ Skia Canvas     │  │ ML Kit Bridge    │  │ Reanimated  │
    │ + Gesture       │  │ (Native Module)  │  │ + Skottie   │
    │ Handler (Stylus)│  │ - Recognition    │  │ Animations  │
    │                 │  │ - Stroke parsing │  │             │
    └─────────────────┘  └──────────────────┘  └─────────────┘
         │                        │                    
         ▼                        ▼                    
    User Input              Offline Ink              Visual
    (Drawing)               Recognition              Feedback
                                                          
┌─────────────────────────────────────────────────────────────────┐
│                    External APIs & Services                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌────────────────────┐  ┌─────────────┐ │
│  │ CameraMath API   │  │ KaTeX Rendering    │  │   Sentry    │ │
│  │                  │  │ (Problem Display)  │  │ (Error Track)│ │
│  │ - Math Validation│  │ - LaTeX parsing    │  │             │ │
│  │ - Step checking  │  │ - SVG output       │  └─────────────┘ │
│  │ - Caching        │  │ - Performance opt. │                   │
│  └──────────────────┘  └────────────────────┘                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Training Mode (Primary User Flow)

```
1. USER DRAWS ON CANVAS
   └─> Gesture Handler captures (x, y, pressure, time)
   └─> Skia renders stroke to canvas
   └─> Strokes stored in canvasStore (Zustand)

2. ML KIT RECOGNITION TRIGGERED (250-500ms pause)
   └─> Native bridge converts strokes to ink data
   └─> ML Kit Digital Ink processes locally
   └─> Returns recognized text (e.g., "x + 5 = 12")
   └─> recognitionUtils.ts segments into steps
   └─> canvasStore updated with recognized text

3. MATH VALIDATION VIA CAMERAMATH
   └─> Recognized text sent to CameraMath API
   └─> API returns: correctness, next steps, solution path
   └─> mathValidation.ts determines usefulness
   └─> Validation cached in MMKV (avoid repeat calls)
   └─> validationStore updated with result

4. HINT SYSTEM ACTIVATED (IF INCORRECT)
   └─> Error type extracted from validation
   └─> hintMapper.ts maps error → hint library
   └─> Progressive hints loaded (concept → direction → micro)
   └─> hintStore tracks escalation level
   └─> HintDisplay component renders with KaTeX

5. FEEDBACK ANIMATION
   └─> Reanimated 3 triggers state animation
   └─> ✅ (green) / ⚠️ (yellow) / ❌ (red) displayed
   └─> Skottie celebrates on success (optional)
   └─> User proceeds to next line or gets hint

6. PERSISTENCE
   └─> Entire attempt (strokes, validation, hints) saved to MMKV
   └─> progressStore updated with problem completion
   └─> Data available for review screen and future analytics
```

---

## PR Task Mapping to Architecture

### PR1: Project Setup - Foundation Layer
```
Foundation
├── New Architecture (Fabric, JSI, TurboModules) enabled
├── Hermes JavaScript engine
├── Directory structure created
├── Git initialized
└── Dependencies scaffolded

Impacts: ALL subsequent PRs depend on this
Files affected: package.json, android/gradle.properties, ios/Podfile
```

### PR2: Canvas & Input - User Interface Layer
```
User Interface Layer
├── Skia Canvas Rendering
│   └── GPU-accelerated, 120 FPS capable
│   └── Smooth stroke drawing
├── Gesture Handler
│   └── Stylus input detection
│   └── Pressure sensitivity handling
│   └── Multi-touch support
├── Tools
│   └── Color picker
│   └── Eraser tool
│   └── Line guides (visual)
└── Hooks
    └── useStylus - device capability detection
    └── useGesture - custom gesture logic

Components: HandwritingCanvas.tsx, ColorPicker.tsx, ToolBar.tsx
Stores: canvasStore (initial - stroke management)
```

### PR3: Recognition - ML & Native Bridge Layer
```
ML & Native Layer
├── Native Bridge (Android & iOS)
│   └── ML Kit Digital Ink Recognition SDK
│   └── Stroke-to-ink data conversion
│   └── Confidence scoring
├── Recognition Utils
│   └── Line segmentation logic
│   └── Stroke filtering
│   └── Confidence thresholding (>85%)
├── Recognition Trigger
│   └── Timer: 250-500ms pause detection
│   └── "Processing..." UI feedback
└── Fallback
    └── Manual text input if recognition fails

Native Code: MLKitBridge.kt (Android), MLKitBridge.swift (iOS)
Components: RecognitionIndicator.tsx
Stores: canvasStore (recognized text)
```

### PR4: Problem Display - Content Layer
```
Content Layer
├── Problem Display Component
│   └── KaTeX-rendered problem text
│   └── Fixed position at top
│   └── Always visible during solving
├── Problem Data Structure
│   └── Problem type, text, answer, steps
│   └── Problem difficulty/category
├── Math Rendering
│   └── LaTeX to SVG/image conversion
│   └── Responsive sizing
│   └── Accessibility text alternatives
└── Problem Library (MVP)
    └── 20-30 hardcoded linear equation problems
    └── Future: dynamic problem generation

Components: ProblemDisplay.tsx, FormattedStep.tsx
Types: Problem.ts, MathExpression.ts
Data: problemData.ts (hardcoded library)
```

### PR5: Validation - Logic & API Layer
```
Logic & API Layer
├── CameraMath API Integration
│   └── API client with error handling
│   └── Request/response parsing
│   └── Rate limiting (max 1 per 500ms)
│   └── Backoff strategy for failures
├── Validation Logic
│   ├── Correctness Checking
│   │   └── Math validity verification
│   │   └── Error type classification
│   └── Usefulness Assessment
│       └── Step progression detection
│       └── Tautology detection (correct but useless)
├── Caching Layer
│   └── MMKV cache for identical requests
│   └── Cache invalidation logic
└── Error Handling
    └── Offline detection
    └── API failure recovery
    └── User-friendly error messages

Utilities: mathValidation.ts, apiConfig.ts, storage.ts
Stores: validationStore (results, feedback state)
Types: Validation.ts, Attempt.ts
Components: ValidationFeedback.tsx
```

### PR6: Hints & Guidance - Intelligence Layer
```
Intelligence Layer
├── Hint Library
│   ├── Error Type Mapping
│   │   └── ~5-10 error patterns per problem type
│   │   └── JSON mapping: error → hints
│   └── Progressive Hints
│       ├── Tier 1: Concept (abstract principle)
│       ├── Tier 2: Direction (how to proceed)
│       └── Tier 3: Micro step (specific action)
├── Hint Escalation Logic
│   ├── Track attempts & hint level
│   ├── Escalate on repeat error
│   └── Timeout-based escalation
├── Inactivity Detection
│   ├── Timer (10 seconds default)
│   ├── Shows tip if no input
│   └── Resets on interaction
└── Hint Display
    └── KaTeX rendering for math
    └── Smooth reveal animation
    └── Never reveals full solution

Hint Library: hints.ts, hintMapper.ts
Stores: hintStore (escalation, history)
Components: HintDisplay.tsx, HintEscalation.tsx
Types: Hint.ts
```

### PR7: State Management & Persistence - Data Layer
```
Data Layer
├── Zustand Stores (In-Memory State)
│   ├── canvasStore
│   │   ├── Current strokes (ink points)
│   │   ├── Recognized text per step
│   │   ├── Color/tool selection
│   │   └── Canvas metadata
│   ├── validationStore
│   │   ├── Validation results
│   │   ├── Feedback states
│   │   └── Error classifications
│   ├── hintStore
│   │   ├── Hint escalation level
│   │   ├── Hint history
│   │   └── Pending hints
│   ├── progressStore
│   │   ├── Completed problems
│   │   ├── Attempt count
│   │   └── Student metadata
│   └── uiStore
│       ├── Selected colors
│       ├── Current tool
│       └── UI state (loading, etc.)
├── MMKV Local Storage (Persistent)
│   ├── Entire attempt history (all fields)
│   ├── Validation cache
│   ├── Problem completion state
│   └── Built-in encryption
├── Persistence Middleware
│   ├── Auto-save on line completion
│   ├── Debounced writes
│   └── Migration support for schema changes
└── Data Export
    └── Export attempt history for debugging
    └── Analytics-ready format

Stores: canvasStore.ts, validationStore.ts, hintStore.ts, progressStore.ts, uiStore.ts
Utilities: storage.ts, storeMiddleware.ts
Types: Store.ts, Attempt.ts, Validation.ts
```

### PR8: Animation & Polish - Visual Layer
```
Visual Layer
├── React Native Reanimated 3
│   ├── Feedback animations
│   │   ├── ✅ Correct & useful: green checkmark + bounce
│   │   ├── ⚠️ Correct but not useful: yellow warning + nudge
│   │   └── ❌ Incorrect: red X + shake
│   ├── Hint reveal animation (smooth slide-in)
│   ├── Transition animations (screen navigation)
│   └── UI thread rendering (60+ FPS guaranteed)
├── Skottie (GPU-Accelerated Lottie)
│   ├── Success celebration animation
│   ├── Loading animation
│   ├── Error animation
│   └── Runs on Skia (same engine as canvas)
├── UI Polish
│   ├── Typography system (scale, weight, color)
│   ├── Spacing system (consistent padding/margin)
│   ├── Color palette (primary, success, warning, error)
│   ├── Icon set (tools, navigation)
│   ├── Dark mode support (optional)
│   └── Accessibility (labels, contrast, text scale)
└── Responsive Layout
    ├── Tablet optimization (8-10" target)
    ├── Orientation support (portrait/landscape)
    ├── Screen size adaptation
    └── Safe area support (notches, home indicator)

Components: FeedbackAnimation.tsx, HintReveal.tsx, SuccessAnimation.tsx
Assets: Lottie animations (success.json, error.json, loading.json), icons
Styles: theme.ts, colors.ts, spacing.ts
Utilities: animation helpers, responsive utilities
```

### PR9: Navigation - App Structure
```
App Structure Layer
├── React Navigation 7
│   ├── Navigation Stack
│   │   ├── Home Screen
│   │   │   └── Problem selection, stats
│   │   ├── Training Mode Screen
│   │   │   └── Canvas + validation + hints
│   │   ├── Review Screen
│   │   │   └── Past attempts, progress
│   │   └── Settings Screen
│   │       └── API config, device info
│   └── Navigation Header (consistent across screens)
├── Screen Linking
│   ├── Problem selection → Training mode
│   ├── Training mode → Review
│   ├── Deep linking (future: teacher app integration)
│   └── State persistence across screens
└── Navigation Types
    └── TypeScript types for all routes, params

Navigation: AppNavigator.tsx, navigation/types.ts
Screens: HomeScreen.tsx, TrainingModeScreen.tsx, ReviewScreen.tsx, SettingsScreen.tsx
Components: NavigationHeader.tsx, NavigationBar.tsx
```

### PR10: Testing - Quality Assurance Layer
```
Quality Assurance Layer
├── Unit Tests (Jest)
│   ├── mathValidation.ts tests
│   │   └── Correctness, usefulness logic
│   ├── recognitionUtils.ts tests
│   │   └── Line splitting, segmentation
│   ├── hintUtils.ts tests
│   │   └── Hint mapping, escalation
│   └── storage.ts tests
│       └── MMKV operations, caching
├── Component Tests (React Native Testing Library)
│   ├── HandwritingCanvas.tsx
│   │   └── Stroke rendering, input handling
│   ├── HintDisplay.tsx
│   │   └── Hint rendering, escalation
│   └── ProblemDisplay.tsx
│       └── Math rendering, visibility
├── E2E Tests (Detox)
│   ├── TrainingMode.e2e.js
│   │   └── Full flow: problem → draw → validate → hint
│   └── MultiStep.e2e.js
│       └── Multi-step problem solving
├── Error Tracking (Sentry)
│   ├── JavaScript error capture
│   ├── Native error capture
│   ├── Breadcrumb tracking (user actions)
│   ├── Performance monitoring
│   └── Source map upload
└── Test Configuration
    └── Jest config, Detox setup, Sentry initialization

Test files: tests/unit/*.test.ts, tests/component/*.test.tsx, tests/e2e/*.e2e.js
Utilities: errorTracking.ts, error boundary components
Configuration: jest.config.js, detox.config.js
```

### PR11: Documentation - Knowledge Base
```
Knowledge Base Layer
├── Developer Documentation
│   ├── ARCHITECTURE.md - System design, data flows
│   ├── SETUP.md - Development environment setup
│   ├── FILE_STRUCTURE.md - Project organization
│   ├── API_INTEGRATION.md - CameraMath API usage
│   ├── MLKIT_SETUP.md - ML Kit configuration
│   ├── STATE_MANAGEMENT.md - Zustand patterns
│   └── DEPLOYMENT.md - Build and release process
├── Main README.md
│   ├── Project overview
│   ├── Quick start
│   ├── Feature list
│   ├── Architecture overview
│   ├── PR tracking guide
│   └── Contributing guidelines
├── CONTRIBUTING.md
│   ├── Code style
│   ├── PR process
│   ├── Testing requirements
│   └── Commit message format
├── CHANGELOG.md
│   └── Version history and release notes
└── Environment Configuration
    └── .env.example - Template with all variables

Documentation files: docs/*.md, README.md, CONTRIBUTING.md, CHANGELOG.md
Configuration: .env.example
Scripts: scripts/build-ios.sh, scripts/build-android.sh, scripts/test.sh
```

---

## Data Models & Type Definitions

### Core Types (PR5, PR7)

```typescript
// app/types/Attempt.ts
interface Attempt {
  id: string;
  problemId: string;
  timestamp: number;
  steps: Step[];
  validation: ValidationResult;
  hints: HintHistory;
  completed: boolean;
}

interface Step {
  id: string;
  strokeData: Stroke[]; // Raw ink points
  recognizedText: string; // ML Kit output
  color: string;
  timestamp: number;
}

interface Stroke {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

// app/types/Validation.ts
interface ValidationResult {
  stepId: string;
  isCorrect: boolean;
  isUseful: boolean;
  errorType?: string;
  feedback: string;
  nextSteps: string[];
  cachedResult: boolean;
  timestamp: number;
}

interface ValidationState {
  current: ValidationResult | null;
  history: ValidationResult[];
  loading: boolean;
  error?: string;
}

// app/types/Hint.ts
interface Hint {
  id: string;
  errorType: string;
  levels: HintLevel[]; // [concept, direction, micro]
}

interface HintLevel {
  level: 1 | 2 | 3;
  text: string;
  mathFormula?: string; // For KaTeX rendering
}

interface HintHistory {
  hints: HintLevel[];
  currentLevel: number;
  lastShown: number;
}

// app/types/Problem.ts
interface Problem {
  id: string;
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expectedSteps: ExpectedStep[];
  answer: string;
}

interface ExpectedStep {
  step: number;
  description: string;
  operation: string;
}
```

---

## Component Hierarchy

```
App (Root)
├── AppNavigator
│   ├── HomeScreen
│   │   ├── ProblemCard (list)
│   │   └── StatsWidget
│   ├── TrainingModeScreen (Main Flow)
│   │   ├── ProblemDisplay
│   │   ├── HandwritingCanvas
│   │   │   ├── LineGuides
│   │   │   ├── ColorPicker
│   │   │   └── ToolBar (eraser, color, clear)
│   │   ├── ValidationFeedback
│   │   │   └── FeedbackAnimation
│   │   ├── HintDisplay
│   │   │   └── HintEscalation
│   │   └── NavigationButtons (next step, submit, etc.)
│   ├── ReviewScreen
│   │   ├── AttemptList
│   │   └── AttemptDetail
│   └── SettingsScreen
│       ├── APIConfig
│       ├── DeviceInfo
│       └── ClearCache
```

---

## File Structure by Responsibility

```
/app
  /components          # Reusable UI components
    HandwritingCanvas.tsx
    ProblemDisplay.tsx
    ValidationFeedback.tsx
    HintDisplay.tsx
    FeedbackAnimation.tsx
    ColorPicker.tsx
    ToolBar.tsx
    NavigationHeader.tsx
    ErrorBoundary.tsx
    ...
  
  /screens             # Full-screen views
    TrainingModeScreen.tsx
    HomeScreen.tsx
    ReviewScreen.tsx
    SettingsScreen.tsx
    CanvasDemoScreen.tsx (dev/testing)
  
  /stores              # Zustand state management
    canvasStore.ts
    validationStore.ts
    hintStore.ts
    progressStore.ts
    uiStore.ts
  
  /utils               # Pure functions & utilities
    mathValidation.ts
    recognitionUtils.ts
    storage.ts
    pressureUtils.ts
    apiConfig.ts
    errorTracking.ts
    problemData.ts
    hintUtils.ts
  
  /hooks               # Custom React hooks
    useStylus.ts
    useGesture.ts
    useRecognition.ts
    useValidation.ts
    useHints.ts
  
  /types               # TypeScript definitions
    Canvas.ts
    Validation.ts
    Attempt.ts
    Hint.ts
    Problem.ts
    Store.ts
    Navigation.ts
  
  /navigation          # React Navigation setup
    AppNavigator.tsx
    types.ts
  
  /assets              # Images, icons, animations
    /images
    /lottie
      success.json
      error.json
      loading.json
  
  /styles              # Theme & styling
    theme.ts
    colors.ts
    spacing.ts

/native-modules       # Native bridge code
  MLKitBridge.kt      (Android)
  MLKitBridge.swift   (iOS)

/hint-library         # Hint data
  hints.ts
  hintMapper.ts

/tests
  /unit
  /component
  /e2e
  /___mocks__

/scripts              # Build & deployment
  build-ios.sh
  build-android.sh
  test.sh

/docs                 # Documentation
  ARCHITECTURE.md
  SETUP.md
  API_INTEGRATION.md
  ...
```

---

## Dependency Graph (PR Order)

```
PR1: Setup
  └── Foundation for ALL

PR2: Canvas
  └── Depends on: PR1

PR3: Recognition
  └── Depends on: PR1, PR2
  └── Feeds to: PR5, PR6

PR4: Problem Display
  └── Depends on: PR1, PR2
  └── Feeds to: PR8

PR5: Validation
  └── Depends on: PR1, PR3
  └── Feeds to: PR6, PR7

PR6: Hints
  └── Depends on: PR1, PR5
  └── Feeds to: PR8

PR7: State & Storage
  └── Depends on: PR1, PR2, PR5, PR6
  └── Feeds to: PR9

PR8: Animation & Polish
  └── Depends on: PR1, PR2, PR4, PR6, PR7
  └── Feeds to: PR9

PR9: Navigation
  └── Depends on: PR1, PR2, PR4, PR7, PR8
  └── Feeds to: PR10

PR10: Testing
  └── Depends on: All PRs
  └── Feeds to: PR11

PR11: Documentation
  └── Depends on: All PRs
  └── Final deliverable
```

---

Use this architecture document alongside the TASK_LIST.md to understand how each PR contributes to the overall system design. Refer to this when making architectural decisions during implementation.
