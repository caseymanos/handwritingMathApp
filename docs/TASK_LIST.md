# Handwriting Math App - Development Task List

## Overview
This is a comprehensive, GitHub-trackable PR-driven task list for the Handwriting Math App MVP. Each PR is broken into subtasks with associated file changes. Track progress through GitHub issues and PRs.

---

## PR1: Project Setup & Configuration ✅ COMPLETE

- [x] Initialize React Native project with New Architecture enabled
- [x] Set up Hermes JavaScript engine
- [x] Configure Android: `android/gradle.properties` - enable `newArchEnabled=true` (descoped for MVP - iOS only)
- [x] Configure iOS: `ios/Podfile` - add New Architecture dependencies
- [x] Create project directory structure (app/, native-modules/, tests/, hint-library/, docs/)
- [x] Initialize Git repository and create initial commit
- [x] Set up `.env.example` file template with API keys placeholder
- [x] Create `.gitignore` with React Native, build artifacts, API keys
- [x] Create `README.md` with project overview and setup instructions
- [x] Configure ESLint and Prettier for code consistency
- [x] Update `package.json` with base dependencies and custom scripts
- [x] Move existing docs to `docs/` folder (PRD, ARCHITECTURE, TASK_LIST)
- [x] Create `CLAUDE.md` for AI development assistance
- [x] Install npm dependencies and iOS CocoaPods
- [x] Verify Xcode workspace configuration

**Files Created:**
```
.env.example ✅
.gitignore (updated) ✅
README.md (comprehensive) ✅
CLAUDE.md ✅
package.json (updated with metadata) ✅
package-lock.json ✅
ios/Podfile (New Architecture enabled) ✅
ios/Podfile.lock ✅
ios/handwritingMathApp.xcworkspace/ ✅
app/ (with subdirectories) ✅
native-modules/ ✅
hint-library/ ✅
tests/ (unit, component, e2e, __mocks__) ✅
docs/ (moved PRD, ARCHITECTURE, TASK_LIST) ✅
scripts/ ✅
```

**Commit:** `fba0c73` - "chore: initial React Native project setup for handwriting math app"

**Status:** ✅ Complete - Ready for PR2

---

## PR2: Canvas & Handwriting Input Prototype ✅ COMPLETE (+ Tablet UI Enhancement)

### Core Canvas Features
- [x] Install and configure `@shopify/react-native-skia`
- [x] Create `HandwritingCanvas.tsx` component with Skia drawing
- [x] Implement stylus/touch input handling via `react-native-gesture-handler`
- [x] Add line guides (visual grid overlay on canvas)
- [x] Implement color selection tool (5 color options)
- [x] Implement eraser tool with pressure sensitivity
- [x] Create hook: `useStylus.ts` for stylus detection and pressure handling
- [x] Create utility: `pressureUtils.ts` for pressure-sensitive stroke sizing
- [x] Build demo screen: `CanvasDemoScreen.tsx` to test canvas
- [x] Test 60+ FPS rendering on target devices (iOS simulator + iPad Pro tested)
- [x] Add accessibility labels for input methods
- [x] Document canvas API in code comments

### Tablet UI Enhancement (Production-Ready)
- [x] Full-screen canvas layout optimized for iPad
- [x] Draggable floating toolbar (9 snap positions: top/middle/bottom x left/center/right)
- [x] Manual show/hide toolbar with floating toggle button
- [x] Welcome/help modal (first launch only, stored in MMKV)
- [x] Portrait and landscape orientation support
- [x] Professional tablet UI similar to Procreate/Notes apps
- [x] Edge-to-edge canvas display (true fullscreen, no letterboxing)
- [x] Native iPad support (TARGETED_DEVICE_FAMILY configured)
- [x] Device rotation support (all orientations)

