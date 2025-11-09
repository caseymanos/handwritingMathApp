# PR13-16 Quick Start Guide
# Developer Implementation Guide

**Purpose**: Step-by-step instructions for implementing collaboration, tutorial, and assessment features
**Audience**: Developers starting Phase 1 implementation
**Prerequisites**: PR1-12 complete, Supabase t3-db access

---

## Before You Start

### Required Access

- [ ] Supabase t3-db project access (nhadlfbxbivlhtkbolve)
- [ ] GitHub repository write access
- [ ] UpStudy API credentials (for batch validation)
- [ ] MyScript Cloud API credentials (existing)

### Local Environment Setup

```bash
# 1. Clone repo and install dependencies
cd handwritingMath
npm install

# 2. Configure environment variables
cp .env.example .env

# Add these new variables to .env:
SUPABASE_URL=https://nhadlfbxbivlhtkbolve.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
ENABLE_CLOUD_SYNC=true

# Feature flags (disable until ready)
ENABLE_TUTORIAL_MODE=false
ENABLE_ASSESSMENT_MODE=false
ENABLE_COLLABORATION=false

# 3. iOS setup
cd ios && pod install && cd ..

# 4. Run the app
npm run ios  # or npm run android
```

### Verify Existing System

```bash
# Run existing tests (should all pass)
npm test

# Check all stores are working
# - canvasStore: drawing works
# - validationStore: step validation works
# - hintStore: hints appear on errors
# - progressStore: attempts saved
# - uiStore: modals and loading states work

# Verify cloud sync (PR12)
# 1. Sign in with email magic link (Settings → Cloud Sync)
# 2. Complete a problem
# 3. Check Supabase dashboard: attempts, steps, strokes tables populated
```

---

## Phase 1: Database & Infrastructure (Week 1-2)

### Step 1: Apply Database Schema

```bash
# 1. Download Supabase CLI
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to t3-db project
supabase link --project-ref nhadlfbxbivlhtkbolve

# 4. Apply schema extensions
psql -h db.nhadlfbxbivlhtkbolve.supabase.co \
     -U postgres \
     -d postgres \
     -f docs/DB_SCHEMA_EXTENSIONS.sql

# OR via Supabase Dashboard:
# https://app.supabase.com/project/nhadlfbxbivlhtkbolve/sql/new
# Copy/paste DB_SCHEMA_EXTENSIONS.sql and execute
```

### Step 2: Verify Tables Created

```sql
-- Run in Supabase SQL Editor
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'teacher_student_links',
  'collaboration_sessions',
  'live_strokes',
  'tutorial_lessons',
  'tutorial_progress',
  'assessments',
  'assessment_strokes'
);
-- Should return 7 rows
```

### Step 3: Test RLS Policies

```sql
-- Create 2 test users in Supabase Dashboard:
-- - test-student@example.com
-- - test-teacher@example.com

-- As test-student, try to insert a teacher_student_link:
-- Should FAIL (students can't create links, only accept)

-- As test-teacher, create a link:
INSERT INTO teacher_student_links (teacher_id, student_id, invite_code, status)
VALUES (
  'teacher-uuid',
  'student-uuid',
  'TEST01',
  'pending'
);
-- Should SUCCEED

-- As test-student, try to view other student's data:
SELECT * FROM attempts WHERE user_id != auth.uid();
-- Should return 0 rows (RLS blocks access)
```

### Step 4: Create TypeScript Types

```bash
# Create new type files
touch app/types/Collaboration.ts
touch app/types/Tutorial.ts
touch app/types/Assessment.ts
```

**app/types/Collaboration.ts:**
```typescript
export interface TeacherStudentLink {
  id: string;
  teacher_id: string;
  student_id: string;
  invite_code: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: {
    can_write: boolean;
    can_view_all: boolean;
    can_annotate: boolean;
  };
  created_at: string;
  expires_at?: string;
  accepted_at?: string;
  revoked_at?: string;
  updated_at: string;
}

export interface CollaborationSession {
  id: string;
  student_id: string;
  teacher_id: string;
  link_id: string;
  attempt_id?: string;
  status: 'active' | 'paused' | 'ended';
  started_at: string;
  ended_at?: string;
  student_last_seen?: string;
  teacher_last_seen?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface LiveStroke {
  id: string;
  session_id: string;
  author_id: string;
  stroke_data: any; // Full Stroke object
  color: string;
  stroke_width: number;
  line_number?: number;
  is_annotation: boolean;
  created_at: string;
}

export interface CursorPosition {
  user_id: string;
  x: number;
  y: number;
  timestamp: number;
}
```

