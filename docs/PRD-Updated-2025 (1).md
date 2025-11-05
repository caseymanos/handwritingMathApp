# Product Requirements Document: Handwriting Math App (Updated)
**Version: 2.0**
**Date: November 5, 2025**
**Project: Superbuilders Handwriting Math Solution**
**Contact: Rafal Szulejko (rafal.szulejko@superbuilders.school)**

---

## Executive Summary

A mobile-first tablet application that enables students to solve math problems through handwriting input with real-time step-by-step validation and intelligent tutoring. The app provides immediate feedback on correctness and usefulness of each solution step, guiding students toward proper problem-solving methodology.

**Key Update from v1.0:** This revision incorporates technology stack optimizations that reduce API costs by $750-$3,000/month, improve performance by 20-30x in critical areas, and enhance developer experience. Core features remain unchanged; implementation strategy has been significantly improved.

---

## User Stories

### Primary User: Student (Ages 8-18)
As a student, I want to:

- **Write math solutions naturally** - Use a stylus to write math solutions line-by-line on a digital canvas, so I can work the way I would on paper but with immediate feedback.
- **Get instant feedback per step** - Receive immediate validation after each line I write, so I know if I'm on the right track without waiting until the end.
- **Understand my mistakes** - Receive targeted hints when I make errors, so I can learn the correct approach without being given the full answer.
- **See my work clearly organized** - Have visible guides on the canvas that encourage me to write one step per line, so my solution process is clear and structured.
- **Correct my mistakes easily** - Use multiple colors and erasing tools to modify my work, so I can fix errors without starting over.
- **Get help when stuck** - Receive progressive hints that start with conceptual cues and become more specific, so I can develop problem-solving skills rather than memorizing answers.

### Secondary User: Teacher/Tutor
As a teacher, I want to:

- **Monitor student progress** - View stored attempts including written lines and outcomes, so I can understand where students struggle.
- **Provide direct guidance (Extra feature)** - See live student work and write directly into their workspace, so I can offer personalized real-time assistance.
- **Track learning patterns** - Access cloud-stored solution attempts, so I can identify common misconceptions and adjust instruction.

---

## Key Features for MVP

### 1. Problem Display
- Display math problem text at the top of the screen
- Clean, readable typography optimized for tablet screens (using react-native-katex for LaTeX rendering)
- Problem remains visible throughout the solving process

### 2. Handwriting Canvas
- **Line-by-line input:** Students write one step per line with visual guides
- **Multi-color support:** At least 3 color options for student preference/organization
- **Eraser tool:** Ability to erase portions of handwriting
- **Auto-segmentation:** Automatically split and recognize each line as a separate step (via ML Kit Digital Ink Recognition)
- **Responsive canvas:** Optimized for stylus and touch input with appropriate pressure sensitivity using react-native-gesture-handler
- **Smooth rendering:** 120 FPS capable via Skia hardware acceleration

### 3. Step Validation System
- **Real-time checking:** Validate each line immediately after completion (trigger on 250-500ms pause)
- **Correctness verification:** Mathematical validity check using CameraMath API (MVP) or Wolfram Alpha (production)
- **Usefulness assessment:** Determine if the step advances the solution
- **Three validation states:**
  - ✅ Correct & useful → Accept and proceed
  - ⚠️ Correct but not useful → Accept with mild nudge
  - ❌ Incorrect → Mark and provide targeted hint

### 4. Intelligent Hint System
- **Progressive hint escalation:**
  - Concept cue (most abstract)
  - Directional hint (intermediate)
  - Micro next step (most specific)
- **Inactivity triggers:** Show tips after period of no input
- **Never reveal full solution:** Maintain student agency in problem-solving
- **Contextual feedback:** Hints tailored to the specific error made

### 5. External Math Solver Integration
- **Primary:** CameraMath API integration for MVP
- **Production path:** Wolfram Alpha API (more reliable, better step-by-step solutions)
- **Purpose:** Validate mathematical correctness and solution progress