**Files Created/Modified:**
```
app/components/HandwritingCanvas.tsx ✅
app/components/FloatingToolbar.tsx ✅ (NEW - draggable toolbar with responsive sizing)
app/components/WelcomeModal.tsx ✅ (NEW - first launch tutorial)
app/components/ToggleButton.tsx ✅ (NEW - show/hide toolbar)
app/screens/CanvasDemoScreen.tsx ✅ (redesigned for tablet)
app/hooks/useStylus.ts ✅
app/utils/pressureUtils.ts ✅
app/types/Canvas.ts ✅ (updated with toolbar position types)
package.json (updated - added @shopify/react-native-skia@2.3.10, react-native-gesture-handler@2.29.1, @react-native-async-storage/async-storage@2.2.0) ✅
App.tsx (updated - SafeAreaProvider with edges=[], StatusBar translucent) ✅
ios/Podfile.lock (updated after pod install) ✅
ios/handwritingMathApp/Info.plist (added UIDeviceFamily, orientation settings, UIRequiresFullScreen) ✅
ios/handwritingMathApp/AppDelegate.swift (added orientation support method) ✅
ios/handwritingMathApp/LaunchScreen.storyboard (removed portrait-only constraint) ✅
ios/handwritingMathApp.xcodeproj/project.pbxproj (added TARGETED_DEVICE_FAMILY = "1,2") ✅
```

**Commit:** (Pending - ready for commit)

**Status:** ✅ Complete - Ready for PR3

**Key Features Implemented:**
- Hardware-accelerated Skia canvas with 120 FPS capability
- Pressure-sensitive stylus/touch input detection (iOS & Android)
- 5 color options (black, blue, red, green, purple)
- Eraser tool with 3x pen width
- Horizontal line guides for organized writing
- Smooth stroke rendering using quadratic curves
- True edge-to-edge fullscreen canvas (no letterboxing on iPad)
- Native iPad support with proper device family configuration
- Responsive toolbar sizing (80px × 400px iPad, 60px × 200px iPhone)
- Draggable floating toolbar with snap-to-position functionality
- Welcome modal with first-launch tutorial
- Full portrait and landscape orientation support with auto-rotation
- Professional tablet-first UI design
- Accessibility labels for all interactive elements
- Comprehensive code documentation

**GitHub Issue Title:** `feat: implement handwriting canvas with Skia, gesture handling, and tablet-optimized UI`

---

## PR3: Handwriting Recognition (ML Kit Digital Ink Bridge)

- [ ] Create native bridge for Google ML Kit Digital Ink Recognition
  - [ ] Android: Create Java/Kotlin bridge in `native-modules/MLKitBridge.kt`
  - [ ] iOS: Create Objective-C/Swift bridge in `native-modules/MLKitBridge.swift`
- [ ] Install `@nahrae/react-native-digital-ink` or custom bridge package
- [ ] Implement stroke capture and conversion to ML Kit ink format
- [ ] Create `recognitionUtils.ts` for line splitting logic
- [ ] Implement recognition trigger on 250-500ms pause
- [ ] Store recognized text and stroke data in Zustand canvas store
- [ ] Add manual fallback: allow user to type step if recognition fails
- [ ] Create confidence threshold logic (>85% accuracy target)
- [ ] Add recognition UI feedback ("Processing..." indicator)
- [ ] Test with real student handwriting samples (linear equations)
- [ ] Document ML Kit setup and model download process

**Files to Create:**
```
native-modules/MLKitBridge.kt (Android)
native-modules/MLKitBridge.swift (iOS)
app/utils/recognitionUtils.ts
app/utils/mlkitConfig.ts
app/stores/canvasStore.ts (initial - recognition-focused)
app/components/RecognitionIndicator.tsx
package.json (updated - add native bridge dependency)
docs/MLKIT_SETUP.md
```

**GitHub Issue Title:** `feat: integrate Google ML Kit Digital Ink Recognition for offline handwriting recognition`

---

## PR4: Problem Display & Math Rendering

- [ ] Install and configure `react-native-katex` for LaTeX rendering
- [ ] Create `ProblemDisplay.tsx` component for problem text at top of screen
- [ ] Create problem data structure/interface in `types/Problem.ts`
- [ ] Build `problemData.ts` with hardcoded library (20-30 linear equations for MVP)
- [ ] Implement problem text formatting with KaTeX
- [ ] Create component for displaying formatted solution steps with math notation
- [ ] Ensure problem stays visible during entire solving process
- [ ] Test math rendering on tablets (different screen sizes)
- [ ] Add accessibility support for math notation (text alternatives)
- [ ] Document problem data format