**app/types/Tutorial.ts:**
```typescript
import { ProblemCategory, ProblemDifficulty } from './Problem';

export interface TutorialLesson {
  id: string;
  slug: string;
  title: string;
  description?: string;
  skill_category: ProblemCategory;
  difficulty: ProblemDifficulty;
  content_type: 'video' | 'interactive' | 'text';
  video_url?: string;
  video_platform: 'youtube' | 'cloudflare' | 'custom';
  duration_seconds?: number;
  transcript?: string;
  interactive_content?: any;
  sort_order: number;
  prerequisites: string[]; // lesson slugs
  tags: string[];
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  published: boolean;
}

export interface TutorialProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number; // 0-100
  video_position_seconds: number;
  started_at?: string;
  completed_at?: string;
  time_spent_seconds: number;
  last_watched_at?: string;
  created_at: string;
  updated_at: string;
}
```

**app/types/Assessment.ts:**
```typescript
import { ValidationResult } from './Validation';
import { Stroke } from './Canvas';

export interface Assessment {
  id: string;
  user_id: string;
  problem_id: string;
  started_at: string;
  submitted_at?: string;
  status: 'in_progress' | 'submitted' | 'graded';
  steps: AssessmentStep[];
  validation_results?: ValidationResult[];
  score?: number; // 0-100
  correct_steps: number;
  useful_steps: number;
  total_steps: number;
  time_spent_seconds: number;
  time_limit_seconds?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AssessmentStep {
  latex: string;
  lineNumber: number;
  timestamp: number;
}

export interface AssessmentStroke {
  id: string;
  assessment_id: string;
  user_id: string;
  step_index: number;
  line_number?: number;
  point_count: number;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  bytes_compressed: number;
  bytes_original: number;
  encoding: 'delta-gzip-base64';
  data: string; // base64
  created_at: string;
  updated_at: string;
}
```

### Step 5: Extend Sync Infrastructure

**app/utils/sync/collaborationSync.ts:**
```typescript
import { getSupabaseClient } from './supabaseClient';
import { CollaborationSession, TeacherStudentLink, LiveStroke } from '../../types/Collaboration';

export async function upsertTeacherStudentLink(link: TeacherStudentLink): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('teacher_student_links')
    .upsert(link, { onConflict: 'id' });

  if (error) throw error;
}

export async function upsertCollaborationSession(session: CollaborationSession): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('collaboration_sessions')
    .upsert(session, { onConflict: 'id' });

  if (error) throw error;
}

export async function insertLiveStroke(stroke: LiveStroke): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('live_strokes')
    .insert(stroke);

  if (error) throw error;
}
```

**app/utils/sync/tutorialSync.ts:**
```typescript
import { getSupabaseClient } from './supabaseClient';
import { TutorialProgress, TutorialLesson } from '../../types/Tutorial';

export async function fetchTutorialLessons(): Promise<TutorialLesson[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('tutorial_lessons')
    .select('*')
    .eq('published', true)
    .order('skill_category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertTutorialProgress(progress: TutorialProgress): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('tutorial_progress')
    .upsert(progress, { onConflict: 'user_id,lesson_id' });

  if (error) throw error;
}
```

**app/utils/sync/assessmentSync.ts:**
```typescript
import { getSupabaseClient } from './supabaseClient';
import { Assessment, AssessmentStroke } from '../../types/Assessment';

export async function upsertAssessment(assessment: Assessment): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('assessments')
    .upsert(assessment, { onConflict: 'id' });

  if (error) throw error;
}

export async function insertAssessmentStroke(stroke: AssessmentStroke): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('assessment_strokes')
    .insert(stroke);

  if (error) throw error;
}
```

### Step 6: Update package.json

```bash
# Add new dependencies
npm install @supabase/realtime-js react-native-youtube-iframe react-native-video

# Update package.json dependencies section:
{
  "dependencies": {
    // ... existing dependencies
    "react-native-youtube-iframe": "^2.3.0",
    "react-native-video": "^6.0.0"
  }
}
```

