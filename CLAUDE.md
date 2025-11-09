# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Handwriting Math App - A React Native tablet application that enables students to solve math problems through handwriting input with real-time step-by-step validation and intelligent tutoring. Students write solutions line-by-line on a digital canvas and receive immediate feedback on correctness and usefulness of each step.

**Target Devices:** iPad 9th gen+, iPad Pro (8-10" tablets with Apple Pencil support) - Android descoped for MVP

## Technology Stack

### Core Framework
- **React Native 0.76+** with New Architecture enabled (Fabric + TurboModules + JSI)
- **Hermes** JavaScript engine (default, provides 30% startup speed improvement)
- Enable New Architecture: Set `newArchEnabled=true` in `android/gradle.properties` and update `ios/Podfile`

### Key Libraries
- **@shopify/react-native-skia** - Hardware-accelerated canvas rendering (120 FPS capable)
- **react-native-gesture-handler** - Stylus/touch input handling with pressure sensitivity
- **MyScript Cloud API** - Cloud-based handwriting recognition (requires internet connection)
- **react-native-mmkv** - Local storage (20x faster than AsyncStorage, synchronous API, encrypted)
- **Zustand** - State management (10x better performance than Context API)
- **react-native-katex** - LaTeX rendering for math notation
- **React Native Reanimated 3** - UI thread animations (60+ FPS guaranteed)
- **react-native-skottie** - GPU-accelerated Lottie animations
- **React Navigation 7** - App navigation
- **UpStudy API** - Math validation (formerly CameraMath), plan Wolfram Alpha upgrade
- **@sentry/react-native** - Error tracking and performance monitoring

## Development Commands

### Project Setup
```bash
# Install dependencies
npm install  # or yarn install

# iOS setup
cd ios && pod install && cd ..

# Android setup
# Ensure newArchEnabled=true in android/gradle.properties
```

### Running the App
```bash
# iOS
npm run ios  # or: npx react-native run-ios

# Android
npm run android  # or: npx react-native run-android

# Start Metro bundler
npm start
```

### Testing
```bash
# Run unit tests
npm test  # or: jest

# Run specific test file
npm test -- recognitionUtils.test.ts

# Run tests in watch mode
npm test -- --watch

# Run component tests
npm run test:component

# Run E2E tests (Detox)
npm run test:e2e:ios
npm run test:e2e:android

# Coverage report
npm test -- --coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck  # if using TypeScript
```

### Build
```bash
# iOS build
scripts/build-ios.sh

# Android build
scripts/build-android.sh
```

## Architecture

### System Data Flow
```
User Input (Stylus/Touch)
  ↓ [react-native-gesture-handler]
Skia Canvas (120 FPS)
  ↓ [250-500ms pause detection]
MyScript Cloud API Recognition (requires internet)
  ↓
Recognized text
  ↓ [debounced, cached via MMKV]
UpStudy API Validation
  ↓
Validation result (correct? useful?)
  ↓ [Zustand state update]
UI Feedback (Reanimated 3 animations)
  ↓
Result persisted to MMKV
```

### Directory Structure
```
/app
  /components       # Reusable UI components (Canvas, Hints, Feedback, etc.)
  /screens         # Full-screen views (TrainingMode, Home, Review, Settings)
  /stores          # Zustand state stores (canvas, validation, hints, progress, ui)
  /utils           # Pure functions (mathValidation, recognitionUtils, storage, etc.)
  /hooks           # Custom React hooks (useStylus, useRecognition, useValidation)
  /types           # TypeScript type definitions
  /navigation      # React Navigation setup
  /assets          # Images, Lottie animations, icons
  /styles          # Theme, colors, spacing

/native-modules    # Empty (ML Kit native bridge descoped - using MyScript Cloud API)

/hint-library      # Hint data and mapping logic

/tests
  /unit           # Unit tests for utilities
  /component      # Component tests (React Native Testing Library)
  /e2e            # E2E tests (Detox)
  /__mocks__      # API and module mocks
```

### State Management (Zustand Stores)
- **canvasStore** - Current strokes, recognized text, colors, tool selection
- **validationStore** - Validation results, feedback states, error classifications, API cache
- **hintStore** - Hint escalation level, hint history, pending hints
- **progressStore** - Completed problems, attempt count, student metadata
- **uiStore** - UI state (loading, modals, etc.)

All stores use MMKV persistence middleware for automatic local storage.

### Core Data Models

#### Attempt
```typescript
interface Attempt {
  id: string;
  problemId: string;
  timestamp: number;
  steps: Step[];
  validation: ValidationResult;
  hints: HintHistory;
  completed: boolean;
}
```

#### Step
```typescript
interface Step {
  id: string;
  strokeData: Stroke[];  // Raw ink points
  recognizedText: string; // MyScript output
  color: string;
  timestamp: number;
}
```

#### ValidationResult
```typescript
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
```

#### Problem
```typescript
interface Problem {
  id: string;                    // Unique identifier (e.g., "le_easy_01")
  category: ProblemCategory;     // LINEAR_EQUATIONS, BASIC_ALGEBRA, etc.
  difficulty: ProblemDifficulty; // EASY, MEDIUM, or HARD
  text: string;                   // Plain text for accessibility
  latex: string;                  // LaTeX formatted for KaTeX rendering
  answer: string;                 // Final answer (plain text)
  answerLatex: string;           // LaTeX formatted answer
  expectedSteps: ExpectedStep[]; // Solution steps for validation
  hints?: string[];              // Optional hints (used in PR6)
  tags?: string[];               // Tags for categorization
}
```

#### ExpectedStep
```typescript
interface ExpectedStep {
  stepNumber: number;   // Sequential step number
  description: string;  // What this step does
  expression: string;   // LaTeX mathematical expression
  operation: string;    // Operation performed (e.g., "add 5 to both sides")
}
```

### Problem Data
- **Location**: `app/utils/problemData.ts` (hardcoded for MVP)
- **Library Size**: 25 linear equation problems
  - 5 EASY (one-step: x + 5 = 12)
  - 10 MEDIUM (two-step: 2x + 3 = 11)
  - 10 HARD (variables both sides: 3x + 7 = 2x + 15)
- **Format**: LaTeX for math rendering via react-native-katex
- **Components**:
  - `ProblemDisplay.tsx` - Renders problem with KaTeX
  - `FormattedStep.tsx` - Renders solution steps with feedback
- **Helper Functions**:
  - `getProblemById(id)` - Retrieve specific problem
  - `getRandomProblem(difficulty?)` - Get random problem
  - `getNextProblem(currentId)` - Get next in sequence
  - `getProblemStats()` - Get library statistics
- **Documentation**: See `docs/PROBLEM_DATA_FORMAT.md` for detailed format guide

## Key Implementation Patterns

### Performance Optimization
1. **Canvas rendering** - Use Skia hardware acceleration, avoid blocking JS thread
2. **Recognition trigger** - Only on 250-500ms pause, not per-stroke
3. **API calls** - Debounce (max 1 per 500ms), cache aggressively in MMKV
4. **State updates** - Use Zustand selectors to avoid unnecessary re-renders
5. **Animations** - Run on UI thread via Reanimated 3, never block JS thread
6. **Target: 60+ FPS** on 3-year-old tablets, 120 FPS on modern devices

### Validation Logic
- **Correctness** - Math is valid (via CameraMath API)
- **Usefulness** - Step advances solution (custom logic on top of API response)
- Three states: ✅ Correct & useful | ⚠️ Correct but not useful | ❌ Incorrect
- Cache all validation results in MMKV to avoid duplicate API calls
- Implement offline queue for failed API calls

### Hint System
- Progressive escalation: Concept → Direction → Micro step
- Never reveal full solution
- Map error types to hint library (JSON-based)
- Show hints on: incorrect step, repeated errors, or 10s inactivity
- Track escalation level per attempt

### MyScript Cloud API Integration
- **No native bridge required** - REST API integration via `app/utils/myScriptClient.ts`
- Converts strokes (x, y, pressure, time) to MyScript ink format (JSON)
- Returns LaTeX and plain text with confidence score (target: >85%)
- **Requires internet connection** - Cloud-based recognition service
- See `docs/MYSCRIPT_SETUP.md` for API key setup

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions in stores and components
- Keep components small and focused (single responsibility)
- Extract business logic to `/utils`, not in components
- Use custom hooks for reusable stateful logic

### State Management
- Use Zustand, not Context API or Redux
- One store per domain (canvas, validation, hints, progress, ui)
- Use selectors to avoid re-renders: `const strokes = useCanvasStore(state => state.strokes)`
- Persist critical state to MMKV via middleware

### Testing
- **Unit tests** - All validation logic, recognition utils, hint mapping
- **Component tests** - User interactions, rendering, accessibility
- **E2E tests** - Complete workflows (draw → validate → hint)
- Target: 70%+ coverage for critical paths
- Mock API calls, never hit real UpStudy or MyScript APIs in tests

### Performance
- Profile on actual target devices (iPad 9th gen, iPad Pro) regularly
- Use Sentry performance monitoring to track validation response times
- Keep canvas rendering at 60+ FPS minimum
- Validation response target: <2 seconds end-to-end

### API Usage
- UpStudy API: Math validation (contact team for pricing)
- MyScript Cloud API: Handwriting recognition (see docs/MYSCRIPT_SETUP.md for pricing)
- Implement rate limiting and backoff strategy for both APIs
- Monitor costs via Sentry custom events
- Plan Wolfram Alpha migration for production validation

## PR Development Workflow

This project follows a structured 11-PR workflow (see TASK_LIST.md):
- **PR1** - Project setup & configuration
- **PR2** - Canvas & handwriting input
- **PR3** - MyScript Cloud API recognition
- **PR4** - Problem display & math rendering
- **PR5** - Math validation & API integration
- **PR6** - Hint system
- **PR7** - State management & persistence
- **PR8** - Animation & UI polish
- **PR9** - Navigation structure
- **PR10** - Testing suite
- **PR11** - Documentation

Each PR should:
- Reference the task list in description
- List all files created/modified/deleted
- Include tests for new functionality
- Be tested on iOS (Android descoped for MVP)
- Update ARCHITECTURE.md if adding new patterns

## Common Issues & Solutions

### Canvas Performance
- **Issue:** Slow rendering, dropped frames
- **Solution:** Ensure using Skia (not SVG), limit canvas resolution, use path-based rendering

### Recognition Accuracy
- **Issue:** MyScript recognition < 85% accuracy
- **Solution:** Test with real handwriting samples, adjust confidence threshold, add manual fallback, ensure proper stroke formatting

### State Sync Issues
- **Issue:** Canvas state not persisting
- **Solution:** Check MMKV middleware configuration, ensure Zustand store uses persistence

### API Rate Limits
- **Issue:** UpStudy API rate limiting
- **Solution:** Check debouncing (500ms min), verify cache hits in MMKV, implement backoff

### Stylus vs Touch
- **Issue:** Inconsistent input handling
- **Solution:** Use `getToolType()` (Android) or `force` property (iOS) to detect input method

## Important Notes

- **Never commit API keys** - Use `.env` and `.gitignore`
- **Test on physical devices** - Simulators don't accurately reflect stylus behavior
- **MMKV over AsyncStorage** - 20x performance improvement, always use MMKV
- **Zustand over Context** - 10x better performance, already decided
- **MyScript requires internet** - Cloud-based recognition service, ensure network connectivity
- **Hint quality > quantity** - Progressive hints that teach, never reveal full answers
- **Target: Paper-like experience** - Smooth, responsive, natural handwriting feel

## External Resources

- **PRD:** See `PRD-Updated-2025 (1).md` for full requirements
- **Architecture:** See `ARCHITECTURE.md` for detailed system design and data flows
- **Task List:** See `TASK_LIST.md` for PR-by-PR development roadmap
- **UpStudy API:** Contact team for API documentation and credentials
- **MyScript Cloud API:** [MyScript Developer Portal](https://developer.myscript.com)
- **Skia:** [react-native-skia docs](https://shopify.github.io/react-native-skia/)

## Contact

- **Rafal Szulejko** - rafal.szulejko@superbuilders.school (UTC+1)
- Slack: Gauntlet Slack (for urgent issues)