**Files to Create:**
```
app/components/ProblemDisplay.tsx
app/components/FormattedStep.tsx
app/utils/problemData.ts
app/types/Problem.ts
app/screens/CanvasDemoScreen.tsx (update)
package.json (updated - add react-native-katex)
```

**GitHub Issue Title:** `feat: add problem display with KaTeX math rendering`

---

## PR5: Math Validation Logic & CameraMath API Integration

- [ ] Create CameraMath API configuration (`apiConfig.ts`)
- [ ] Implement validation function: `mathValidation.ts`
- [ ] Create API client for CameraMath calls with error handling
- [ ] Implement correctness checking (validate math is valid)
- [ ] Implement usefulness checking (detect if step advances solution)
- [ ] Parse CameraMath response for step-by-step solution
- [ ] Create validation state structure in Zustand: `validationStore.ts`
- [ ] Implement caching logic in MMKV to avoid re-validation
- [ ] Install MMKV (`react-native-mmkv`)
- [ ] Create `storage.ts` utility for MMKV operations
- [ ] Create validation result types: `types/Validation.ts`
- [ ] Add debouncing for API calls (max 1 per 500ms)
- [ ] Implement rate limit handling and backoff strategy
- [ ] Create error states for offline/failed validation
- [ ] Add API cost monitoring (log usage for budget tracking)

**Files to Create:**
```
app/utils/apiConfig.ts
app/utils/mathValidation.ts
app/utils/storage.ts
app/stores/validationStore.ts
app/types/Validation.ts
app/types/Attempt.ts
app/components/ValidationFeedback.tsx
app/screens/CanvasDemoScreen.tsx (update)
package.json (updated - add react-native-mmkv, axios)
.env (update - add CAMERAMATH_API_KEY)
```

**GitHub Issue Title:** `feat: implement CameraMath API integration for step validation`

---

## PR6: Feedback, Hints, and Guidance System

- [ ] Create hint library structure: `hint-library/hints.ts`
- [ ] Build hint mapping system (error type → progressive hints)
- [ ] Create 5-10 sample hints for common linear equation errors
- [ ] Implement three-tier hint system:
  - [ ] Concept cue (most abstract)
  - [ ] Directional hint (intermediate)
  - [ ] Micro next step (most specific, no full answer)
- [ ] Create `hintStore.ts` in Zustand for hint state tracking
- [ ] Implement inactivity timer (show hint after 10 seconds of no input)
- [ ] Build `HintDisplay.tsx` component for rendering progressive hints
- [ ] Create hint escalation logic (track attempts, escalate on repeat error)
- [ ] Implement KaTeX rendering for math-formatted hints
- [ ] Add hint validation to prevent full solution reveal
- [ ] Create hint history tracking per attempt
- [ ] Design hint triggering logic based on validation feedback

**Files to Create:**
```
hint-library/hints.ts
hint-library/hintMapper.ts
app/stores/hintStore.ts
app/components/HintDisplay.tsx
app/components/HintEscalation.tsx
app/utils/hintUtils.ts
app/types/Hint.ts
app/screens/CanvasDemoScreen.tsx (update - hook up hints)
```

**GitHub Issue Title:** `feat: implement progressive hint system with inactivity triggers`

---

## PR7: State Management with Zustand & Local Storage with MMKV

- [ ] Create comprehensive Zustand store structure
  - [ ] `canvasStore.ts` - canvas state, strokes, recognized text
  - [ ] `validationStore.ts` - validation results, feedback
  - [ ] `hintStore.ts` - hint history, escalation level
  - [ ] `progressStore.ts` - student progress, completed problems
  - [ ] `uiStore.ts` - colors, tool selection, UI state