### Checkpoint: Phase 1 Complete ✅

- [ ] All 7 tables created in Supabase
- [ ] RLS policies tested and verified
- [ ] TypeScript types defined
- [ ] Sync utilities created
- [ ] Dependencies installed
- [ ] Tests passing

**Commit Message:**
```
feat(pr13): add database schema and sync infrastructure for collaboration, tutorial, and assessment modes

- Add 7 new tables to t3-db: teacher_student_links, collaboration_sessions, live_strokes, tutorial_lessons, tutorial_progress, assessments, assessment_strokes
- Implement RLS policies for user isolation and teacher-student access control
- Create TypeScript type definitions for new features
- Extend sync infrastructure with collaboration, tutorial, and assessment sync clients
- Add react-native-youtube-iframe and react-native-video dependencies

Related: PR13-16 Implementation Plan
```

---

## Phase 2: Tutorial Mode (Week 3-4)

### Step 1: Create Tutorial Store

**app/stores/tutorialStore.ts:**
```typescript
import { create } from 'zustand';
import { TutorialLesson, TutorialProgress } from '../types/Tutorial';
import { Problem, ProblemCategory } from '../types/Problem';
import { fetchTutorialLessons, upsertTutorialProgress } from '../utils/sync/tutorialSync';
import { storage } from '../utils/storage';

interface TutorialStoreState {
  // Lesson library
  lessons: TutorialLesson[];
  lessonsLoading: boolean;

  // User progress
  progress: Map<string, TutorialProgress>;

  // Current lesson
  currentLesson: TutorialLesson | null;
  videoPosition: number;
  isPlaying: boolean;
  playbackRate: number;

  // Actions
  fetchLessons: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  startLesson: (lessonId: string) => void;
  updateVideoPosition: (seconds: number) => void;
  completeLesson: (lessonId: string) => Promise<void>;

  // Helpers
  isLessonUnlocked: (lessonId: string) => boolean;
  getUnlockedProblems: (category: ProblemCategory) => Problem[];
}

export const useTutorialStore = create<TutorialStoreState>((set, get) => ({
  lessons: [],
  lessonsLoading: false,
  progress: new Map(),
  currentLesson: null,
  videoPosition: 0,
  isPlaying: false,
  playbackRate: 1.0,

  fetchLessons: async () => {
    set({ lessonsLoading: true });
    try {
      const lessons = await fetchTutorialLessons();
      set({ lessons, lessonsLoading: false });
    } catch (error) {
      console.error('[TutorialStore] Failed to fetch lessons:', error);
      set({ lessonsLoading: false });
    }
  },

  fetchProgress: async () => {
    // TODO: Implement
  },

  startLesson: (lessonId: string) => {
    const lesson = get().lessons.find(l => l.id === lessonId);
    if (lesson) {
      set({ currentLesson: lesson, videoPosition: 0 });
    }
  },

  updateVideoPosition: (seconds: number) => {
    set({ videoPosition: seconds });
    // Save every 5 seconds
    if (seconds % 5 === 0) {
      // TODO: Sync to Supabase
    }
  },

  completeLesson: async (lessonId: string) => {
    // TODO: Implement
  },

  isLessonUnlocked: (lessonId: string) => {
    // TODO: Implement prerequisite logic
    return true;
  },

  getUnlockedProblems: (category: ProblemCategory) => {
    // TODO: Implement unlocking logic
    return [];
  },
}));
```

### Step 2: Build TutorialScreen

```bash
# Create screen
touch app/screens/TutorialScreen.tsx

# Create components
touch app/components/VideoPlayer.tsx
touch app/components/LessonCard.tsx
```

**app/screens/TutorialScreen.tsx:**
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useTutorialStore } from '../stores/tutorialStore';
import YoutubePlayer from 'react-native-youtube-iframe';

type Props = NativeStackScreenProps<RootStackParamList, 'Tutorial'>;

