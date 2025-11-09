# PR13-16 Implementation Plan
# Teacher Collaboration, Tutorial Mode, and Assessment Mode

**Created**: 2025-11-08
**Status**: Planning Phase
**Supabase Project**: t3-db (nhadlfbxbivlhtkbolve)

---

## Executive Summary

This document outlines the implementation plan for three major post-MVP features:

1. **PR13: Teacher/Guide Real-time Collaboration** - Bidirectional live collaboration with WebSocket-based real-time stroke streaming
2. **PR14: Tutorial Mode** - Direct Instruction-based tutorial system with video lessons and progress tracking
3. **PR15: Assessment Mode** - Deferred validation mode for formal assessments

All features leverage the existing t3-db Supabase project with schema extensions and build upon the proven local-first sync architecture from PR12.

---

## Table of Contents

1. [Database Schema Extensions](#database-schema-extensions)
2. [PR13: Real-time Collaboration](#pr13-real-time-collaboration)
3. [PR14: Tutorial Mode](#pr14-tutorial-mode)
4. [PR15: Assessment Mode](#pr15-assessment-mode)
5. [Integration with Existing System](#integration-with-existing-system)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Security & Privacy Considerations](#security--privacy-considerations)

---

## Database Schema Extensions

### New Tables for t3-db Project

#### 1. teacher_student_links (Collaboration)

```sql
CREATE TABLE IF NOT EXISTS public.teacher_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'revoked'
  permissions JSONB NOT NULL DEFAULT '{"can_write": true, "can_view_all": true, "can_annotate": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- Indexes
CREATE INDEX idx_teacher_student_links_teacher ON public.teacher_student_links(teacher_id);
CREATE INDEX idx_teacher_student_links_student ON public.teacher_student_links(student_id);
CREATE INDEX idx_teacher_student_links_invite_code ON public.teacher_student_links(invite_code);
CREATE INDEX idx_teacher_student_links_status ON public.teacher_student_links(status);

-- RLS Policies
ALTER TABLE public.teacher_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own links"
  ON public.teacher_student_links FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view own links"
  ON public.teacher_student_links FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can create links"
  ON public.teacher_student_links FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Students can accept links"
  ON public.teacher_student_links FOR UPDATE
  USING (auth.uid() = student_id AND status = 'pending');

CREATE POLICY "Teachers can revoke links"
  ON public.teacher_student_links FOR UPDATE
  USING (auth.uid() = teacher_id);
```

#### 2. collaboration_sessions (Real-time)

```sql
CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.teacher_student_links(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'ended'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  student_last_seen TIMESTAMPTZ,
  teacher_last_seen TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_collaboration_sessions_student ON public.collaboration_sessions(student_id);
CREATE INDEX idx_collaboration_sessions_teacher ON public.collaboration_sessions(teacher_id);
CREATE INDEX idx_collaboration_sessions_status ON public.collaboration_sessions(status);
CREATE INDEX idx_collaboration_sessions_attempt ON public.collaboration_sessions(attempt_id);

-- RLS Policies
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own sessions"
  ON public.collaboration_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view student sessions"
  ON public.collaboration_sessions FOR SELECT
  USING (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM public.teacher_student_links
      WHERE teacher_id = auth.uid()
      AND student_id = collaboration_sessions.student_id
      AND status = 'active'
    )
  );

CREATE POLICY "Students can create sessions"
  ON public.collaboration_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Both parties can update sessions"
  ON public.collaboration_sessions FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = teacher_id);
```

#### 3. live_strokes (Real-time stroke streaming)

```sql
CREATE TABLE IF NOT EXISTS public.live_strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stroke_data JSONB NOT NULL, -- Uncompressed for real-time, compressed in steps.strokes
  color TEXT NOT NULL,
  stroke_width FLOAT NOT NULL,
  line_number INTEGER,
  is_annotation BOOLEAN NOT NULL DEFAULT false, -- true if teacher annotation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_live_strokes_session ON public.live_strokes(session_id);
CREATE INDEX idx_live_strokes_created ON public.live_strokes(created_at DESC);

-- RLS Policies
ALTER TABLE public.live_strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session participants can view strokes"
  ON public.live_strokes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collaboration_sessions cs
      WHERE cs.id = session_id
      AND (cs.student_id = auth.uid() OR cs.teacher_id = auth.uid())
    )
  );

CREATE POLICY "Session participants can insert strokes"
  ON public.live_strokes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.collaboration_sessions cs
      WHERE cs.id = session_id
      AND (cs.student_id = auth.uid() OR cs.teacher_id = auth.uid())
      AND cs.status = 'active'
    )
  );
```

#### 4. tutorial_lessons (Tutorial Content)

```sql
CREATE TABLE IF NOT EXISTS public.tutorial_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  skill_category TEXT NOT NULL, -- Maps to ProblemCategory
  difficulty TEXT NOT NULL, -- Maps to ProblemDifficulty
  content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'interactive', 'text'
  video_url TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  interactive_content JSONB, -- For future interactive lessons
  sort_order INTEGER NOT NULL DEFAULT 0,
  prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[], -- Lesson slugs that must be completed first
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published BOOLEAN NOT NULL DEFAULT true
);

-- Indexes
CREATE INDEX idx_tutorial_lessons_slug ON public.tutorial_lessons(slug);
CREATE INDEX idx_tutorial_lessons_category ON public.tutorial_lessons(skill_category);
CREATE INDEX idx_tutorial_lessons_difficulty ON public.tutorial_lessons(difficulty);
CREATE INDEX idx_tutorial_lessons_published ON public.tutorial_lessons(published);

-- RLS Policies
ALTER TABLE public.tutorial_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view published lessons"
  ON public.tutorial_lessons FOR SELECT
  USING (published = true);
```

#### 5. tutorial_progress (User progress tracking)

```sql
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.tutorial_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  progress_percent INTEGER NOT NULL DEFAULT 0, -- 0-100
  video_position_seconds INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Indexes
CREATE INDEX idx_tutorial_progress_user ON public.tutorial_progress(user_id);
CREATE INDEX idx_tutorial_progress_lesson ON public.tutorial_progress(lesson_id);
CREATE INDEX idx_tutorial_progress_status ON public.tutorial_progress(status);

-- RLS Policies
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.tutorial_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.tutorial_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.tutorial_progress FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 6. assessments (Assessment mode)

```sql
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded'
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of step data (latex, line_number)
  validation_results JSONB, -- Validation after submission
  score FLOAT, -- 0-100, calculated after validation
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assessments_user ON public.assessments(user_id);
CREATE INDEX idx_assessments_problem ON public.assessments(problem_id);
CREATE INDEX idx_assessments_status ON public.assessments(status);
CREATE INDEX idx_assessments_submitted ON public.assessments(submitted_at DESC);

-- RLS Policies
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 7. assessment_strokes (Stroke data for assessments)

```sql
CREATE TABLE IF NOT EXISTS public.assessment_strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL, -- Index in assessments.steps array
  line_number INTEGER,
  point_count INTEGER NOT NULL,
  bbox JSONB NOT NULL DEFAULT '{}'::jsonb,
  bytes_compressed INTEGER NOT NULL,
  bytes_original INTEGER NOT NULL,
  encoding TEXT NOT NULL DEFAULT 'delta-gzip-base64',
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assessment_strokes_assessment ON public.assessment_strokes(assessment_id);
CREATE INDEX idx_assessment_strokes_user ON public.assessment_strokes(user_id);

-- RLS Policies
ALTER TABLE public.assessment_strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment strokes"
  ON public.assessment_strokes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessment strokes"
  ON public.assessment_strokes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Updated Triggers

```sql
-- Add updated_at triggers for new tables
CREATE TRIGGER update_teacher_student_links_updated_at
  BEFORE UPDATE ON public.teacher_student_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON public.collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutorial_lessons_updated_at
  BEFORE UPDATE ON public.tutorial_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutorial_progress_updated_at
  BEFORE UPDATE ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_strokes_updated_at
  BEFORE UPDATE ON public.assessment_strokes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## PR13: Real-time Collaboration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Real-time Collaboration                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Student Device                      Teacher Dashboard       │
│  ┌─────────────────┐                ┌──────────────────┐   │
│  │ HandwritingCanvas│◄──WebSocket──►│ LiveCanvasView   │   │
│  │   (writes)       │                │  (reads + writes)│   │
│  └────────┬─────────┘                └────────┬─────────┘   │
│           │                                    │             │
│           │                                    │             │
│  ┌────────▼─────────┐                ┌────────▼─────────┐   │
│  │collaborationStore│                │ collaborationStore│   │
│  │  - session       │                │   - activeStudents│   │
│  │  - liveStrokes   │                │   - liveStrokes   │   │
│  │  - peerCursor    │                │   - cursors       │   │
│  └────────┬─────────┘                └────────┬─────────┘   │
│           │                                    │             │
│           └──────────┬──────────────┬──────────┘             │
│                      │              │                        │
│              ┌───────▼──────────────▼──────┐                │
│              │  Supabase Realtime API      │                │
│              │  - broadcast (strokes)      │                │
│              │  - presence (online status) │                │
│              │  - postgres_changes (data)  │                │
│              └─────────────────────────────┘                │
│                      │                                       │
│              ┌───────▼──────────────────────┐               │
│              │  Database Tables             │               │
│              │  - collaboration_sessions    │               │
│              │  - live_strokes (ephemeral)  │               │
│              │  - teacher_student_links     │               │
│              └──────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. collaborationStore.ts (New Zustand Store)

```typescript
interface CollaborationStoreState {
  // Session management
  activeSession: CollaborationSession | null;
  sessionStatus: 'disconnected' | 'connecting' | 'connected';

  // Real-time state
  liveStrokes: LiveStroke[];
  peerCursors: Map<string, CursorPosition>;
  isTeacherConnected: boolean;

  // Supabase Realtime channel
  realtimeChannel: RealtimeChannel | null;

  // Actions
  startSession: (teacherId: string) => Promise<void>;
  endSession: () => Promise<void>;
  broadcastStroke: (stroke: Stroke) => Promise<void>;
  updateCursorPosition: (position: { x: number; y: number }) => void;

  // Subscriptions
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;
}
```

**Key Features:**
- WebSocket-based real-time stroke streaming using Supabase Realtime
- Presence tracking (who's online, cursor positions)
- Broadcast API for low-latency stroke synchronization
- Automatic reconnection with exponential backoff
- Optimistic UI updates with conflict resolution

#### 2. useRealtimeCollaboration.ts (Hook)

```typescript
/**
 * Hook for managing real-time collaboration features
 * Handles WebSocket subscriptions, stroke broadcasting, and presence
 */
export function useRealtimeCollaboration(sessionId: string | null) {
  const store = useCollaborationStore();

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to Supabase Realtime channel
    const channel = supabase.channel(`collaboration:${sessionId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId },
      },
    });

    // Listen for stroke broadcasts
    channel.on('broadcast', { event: 'stroke' }, (payload) => {
      store.addLiveStroke(payload.stroke);
    });

    // Track presence (online/offline)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      store.updatePeerPresence(state);
    });

    // Subscribe to database changes for session updates
    channel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'collaboration_sessions',
      filter: `id=eq.${sessionId}`,
    }, (payload) => {
      store.updateSession(payload.new);
    });

    channel.subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId]);
}
```

#### 3. TeacherDashboardScreen.tsx (New Screen)

**Features:**
- Live student list with online status indicators
- Multi-student monitoring (grid view of active sessions)
- Canvas overlay with annotation tools
- Direct write-into-workspace capability
- Session controls (pause, end, request attention)

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│  Teacher Dashboard                           [Settings]│
├────────────┬───────────────────────────────────────────┤
│ Students   │ Active Session: Sarah M.                  │
│            │ Problem: 2x + 5 = 15                      │
│ ● Sarah M. │ ┌──────────────────────────────────────┐ │
│ ○ John D.  │ │                                      │ │
│ ● Emma L.  │ │     [Live Canvas View]               │ │
│            │ │     (student's strokes in blue)      │ │
│ [+ Invite] │ │     (teacher annotations in red)     │ │
│            │ │                                      │ │
│            │ └──────────────────────────────────────┘ │
│            │ [Annotation Tools] [Request Attention]   │
│            │ Steps: 3/5  Time: 4:32  Hints: 1        │
└────────────┴───────────────────────────────────────────┘
```