- [ ] Implement MMKV persistence middleware for Zustand
- [ ] Create type definitions for all stores: `types/Store.ts`
- [ ] Implement auto-save of canvas state to MMKV on line completion
- [ ] Create attempt history tracking (all attempts stored locally)
- [ ] Implement encryption for sensitive data (MMKV built-in)
- [ ] Create migration logic for future schema changes
- [ ] Add data export utility for troubleshooting
- [ ] Test MMKV performance on older tablets

**Files to Create:**
```
app/stores/canvasStore.ts
app/stores/validationStore.ts
app/stores/hintStore.ts
app/stores/progressStore.ts
app/stores/uiStore.ts
app/types/Store.ts
app/utils/storage.ts (enhanced)
app/utils/storeMiddleware.ts
tests/unit/stores.test.ts
```

**GitHub Issue Title:** `feat: implement Zustand state management with MMKV persistence`

---

## PR8: Animation, UI Polish & Tablet Optimizations

- [ ] Install React Native Reanimated 3
- [ ] Create animation components:
  - [ ] `FeedbackAnimation.tsx` - ✅/⚠️/❌ state transitions
  - [ ] `HintReveal.tsx` - smooth hint escalation animation
  - [ ] `SuccessAnimation.tsx` - celebration on correct step
- [ ] Install react-native-skottie for Lottie support
- [ ] Create/source Lottie animations for success, error, loading states
- [ ] Optimize UI layout for 8-10" tablets (responsive)
- [ ] Design visual feedback states:
  - [ ] ✅ Correct & useful: green checkmark + animation
  - [ ] ⚠️ Correct but not useful: yellow warning + nudge hint
  - [ ] ❌ Incorrect: red X + error hint
- [ ] Create style system: `app/styles/theme.ts`, `colors.ts`
- [ ] Polish all components with proper spacing and typography
- [ ] Add icons/images for tools (color picker, eraser, etc.)
- [ ] Implement dark mode support (optional)
- [ ] Test UI on multiple tablet sizes and orientations
- [ ] Add accessibility features: labels, contrast, text scaling

**Files to Create:**
```
app/components/FeedbackAnimation.tsx
app/components/HintReveal.tsx
app/components/SuccessAnimation.tsx
app/assets/lottie/success.json
app/assets/lottie/error.json
app/assets/lottie/loading.json
app/assets/images/ (icons, guides, etc.)
app/styles/theme.ts
app/styles/colors.ts
app/styles/spacing.ts
app/screens/CanvasDemoScreen.tsx (major polish)
package.json (updated - add react-native-reanimated-3, react-native-skottie)
```

**GitHub Issue Title:** `feat: add animations, polish UI, and optimize for tablets`

---

## PR9: Navigation & App Structure

- [ ] Install React Navigation 7
- [ ] Create `AppNavigator.tsx` - main navigation structure
- [ ] Build navigation stack:
  - [ ] Home screen
  - [ ] Training mode screen
  - [ ] Review/history screen
  - [ ] Settings screen
- [ ] Create `HomeScreen.tsx` - problem selection, start training
- [ ] Create `TrainingModeScreen.tsx` - main canvas + validation + hints flow
- [ ] Create `ReviewScreen.tsx` - past attempts, progress tracking
- [ ] Create `SettingsScreen.tsx` - colors, device info, API config
- [ ] Implement deep linking support (optional for future teacher app)
- [ ] Add navigation header/tab bar with icons
- [ ] Create navigation type definitions: `types/Navigation.ts`
- [ ] Test navigation flows on tablets

**Files to Create:**
```
app/navigation/AppNavigator.tsx
app/navigation/types.ts
app/screens/HomeScreen.tsx
app/screens/TrainingModeScreen.tsx
app/screens/ReviewScreen.tsx
app/screens/SettingsScreen.tsx
app/components/NavigationHeader.tsx
app/components/NavigationBar.tsx
app/assets/images/icons/ (nav icons)
package.json (updated - add react-navigation/native, react-navigation/stack, react-navigation/bottom-tabs)
```

**GitHub Issue Title:** `feat: implement React Navigation 7 and app screen structure`