export const TutorialScreen: React.FC<Props> = ({ route, navigation }) => {
  const { lessonId } = route.params;
  const { currentLesson, startLesson, videoPosition, updateVideoPosition } = useTutorialStore();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    startLesson(lessonId);
  }, [lessonId]);

  if (!currentLesson) {
    return <View><Text>Loading...</Text></View>;
  }

  // Extract YouTube video ID from URL
  const videoId = currentLesson.video_url?.split('v=')[1] || '';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{currentLesson.title}</Text>

      <YoutubePlayer
        height={250}
        videoId={videoId}
        play={playing}
        onChangeState={(state) => {
          setPlaying(state === 'playing');
        }}
        initialPlayerParams={{
          start: videoPosition,
        }}
      />

      <View style={styles.controls}>
        <TouchableOpacity onPress={() => setPlaying(!playing)}>
          <Text>{playing ? 'Pause' : 'Play'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{currentLesson.description}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  controls: {
    marginTop: 16,
  },
  description: {
    marginTop: 16,
    fontSize: 16,
  },
});
```

### Step 3: Update Navigation

**app/navigation/types.ts:**
```typescript
export type RootStackParamList = {
  // ... existing screens
  TutorialLibrary: undefined;
  Tutorial: { lessonId: string };
};
```

**app/navigation/AppNavigator.tsx:**
```typescript
// Add new screens
import { TutorialLibraryScreen } from '../screens/TutorialLibraryScreen';
import { TutorialScreen } from '../screens/TutorialScreen';

// In Stack.Navigator
<Stack.Screen
  name="TutorialLibrary"
  component={TutorialLibraryScreen}
  options={{ title: 'Tutorial Library' }}
/>
<Stack.Screen
  name="Tutorial"
  component={TutorialScreen}
  options={{ title: 'Lesson' }}
/>
```

### Step 4: Seed Initial Lessons

**scripts/seed-tutorial-lessons.sql:**
```sql
-- Linear Equations - Easy
INSERT INTO tutorial_lessons (slug, title, description, skill_category, difficulty, content_type, video_url, video_platform, duration_seconds, sort_order)
VALUES
  ('linear-eq-intro', 'Introduction to Linear Equations', 'Learn what linear equations are and why they matter', 'LINEAR_EQUATIONS', 'EASY', 'video', 'https://www.youtube.com/watch?v=example1', 'youtube', 300, 0),
  ('linear-eq-one-step', 'Solving One-Step Equations', 'Master equations like x + 5 = 12', 'LINEAR_EQUATIONS', 'EASY', 'video', 'https://www.youtube.com/watch?v=example2', 'youtube', 480, 1),
  ('linear-eq-two-step', 'Solving Two-Step Equations', 'Learn to solve 2x + 3 = 11', 'LINEAR_EQUATIONS', 'MEDIUM', 'video', 'https://www.youtube.com/watch?v=example3', 'youtube', 720, 2);
```

### Checkpoint: Tutorial Mode Beta ✅

- [ ] tutorialStore implemented
- [ ] TutorialScreen renders video
- [ ] Navigation working
- [ ] 3-5 lessons seeded
- [ ] Progress tracking (basic)

**Test Checklist:**
- [ ] Load tutorial library (fetch from Supabase)
- [ ] Start lesson (video plays)
- [ ] Video position saves on pause
- [ ] Resume works (starts at saved position)

---

## Phase 3: Assessment Mode (Week 5-6)

### Step 1: Create Assessment Store

**app/stores/assessmentStore.ts:**
```typescript
import { create } from 'zustand';
import { Assessment, AssessmentStep } from '../types/Assessment';
import { ValidationResult } from '../types/Validation';
import { Stroke } from '../types/Canvas';
import { validateMathStep } from '../utils/mathValidation';

interface AssessmentStoreState {
  currentAssessment: Assessment | null;
  assessmentStatus: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  steps: AssessmentStep[];
  startTime: number | null;
  timeElapsed: number;
  timerInterval: NodeJS.Timeout | null;
  isSubmitting: boolean;
  score: number | null;
  validationResults: ValidationResult[];

  startAssessment: (problemId: string) => void;
  addStep: (latex: string, strokes: Stroke[], lineNumber: number) => void;
  submitAssessment: () => Promise<void>;
  retryAssessment: () => void;
  startTimer: () => void;
  stopTimer: () => void;
}