#### 4. InviteCodeSystem.ts (Utility)

**Teacher Flow:**
1. Teacher generates 6-character invite code
2. Code expires in 24 hours
3. Teacher shares code with student (email, QR code, verbal)

**Student Flow:**
1. Student enters code in Settings → Collaboration
2. Code validates, creates `teacher_student_links` record
3. Link appears in both teacher and student interfaces
4. Student can start collaborative sessions

**Code Format:** `ABC123` (uppercase alphanumeric, 6 chars)

#### 5. Real-time Optimizations

**Stroke Batching:**
- Batch strokes every 50ms for bandwidth efficiency
- Send delta-compressed point arrays
- Use binary format for lower latency (optional)

**Conflict Resolution:**
- Last-write-wins for stroke data
- Teacher annotations always rendered on top
- No stroke merging (independent layers)

**Performance Targets:**
- Stroke latency: <100ms peer-to-peer
- Connection time: <2 seconds
- Reconnection: <5 seconds with exponential backoff
- Bandwidth: <50KB/min per active session

### Files to Create

```
app/stores/collaborationStore.ts
app/hooks/useRealtimeCollaboration.ts
app/screens/TeacherDashboardScreen.tsx
app/screens/StudentCollaborationScreen.tsx (enhanced TrainingMode)
app/components/LiveCanvasView.tsx
app/components/PeerCursor.tsx
app/components/InviteCodeInput.tsx
app/components/ActiveStudentsList.tsx
app/utils/sync/realtimeClient.ts
app/utils/inviteCodeGenerator.ts
app/types/Collaboration.ts
```