---

## PR10: Testing Suite & Error Tracking

- [ ] Set up Jest configuration
- [ ] Create unit tests for core logic:
  - [ ] `tests/unit/mathValidation.test.ts` - validation logic
  - [ ] `tests/unit/recognitionUtils.test.ts` - line splitting
  - [ ] `tests/unit/hintUtils.test.ts` - hint mapping
  - [ ] `tests/unit/storage.test.ts` - MMKV operations
- [ ] Set up React Native Testing Library
- [ ] Create component tests:
  - [ ] `tests/component/HandwritingCanvas.test.tsx` - drawing
  - [ ] `tests/component/HintDisplay.test.tsx` - hint rendering
  - [ ] `tests/component/ProblemDisplay.test.tsx` - problem display
- [ ] Install and configure Detox for E2E testing
- [ ] Create E2E tests:
  - [ ] `tests/e2e/TrainingMode.e2e.js` - complete flow: problem → draw → validate → hint
  - [ ] `tests/e2e/MultiStep.e2e.js` - multi-step problem solving
- [ ] Integrate Sentry (`@sentry/react-native`)
- [ ] Create `errorTracking.ts` utility for Sentry initialization
- [ ] Add error boundary components
- [ ] Set up CI/CD test runner (GitHub Actions optional)
- [ ] Create test documentation: `docs/TESTING.md`
- [ ] Target test coverage: 70%+ for critical paths

**Files to Create:**
```
tests/unit/mathValidation.test.ts
tests/unit/recognitionUtils.test.ts
tests/unit/hintUtils.test.ts
tests/unit/storage.test.ts
tests/component/HandwritingCanvas.test.tsx
tests/component/HintDisplay.test.tsx
tests/component/ProblemDisplay.test.tsx
tests/e2e/TrainingMode.e2e.js
tests/e2e/MultiStep.e2e.js
tests/jest.config.js
tests/__mocks__/ (API mocks, etc.)
app/utils/errorTracking.ts
app/components/ErrorBoundary.tsx
package.json (updated - add jest, @testing-library/react-native, detox, @sentry/react-native)
docs/TESTING.md
```

**GitHub Issue Title:** `test: add comprehensive unit, component, and E2E testing with Sentry error tracking`

---

## PR11: Documentation & Deployment Prep

- [ ] Create comprehensive architecture documentation: `docs/ARCHITECTURE.md`
- [ ] Document file structure and module organization: `docs/FILE_STRUCTURE.md`
- [ ] Write developer setup guide: `docs/SETUP.md`
- [ ] Document API integration: `docs/API_INTEGRATION.md`
- [ ] Document ML Kit setup: `docs/MLKIT_SETUP.md`
- [ ] Document Zustand store patterns: `docs/STATE_MANAGEMENT.md`
- [ ] Write deployment guide: `docs/DEPLOYMENT.md`
- [ ] Update main `README.md` with:
  - [ ] Project overview
  - [ ] Quick start guide
  - [ ] Feature list
  - [ ] Architecture overview
  - [ ] PR tracking guide
  - [ ] Contributing guidelines
- [ ] Create `CHANGELOG.md` template
- [ ] Create `CONTRIBUTING.md` for team guidelines
- [ ] Add comments to critical code files
- [ ] Update `.env.example` with all required environment variables
- [ ] Create deployment scripts (if using Expo or EAS):
  - [ ] `scripts/build-ios.sh`
  - [ ] `scripts/build-android.sh`
  - [ ] `scripts/test.sh`
- [ ] Document tablet target specs in README

**Files to Create:**
```
docs/ARCHITECTURE.md
docs/FILE_STRUCTURE.md
docs/SETUP.md
docs/API_INTEGRATION.md
docs/STATE_MANAGEMENT.md
docs/DEPLOYMENT.md
README.md (updated - comprehensive)
CHANGELOG.md
CONTRIBUTING.md
.env.example
scripts/build-ios.sh
scripts/build-android.sh
scripts/test.sh
```

**GitHub Issue Title:** `docs: add comprehensive documentation and deployment guide`