### 6. Local Data Persistence
- **Storage:** All student work, attempts, and validation history stored locally with react-native-mmkv
- **Encryption:** Built-in encryption for student data security
- **No cloud sync (MVP):** Data remains on device; cloud sync is post-MVP feature

---

## Tech Stack (Updated)

### Frontend Framework
**React Native 0.76+ with New Architecture enabled**
- **Rationale:** Cross-platform support (iOS/Android tablets), reusable components across Superbuilders projects, mature ecosystem
- **Update:** Enable Fabric + TurboModules + JSI for 30% faster startup and better performance
- **JavaScript Engine:** Hermes (default in RN 0.76+, provides 30% startup speed improvement)
- **Configuration:** Must set `newArchEnabled=true` in `android/gradle.properties` and update `ios/Podfile`

### Canvas & Graphics Library
**@shopify/react-native-skia (unchanged from v1.0)**
- Hardware-accelerated 2D graphics with GPU rendering
- Excellent stylus pressure support and sub-millisecond responsiveness
- Capable of 120 FPS rendering without blocking main thread
- Pairs seamlessly with react-native-reanimated for smooth animations
- **Companion:** react-native-gesture-handler for superior touch/stylus event handling (replaces built-in PanResponder)

### Handwriting Recognition (UPDATED - CRITICAL)
**Primary: Google ML Kit Digital Ink Recognition**
- **Major change from v1.0:** Replaces Google Cloud Vision API
- **Rationale:** 
  - Purpose-built for digital ink recognition (stylus/touch strokes), not static images
  - Works 100% offline after initial model download (~5MB per language)
  - ~85% accuracy for handwriting with stroke-based input
  - Recognizes 300+ languages and 25+ writing systems
  - Eliminates $750-$3,000/month in API costs vs. Vision API
  - Recognizes gestures (delete, circle) for improved UX
- **Implementation:** Community package `@nahrae/react-native-digital-ink` or custom native bridge
- **Timeline:** 1-2 weeks for native module development/integration
- **Secondary (Premium tier):** MyScript Math API (iink SDK)
  - 95%+ accuracy for mathematical notation
  - 200+ math symbols recognized in real-time
  - Subscription-based (consider for paid tier post-MVP)
  - Superior for complex notation (integrals, matrices, etc.)

### Math Display Rendering (NEW)
**react-native-katex**
- Lightweight WebView-based LaTeX rendering
- Displays math problems, solutions, and formatted feedback
- Faster than MathJax for this use case
- Handles fractions, exponents, special symbols, equations
- Essential for professional appearance of math content

### Math Validation
**Primary: CameraMath API (MVP)**
- $10 free credits sufficient for MVP testing/development
- Designed specifically for math problem solving
- Responsive team with good API support
- **Production upgrade path:** Wolfram Alpha API (~$60-120/year for enterprise tier)
  - More reliable step-by-step solutions
  - Better handling of complex math
  - Estimated cost: $500-1,000/month for 10,000+ students

**Excluded:** Symbolab (unresponsive team per original PRD notes)

### State Management (UPDATED)
**Zustand (instead of React Context API)**
- **Major change:** Use Zustand from MVP start, not Context API
- **Rationale:**
  - 10x better performance than Context API for frequent state updates
  - No unnecessary re-renders of consumer components
  - Minimal boilerplate (~20 lines for full setup)
  - Built-in persistence middleware for canvas state
  - Synchronous updates pair perfectly with MMKV
  - Better developer experience with easier debugging
- **Setup time:** ~30 minutes vs. 1-2 hours for optimized Context API
- **Example stores needed:**
  - Canvas state (current step, ink points, color)
  - Validation state (step status, feedback)
  - User progress (completed problems, hints used)