### Integration Points

1. **SettingsScreen**: Add "Collaboration" section with invite code input
2. **HomeScreen**: Show active teacher sessions (if student)
3. **TrainingModeScreen**: Add collaboration mode toggle
4. **Navigation**: Add TeacherDashboard to stack

---

## PR14: Tutorial Mode

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Tutorial Mode                       │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Tutorial Library            User Progress            │
│  ┌──────────────────┐      ┌──────────────────┐     │
│  │ tutorial_lessons │      │ tutorial_progress│     │
│  │ - video_url      │──┬──►│ - status         │     │
│  │ - transcript     │  │   │ - progress_%     │     │
│  │ - prerequisites  │  │   │ - video_position │     │
│  └──────────────────┘  │   └──────────────────┘     │
│                        │                              │
│  ┌─────────────────────▼──────────────────────┐     │
│  │      TutorialScreen.tsx                    │     │
│  │  ┌──────────────────────────────────────┐  │     │
│  │  │  Video Player (react-native-video)   │  │     │
│  │  │  - Playback controls                 │  │     │
│  │  │  - Progress tracking                 │  │     │
│  │  │  - Transcript overlay (optional)     │  │     │
│  │  └──────────────────────────────────────┘  │     │
│  │  [Mark as Complete] [Practice Problems]   │     │
│  └────────────────────────────────────────────┘     │
│                        │                              │
│  ┌─────────────────────▼──────────────────────┐     │
│  │      HomeScreen - Skills Section          │     │
│  │  LINEAR_EQUATIONS (3/5 lessons complete)  │     │
│  │  ✓ Lesson 1: Introduction                │     │
│  │  ✓ Lesson 2: One-step equations          │     │
│  │  ✓ Lesson 3: Two-step equations          │     │
│  │  ○ Lesson 4: Variables on both sides     │     │
│  │  🔒 Lesson 5: Word problems (locked)      │     │
│  │  [Practice Problems]                      │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Key Components

#### 1. tutorialStore.ts (New Zustand Store)

```typescript
interface TutorialStoreState {
  // Lesson library
  lessons: TutorialLesson[];
  lessonsLoading: boolean;

  // User progress
  progress: Map<string, TutorialProgress>; // lessonId -> progress

  // Current lesson state
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
```