---

## 🎯 Summary Checklist

### Core MVP Features
- [ ] Canvas with handwriting + colors + eraser ✓ (PR2)
- [ ] ML Kit handwriting recognition ✓ (PR3)
- [ ] Problem display with math rendering ✓ (PR4)
- [ ] CameraMath validation ✓ (PR5)
- [ ] Progressive hint system ✓ (PR6)
- [ ] Zustand state + MMKV storage ✓ (PR7)
- [ ] Smooth animations and UI polish ✓ (PR8)
- [ ] Navigation and app structure ✓ (PR9)
- [ ] Testing and error tracking ✓ (PR10)
- [ ] Documentation ✓ (PR11)

### Success Criteria (From PRD)
- [ ] 120 FPS canvas rendering
- [ ] <2 second validation response time
- [ ] >85% handwriting recognition accuracy
- [ ] Progressive hints that never reveal full solution
- [ ] Paper-like writing experience
- [ ] Zero crashes during normal flow
- [ ] Offline ML Kit recognition
- [ ] 60+ FPS on 3-year-old tablets

---

## Post-MVP PRs (Phase 2+)

### PR12: Cloud Storage Integration
- [ ] Supabase/Firebase setup
- [ ] Sync attempt history to cloud
- [ ] User authentication
- [ ] Files: `app/utils/cloudSync.ts`, auth providers

### PR13: Teacher/Guide App
- [ ] WebSocket real-time infrastructure
- [ ] Teacher dashboard
- [ ] Live progress monitoring
- [ ] Direct write-into-workspace capability

### PR14: Tutorial Mode
- [ ] Video playback library integration
- [ ] Lesson/skill content structure
- [ ] Progress tracking per skill
- [ ] Files: `app/screens/TutorialScreen.tsx`

### PR15: Assessment Mode
- [ ] Submit-then-validate workflow
- [ ] Full solution checking
- [ ] Defer validation until submit button
- [ ] Files: `app/screens/AssessmentScreen.tsx`

### PR16: Undo/Redo & Advanced Features
- [ ] Multi-step undo/redo
- [ ] Gesture-based undo (swipe)
- [ ] Voice hints (optional)
- [ ] Files: Enhanced canvas, audio integration

---

## 📝 Git Workflow

For each PR:
1. Create branch: `git checkout -b feature/[PR-number]-[feature-name]`
2. Commit regularly with descriptive messages
3. Reference this task list in PR description
4. Track file changes in PR description
5. Link to GitHub issue
6. Require code review before merge
7. Merge to `main` when approved and all tests pass

Example PR format:
```
## Closes #[ISSUE_NUMBER]

## Description
Implements [feature from task list]

## Files Changed
- Created: [new files]
- Modified: [updated files]
- Deleted: [removed files]

## Testing
- [ ] Tested on iPad 9th gen
- [ ] Tested on Samsung Tab S9
- [ ] All tests passing

## Checklist
- [x] All subtasks from PR[N] task list completed
```

---

## Timeline Estimate

- **PR1-4:** Weeks 1-2 (Setup, canvas, recognition, problem display)
- **PR5-7:** Weeks 2-4 (Validation, hints, state management)
- **PR8-9:** Weeks 4-6 (UI polish, navigation)
- **PR10-11:** Weeks 6-7 (Testing, documentation)
- **Total MVP:** 7 weeks
- **Post-MVP PRs:** Weeks 8-13+ (Cloud, teacher, tutorial, assessment)

---

## Repository Setup

```bash
# Initialize repo
git init handwriting-math-app
cd handwriting-math-app

# Create base structure
mkdir -p app/{components,screens,stores,utils,hooks,navigation,assets,styles,types}
mkdir -p native-modules tests/{unit,component,e2e,__mocks__} hint-library docs scripts

# Initial commit
git add .
git commit -m "chore: initial project structure"

# Start PR1
git checkout -b feature/pr1-project-setup
```

---

Use this task list to track development progress. Check off tasks as you complete them in each PR. Reference this document in your GitHub issues and PRs for traceability.