export const useAssessmentStore = create<AssessmentStoreState>((set, get) => ({
  currentAssessment: null,
  assessmentStatus: 'not_started',
  steps: [],
  startTime: null,
  timeElapsed: 0,
  timerInterval: null,
  isSubmitting: false,
  score: null,
  validationResults: [],

  startAssessment: (problemId: string) => {
    set({
      currentAssessment: {
        id: `assessment_${Date.now()}`,
        user_id: '', // TODO: Get from auth
        problem_id: problemId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        steps: [],
        correct_steps: 0,
        useful_steps: 0,
        total_steps: 0,
        time_spent_seconds: 0,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      assessmentStatus: 'in_progress',
      steps: [],
      startTime: Date.now(),
    });
    get().startTimer();
  },

  addStep: (latex: string, strokes: Stroke[], lineNumber: number) => {
    const newStep: AssessmentStep = {
      latex,
      lineNumber,
      timestamp: Date.now(),
    };
    set(state => ({
      steps: [...state.steps, newStep],
    }));
  },

  submitAssessment: async () => {
    set({ isSubmitting: true });
    const { steps } = get();

    try {
      // Batch validate all steps in parallel
      const validationPromises = steps.map((step, index) =>
        validateMathStep({
          problemId: get().currentAssessment!.problem_id,
          stepLatex: step.latex,
          stepNumber: index + 1,
          previousSteps: steps.slice(0, index).map(s => s.latex),
        })
      );

      const results = await Promise.all(validationPromises);

      // Calculate score
      const correctCount = results.filter(r => r.isCorrect).length;
      const usefulCount = results.filter(r => r.isUseful).length;
      const score = Math.round(
        (correctCount / steps.length) * 70 +
        (usefulCount / steps.length) * 30
      );

      set({
        validationResults: results,
        score,
        assessmentStatus: 'graded',
        isSubmitting: false,
      });

      // TODO: Sync to Supabase
    } catch (error) {
      console.error('[AssessmentStore] Validation failed:', error);
      set({ isSubmitting: false });
    }
  },

  retryAssessment: () => {
    set({
      steps: [],
      validationResults: [],
      score: null,
      assessmentStatus: 'not_started',
      startTime: null,
      timeElapsed: 0,
    });
  },

  startTimer: () => {
    const interval = setInterval(() => {
      const { startTime } = get();
      if (startTime) {
        set({ timeElapsed: Math.floor((Date.now() - startTime) / 1000) });
      }
    }, 1000);
    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
      set({ timerInterval: null });
    }
  },
}));
```

### Step 2: Build AssessmentScreen

```bash
touch app/screens/AssessmentScreen.tsx
touch app/screens/AssessmentResultsScreen.tsx
touch app/components/AssessmentTimer.tsx
touch app/components/ScoreDisplay.tsx
```

**app/screens/AssessmentScreen.tsx:**
```typescript
// Reuse HandwritingCanvas, ProblemDisplay
// Similar to TrainingModeScreen but:
// - No ValidationFeedback
// - No HintReveal
// - Submit button instead of auto-validation
// - Timer in header
```

### Checkpoint: Assessment Mode Beta ✅

- [ ] assessmentStore implemented
- [ ] AssessmentScreen working
- [ ] Submit triggers batch validation
- [ ] Scoring algorithm correct
- [ ] Results screen shows feedback

---

## Phase 4: Collaboration (Week 7-10)

### Step 1: Install Supabase Realtime

```bash
# Already installed in Phase 1, verify:
npm list @supabase/realtime-js
```

### Step 2: Create Collaboration Store

**app/stores/collaborationStore.ts:**
```typescript
import { create } from 'zustand';
import { CollaborationSession, LiveStroke, CursorPosition } from '../types/Collaboration';
import { Stroke } from '../types/Canvas';
import { getSupabaseClient } from '../utils/sync/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

interface CollaborationStoreState {
  activeSession: CollaborationSession | null;
  sessionStatus: 'disconnected' | 'connecting' | 'connected';
  liveStrokes: LiveStroke[];
  peerCursors: Map<string, CursorPosition>;
  isTeacherConnected: boolean;
  realtimeChannel: RealtimeChannel | null;

  startSession: (teacherId: string) => Promise<void>;
  endSession: () => Promise<void>;
  broadcastStroke: (stroke: Stroke) => Promise<void>;
  updateCursorPosition: (position: { x: number; y: number }) => void;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
}

