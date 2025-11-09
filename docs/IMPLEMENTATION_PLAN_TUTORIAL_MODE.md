# Implementation Plan: PR14 Tutorial Mode (Phase 2)

## Context
The handwriting math app has completed Phase 1 infrastructure for PR13-16. All TypeScript types, sync clients, and database schema are ready. The next step is implementing **Tutorial Mode (PR14)** which provides Direct Instruction-based video lessons with progress tracking.

## Objectives
Build a complete tutorial system where students can:
1. Browse video lessons organized by skill category
2. Watch educational videos with progress tracking
3. Unlock practice problems based on lesson completion
4. Resume lessons from their last watched position

## Current State
✅ Complete:
- `app/types/Tutorial.ts` - All TypeScript types defined
- `app/utils/sync/tutorialSync.ts` - Sync client with 8 functions
- Database schema in `docs/DB_SCHEMA_EXTENSIONS.sql`
- `react-native-youtube-iframe` dependency installed
- Environment variables configured in `.env.example`

❌ Not Yet Implemented:
- Zustand tutorial store
- Tutorial screens (library + player)
- Video player component
- Progress tracking integration
- Home screen integration

## Implementation Steps

### Step 1: Create tutorialStore.ts
**File:** `app/stores/tutorialStore.ts`

**Requirements:**
- Zustand store following existing patterns (see `progressStore.ts` as reference)
- MMKV persistence for offline support
- State:
  - `lessons: TutorialLesson[]` - Cached lesson library
  - `progress: Map<string, TutorialProgress>` - User progress by lesson ID
  - `currentLesson: TutorialLesson | null` - Active lesson
  - `videoPosition: number` - Current playback position in seconds
  - `isPlaying: boolean` - Video playback state
  - `playbackRate: number` - Speed (1.0, 1.25, 1.5, 2.0)
  - `lessonsLoading: boolean` - Loading state
- Actions:
  - `fetchLessons()` - Load lessons from Supabase using `fetchTutorialLessons()`
  - `fetchProgress()` - Load user progress using `fetchTutorialProgress()`
  - `startLesson(lessonId: string)` - Initialize lesson playback
  - `updateVideoPosition(seconds: number)` - Save position (debounce 5sec)
  - `completeLesson(lessonId: string)` - Mark lesson complete using `completeLesson()`
  - `isLessonUnlocked(lessonId: string)` - Check prerequisites using `isLessonUnlocked()`
  - `getUnlockedProblems(category: ProblemCategory)` - Return unlocked problems based on completion
- Persistence:
  - Save/load progress map to MMKV
  - Cache lessons locally (refresh every 24 hours)
  - Auto-save video position every 5 seconds

**Reference Files:**
- `app/stores/progressStore.ts` - MMKV persistence pattern
- `app/stores/hintStore.ts` - Map-based state example
- `app/utils/sync/tutorialSync.ts` - Available sync functions

### Step 2: Create VideoPlayer Component
**File:** `app/components/VideoPlayer.tsx`

**Requirements:**
- Use `react-native-youtube-iframe` for YouTube embeds
- Props:
  - `videoUrl: string` - YouTube URL or video ID
  - `initialPosition?: number` - Start position in seconds
  - `onProgress: (seconds: number) => void` - Callback every 1 second
  - `onComplete: () => void` - Callback when video ends
  - `playbackRate?: number` - Speed multiplier
- Controls:
  - Play/Pause button
  - Seek bar with current time / total duration
  - Playback speed selector (1x, 1.25x, 1.5x, 2x)
  - Fullscreen toggle
- Features:
  - Auto-resume from initialPosition
  - Save position on pause/background
  - Show loading spinner during buffering
  - Error handling with retry button
- Styling:
  - Use existing style system (`app/styles/`)
  - 16:9 aspect ratio for video
  - Accessible controls with labels
  - Responsive sizing for iPad landscape/portrait

**Reference Files:**
- `app/components/HandwritingCanvas.tsx` - Complex component example
- `app/styles/` - Style system
- `react-native-youtube-iframe` documentation

### Step 3: Create TutorialScreen
**File:** `app/screens/TutorialScreen.tsx`

**Requirements:**
- Screen for watching individual lessons
- Props: `route.params.lessonId: string`
- Layout sections:
  1. **Header**
     - Back button (navigation.goBack)
     - Lesson title
     - Progress indicator (e.g., "71% complete")
  2. **Video Player**
     - Embed VideoPlayer component
     - Pass lesson.video_url
     - Wire up onProgress to tutorialStore.updateVideoPosition
     - Wire up onComplete to tutorialStore.completeLesson
  3. **Tabs** (optional for MVP, can start with just video)
     - Video (default)
     - Transcript (display lesson.transcript if available)
     - Notes (future feature, can skip)
  4. **Footer**
     - "Continue Watching" button (if progress < 100%)
     - "Mark as Complete" button (if progress >= 80%)
     - "Practice Problems" button (navigate to TrainingMode with category filter)