**Features:**
- Tracks completion status for all lessons
- Enforces prerequisite relationships
- Persists video position for resume-on-return
- Unlocks practice problems based on lesson completion

#### 2. TutorialScreen.tsx (New Screen)

**Features:**
- Video player with controls (play, pause, seek, speed)
- Optional transcript overlay with auto-scroll
- Progress bar with chapter markers
- "Mark as Complete" button (requires 80% watch time)
- Direct link to practice problems
- Lesson notes/summary section

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  ← Back    Lesson 3: Two-Step Equations            │
├────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐   │
│ │                                              │   │
│ │         [Video Player]                       │   │
│ │         Duration: 8:32 / 12:00               │   │
│ │                                              │   │
│ │         ◄◄  ▶️  ►►  [Speed: 1x]               │   │
│ └──────────────────────────────────────────────┘   │
│                                                    │
│ [Transcript] [Notes] [Practice]                   │
│ ┌──────────────────────────────────────────────┐  │
│ │ In this lesson, we'll learn how to solve     │  │
│ │ equations that require two operations...     │  │
│ │                                              │  │
│ │ Example: 2x + 5 = 15                         │  │
│ │ Step 1: Subtract 5 from both sides...       │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ Progress: 71% complete                            │
│ [Continue Watching]  [Mark as Complete]           │
└────────────────────────────────────────────────────┘
```

#### 3. TutorialLibraryScreen.tsx (New Screen)

**Features:**
- Browse lessons by skill category
- Filter by difficulty
- Search by keyword
- Visual progress indicators
- Lock icon for prerequisites not met

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Tutorial Library                       [Search 🔍]│
├────────────────────────────────────────────────────┤
│ [All] [Linear Equations] [Algebra] [Fractions]    │
│                                                    │
│ LINEAR EQUATIONS                    Progress: 60% │
│ ├─ ✓ Lesson 1: Introduction (Easy)        5 min  │
│ ├─ ✓ Lesson 2: One-step equations (Easy)  8 min  │
│ ├─ ✓ Lesson 3: Two-step equations (Med)  12 min  │
│ ├─ ○ Lesson 4: Variables both sides (Med) 15 min │
│ └─ 🔒 Lesson 5: Word problems (Hard)      18 min  │
│     (Complete Lesson 4 to unlock)                 │
│                                                    │
│ BASIC ALGEBRA                          Progress: 0%│
│ ├─ ○ Lesson 1: Distributive property     10 min  │
│ ├─ 🔒 Lesson 2: Combining like terms      12 min  │
│ └─ 🔒 Lesson 3: Factoring basics          15 min  │
└────────────────────────────────────────────────────┘
```

#### 4. Video Content Strategy

**Phase 1: YouTube Embeds**
- Use existing Khan Academy / Math Antics videos
- Store YouTube URLs in `tutorial_lessons.video_url`
- Use `react-native-youtube-iframe` for playback
- No hosting costs, immediate content availability

**Phase 2: Custom Content (Future)**
- Record Direct Instruction-style videos
- Host on Supabase Storage or Cloudflare Stream
- Branded content with consistent style
- Interactive elements (clickable examples)

**Phase 3: Interactive Lessons (Future)**
- Code-based interactive diagrams
- Step-through animations
- Embedded practice problems
- Gamification elements

#### 5. Progress Tracking

**Completion Criteria:**
- Watch time ≥80% of video duration
- Manual "Mark as Complete" button
- Optional quiz (future)

**Progress Persistence:**
- Save video position every 5 seconds
- Resume from last position on re-entry
- Track time spent per lesson
- Sync to Supabase via existing sync infrastructure

#### 6. Integration with Problem Data

**Unlocking Logic:**
```typescript
function getUnlockedProblems(category: ProblemCategory): Problem[] {
  const lessonsForCategory = lessons.filter(l => l.skill_category === category);
  const completedLessons = lessonsForCategory.filter(l =>
    progress.get(l.id)?.status === 'completed'
  );

  // Unlock problems based on lesson completion
  // Easy: Any lesson in category
  // Medium: ≥2 lessons complete
  // Hard: All lessons complete
  const easyProblems = completedLessons.length >= 1
    ? problemData.filter(p => p.category === category && p.difficulty === 'EASY')
    : [];

  const mediumProblems = completedLessons.length >= 2
    ? problemData.filter(p => p.category === category && p.difficulty === 'MEDIUM')
    : [];

  const hardProblems = completedLessons.length === lessonsForCategory.length
    ? problemData.filter(p => p.category === category && p.difficulty === 'HARD')
    : [];

  return [...easyProblems, ...mediumProblems, ...hardProblems];
}
```

### Files to Create

```
app/stores/tutorialStore.ts
app/screens/TutorialScreen.tsx
app/screens/TutorialLibraryScreen.tsx
app/components/VideoPlayer.tsx
app/components/LessonCard.tsx
app/components/ProgressIndicator.tsx
app/utils/sync/tutorialSyncClient.ts
app/types/Tutorial.ts
docs/TUTORIAL_CONTENT_GUIDE.md
scripts/seed-tutorial-lessons.sql
```

### Dependencies to Add

```json
{
  "react-native-youtube-iframe": "^2.3.0",
  "react-native-video": "^6.0.0"
}
```

---