export const useCollaborationStore = create<CollaborationStoreState>((set, get) => ({
  activeSession: null,
  sessionStatus: 'disconnected',
  liveStrokes: [],
  peerCursors: new Map(),
  isTeacherConnected: false,
  realtimeChannel: null,

  startSession: async (teacherId: string) => {
    // TODO: Implement
  },

  endSession: async () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      await realtimeChannel.unsubscribe();
    }
    set({
      activeSession: null,
      sessionStatus: 'disconnected',
      realtimeChannel: null,
    });
  },

  broadcastStroke: async (stroke: Stroke) => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      await realtimeChannel.send({
        type: 'broadcast',
        event: 'stroke',
        payload: { stroke },
      });
    }
  },

  updateCursorPosition: (position: { x: number; y: number }) => {
    // TODO: Broadcast cursor position
  },

  subscribeToSession: (sessionId: string) => {
    const client = getSupabaseClient();
    const channel = client.channel(`collaboration:${sessionId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: 'user_id' },
      },
    });

    // Listen for strokes
    channel.on('broadcast', { event: 'stroke' }, (payload) => {
      set(state => ({
        liveStrokes: [...state.liveStrokes, payload.stroke],
      }));
    });

    // Track presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      set({ isTeacherConnected: Object.keys(state).length > 1 });
    });

    channel.subscribe();
    set({ realtimeChannel: channel, sessionStatus: 'connected' });
  },

  unsubscribeFromSession: () => {
    get().endSession();
  },
}));
```

### Checkpoint: Collaboration Beta ✅

- [ ] Realtime subscriptions working
- [ ] Strokes broadcast peer-to-peer
- [ ] Presence tracking shows online/offline
- [ ] Teacher dashboard displays live canvas
- [ ] Invite codes functional

---

## Testing Strategy

### Unit Tests

```bash
# Create test files
touch tests/unit/tutorialStore.test.ts
touch tests/unit/assessmentStore.test.ts
touch tests/unit/collaborationStore.test.ts

# Run tests
npm test
```

### Integration Tests

```bash
# Test full workflows:
# 1. Tutorial: Watch lesson → Complete → Unlock problems
# 2. Assessment: Start → Write steps → Submit → View results
# 3. Collaboration: Teacher invite → Student accept → Live session
```

### E2E Tests (Detox)

```bash
# Add E2E tests (future PR)
npm run test:e2e:ios
```

---

## Deployment Checklist

### Pre-Launch

- [ ] All unit tests passing (100%)
- [ ] Integration tests passing
- [ ] RLS policies verified (security audit)
- [ ] Performance benchmarks met (see targets in plan)
- [ ] Feature flags configured
- [ ] Sentry error tracking enabled
- [ ] Database backups configured

### Beta Launch

- [ ] Enable feature flags for beta users
- [ ] Monitor Sentry for errors
- [ ] Track engagement metrics
- [ ] Gather user feedback
- [ ] Iterate on UX

### Full Launch

- [ ] Enable features for all users
- [ ] Announce launch (email, in-app)
- [ ] Monitor performance and costs
- [ ] Plan Phase 2 enhancements

---

## Common Issues & Debugging

### Issue: RLS policy blocking queries

```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'tutorial_lessons';

-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid';
SELECT * FROM tutorial_lessons;
```

### Issue: Realtime not connecting

```typescript
// Check Supabase client initialization
const client = getSupabaseClient();
console.log('[Realtime] Client:', client);

// Verify JWT token
const session = await client.auth.getSession();
console.log('[Realtime] Session:', session);

// Test channel subscription
const channel = client.channel('test');
channel.subscribe((status) => {
  console.log('[Realtime] Status:', status);
});
```

### Issue: Video not loading

```typescript
// Check YouTube URL format
const videoUrl = 'https://www.youtube.com/watch?v=VIDEO_ID';
const videoId = videoUrl.split('v=')[1]; // Extract ID

// Verify react-native-youtube-iframe installed
import YoutubePlayer from 'react-native-youtube-iframe';
```

---

## Next Steps

1. **Start with Phase 1** (Database & Infrastructure)
2. **Test thoroughly** before moving to next phase
3. **Commit frequently** with clear messages
4. **Document** any deviations from plan
5. **Ask questions** in team Slack channel

**Good luck with implementation!** 🚀

For questions, see:
- Full plan: `PR13-15-16_IMPLEMENTATION_PLAN.md`
- Executive summary: `PR13-16_EXECUTIVE_SUMMARY.md`
- Architecture diagrams: `PR13-16_ARCHITECTURE_DIAGRAMS.md`