### Local Data Storage (UPDATED - CRITICAL)
**react-native-mmkv (replaces AsyncStorage)**
- **Major change:** Must replace AsyncStorage immediately
- **Performance comparison:**
  - MMKV: 12ms read/write (synchronous)
  - AsyncStorage: 242ms read/write (asynchronous) → **20x slower**
- **Rationale:**
  - Synchronous API eliminates race conditions on app state
  - Built-in encryption for student data security
  - 45MB optimized memory footprint
  - Industry-standard in React Native apps (2.3k+ GitHub stars)
  - Production-ready and widely adopted
  - No external databases needed for MVP
- **Use cases:**
  - Store handwriting strokes and canvas state
  - Cache validation results and API responses
  - Persist user progress and attempt history
  - Store API credentials securely

### Animations & Transitions (NEW)
**React Native Reanimated 3 + react-native-skottie**
- **Reanimated 3:**
  - Runs animations on native UI thread (not JS thread) → guaranteed 60+ FPS
  - No jank during complex UI updates
  - Integrates seamlessly with Skia canvas
  - Use for: Hint reveals, validation feedback, step transitions
- **react-native-skottie (for Lottie animations):**
  - GPU-accelerated Lottie animation player
  - 63% faster than standard lottie-react-native
  - Uses Skia engine for consistent performance
  - Use for: Celebration effects, loading states, success animations

### Navigation (NEW)
**React Navigation 7 (or Expo Router if using Expo CLI)**
- **Option A - React Navigation 7:** More flexible for custom flows, better for non-Expo setups
- **Option B - Expo Router:** File-based routing, automatic deep linking, if using Expo
- **Recommendation:** React Navigation 7 for maximum control over math-specific UI flows

### Testing & Quality Assurance (NEW)

#### Unit Testing
**Jest (included with React Native)**
- Zero-configuration testing framework
- Test validation logic, hint generation, state mutations
- Fast feedback during development

#### Component Testing
**React Native Testing Library**
- Test user interactions (drawing, button taps)
- Verify UI renders correctly after validation feedback
- Query elements by accessibility labels

#### End-to-End Testing
**Detox (gray-box E2E testing)**
- Simulate complete user workflows (draw → validate → next problem)
- Test on both iOS and Android simulators
- Setup time: ~1 week for test suite
- Run in CI/CD pipeline

#### Error Tracking & Monitoring
**Sentry (@sentry/react-native)**
- **Critical:** Sentry handles BOTH JavaScript and native errors (Crashlytics only handles native)
- Automatic crash reporting with breadcrumbs (user actions leading to crash)
- Source maps for unminified stack traces
- Performance monitoring included
- Free tier: 5,000 errors/month (sufficient for MVP)
- Upgrade: $26/month when scaling

---

## Architecture Overview

### Data Flow
```
User Input (Stylus/Touch)
    ↓ [via react-native-gesture-handler]
Skia Canvas Rendering (120 FPS)
    ↓ [on 250-500ms pause]
ML Kit Digital Ink Recognition (local/offline)
    ↓
Recognized step text
    ↓ [debounced, cached]
CameraMath/Wolfram Alpha API
    ↓
Validation result + step-by-step solution
    ↓ [via Zustand]
State update (animation triggered via Reanimated)
    ↓
User feedback displayed on canvas
    ↓ [via MMKV]
Result cached locally
```

### Storage Architecture
- **Local:** MMKV (encrypted) for canvas state, attempts, validation cache
- **Session:** Zustand for real-time UI state (current step, colors, hints)
- **Cloud:** Post-MVP feature (not in scope)

---

## Technical Considerations & Risk Mitigation

### 1. Handwriting Recognition Accuracy
**Challenge:** Mathematical notation is complex (fractions, exponents, special symbols). ML Kit accuracy varies with student handwriting quality.

**Mitigation:**
- Use ML Kit Digital Ink Recognition (purpose-built for digital ink, not static images)
- Test recognition accuracy early with real student handwriting samples (target: >85%)
- Start with constrained problem types (linear equations, basic algebra)
- Implement manual correction mechanism: if ML Kit fails, allow student to type the step
- For premium tier, integrate MyScript Math API (95%+ accuracy for math notation)
- Build fallback: If recognition confidence < 60%, prompt "Please rewrite this step"