## PR15: Assessment Mode

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Assessment Mode                     │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Student Workflow                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. Start Assessment (problem assigned)       │   │
│  │    - Timer starts                            │   │
│  │    - Validation disabled                     │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                   │
│  ┌────────────────▼─────────────────────────────┐   │
│  │ 2. Work on Canvas (step-by-step)            │   │
│  │    - Write solution line-by-line            │   │
│  │    - Steps stored locally (no validation)   │   │
│  │    - No hints available                     │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                   │
│  ┌────────────────▼─────────────────────────────┐   │
│  │ 3. Submit Solution                           │   │
│  │    - All steps uploaded to Supabase         │   │
│  │    - Batch validation via UpStudy API       │   │
│  │    - Score calculated (0-100)               │   │
│  └────────────────┬─────────────────────────────┘   │
│                   │                                   │
│  ┌────────────────▼─────────────────────────────┐   │
│  │ 4. Review Results                            │   │
│  │    - Score displayed                         │   │
│  │    - Step-by-step feedback shown            │   │
│  │    - Correct solution revealed              │   │
│  │    - Option to retry (new problem)          │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  Data Flow                                            │
│  assessmentStore → assessments table → validation    │
│                                                        │
└──────────────────────────────────────────────────────┘
```

### Key Differences from Training Mode

| Feature | Training Mode | Assessment Mode |
|---------|---------------|-----------------|
| Validation | After each step (real-time) | After submission (batch) |
| Hints | Available on errors | Disabled |
| Time limit | None | Optional (configurable) |
| Retries | Unlimited | Configurable (0-3) |
| Feedback | Immediate | Deferred until submit |
| Scoring | Not tracked | 0-100 score |
| Solution reveal | Via hints (progressive) | Full solution after submit |

### Key Components

#### 1. assessmentStore.ts (New Zustand Store)

```typescript
interface AssessmentStoreState {
  // Current assessment
  currentAssessment: Assessment | null;
  assessmentStatus: 'not_started' | 'in_progress' | 'submitted' | 'graded';

  // Steps (local until submission)
  steps: AssessmentStep[];

  // Timer
  startTime: number | null;
  timeElapsed: number; // seconds
  timerInterval: NodeJS.Timeout | null;

  // Submission
  isSubmitting: boolean;
  submissionError: string | null;

  // Results
  score: number | null;
  validationResults: ValidationResult[];

  // Actions
  startAssessment: (problemId: string) => void;
  addStep: (latex: string, strokes: Stroke[], lineNumber: number) => void;
  submitAssessment: () => Promise<void>;
  retryAssessment: () => void;

  // Timer actions
  startTimer: () => void;
  stopTimer: () => void;
  getElapsedTime: () => number;
}
```

**Features:**
- Stores steps locally until submission
- Tracks time spent
- Batch validates all steps on submit
- Calculates score based on correctness and usefulness
- Persists to Supabase after submission

#### 2. AssessmentScreen.tsx (New Screen)

**Features:**
- Reuses HandwritingCanvas component
- Shows problem at top (like TrainingMode)
- Timer in header (optional, configurable)
- "Submit" button instead of auto-validation
- No hint button
- Warning before submit (confirm dialog)

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Assessment Mode          Timer: 08:32  [Submit]   │
├────────────────────────────────────────────────────┤
│ Problem: Solve for x                               │
│ 3x + 7 = 2x + 15                                   │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │                                              │  │
│ │      [Handwriting Canvas]                    │  │
│ │      (student writes solution)               │  │
│ │                                              │  │
│ │      Line 1: 3x + 7 = 2x + 15                │  │
│ │      Line 2: x + 7 = 15                      │  │
│ │      Line 3: x = 8                           │  │
│ │                                              │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ [Undo] [Undo Line] [Clear] [Change Color]         │
│                                                    │
│ Steps: 3  No validation until you submit.         │
│ [Submit for Grading]                              │
└────────────────────────────────────────────────────┘
```

#### 3. AssessmentResultsScreen.tsx (New Screen)