- State management:
  - Load lesson data from tutorialStore on mount
  - Subscribe to videoPosition updates
  - Show success animation on completion (use SuccessAnimation component)
- Persistence:
  - Auto-save video position every 5 seconds (store handles this)
  - Update tutorial_progress in Supabase via sync client

**Reference Files:**
- `app/screens/TrainingModeScreen.tsx` - Screen structure example
- `app/components/SuccessAnimation.tsx` - Completion animation
- `app/navigation/types.ts` - Navigation types

### Step 4: Create TutorialLibraryScreen
**File:** `app/screens/TutorialLibraryScreen.tsx`

**Requirements:**
- Screen for browsing all available lessons
- Layout sections:
  1. **Header**
     - Title: "Tutorial Library"
     - Search icon (future feature, can skip for MVP)
  2. **Category Filters**
     - Horizontal scroll list: All, Linear Equations, Basic Algebra, Fractions, etc.
     - Active filter highlighted
     - Filter lessons by selected category
  3. **Lesson List**
     - Grouped by category (collapsible sections)
     - Each lesson card shows:
       - ✅ Checkmark if completed
       - ○ Circle if unlocked but not complete
       - 🔒 Lock icon if prerequisites not met
       - Lesson title
       - Duration (e.g., "12 min")
       - Difficulty badge (Easy/Medium/Hard)
     - Tap lesson to navigate to TutorialScreen
     - Disabled state for locked lessons (gray out, show prerequisite message)
  4. **Progress Summary**
     - Overall progress bar per category (e.g., "Linear Equations: 3/5 complete")
- State management:
  - Load lessons from tutorialStore.lessons
  - Load progress from tutorialStore.progress
  - Use tutorialStore.isLessonUnlocked to determine lock state
- Styling:
  - Use LessonCard component (create separate component)
  - Responsive grid layout (2 columns on iPad landscape)
  - Smooth animations for category transitions

**Reference Files:**
- `app/screens/HomeScreen.tsx` - Category filtering example
- `app/components/ProblemDisplay.tsx` - Card-style component

### Step 5: Create LessonCard Component
**File:** `app/components/LessonCard.tsx`

**Requirements:**
- Display single lesson in list
- Props:
  - `lesson: TutorialLesson`
  - `progress?: TutorialProgress`
  - `isLocked: boolean`
  - `onPress: () => void`
- Display:
  - Status icon (✅/○/🔒)
  - Title
  - Duration (format: "12 min")
  - Difficulty badge (colored pill)
  - Progress bar if in_progress (0-100%)
  - Prerequisite message if locked (small gray text)
- States:
  - Locked: grayed out, disabled
  - Unlocked: full color, tappable
  - Completed: green accent
  - In Progress: blue accent with progress bar
- Styling:
  - Use style system
  - Add accessibility labels
  - Touch feedback (opacity change)

### Step 6: Update Navigation
**File:** `app/navigation/AppNavigator.tsx`

**Changes:**
- Add new routes to `RootStackParamList`:
  ```typescript
  TutorialLibrary: undefined;
  Tutorial: { lessonId: string };
  ```
- Add screens to stack:
  ```typescript
  <Stack.Screen name="TutorialLibrary" component={TutorialLibraryScreen} />
  <Stack.Screen name="Tutorial" component={TutorialScreen} />
  ```
- Modal presentation for TutorialLibrary (optional)

**File:** `app/navigation/types.ts`
- Update type definitions to match

### Step 7: Update HomeScreen
**File:** `app/screens/HomeScreen.tsx`

**Changes:**
- Add "LEARN" section above existing "PRACTICE" section
- New card:
  - Icon: 📚
  - Title: "Tutorial Library"
  - Subtitle: "Learn new skills with video lessons"
  - Progress: "X/Y lessons complete" (load from tutorialStore)
  - onPress: Navigate to TutorialLibrary
- Fetch tutorial progress on mount:
  ```typescript
  const tutorialStore = useTutorialStore();
  useEffect(() => {
    tutorialStore.fetchLessons();
    tutorialStore.fetchProgress();
  }, []);
  ```
- Display loading state while fetching

**Reference:** See layout mockup in `docs/PR13-15-16_IMPLEMENTATION_PLAN.md` lines 1104-1134

### Step 8: Update SettingsScreen (Optional)
**File:** `app/screens/SettingsScreen.tsx`

**Changes (can defer to polish phase):**
- Add "Tutorial Preferences" section
- Settings:
  - Video quality (480p/720p/1080p) - future feature
  - Auto-advance to next lesson (boolean)
  - Show captions (boolean) - future feature
- Store in MMKV via tutorialStore

### Step 9: Seed Tutorial Lessons Data
**File:** `scripts/seed-tutorial-lessons.sql`