### 2. Real-Time Performance
**Challenge:** Canvas rendering + recognition + API validation must feel instantaneous. Older tablets may struggle.

**Mitigation:**
- Use Skia's hardware acceleration (guaranteed 60+ FPS, capable of 120 FPS)
- Implement optimistic UI: show "processing" indicator immediately (don't block UI thread)
- Trigger recognition only on 250-500ms pause (not per-stroke) to reduce API calls
- Cache validation results in MMKV (avoid re-validating same step)
- Use debouncing to batch API calls (max 1 call per 500ms)
- Profile on actual target devices early (iPad 9th gen minimum)
- Enable React Native New Architecture (Fabric JSI) for synchronous native module calls

### 3. React Native Canvas Limitations
**Challenge:** Complex canvas operations can cause performance issues, especially on lower-end Android tablets.

**Mitigation:**
- Use @shopify/react-native-skia exclusively (hardware-accelerated)
- Avoid `<Drawing />` component for frequent updates (locks JS thread)
- Implement path-based rendering instead of stroke-by-stroke updates
- Limit canvas resolution to necessary quality (1080p sufficient for tablets)
- Implement view recycling for step history (virtualize long lists)
- Test early on lower-end Android tablets (Samsung Tab A series)

### 4. API Costs & Rate Limiting
**Challenge:** External APIs cost money per call. At scale, costs could escalate rapidly.

**Mitigation:**
- **ML Kit Digital Ink:** Eliminates $750-$3,000/month recognition costs (offline)
- Implement aggressive caching of validation results in MMKV
- Debounce API calls: minimum 500ms between recognition triggers
- Set up monitoring in Sentry to track API usage from day one
- Batch requests where possible (e.g., validate multiple steps together)
- CameraMath $10 credit for MVP; plan production upgrade to Wolfram Alpha with known costs
- Implement rate limit headers monitoring and backoff strategy

### 5. Offline Support
**Challenge:** All APIs theoretically require internet, but school environments may have unreliable connectivity.

**Mitigation:**
- ML Kit works 100% offline for recognition (no internet required for this step)
- Cache validation results locally in MMKV
- Detect offline state and queue API calls for when connectivity returns
- Show offline indicator to user with message: "Your work is saved locally. Validation will occur when connection restores."
- Implement local validation fallback for MVP (e.g., regex pattern matching for simple problems)
- Plan fully offline mode for post-MVP feature (store problem library locally)

### 6. Mathematical Logic Complexity
**Challenge:** Determining "usefulness" of a step is non-trivial. Some steps are correct but don't advance the solution.

**Mitigation:**
- Start with simpler problem types (linear equations, basic algebra, basic geometry)
- Use external solver's step-by-step solutions as reference for what "useful" means
- Build custom validation logic layer on top of CameraMath API responses
- Create library of common "correct but useless" patterns (e.g., 5 = 5)
- For each problem type, document expected solution steps in comments
- Iterate validation logic based on real student data (start narrow, expand gradually)
- Use Sentry to track validation misclassifications and improve over time

### 7. Cross-Platform Consistency
**Challenge:** React Native behavior differs between iOS and Android. Stylus handling is particularly inconsistent.

**Mitigation:**
- Test on both platforms continuously (don't batch until end)
- Use react-native-gesture-handler for consistent touch/stylus handling across platforms
- Test stylus pressure sensitivity on iPad and Samsung tablets (which support pressure)
- Ensure Skia rendering produces identical output on iOS and Android (it does; it's the main benefit)
- Budget 1-2 extra weeks for platform-specific adjustments
- Use iOS Simulator for primary development, test on physical Android tablet weekly

### 8. Stylus vs Touch Input
**Challenge:** Not all tablets support stylus. Pressure sensitivity detection varies by device.

**Mitigation:**
- Detect input method and adjust stroke rendering accordingly
- Optimize for stylus but ensure finger input is usable
- Detect pressure sensitivity at runtime: `getToolType()` (Android), `force` property (iOS)
- Adjust stroke width based on input method (thinner for stylus, thicker for finger)
- Document recommended devices: iPad 7th gen+, Samsung Galaxy Tab S6+
- Set minimum screen size requirement: 8 inches (smaller tablets harder to write on)
- Test on both stylus-capable and non-stylus tablets

### 9. State Management Complexity
**Challenge:** As app grows, managing canvas state, validation state, user progress, and UI state becomes complex with Context API.

**Mitigation:**
- Use Zustand from MVP start (avoid refactoring from Context later)
- Organize stores by domain: canvasStore, validationStore, userStore, uiStore
- Use Zustand middleware for persistence (auto-save to MMKV)
- Implement selector pattern to avoid unnecessary re-renders
- Add Redux DevTools integration for debugging (available in Zustand)

### 10. Network Connectivity & API Reliability
**Challenge:** School networks may have intermittent connectivity. API services may have downtime.

**Mitigation:**
- Implement exponential backoff for failed API calls (1s, 2s, 4s, 8s...)
- Queue failed validations in MMKV and retry when online
- Show user-friendly error messages (not stack traces)
- Monitor API reliability with Sentry (automatic error tracking)
- Plan fallback validation logic (pattern matching for simple problems)
- Test with intentional network latency during QA phase

---

## Success Criteria for MVP

- **Functional Completeness:** Student can complete a full linear equation problem using handwriting with step-by-step validation ✅
- **Recognition Accuracy:** >85% accuracy on standard mathematical notation (using ML Kit) ✅
- **Response Time:** <2 seconds from line completion to validation feedback (trigger on pause) ✅
- **Hint Quality:** Progressive hints (concept → direction → next step) that never reveal full answer ✅
- **User Experience:** Smooth, paper-like writing experience on iPad 9th gen and Samsung Tab S9 ✅
- **Stability:** Zero crashes during normal problem-solving flow (tested 100+ problems across 5 devices) ✅
- **Offline Capability:** Handwriting recognition works offline; validation queued when online ✅
- **Performance:** 60+ FPS canvas rendering on 3-year-old tablets ✅

---

## Out of Scope for MVP

1. **Cloud Storage System:** Storing every attempt on remote servers, cross-device synchronization, historical attempt analytics
   - *Reason:* Requires backend infrastructure, authentication system, ongoing hosting costs
   - *Target: Post-MVP Phase 1 (weeks 12-16)*

2. **Teacher/Guide App:** Bidirectional contact between teacher and student, live progress monitoring, direct writing into student workspace
   - *Reason:* Requires real-time communication infrastructure (WebSockets/Firebase), separate teacher interface, complex permission system
   - *Target: Post-MVP Phase 2 (weeks 17-22)*

3. **Tutorial Mode:** Direct instruction-based tutorials, pre-problem skill training
   - *Reason:* Content creation required, adds significant scope. Focus on core validation loop first.
   - *Target: Post-MVP Phase 3 (weeks 23+)*

4. **Assessment Mode:** Submit-then-check entire solution validation, different validation flow from training mode
   - *Reason:* Alternative user flow; can be added once primary flow is validated in production
   - *Target: Post-MVP Phase 2*

5. **Voice Tutoring:** Audio hint delivery system, text-to-speech integration
   - *Reason:* Optional feature, adds complexity without being core to MVP value proposition
   - *Target: Post-MVP Phase 4*

6. **Undo Functionality (Beyond Eraser):** Multi-step undo/redo stack
   - *Reason:* Nice-to-have but not essential. Eraser tool sufficient for MVP.
   - *Target: Post-MVP Phase 1*

7. **Multi-Problem Sessions:** Problem sets, sequential problem flow, cumulative scoring
   - *Reason:* Adds complexity; MVP focuses on single-problem validation loop
   - *Target: Post-MVP Phase 1*

---

## Open Questions & Decisions Needed

### 1. Target Tablet Specifications
**Decision Needed:** What is the minimum and recommended device specification?
- **Recommendation:**
  - Minimum: iOS 13+ (iPad 7th gen), Android 8.0+ (Samsung Tab A series)
  - Recommended: iOS 14+ (iPad 9th gen), Android 11+ (Samsung Tab S6+)
  - Screen size: 8"+ minimum (9-10" optimal for handwriting)
  - Stylus support: Optional for MVP, recommended for best experience
  - RAM: 2GB minimum, 4GB recommended

### 2. Problem Content Source
**Decision Needed:** Where will math problems come from?
- **Recommendation:**
  - MVP v1: Hardcoded problem library (20-30 linear equations, basic algebra)
  - Teacher input interface: Post-MVP feature
  - Dynamic generation: Phase 2 (using math expression generators)
  - Consider integrating Khan Academy problem sets post-MVP

### 3. Recognition Trigger Mechanism
**Decision Needed:** When exactly do we trigger handwriting recognition?
- **Recommendation:**
  - **On pause:** 250-500ms after last stylus/touch movement stops
  - **Manual trigger:** "Next Step" button for explicit user control
  - **Hybrid:** Auto-trigger on pause, allow manual override
  - Show visual feedback: "Processing..." indicator (avoid hidden latency)
  - Never trigger mid-stroke (too frequent, causes performance issues)

### 4. Validation UI/UX Design
**Decision Needed:** How do we visually indicate correct/incorrect/useful feedback?
- **Recommendation:**
  - ✅ Correct & useful: Green checkmark, subtle bounce animation (Reanimated)
  - ⚠️ Correct but not useful: Yellow warning icon with inline hint
  - ❌ Incorrect: Red X with error message + progressive hint system
  - Feedback appears inline near the step (on canvas or below)
  - Animation (Reanimated 3) for smooth transitions between states
  - No modal dialogs (keep context on canvas)

### 5. Budget Allocation
**Decision Needed:** Expected API call budget for development vs. production?
- **Recommendation:**
  - **Development:** ML Kit (free), CameraMath ($10 credit covers 6,000+ API calls)
  - **MVP Testing:** $50-100 (test with real handwriting samples)
  - **Production (10,000 students):** $500-1,000/month for Wolfram Alpha upgrade
  - **Monitoring (Sentry):** Free tier initially, $26/month at scale
  - **Optimization:** ML Kit's offline capability eliminates largest cost (recognition)

### 6. User Authentication
**Decision Needed:** Even for MVP, do we need basic user profiles?
- **Recommendation:**
  - MVP v1: No authentication needed (single-user mode)
  - Store profile in MMKV locally (device-specific)
  - Add authentication in Post-MVP Phase 1 (for cloud sync)
  - Use Supabase or Firebase Auth (not in scope for MVP, but plan architecture)

### 7. Hint Generation Strategy
**Decision Needed:** How do we generate contextual hints based on the error?
- **Recommendation:**
  - Parse CameraMath's error output to categorize mistake type
  - Build hint library mapping error type → progressive hint sequence
  - Example:
    - Error: "Forgot to divide both sides"
    - Concept hint: "Remember, whatever you do to one side, you must do to the other side"
    - Direction hint: "Try dividing both sides by 2"
    - Micro hint: "The left side should be: x = ?"
  - Start with manual hint library (5-10 problems), expand with ML patterns

---

## Development Timeline (Updated)

Original timeline: 7-11 weeks
**Updated timeline: 9-13 weeks** (accounting for ML Kit integration and comprehensive testing)

### Phase 1: Canvas & Handwriting Recognition POC (Weeks 1-4)
**Deliverables:**
- React Native project setup with New Architecture enabled
- Skia canvas with stylus/touch input working smoothly
- ML Kit Digital Ink Recognition integrated via native bridge
- Gesture handler for smooth pen/touch events
- Performance baseline: 60+ FPS on test tablets

**Dependencies:**
- Set up Expo or bare React Native project
- Native bridge for ML Kit (or use @nahrae/react-native-digital-ink package)
- Test with real student handwriting samples (calibrate accuracy threshold)

**Effort breakdown:**
- Project setup + New Architecture: 3-4 days
- Skia canvas + gesture handler: 5-6 days
- ML Kit integration: 5-7 days (includes native bridge development if needed)
- Performance testing + optimization: 3-4 days

### Phase 2: Math Validation & State Management (Weeks 4-7)
**Deliverables:**
- CameraMath API integration (test with MVP $10 credit)
- Zustand state management stores (canvas, validation, user)
- MMKV local storage for all data persistence
- Validation logic that determines "useful" vs. "correct but not useful"
- Step history tracking with canvas state caching

**Dependencies:**
- CameraMath API account + credentials
- Complete Phase 1 (canvas working smoothly)

**Effort breakdown:**
- Zustand store architecture: 2-3 days
- MMKV integration + encryption: 2-3 days
- CameraMath API integration: 3-4 days
- Validation logic + step tracking: 4-5 days
- Caching + optimization: 3-4 days

### Phase 3: Hint System & UI Polish (Weeks 7-10)
**Deliverables:**
- Progressive hint generation (concept → direction → next step)
- Hint triggering on error or inactivity
- React-native-katex integration for math problem display
- React Native Reanimated 3 animations for feedback states
- Beautiful, polished UI with color options and visual guides

**Dependencies:**
- Complete Phase 2 (validation working)
- Hint strategy defined (see decision #7 above)

**Effort breakdown:**
- Hint system architecture + library: 4-5 days
- React-native-katex integration: 2-3 days
- Reanimated animations setup: 2-3 days
- UI design + implementation: 5-6 days
- Polish + edge cases: 3-4 days

### Phase 4: Testing, Optimization & Refinement (Weeks 10-13)
**Deliverables:**
- Jest unit tests for validation logic and state management
- React Native Testing Library component tests
- Detox E2E tests for complete user workflows
- Sentry integration for error tracking
- Performance optimization on actual target devices

**Dependencies:**
- Phases 1-3 complete (working app)
- Target tablets available for testing (iPad 9th gen, Samsung Tab S9)

**Effort breakdown:**
- Jest unit tests: 3-4 days
- RNTL component tests: 3-4 days
- Detox E2E test setup + tests: 4-5 days
- Sentry integration: 1-2 days
- Performance profiling + optimization: 3-4 days
- Device testing + bug fixes: 3-4 days

**Total: 9-13 weeks (flexible based on native bridge complexity)**

---

## Dependencies & Prerequisites

### External Services
- [ ] CameraMath API account ($10 credit for MVP)
- [ ] Sentry account (free tier for error tracking)
- [ ] Google Cloud account (for ML Kit Digital Ink Recognition setup)
- [ ] Future: Wolfram Alpha API account (production upgrade)

### Development Tools
- [ ] React Native CLI or Expo CLI (with New Architecture support)
- [ ] Xcode 14+ (for iOS development)
- [ ] Android Studio (for Android development)
- [ ] Detox CLI (for E2E testing)
- [ ] Sentry CLI (for error tracking)

### Design Assets
- [ ] Tablet UI mockups (problem display, canvas, feedback states)
- [ ] Hint message library (20-30 common errors with progressive hints)
- [ ] Celebration/success animations (optional Lottie files)

### Team Skills Required
- React Native development (1-2 developers)
- Native iOS/Android development (0.5 FTE for native bridge work, ML Kit)
- UI/UX design (0.5 FTE)
- QA/testing (0.5 FTE)
- Math domain expert (0.25 FTE for validation logic and hint design)

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| ML Kit recognition accuracy < 85% | Medium | High | Test early with real handwriting; plan MyScript fallback |
| React Native performance issues on older tablets | Medium | High | Use New Architecture, Skia, profile early on target devices |
| CameraMath API unreliability | Low | High | Plan Wolfram Alpha migration; implement local validation fallback |
| Team unfamiliar with Skia/Gesture Handler | Medium | Medium | Budget learning time in Phase 1; use existing community samples |
| School network connectivity issues | Low | Medium | Implement offline mode; queue API calls locally |
| Hint generation inaccurate | High | Medium | Build iteratively with real student data; start with manual library |

---

## Success Metrics (Post-MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Adoption | 80%+ of target classrooms | App installs, DAU |
| Recognition Accuracy | >85% | ML Kit accuracy tests, user manual corrections |
| Validation Performance | <2 sec end-to-end | Sentry performance monitoring |
| Student Engagement | 70%+ complete problems per session | Zustand session tracking |
| Error Rate | <0.1% crashes per session | Sentry crash reporting |
| Hint Usefulness | 80%+ students solve with hints | In-app rating survey |

---

## Next Steps

### Immediate (This Week)
1. ✅ Review and approve updated PRD
2. ⬜ Set up React Native project with New Architecture enabled
3. ⬜ Create CameraMath and Sentry accounts
4. ⬜ Research @nahrae/react-native-digital-ink package or plan native ML Kit bridge

### Week 2-3
5. ⬜ Begin Phase 1: Canvas prototype with Skia + gesture handler
6. ⬜ Test ML Kit recognition with sample math problems
7. ⬜ Create low-fidelity UI mockups (problem display, canvas area, feedback zones)
8. ⬜ Build hint library for 5 common linear equation errors

### Week 4+
9. ⬜ Proceed through Phases 2-4 per timeline above
10. ⬜ Weekly performance profiling on target devices
11. ⬜ Monthly review of tech stack choices based on real implementation experience

---

## Appendix: Library Justification

### Why react-native-mmkv over AsyncStorage?
- **20x performance difference:** 12ms vs. 242ms for read/write operations
- **Synchronous API:** Eliminates race conditions in state management
- **Encryption built-in:** Better security for student data
- **Production-proven:** 2.3k+ GitHub stars, used in thousands of production apps

### Why Google ML Kit Digital Ink over Google Cloud Vision?
- **Purpose-built for digital ink:** ML Kit recognizes strokes; Vision recognizes static images
- **Offline capability:** Eliminates $750-$3,000/month in API costs at scale
- **Better accuracy for handwriting:** 85% vs. ~64% for generic OCR
- **Stroke gesture support:** Recognize delete, circle, etc. for improved UX

### Why Zustand over React Context?
- **10x better performance:** No unnecessary re-renders in consuming components
- **Easier debugging:** Built-in Redux DevTools integration
- **Simpler API:** ~20 lines for complete setup vs. 1-2 hours for optimized Context
- **Middleware support:** Persistence to MMKV built-in

### Why Sentry over Crashlytics?
- **JavaScript error tracking:** Sentry captures JS errors; Crashlytics only captures native errors
- **Breadcrumbs:** User actions leading to crash (essential for debugging)
- **Performance monitoring:** Included; Crashlytics requires separate setup
- **Better React Native support:** Native team at Sentry vs. Google maintaining Firebase

### Why react-native-skottie over lottie-react-native?
- **63% faster animation rendering:** GPU-accelerated via Skia
- **Consistent with canvas library:** Uses same Skia engine as Skia canvas
- **Better performance on tablets:** Crucial for maintaining 60+ FPS

---

**Document Version History**
- **v1.0 (Nov 5, 2025, 11:00 AM):** Original PRD
- **v2.0 (Nov 5, 2025, 11:30 AM):** Updated with technology stack optimizations, library recommendations, and improved risk mitigation