**Features:**
- Shows final score (0-100)
- Step-by-step breakdown with feedback
- Correct solution displayed
- Time taken
- Option to retry with new problem
- Export results (PDF/image)

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Assessment Results                                │
├────────────────────────────────────────────────────┤
│                  Score: 67/100                     │
│              Time: 8:32                            │
│                                                    │
│ Step-by-Step Feedback:                            │
│ ✅ Step 1: 3x + 7 = 2x + 15  (Correct)             │
│    Starting equation                               │
│                                                    │
│ ✅ Step 2: x + 7 = 15  (Correct)                   │
│    Subtracted 2x from both sides                  │
│                                                    │
│ ❌ Step 3: x = 8  (Incorrect)                      │
│    Arithmetic error: should be x = 8              │
│    You wrote: x = 8                               │
│    Correct: x = 8                                 │
│                                                    │
│ Correct Solution:                                 │
│ 1. 3x + 7 = 2x + 15                               │
│ 2. x + 7 = 15     (subtract 2x)                   │
│ 3. x = 8          (subtract 7)                    │
│                                                    │
│ [Try Another Problem]  [Back to Home]             │
└────────────────────────────────────────────────────┘
```

#### 4. Validation Logic

**Batch Validation:**
```typescript
async function validateAssessment(steps: AssessmentStep[]): Promise<{
  validationResults: ValidationResult[];
  score: number;
}> {
  const validationResults: ValidationResult[] = [];

  // Validate each step
  for (const step of steps) {
    const result = await validateMathStep({
      problemId: currentProblem.id,
      stepLatex: step.latex,
      stepNumber: step.index,
      previousSteps: steps.slice(0, step.index).map(s => s.latex),
    });

    validationResults.push(result);
  }

  // Calculate score
  const correctSteps = validationResults.filter(r => r.isCorrect).length;
  const usefulSteps = validationResults.filter(r => r.isUseful).length;

  // Scoring formula:
  // - 70% for correctness
  // - 30% for usefulness
  const correctnessScore = (correctSteps / steps.length) * 70;
  const usefulnessScore = (usefulSteps / steps.length) * 30;
  const score = Math.round(correctnessScore + usefulnessScore);

  return { validationResults, score };
}
```

**Score Breakdown:**
- 100 points: All steps correct and useful
- 70 points: All steps correct but some not useful
- 50 points: 50% steps correct
- 0 points: No correct steps

#### 5. Teacher View (Future)

**AssessmentDashboard.tsx** (for teachers):
- View all student assessments
- Filter by date, score, problem
- Export grades (CSV)
- Assign assessments to students
- Set time limits and retry policies

### Files to Create

```
app/stores/assessmentStore.ts
app/screens/AssessmentScreen.tsx
app/screens/AssessmentResultsScreen.tsx
app/screens/AssessmentDashboard.tsx (teacher view, future)
app/components/AssessmentTimer.tsx
app/components/ScoreDisplay.tsx
app/components/StepFeedbackList.tsx
app/utils/sync/assessmentSyncClient.ts
app/utils/assessmentScoring.ts
app/types/Assessment.ts
```

---

## Integration with Existing System

### 1. Navigation Updates

**app/navigation/AppNavigator.tsx:**
```typescript
export type RootStackParamList = {
  Home: undefined;
  TrainingMode: { problemId?: string };
  Review: undefined;
  Settings: undefined;

  // PR13: Collaboration
  TeacherDashboard: undefined;
  StudentCollaboration: { sessionId: string };

  // PR14: Tutorial
  TutorialLibrary: undefined;
  Tutorial: { lessonId: string };

  // PR15: Assessment
  Assessment: { problemId: string; timeLimit?: number };
  AssessmentResults: { assessmentId: string };
};
```

### 2. HomeScreen Updates

**New sections:**
- "Learn" section (Tutorial Mode button)
- "Practice" section (existing Training Mode)
- "Test" section (Assessment Mode button)
- "Collaborate" section (if teacher connected)

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Home                                    [Settings]│
├────────────────────────────────────────────────────┤
│ LEARN                                              │
│ ┌────────────────────────────────────────────┐    │
│ │  📚 Tutorial Library                       │    │
│ │  Learn new skills with video lessons      │    │
│ │  Progress: 5/12 lessons complete          │    │
│ └────────────────────────────────────────────┘    │
│                                                    │
│ PRACTICE                                          │
│ ┌────────────────────────────────────────────┐    │
│ │  ✏️ Training Mode                           │    │
│ │  Solve problems with hints and feedback   │    │
│ │  Problems solved: 23                       │    │
│ └────────────────────────────────────────────┘    │
│                                                    │
│ TEST                                              │
│ ┌────────────────────────────────────────────┐    │
│ │  📝 Assessment Mode                        │    │
│ │  Test your skills without hints            │    │
│ │  Average score: 78%                        │    │
│ └────────────────────────────────────────────┘    │
│                                                    │
│ COLLABORATE (1 teacher connected)                 │
│ ┌────────────────────────────────────────────┐    │
│ │  👥 Work with Mrs. Johnson                 │    │
│ │  [Start Collaborative Session]             │    │
│ └────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

### 3. SettingsScreen Updates

**New sections:**
- **Collaboration** (invite code input, linked teachers list)
- **Tutorial Preferences** (video quality, autoplay, captions)
- **Assessment Settings** (time limit preference)

### 4. Sync Infrastructure Extensions

**app/utils/sync/syncClient.ts additions:**
```typescript
// Collaboration sync
export async function upsertCollaborationSession(session: CollaborationSession): Promise<void>;
export async function upsertLiveStroke(stroke: LiveStroke, sessionId: string): Promise<void>;

// Tutorial sync
export async function upsertTutorialProgress(progress: TutorialProgress): Promise<void>;

