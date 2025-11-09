# RepoPrompt: Implement Tutorial Mode (PR14)

## Mission
Implement Tutorial Mode for the handwriting math app - a video-based learning system where students watch lessons, track progress, and unlock practice problems based on completion.

## Context
Phase 1 infrastructure is COMPLETE:
- ✅ All TypeScript types in `app/types/Tutorial.ts`
- ✅ Sync client in `app/utils/sync/tutorialSync.ts` (8 functions ready)
- ✅ Database schema in `docs/DB_SCHEMA_EXTENSIONS.sql`
- ✅ `react-native-youtube-iframe` installed
- ✅ Environment variables configured

## Your Task: Build 11 Components

### 1. tutorialStore.ts (Zustand Store)
**File:** `app/stores/tutorialStore.ts`

**Pattern:** Follow `app/stores/progressStore.ts` for MMKV persistence

**State:**
```typescript
{
  lessons: TutorialLesson[],
  progress: Map<string, TutorialProgress>,
  currentLesson: TutorialLesson | null,
  videoPosition: number,
  isPlaying: boolean,
  playbackRate: number,
  lessonsLoading: boolean
}
```

**Actions:**
- `fetchLessons()` → use `fetchTutorialLessons()` from tutorialSync.ts
- `fetchProgress()` → use `fetchTutorialProgress()` from tutorialSync.ts
- `startLesson(lessonId)` → set currentLesson, load from progress
- `updateVideoPosition(seconds)` → debounce 5sec, call `updateVideoPosition()` from sync
- `completeLesson(lessonId)` → call `completeLesson()` from sync
- `isLessonUnlocked(lessonId)` → use `isLessonUnlocked()` from sync
- `getUnlockedProblems(category)` → filter by completion (Easy: 1 lesson, Medium: 2 lessons, Hard: all lessons)

**Persistence:**
- Save progress Map to MMKV on updates
- Cache lessons (refresh every 24 hours)
- Auto-save video position every 5 seconds

### 2. VideoPlayer.tsx Component
**File:** `app/components/VideoPlayer.tsx`

**Use:** `react-native-youtube-iframe`

**Props:**
```typescript
{
  videoUrl: string,
  initialPosition?: number,
  onProgress: (seconds: number) => void,
  onComplete: () => void,
  playbackRate?: number
}
```

**Features:**
- Play/Pause, seek bar, speed selector (1x, 1.25x, 1.5x, 2x)
- Auto-resume from initialPosition
- Loading spinner during buffering
- Error handling with retry button
- 16:9 aspect ratio
- Use style system from `app/styles/`

### 3. TutorialScreen.tsx
**File:** `app/screens/TutorialScreen.tsx`

**Route params:** `{ lessonId: string }`

**Layout:**
1. Header: Back button, lesson title, progress %
2. VideoPlayer: Wire to tutorialStore.updateVideoPosition & completeLesson
3. Footer:
   - "Continue Watching" (if progress < 100%)
   - "Mark as Complete" (if progress >= 80%)
   - "Practice Problems" (navigate to TrainingMode)

**Pattern:** See `app/screens/TrainingModeScreen.tsx`

**Features:**
- Load lesson from tutorialStore on mount
- Show SuccessAnimation on completion
- Auto-save position every 5 seconds

### 4. TutorialLibraryScreen.tsx
**File:** `app/screens/TutorialLibraryScreen.tsx`

**Layout:**
1. Header: "Tutorial Library"
2. Category filters: Horizontal scroll (All, Linear Equations, etc.)
3. Lesson list: Grouped by category
   - Use LessonCard component for each lesson
   - Show ✅ (complete), ○ (unlocked), 🔒 (locked)
4. Progress summary per category

**Pattern:** See `app/screens/HomeScreen.tsx` for category filtering

**Features:**
- Filter by selected category
- Use tutorialStore.isLessonUnlocked for lock state
- 2-column grid on iPad landscape

### 5. LessonCard.tsx Component
**File:** `app/components/LessonCard.tsx`

**Props:**
```typescript
{
  lesson: TutorialLesson,
  progress?: TutorialProgress,
  isLocked: boolean,
  onPress: () => void
}
```

**Display:**
- Status icon (✅/○/🔒)
- Title, duration, difficulty badge
- Progress bar if in_progress
- Prerequisite message if locked

**States:** Locked (gray), Unlocked (full color), Completed (green), In Progress (blue)

### 6. Navigation Updates
**Files:** `app/navigation/AppNavigator.tsx`, `app/navigation/types.ts`

**Add routes:**
```typescript
TutorialLibrary: undefined;
Tutorial: { lessonId: string };
```

**Add screens:**
```typescript
<Stack.Screen name="TutorialLibrary" component={TutorialLibraryScreen} />
<Stack.Screen name="Tutorial" component={TutorialScreen} />
```

### 7. HomeScreen Integration
**File:** `app/screens/HomeScreen.tsx`

**Add LEARN section above PRACTICE:**
```typescript
📚 Tutorial Library
Learn new skills with video lessons
Progress: X/Y lessons complete
[Navigate to TutorialLibrary]
```

**Fetch on mount:**
```typescript
useEffect(() => {
  tutorialStore.fetchLessons();
  tutorialStore.fetchProgress();
}, []);
```

### 8. Seed Data Script
**File:** `scripts/seed-tutorial-lessons.sql`