**Requirements:**
- Create SQL script to populate tutorial_lessons table
- Start with 5-10 lessons for Linear Equations category
- Use existing Khan Academy YouTube videos (free, educational)
- Example lesson structure:
  ```sql
  INSERT INTO tutorial_lessons (slug, title, description, skill_category, difficulty, video_url, duration_seconds, sort_order, prerequisites)
  VALUES
  ('le-intro', 'Introduction to Linear Equations', 'Learn what a linear equation is...', 'LINEAR_EQUATIONS', 'EASY', 'https://youtube.com/watch?v=...', 300, 1, ARRAY[]::TEXT[]),
  ('le-one-step', 'One-Step Equations', 'Solve equations with one operation...', 'LINEAR_EQUATIONS', 'EASY', 'https://youtube.com/watch?v=...', 480, 2, ARRAY['le-intro']),
  ...
  ```
- Ensure prerequisites reference slugs (not IDs)
- Mark all as `published = true`

**Action:** User must run this script against Supabase database

### Step 10: Testing
**File:** `tests/unit/stores/tutorialStore.test.ts`

**Requirements:**
- Test store actions:
  - fetchLessons() - mock Supabase response
  - fetchProgress() - verify Map population
  - startLesson() - check state updates
  - updateVideoPosition() - verify debouncing
  - completeLesson() - verify sync call
  - isLessonUnlocked() - test prerequisite logic
  - getUnlockedProblems() - test unlocking rules
- Mock dependencies:
  - `app/utils/sync/tutorialSync.ts`
  - MMKV storage
- Follow existing test patterns from `tests/unit/storage.test.ts`

### Step 11: Documentation
**File:** `docs/TUTORIAL_CONTENT_GUIDE.md`

**Contents:**
- How to add new lessons
- Video content guidelines (length, style, quality)
- Prerequisite relationship best practices
- Lesson slug naming conventions
- How to update existing lessons
- Video hosting options (YouTube vs custom)
- Future: How to create custom content

## Integration Checklist
- [ ] tutorialStore integrated with existing progressStore for overall progress tracking
- [ ] Tutorial completion unlocks practice problems (verify in TrainingModeScreen)
- [ ] Navigation flows work: Home → TutorialLibrary → Tutorial → back
- [ ] Video player handles background/foreground transitions
- [ ] Progress syncs to Supabase correctly
- [ ] Offline mode works (cached lessons, queued progress updates)
- [ ] Error handling for network failures
- [ ] Loading states throughout
- [ ] Accessibility labels on all interactive elements
- [ ] Style system applied consistently

## Success Criteria
- [ ] Students can browse lessons by category
- [ ] Video playback works smoothly on iPad
- [ ] Progress saves automatically every 5 seconds
- [ ] Lessons unlock based on prerequisites
- [ ] Completing lessons unlocks practice problems
- [ ] Video position persists across app restarts
- [ ] All sync operations queue when offline
- [ ] No crashes during normal usage
- [ ] 60+ FPS performance on target devices
- [ ] Comprehensive test coverage (70%+)

## Priority
HIGH - This is Phase 2 in the roadmap and should be completed before Assessment Mode (PR15) and Collaboration (PR13).

## Estimated Effort
- tutorialStore: 4-6 hours
- VideoPlayer component: 3-4 hours
- TutorialScreen: 3-4 hours
- TutorialLibraryScreen: 4-5 hours
- LessonCard component: 2 hours
- Navigation updates: 1 hour
- HomeScreen integration: 2 hours
- Seed data script: 2-3 hours
- Testing: 4-5 hours
- Documentation: 2 hours
**Total: 27-36 hours (3-4 days)**

## Dependencies
- Database migration MUST be applied first (DB_SCHEMA_EXTENSIONS.sql)
- Environment variables MUST be set (SUPABASE_URL, SUPABASE_ANON_KEY)
- react-native-youtube-iframe MUST be installed (already done)

## Notes for Implementation
- Follow existing code patterns from PR12 (cloud sync)
- Use style system from PR8 (app/styles/)
- Reuse components where possible (SuccessAnimation, etc.)
- Test on physical iPad for video playback performance
- Ensure video player works in portrait and landscape
- Consider bandwidth usage (WiFi vs cellular)
- Add Sentry tracking for video playback errors
- Use feature flag ENABLE_TUTORIAL_MODE during development (set to false initially)

## Open Questions for User
1. Do you have specific YouTube videos selected, or should I find appropriate Khan Academy videos?
2. Should we implement search in TutorialLibraryScreen for MVP, or defer to Phase 2?
3. Should we show video transcripts, or focus on video-only for MVP?
4. Do you want quiz questions after lessons (mentioned in plan as future), or skip entirely?
5. Should we implement video quality settings now, or defer to polish phase?

## Next Steps After Tutorial Mode
Once Tutorial Mode (PR14) is complete, the next feature in the roadmap is:
- **PR15: Assessment Mode** - Deferred validation for formal testing
- See `docs/PR13-15-16_IMPLEMENTATION_PLAN.md` section "PR15: Assessment Mode" for details