// Assessment sync
export async function upsertAssessment(assessment: Assessment): Promise<void>;
export async function upsertAssessmentStroke(stroke: AssessmentStroke, assessmentId: string): Promise<void>;
```

### 5. Store Integration

**progressStore.ts updates:**
- Track tutorial completion alongside problem completion
- Track assessment scores
- Calculate overall progress across all modes

**uiStore.ts updates:**
- Add modal types: `invite_code_modal`, `assessment_submit_confirm`
- Add loading states for real-time subscriptions

---

## Implementation Roadmap

### Phase 1: Database & Infrastructure (Week 1-2)

**PR13a: Database Schema & Sync Foundation**
- [ ] Create all new tables in t3-db (schema above)
- [ ] Test RLS policies
- [ ] Extend syncClient with new upsert methods
- [ ] Add Supabase Realtime dependency
- [ ] Create type definitions for new tables

**Files:**
- `docs/DB_SCHEMA_EXTENSIONS.sql` (new)
- `app/utils/sync/realtimeClient.ts` (new)
- `app/utils/sync/collaborationSync.ts` (new)
- `app/utils/sync/tutorialSync.ts` (new)
- `app/utils/sync/assessmentSync.ts` (new)
- `app/types/Collaboration.ts` (new)
- `app/types/Tutorial.ts` (new)
- `app/types/Assessment.ts` (new)

### Phase 2: Tutorial Mode (Week 3-4)

**PR14a: Tutorial Core Features**
- [ ] Create tutorialStore.ts
- [ ] Build TutorialScreen with video player
- [ ] Build TutorialLibraryScreen
- [ ] Implement progress tracking
- [ ] Add tutorial sync to progressStore
- [ ] Seed initial lesson data

**PR14b: Tutorial Integration**
- [ ] Add "Learn" section to HomeScreen
- [ ] Integrate tutorial completion with problem unlocking
- [ ] Add tutorial preferences to SettingsScreen
- [ ] Create tutorial content guide for future additions

**Files:**
- `app/stores/tutorialStore.ts`
- `app/screens/TutorialScreen.tsx`
- `app/screens/TutorialLibraryScreen.tsx`
- `app/components/VideoPlayer.tsx`
- `app/components/LessonCard.tsx`
- `docs/TUTORIAL_CONTENT_GUIDE.md`
- `scripts/seed-tutorial-lessons.sql`

### Phase 3: Assessment Mode (Week 5-6)

**PR15a: Assessment Core Features**
- [ ] Create assessmentStore.ts
- [ ] Build AssessmentScreen (reuse HandwritingCanvas)
- [ ] Build AssessmentResultsScreen
- [ ] Implement batch validation logic
- [ ] Implement scoring algorithm
- [ ] Add assessment sync

**PR15b: Assessment Integration**
- [ ] Add "Test" section to HomeScreen
- [ ] Create assessment history view in ReviewScreen
- [ ] Add assessment preferences to SettingsScreen
- [ ] Export results feature (PDF/image)

**Files:**
- `app/stores/assessmentStore.ts`
- `app/screens/AssessmentScreen.tsx`
- `app/screens/AssessmentResultsScreen.tsx`
- `app/components/AssessmentTimer.tsx`
- `app/components/ScoreDisplay.tsx`
- `app/utils/assessmentScoring.ts`

### Phase 4: Real-time Collaboration (Week 7-10)

**PR13b: Collaboration Foundation**
- [ ] Create collaborationStore.ts
- [ ] Implement invite code system
- [ ] Build teacher-student linking flow
- [ ] Add collaboration section to SettingsScreen

**PR13c: Real-time Features**
- [ ] Implement Supabase Realtime subscriptions
- [ ] Create useRealtimeCollaboration hook
- [ ] Build LiveCanvasView component
- [ ] Implement stroke broadcasting
- [ ] Add presence tracking (online/offline)

**PR13d: Teacher Dashboard**
- [ ] Build TeacherDashboardScreen
- [ ] Create ActiveStudentsList component
- [ ] Implement multi-student monitoring
- [ ] Add annotation tools
- [ ] Build session controls

**PR13e: Student Collaboration UI**
- [ ] Enhance TrainingModeScreen with collaboration mode
- [ ] Add teacher presence indicator
- [ ] Display live annotations
- [ ] Add collaboration notifications

**Files:**
- `app/stores/collaborationStore.ts`
- `app/hooks/useRealtimeCollaboration.ts`
- `app/screens/TeacherDashboardScreen.tsx`
- `app/screens/StudentCollaborationScreen.tsx`
- `app/components/LiveCanvasView.tsx`
- `app/components/PeerCursor.tsx`
- `app/components/InviteCodeInput.tsx`
- `app/utils/inviteCodeGenerator.ts`

### Phase 5: Testing & Polish (Week 11-12)

**PR16: Comprehensive Testing**
- [ ] Unit tests for new stores
- [ ] Integration tests for sync operations
- [ ] E2E tests for each mode
- [ ] Real-time collaboration stress testing
- [ ] Performance optimization

**PR17: Documentation**
- [ ] Update ARCHITECTURE.md
- [ ] Create COLLABORATION_GUIDE.md
- [ ] Create TUTORIAL_ADMIN_GUIDE.md
- [ ] Create ASSESSMENT_GUIDE.md
- [ ] Update main README

---

## Security & Privacy Considerations

### 1. Teacher-Student Data Access

**RLS Policies Enforce:**
- Teachers can ONLY see students who have accepted their invite
- Students can revoke teacher access at any time
- Teachers cannot access student data from other teachers
- All collaboration sessions are isolated by link_id

**Privacy Controls:**
- Students can see which teachers have access
- Students can pause/end collaboration sessions
- Student data is never shared without explicit consent
- Teachers cannot see historical data before link acceptance

### 2. Real-time Security

**WebSocket Authentication:**
- All Realtime channels require valid JWT token
- User ID verified against session participants
- Broadcast messages signed with user ID
- No cross-session data leakage

**Data Validation:**
- All stroke data validated on server
- Rate limiting on broadcast messages (max 100/sec)
- Session timeouts after 1 hour of inactivity
- Automatic cleanup of ephemeral live_strokes table

### 3. Assessment Integrity

**Anti-Cheating Measures:**
- No hints available during assessments
- No external validation until submission
- Timer cannot be paused (optional enforcement)
- Screenshots disabled during assessment (future)
- Detection of copy-paste (future)

**Data Integrity:**
- Steps cannot be modified after submission
- Timestamp verification for submission time
- Stroke data hashed for tamper detection (future)

### 4. Tutorial Content Protection

**Access Control:**
- Video URLs obfuscated (not direct YouTube links)
- Rate limiting on video requests
- User authentication required for all content
- Progress tracking prevents skipping

---

## Performance Considerations

### 1. Real-time Collaboration

**Bandwidth Optimization:**
- Stroke batching (50ms intervals)
- Delta compression for point arrays
- Binary serialization for WebSocket messages
- Automatic quality degradation on poor connections

**Expected Bandwidth:**
- Active writing: ~20KB/sec
- Idle: <1KB/sec
- Peak (both writing): ~40KB/sec
- Target: <50KB/min average per session

### 2. Tutorial Video Streaming

**Performance:**
- Use adaptive bitrate streaming (HLS/DASH future)
- Prefetch next lesson on 80% completion
- Cache video positions locally
- Lazy load transcript data

**Bandwidth:**
- 480p: ~500KB/min
- 720p: ~1MB/min
- 1080p: ~2MB/min (optional, WiFi only)

### 3. Assessment Batch Validation

**Optimization:**
- Parallel validation requests (max 5 concurrent)
- Cache validation results in MMKV
- Retry failed validations with backoff
- Show progress indicator during validation

**Expected Time:**
- 1-3 steps: <2 seconds
- 4-6 steps: <5 seconds
- 7-10 steps: <10 seconds
- 10+ steps: <15 seconds

---

## Open Questions & Decisions Needed

### 1. Teacher-Student Pairing

**Options:**
A. **Invite Code System** (Recommended)
   - Pro: Simple, works for any teacher
   - Pro: No pre-configuration needed
   - Con: Manual process for teachers

B. **Email-based Linking**
   - Pro: More professional
   - Pro: Built-in verification
   - Con: Requires email infrastructure

C. **Admin Dashboard**
   - Pro: School-wide management
   - Pro: Bulk assignment
   - Con: Requires separate admin role

**Recommendation:** Start with **Option A (Invite Code)** for MVP, add Option B for Phase 2.

### 2. Tutorial Content Hosting

**Options:**
A. **YouTube Embeds** (Recommended for MVP)
   - Pro: Free, no hosting costs
   - Pro: Immediate content availability
   - Pro: Use existing Khan Academy videos
   - Con: Requires internet, no offline mode
   - Con: Not branded

B. **Supabase Storage**
   - Pro: Full control, branded content
   - Pro: Can enable offline mode
   - Con: Storage costs (~$0.02/GB/month)
   - Con: Bandwidth costs (~$0.09/GB)

C. **Cloudflare Stream**
   - Pro: Optimized for video
   - Pro: Adaptive bitrate
   - Con: $1/month + $1 per 1000 minutes delivered

**Recommendation:** Start with **Option A (YouTube)**, migrate to Option C for Phase 2 with custom content.

### 3. Assessment Hints Policy

**Options:**
A. **No Hints** (Recommended)
   - Pro: True assessment of understanding
   - Pro: Prevents gaming the system
   - Con: Students may get stuck

B. **Limited Hints** (1-2 max)
   - Pro: Reduces frustration
   - Pro: Partial credit for hint usage
   - Con: Complex scoring algorithm

C. **Hints After Submission**
   - Pro: Learning opportunity after assessment
   - Pro: Review incorrect steps
   - Con: Not during assessment

**Recommendation:** **Option A (No Hints)** during assessment, **Option C** for review phase.

### 4. Collaboration Stroke Persistence

**Options:**
A. **Ephemeral** (Recommended)
   - Pro: Lower storage costs
   - Pro: Faster real-time performance
   - Con: Annotations not saved after session

B. **Persistent Annotations**
   - Pro: Teacher notes saved
   - Pro: Review later
   - Con: Higher storage costs
   - Con: Compression overhead

**Recommendation:** **Option A (Ephemeral)** for MVP, add "Save Annotation" button for persistent notes in Phase 2.

---

## Success Metrics

### PR13: Collaboration

- [ ] Connection latency <100ms
- [ ] Stroke broadcast latency <100ms peer-to-peer
- [ ] Reconnection time <5 seconds
- [ ] Zero cross-session data leakage
- [ ] Teacher can monitor ≥5 students simultaneously

### PR14: Tutorial Mode

- [ ] Video loads in <3 seconds
- [ ] Progress saved every 5 seconds
- [ ] Lesson completion tracked accurately
- [ ] Problem unlocking works correctly
- [ ] Tutorial sync completes in <1 second

### PR15: Assessment Mode

- [ ] Batch validation completes in <10 seconds (10 steps)
- [ ] Score calculation accurate (±2 points)
- [ ] Zero hint leakage during assessment
- [ ] Results screen renders in <1 second
- [ ] Assessment sync reliable (99%+ success rate)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding three major features to the Handwriting Math app:

1. **Real-time Collaboration** enables teachers to guide students live
2. **Tutorial Mode** provides Direct Instruction-based learning
3. **Assessment Mode** offers formal testing capabilities

All features leverage the existing local-first architecture, Supabase infrastructure, and proven sync patterns from PR12. The phased approach (Tutorial → Assessment → Collaboration) allows for iterative development and testing.

**Estimated Timeline:** 12 weeks
**Estimated LOC:** ~8,000 lines (stores, screens, components, sync)
**Database Tables:** +7 tables in t3-db project
**Dependencies:** +2 (react-native-video, react-native-youtube-iframe)

Next steps: Begin with Phase 1 (Database & Infrastructure) and proceed sequentially through the roadmap.