**Create 5-10 Linear Equations lessons:**
```sql
INSERT INTO tutorial_lessons (slug, title, description, skill_category, difficulty, video_url, duration_seconds, sort_order, prerequisites)
VALUES
('le-intro', 'Introduction to Linear Equations', '...', 'LINEAR_EQUATIONS', 'EASY', 'YOUTUBE_URL', 300, 1, ARRAY[]::TEXT[]),
('le-one-step', 'One-Step Equations', '...', 'LINEAR_EQUATIONS', 'EASY', 'YOUTUBE_URL', 480, 2, ARRAY['le-intro']),
...
```

**Use Khan Academy YouTube videos** (free, educational)

### 9. Unit Tests
**File:** `tests/unit/stores/tutorialStore.test.ts`

**Test actions:**
- fetchLessons() - mock Supabase response
- fetchProgress() - verify Map population
- updateVideoPosition() - verify debouncing
- completeLesson() - verify sync call
- isLessonUnlocked() - test prerequisite logic
- getUnlockedProblems() - test unlocking rules

**Pattern:** See `tests/unit/storage.test.ts`

**Mock:** tutorialSync.ts, MMKV

### 10. SettingsScreen (Optional)
**File:** `app/screens/SettingsScreen.tsx`

**Add "Tutorial Preferences" section:**
- Auto-advance to next lesson (boolean)
- Store in MMKV

### 11. Documentation
**File:** `docs/TUTORIAL_CONTENT_GUIDE.md`

**Contents:**
- How to add new lessons
- Video content guidelines
- Prerequisite best practices
- Lesson slug naming conventions

## Integration Checklist

- [ ] tutorialStore wired to progressStore for overall tracking
- [ ] Tutorial completion unlocks practice problems
- [ ] Navigation: Home → Library → Tutorial → back
- [ ] Video handles background/foreground
- [ ] Progress syncs to Supabase
- [ ] Offline mode (cached lessons, queued updates)
- [ ] Error handling for network failures
- [ ] Loading states throughout
- [ ] Accessibility labels on all elements
- [ ] Style system applied consistently

## Success Criteria

- [ ] Browse lessons by category
- [ ] Video playback smooth on iPad
- [ ] Progress auto-saves every 5 seconds
- [ ] Lessons unlock based on prerequisites
- [ ] Completing lessons unlocks problems
- [ ] Video position persists across restarts
- [ ] Sync queues when offline
- [ ] 60+ FPS performance
- [ ] 70%+ test coverage

## Development Steps

1. **Create branch:** `git checkout -b feature/pr14-tutorial-mode`
2. **Feature flag:** Keep `ENABLE_TUTORIAL_MODE=false` until complete
3. **Build order:**
   - Day 1: tutorialStore + VideoPlayer
   - Day 2: TutorialScreen + TutorialLibraryScreen + LessonCard
   - Day 3: Navigation + HomeScreen + Tests
   - Day 4: Seed data + Documentation + Polish
4. **Test incrementally:** Unit tests alongside components
5. **Enable flag:** Set `ENABLE_TUTORIAL_MODE=true` when ready
6. **PR:** Reference TASK_LIST.md

## Critical Prerequisites

⚠️ **Database must be migrated first:**
```bash
# Apply base schema
psql -h db.PROJECT_ID.supabase.co -U postgres -f docs/DB_SCHEMA.sql

# Apply extensions
psql -h db.PROJECT_ID.supabase.co -U postgres -f docs/DB_SCHEMA_EXTENSIONS.sql

# Update .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key
```

## Code Patterns to Follow

- **Store pattern:** `app/stores/progressStore.ts` (MMKV persistence)
- **Screen structure:** `app/screens/TrainingModeScreen.tsx`
- **Complex component:** `app/components/HandwritingCanvas.tsx`
- **Style system:** `app/styles/` (use Colors, Spacing, TextStyles)
- **Sync integration:** `app/utils/sync/syncClient.ts`
- **Testing:** `tests/unit/storage.test.ts`

## Key Files Reference

**Already implemented (Phase 1):**
- `app/types/Tutorial.ts` - All types
- `app/utils/sync/tutorialSync.ts` - 8 sync functions ready
- `docs/DB_SCHEMA_EXTENSIONS.sql` - Database schema

**To implement (Phase 2 - YOU):**
- `app/stores/tutorialStore.ts`
- `app/components/VideoPlayer.tsx`
- `app/components/LessonCard.tsx`
- `app/screens/TutorialScreen.tsx`
- `app/screens/TutorialLibraryScreen.tsx`
- Navigation updates
- HomeScreen updates
- Seed data SQL
- Tests
- Documentation

## Estimated Timeline
**3-4 days (27-36 hours)**

## Questions to Resolve
1. YouTube URLs: Find Khan Academy videos or wait for user to provide?
2. Search feature: Implement now or defer to Phase 2?
3. Transcripts: Show them or video-only for MVP?
4. Quiz questions: Skip entirely or implement?
5. Video quality settings: Now or later?

## After Tutorial Mode
Next up: **PR15 Assessment Mode** (4-5 days)
Then: **PR13 Collaboration** (7-10 days)

---

**Ready to start? Begin with Step 1: tutorialStore.ts**
Follow the detailed requirements above and reference the existing code patterns.
