# PR13-16 Architecture Diagrams
# Visual System Architecture for Collaboration, Tutorial, and Assessment

**Created**: 2025-11-08
**Purpose**: Visual reference for system architecture and data flow

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Handwriting Math App                         │
│                  Complete Learning Platform                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   TUTORIAL   │  │   TRAINING   │  │  ASSESSMENT  │          │
│  │     MODE     │  │     MODE     │  │     MODE     │          │
│  │              │  │              │  │              │          │
│  │   Teach      │→ │   Practice   │→ │     Test     │          │
│  │   (Learn)    │  │   (Apply)    │  │   (Evaluate) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                 ↓                  ↓                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           COLLABORATION (Live Tutoring)              │       │
│  │  Teacher can join any mode to provide live support  │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         LOCAL-FIRST ARCHITECTURE (PR12)              │       │
│  │  Zustand Stores → MMKV → Supabase Cloud (t3-db)     │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Learning Journey

```
Student Journey
════════════════════════════════════════════════════════════════

1. LEARN (Tutorial Mode)
   ┌─────────────────────┐
   │  Watch video lesson │
   │  "Solving 2x+5=15"  │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │  Progress tracked   │
   │  Lesson completed   │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Problems unlocked   │
   │ (by difficulty)     │
   └──────────┬──────────┘

2. PRACTICE (Training Mode - Existing)
              │
              ▼
   ┌─────────────────────┐
   │ Solve problems with │
   │ step-by-step hints  │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Real-time validation│
   │ Progressive hints   │
   └──────────┬──────────┘

3. TEST (Assessment Mode)
              │
              ▼
   ┌─────────────────────┐
   │  Formal assessment  │
   │  No hints, timed    │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │ Submit for grading  │
   │ Batch validation    │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────┐
   │  Review results     │
   │  Score + feedback   │
   └─────────────────────┘

4. COLLABORATE (Teacher Support - Available Anytime)

   Student                    Teacher
   ┌──────────┐              ┌──────────┐
   │ Struggling│◄──Live──────►│ Monitors │
   │ with step │   Video      │ Progress │
   └─────┬─────┘              └────┬─────┘
         │                         │
         │  Teacher writes         │
         │  annotation on          │
         │  student's canvas       │
         │◄────────────────────────┘
         │
         ▼
   ┌──────────┐
   │ Student  │
   │ sees help│
   └──────────┘
```

---

## PR13: Real-time Collaboration Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                  REAL-TIME COLLABORATION SYSTEM                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STUDENT DEVICE                        TEACHER DEVICE              │
│  ┌─────────────────────┐              ┌─────────────────────┐     │
│  │ TrainingModeScreen  │              │ TeacherDashboard    │     │
│  │ (collaboration=on)  │              │                     │     │
│  └──────────┬──────────┘              └──────────┬──────────┘     │
│             │                                    │                 │
│  ┌──────────▼──────────┐              ┌─────────▼──────────┐     │
│  │ HandwritingCanvas   │              │ LiveCanvasView     │     │
│  │ - Student strokes   │              │ - Student strokes  │     │
│  │ - Teacher overlays  │              │ - Teacher overlays │     │
│  └──────────┬──────────┘              └──────────┬─────────┘     │
│             │                                    │                 │
│  ┌──────────▼──────────┐              ┌─────────▼──────────┐     │
│  │ collaborationStore  │              │ collaborationStore │     │
│  │ - activeSession     │              │ - activeStudents   │     │
│  │ - liveStrokes       │              │ - liveStrokes      │     │
│  │ - peerCursor        │              │ - cursors          │     │
│  └──────────┬──────────┘              └──────────┬─────────┘     │
│             │                                    │                 │
│             └──────────┬───────────────┬─────────┘                │
│                        │               │                           │
│              ┌─────────▼───────────────▼─────────┐                │
│              │  Supabase Realtime Channel        │                │
│              │  Name: "collaboration:session-id" │                │
│              ├───────────────────────────────────┤                │
│              │ • Broadcast (strokes)    <100ms   │                │
│              │ • Presence (online/offline)       │                │
│              │ • Postgres Changes (session data) │                │
│              └─────────────┬─────────────────────┘                │
│                            │                                       │
│              ┌─────────────▼─────────────────────┐                │
│              │  Database (t3-db)                 │                │
│              ├───────────────────────────────────┤                │
│              │ • teacher_student_links (invite)  │                │
│              │ • collaboration_sessions (active) │                │
│              │ • live_strokes (ephemeral)        │                │
│              └───────────────────────────────────┘                │
│                                                                     │
└───────────────────────────────────────────────────────────────────┘

STROKE BROADCAST FLOW:
1. Student writes stroke → collaborationStore.broadcastStroke()
2. Stroke serialized → channel.send('broadcast', {stroke})
3. WebSocket → Supabase Realtime → Teacher device
4. Teacher's collaborationStore updates → LiveCanvasView re-renders
5. Stroke appears on teacher's screen (<100ms latency)

PRESENCE TRACKING:
- Both devices send heartbeat every 5 seconds
- channel.track({user_id, cursor_position, last_seen})
- Offline detection: >10 seconds without heartbeat
```

---

## PR14: Tutorial Mode Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      TUTORIAL MODE SYSTEM                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STUDENT WORKFLOW                                                  │
│  ┌─────────────────────┐                                          │
│  │ HomeScreen          │                                          │
│  │ Click "Learn"       │                                          │
│  └──────────┬──────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────┐                                          │
│  │ TutorialLibrary     │                                          │
│  │ Browse by category  │◄────────┐                                │
│  └──────────┬──────────┘         │                                │
│             │                     │                                │
│             ▼                     │                                │
│  ┌─────────────────────┐         │                                │
│  │ Select Lesson       │         │                                │
│  │ "Two-step equations"│         │                                │
│  └──────────┬──────────┘         │                                │
│             │                     │                                │
│             ▼                     │                                │
│  ┌─────────────────────┐         │                                │
│  │ TutorialScreen      │         │                                │
│  │ - Video player      │         │                                │
│  │ - Transcript        │         │                                │
│  │ - Progress tracker  │         │                                │
│  └──────────┬──────────┘         │                                │
│             │                     │                                │
│             ▼                     │                                │
│  ┌─────────────────────┐         │                                │
│  │ Watch video         │         │                                │
│  │ (resume at 3:42)    │         │                                │
│  └──────────┬──────────┘         │                                │
│             │                     │                                │
│             ▼                     │                                │
│  ┌─────────────────────┐         │                                │
│  │ Progress tracked    │         │                                │
│  │ Every 5 seconds     │─────────┤                                │
│  └──────────┬──────────┘         │                                │
│             │                     │                                │
│             ▼                     │                                │
│  ┌─────────────────────┐         │                                │
│  │ Complete lesson     │         │                                │
│  │ (80% watch time)    │         │                                │
│  └──────────┬──────────┘         │                                │
│             │                     │                                │
│             ▼                     │                                │
│  ┌─────────────────────┐         │                                │
│  │ Unlock problems     │         │                                │
│  │ Click "Practice"    │─────────┘                                │
│  └─────────────────────┘                                          │
│                                                                     │
│  DATA STORES                                                       │
│  ┌────────────────────────────────────────────────────┐           │
│  │ tutorialStore                                       │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ State:                                              │           │
│  │ - lessons: TutorialLesson[]                        │           │
│  │ - progress: Map<lessonId, TutorialProgress>        │           │
│  │ - currentLesson: TutorialLesson | null             │           │
│  │ - videoPosition: number                            │           │
│  │                                                     │           │
│  │ Actions:                                            │           │
│  │ - fetchLessons()                                   │           │
│  │ - startLesson(id)                                  │           │
│  │ - updateVideoPosition(seconds)                     │           │
│  │ - completeLesson(id)                               │           │
│  │ - isLessonUnlocked(id) → boolean                   │           │
│  │ - getUnlockedProblems(category) → Problem[]        │           │
│  └────────────────────────────────────────────────────┘           │
│                          │                                         │
│                          ▼                                         │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Database Sync (via tutorialSyncClient.ts)          │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ - upsertTutorialProgress(progress)                 │           │
│  │ - Saves every 5 seconds during playback            │           │
│  │ - Write-through to Supabase                        │           │
│  │ - Retry queue for offline support                  │           │
│  └────────────────────────────────────────────────────┘           │
│                          │                                         │
│                          ▼                                         │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Supabase Tables (t3-db)                            │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ tutorial_lessons                                   │           │
│  │ - id, slug, title, video_url, prerequisites        │           │
│  │                                                     │           │
│  │ tutorial_progress                                  │           │
│  │ - user_id, lesson_id, status, progress_percent    │           │
│  │ - video_position_seconds, completed_at             │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  PROBLEM UNLOCKING LOGIC                                           │
│  ┌────────────────────────────────────────────────────┐           │
│  │ function getUnlockedProblems(category) {           │           │
│  │   const lessonsForCategory = lessons.filter(...)   │           │
│  │   const completedCount = countCompleted()          │           │
│  │                                                     │           │
│  │   // Easy: 1+ lessons complete                     │           │
│  │   // Medium: 2+ lessons complete                   │           │
│  │   // Hard: All lessons complete                    │           │
│  │                                                     │           │
│  │   return filterProblemsByDifficulty(...)           │           │
│  │ }                                                   │           │
│  └────────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

## PR15: Assessment Mode Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                     ASSESSMENT MODE SYSTEM                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ASSESSMENT WORKFLOW                                               │
│                                                                     │
│  START                                                             │
│  ┌─────────────────────┐                                          │
│  │ HomeScreen          │                                          │
│  │ Click "Test"        │                                          │
│  └──────────┬──────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────┐                                          │
│  │ AssessmentScreen    │                                          │
│  │ Problem: 3x+7=2x+15 │                                          │
│  │ Timer: 00:00        │                                          │
│  └──────────┬──────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────┐                                          │
│  │ Student writes      │                                          │
│  │ solution line by    │                                          │
│  │ line on canvas      │                                          │
│  └──────────┬──────────┘                                          │
│             │                                                       │
│  ┌──────────▼──────────┐                                          │
│  │ assessmentStore     │                                          │
│  │ - steps: [...]      │                                          │
│  │ - NO validation     │◄─── NO HINTS                             │
│  │ - Timer running     │     NO FEEDBACK                          │
│  └──────────┬──────────┘     (Until submission)                   │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────┐                                          │
│  │ Click Submit        │                                          │
│  │ Confirm dialog      │                                          │
│  └──────────┬──────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────────────────────────────┐                  │
│  │ BATCH VALIDATION (Parallel API Calls)       │                  │
│  ├─────────────────────────────────────────────┤                  │
│  │ Step 1: 3x + 7 = 2x + 15 ──┐                │                  │
│  │ Step 2: x + 7 = 15 ─────────┼─► UpStudy API │                  │
│  │ Step 3: x = 8 ───────────────┘   (5 parallel)│                  │
│  │                                              │                  │
│  │ Returns: ValidationResult[] (2-10 seconds)  │                  │
│  └──────────┬──────────────────────────────────┘                  │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────────────────────────────┐                  │
│  │ SCORING ALGORITHM                            │                  │
│  ├─────────────────────────────────────────────┤                  │
│  │ correctSteps = 2/3 = 66.67%                 │                  │
│  │ usefulSteps = 2/3 = 66.67%                  │                  │
│  │                                              │                  │
│  │ score = (correctSteps * 0.7) +              │                  │
│  │         (usefulSteps * 0.3)                 │                  │
│  │       = (66.67 * 0.7) + (66.67 * 0.3)       │                  │
│  │       = 46.67 + 20.00                       │                  │
│  │       = 67/100                              │                  │
│  └──────────┬──────────────────────────────────┘                  │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────────────────────────────┐                  │
│  │ Sync to Supabase                             │                  │
│  │ - assessment record (score, steps, results) │                  │
│  │ - compressed strokes for each step          │                  │
│  └──────────┬──────────────────────────────────┘                  │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────┐                                          │
│  │ AssessmentResults   │                                          │
│  │ Screen              │                                          │
│  └──────────┬──────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌─────────────────────────────────────────────┐                  │
│  │ RESULTS DISPLAY                              │                  │
│  ├─────────────────────────────────────────────┤                  │
│  │ Score: 67/100                               │                  │
│  │ Time: 8:32                                  │                  │
│  │                                              │                  │
│  │ ✅ Step 1: Correct (starting equation)      │                  │
│  │ ✅ Step 2: Correct (subtracted 2x)          │                  │
│  │ ❌ Step 3: Incorrect                        │                  │
│  │    You wrote: x = 8                         │                  │
│  │    Correct: x = 8                           │                  │
│  │    Error: Arithmetic mistake                │                  │
│  │                                              │                  │
│  │ [Try Another Problem]                       │                  │
│  └─────────────────────────────────────────────┘                  │
│                                                                     │
│  KEY DIFFERENCES vs TRAINING MODE                                  │
│  ┌─────────────────────────────────────────────┐                  │
│  │ Training Mode      │ Assessment Mode        │                  │
│  ├────────────────────┼────────────────────────┤                  │
│  │ ✓ Hints available  │ ✗ No hints            │                  │
│  │ ✓ Step validation  │ ✗ Deferred validation │                  │
│  │ ✗ No time limit    │ ✓ Optional timer      │                  │
│  │ ✗ No scoring       │ ✓ Score 0-100         │                  │
│  │ ✓ Immediate help   │ ✗ Submit first        │                  │
│  └────────────────────┴────────────────────────┘                  │
└───────────────────────────────────────────────────────────────────┘
```

---

## Database Entity Relationships

```
┌───────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA (t3-db)                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  EXISTING TABLES (PR12)                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │  sessions    │    │  attempts    │    │    steps     │        │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤        │
│  │ id (PK)      │    │ id (PK)      │    │ id (PK)      │        │
│  │ user_id (FK) │    │ session_id   │───►│ attempt_id   │        │
│  │ started_at   │    │ problem_id   │    │ step_number  │        │
│  │ device_info  │    │ completed    │    │ latex        │        │
│  └──────┬───────┘    │ solved       │    │ is_correct   │        │
│         │            └──────┬───────┘    │ is_useful    │        │
│         │                   │            └──────┬───────┘        │
│         │                   │                   │                 │
│         │                   │            ┌──────▼───────┐        │
│         │                   │            │   strokes    │        │
│         │                   │            ├──────────────┤        │
│         │                   │            │ id (PK)      │        │
│         │                   │            │ step_id (FK) │        │
│         │                   │            │ data (gzip)  │        │
│         │                   │            │ bytes_compr  │        │
│         │                   │            └──────────────┘        │
│         │                   │                                     │
│         │                   │            ┌──────────────┐        │
│         │                   └───────────►│    hints     │        │
│         │                                ├──────────────┤        │
│         │                                │ id (PK)      │        │
│         │                                │ attempt_id   │        │
│         │                                │ level        │        │
│         │                                │ error_type   │        │
│         │                                └──────────────┘        │
│         │                                                         │
│  NEW TABLES (PR13-16)                                             │
│         │                                                         │
│         │   ┌────────────────────────┐                           │
│         │   │ teacher_student_links  │                           │
│         │   ├────────────────────────┤                           │
│         │   │ id (PK)                │                           │
│         │   │ teacher_id (FK auth)   │                           │
│         │   │ student_id (FK auth)   │                           │
│         │   │ invite_code (UNIQUE)   │                           │
│         │   │ status (pending/active)│                           │
│         │   │ permissions (JSONB)    │                           │
│         │   └───────┬────────────────┘                           │
│         │           │                                             │
│         │           │    ┌────────────────────────┐              │
│         │           └───►│ collaboration_sessions │              │
│         │                ├────────────────────────┤              │
│         │                │ id (PK)                │              │
│         │                │ student_id (FK)        │              │
│         │                │ teacher_id (FK)        │              │
│         │                │ link_id (FK)           │              │
│         └───────────────►│ attempt_id (FK)        │              │
│                          │ status (active/ended)  │              │
│                          │ student_last_seen      │              │
│                          │ teacher_last_seen      │              │
│                          └───────┬────────────────┘              │
│                                  │                                │
│                          ┌───────▼────────────┐                  │
│                          │   live_strokes     │                  │
│                          ├────────────────────┤                  │
│                          │ id (PK)            │                  │
│                          │ session_id (FK)    │                  │
│                          │ author_id (FK)     │                  │
│                          │ stroke_data (JSON) │                  │
│                          │ is_annotation      │                  │
│                          │ created_at         │                  │
│                          └────────────────────┘                  │
│                                                                   │
│  ┌────────────────────┐                                          │
│  │ tutorial_lessons   │                                          │
│  ├────────────────────┤                                          │
│  │ id (PK)            │                                          │
│  │ slug (UNIQUE)      │                                          │
│  │ title              │                                          │
│  │ skill_category     │                                          │
│  │ difficulty         │                                          │
│  │ video_url          │                                          │
│  │ prerequisites[]    │                                          │
│  └───────┬────────────┘                                          │
│          │                                                        │
│          │    ┌────────────────────┐                             │
│          └───►│ tutorial_progress  │                             │
│               ├────────────────────┤                             │
│               │ id (PK)            │                             │
│               │ user_id (FK)       │                             │
│               │ lesson_id (FK)     │                             │
│               │ status             │                             │
│               │ progress_percent   │                             │
│               │ video_position_sec │                             │
│               │ completed_at       │                             │
│               └────────────────────┘                             │
│                                                                   │
│  ┌────────────────────┐                                          │
│  │   assessments      │                                          │
│  ├────────────────────┤                                          │
│  │ id (PK)            │                                          │
│  │ user_id (FK)       │                                          │
│  │ problem_id         │                                          │
│  │ started_at         │                                          │
│  │ submitted_at       │                                          │
│  │ status             │                                          │
│  │ steps (JSONB)      │                                          │
│  │ validation_results │                                          │
│  │ score (0-100)      │                                          │
│  └───────┬────────────┘                                          │
│          │                                                        │
│          │    ┌────────────────────┐                             │
│          └───►│ assessment_strokes │                             │
│               ├────────────────────┤                             │
│               │ id (PK)            │                             │
│               │ assessment_id (FK) │                             │
│               │ step_index         │                             │
│               │ data (gzip)        │                             │
│               │ bytes_compressed   │                             │
│               └────────────────────┘                             │
│                                                                   │
│  RLS POLICY ENFORCEMENT                                           │
│  ┌────────────────────────────────────────────────┐              │
│  │ All tables: auth.uid() = user_id               │              │
│  │                                                 │              │
│  │ Exceptions (Collaboration):                    │              │
│  │ - Teachers can see linked student data         │              │
│  │ - Students can see teacher annotations         │              │
│  │ - Both can update collaboration_sessions       │              │
│  │                                                 │              │
│  │ Public (Tutorial):                             │              │
│  │ - All users can read published lessons         │              │
│  └────────────────────────────────────────────────┘              │
└───────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App.tsx
├── NavigationContainer
    └── AppNavigator (Stack)
        │
        ├── HomeScreen
        │   ├── Learn Section → TutorialLibraryScreen
        │   ├── Practice Section → TrainingModeScreen (existing)
        │   ├── Test Section → AssessmentScreen
        │   └── Collaborate Section → StudentCollaborationScreen
        │
        ├── TutorialLibraryScreen (NEW)
        │   ├── LessonCard[]
        │   ├── ProgressIndicator
        │   └── SearchBar
        │
        ├── TutorialScreen (NEW)
        │   ├── VideoPlayer (react-native-youtube-iframe)
        │   ├── Transcript
        │   ├── ProgressBar
        │   └── CompleteButton
        │
        ├── TrainingModeScreen (EXISTING - Enhanced)
        │   ├── ProblemDisplay
        │   ├── HandwritingCanvas
        │   │   └── useRealtimeCollaboration (if collaboration=on)
        │   ├── ValidationFeedback
        │   ├── HintReveal
        │   ├── FloatingToolbar
        │   └── LiveAnnotations (if collaboration=on)
        │
        ├── AssessmentScreen (NEW)
        │   ├── ProblemDisplay
        │   ├── HandwritingCanvas (reused)
        │   ├── AssessmentTimer
        │   ├── StepList (no validation shown)
        │   ├── FloatingToolbar
        │   └── SubmitButton
        │
        ├── AssessmentResultsScreen (NEW)
        │   ├── ScoreDisplay
        │   ├── StepFeedbackList
        │   │   └── StepFeedbackItem[]
        │   ├── CorrectSolutionView
        │   └── RetryButton
        │
        ├── TeacherDashboardScreen (NEW)
        │   ├── ActiveStudentsList
        │   │   └── StudentCard[]
        │   ├── LiveCanvasView
        │   │   ├── HandwritingCanvas (read-only)
        │   │   ├── AnnotationTools
        │   │   └── PeerCursor
        │   ├── SessionControls
        │   └── ProgressSummary
        │
        ├── ReviewScreen (EXISTING - Enhanced)
        │   ├── AttemptHistory (existing)
        │   ├── TutorialProgress (new)
        │   └── AssessmentHistory (new)
        │
        └── SettingsScreen (EXISTING - Enhanced)
            ├── Account Section (existing)
            ├── Cloud Sync Section (existing)
            ├── Collaboration Section (NEW)
            │   ├── InviteCodeInput
            │   └── LinkedTeachersList
            ├── Tutorial Preferences (NEW)
            │   └── VideoQualitySelector
            └── Assessment Preferences (NEW)
                └── TimeLimitToggle
```

---

## State Management Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                   ZUSTAND STORE ARCHITECTURE                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  EXISTING STORES (PR1-12)                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │ canvasStore    │  │ validationStore│  │  hintStore     │      │
│  ├────────────────┤  ├────────────────┤  ├────────────────┤      │
│  │ - strokes      │  │ - status       │  │ - currentHint  │      │
│  │ - currentStroke│  │ - current      │  │ - history      │      │
│  │ - selectedColor│  │ - history      │  │ - level        │      │
│  │ - selectedTool │  │ - error        │  │ - escalation   │      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐                           │
│  │ progressStore  │  │   uiStore      │                           │
│  ├────────────────┤  ├────────────────┤                           │
│  │ - attempts     │  │ - loading      │                           │
│  │ - currentAttempt│ │ - modals       │                           │
│  │ - completed    │  │ - notifications│                           │
│  │ - accuracy     │  │ - toolbar      │                           │
│  └────────────────┘  └────────────────┘                           │
│                                                                     │
│  NEW STORES (PR13-16)                                              │
│  ┌────────────────────────────────────────────────────┐           │
│  │ collaborationStore (PR13)                          │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ State:                                              │           │
│  │ - activeSession: CollaborationSession | null       │           │
│  │ - sessionStatus: 'disconnected' | 'connected'      │           │
│  │ - liveStrokes: LiveStroke[]                        │           │
│  │ - peerCursors: Map<string, CursorPosition>         │           │
│  │ - isTeacherConnected: boolean                      │           │
│  │ - realtimeChannel: RealtimeChannel | null          │           │
│  │                                                     │           │
│  │ Actions:                                            │           │
│  │ - startSession(teacherId)                          │           │
│  │ - endSession()                                     │           │
│  │ - broadcastStroke(stroke)                          │           │
│  │ - updateCursorPosition(x, y)                       │           │
│  │ - subscribeToSession(sessionId)                    │           │
│  │ - unsubscribeFromSession()                         │           │
│  │                                                     │           │
│  │ Persistence: None (ephemeral, real-time only)      │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  ┌────────────────────────────────────────────────────┐           │
│  │ tutorialStore (PR14)                               │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ State:                                              │           │
│  │ - lessons: TutorialLesson[]                        │           │
│  │ - progress: Map<lessonId, TutorialProgress>        │           │
│  │ - currentLesson: TutorialLesson | null             │           │
│  │ - videoPosition: number                            │           │
│  │ - isPlaying: boolean                               │           │
│  │ - playbackRate: number                             │           │
│  │                                                     │           │
│  │ Actions:                                            │           │
│  │ - fetchLessons()                                   │           │
│  │ - fetchProgress()                                  │           │
│  │ - startLesson(lessonId)                            │           │
│  │ - updateVideoPosition(seconds) → sync every 5s     │           │
│  │ - completeLesson(lessonId)                         │           │
│  │ - isLessonUnlocked(lessonId)                       │           │
│  │ - getUnlockedProblems(category)                    │           │
│  │                                                     │           │
│  │ Persistence: MMKV (video position, completed list) │           │
│  │ Sync: Supabase (tutorial_progress table)           │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  ┌────────────────────────────────────────────────────┐           │
│  │ assessmentStore (PR15)                             │           │
│  ├────────────────────────────────────────────────────┤           │
│  │ State:                                              │           │
│  │ - currentAssessment: Assessment | null             │           │
│  │ - assessmentStatus: 'not_started' | 'submitted'    │           │
│  │ - steps: AssessmentStep[]                          │           │
│  │ - startTime: number                                │           │
│  │ - timeElapsed: number                              │           │
│  │ - timerInterval: NodeJS.Timeout | null             │           │
│  │ - isSubmitting: boolean                            │           │
│  │ - score: number | null                             │           │
│  │ - validationResults: ValidationResult[]            │           │
│  │                                                     │           │
│  │ Actions:                                            │           │
│  │ - startAssessment(problemId)                       │           │
│  │ - addStep(latex, strokes, lineNumber)              │           │
│  │ - submitAssessment() → batch validation            │           │
│  │ - retryAssessment()                                │           │
│  │ - startTimer()                                     │           │
│  │ - stopTimer()                                      │           │
│  │                                                     │           │
│  │ Persistence: MMKV (in-progress steps)              │           │
│  │ Sync: Supabase (after submission only)             │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  STORE DEPENDENCIES                                                │
│  ┌────────────────────────────────────────────────────┐           │
│  │ assessmentStore → validationStore (for validation) │           │
│  │ tutorialStore → progressStore (for problem unlock) │           │
│  │ collaborationStore → canvasStore (for strokes)     │           │
│  │ All stores → uiStore (for loading/modals)          │           │
│  └────────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

## Performance & Scalability

```
┌───────────────────────────────────────────────────────────────────┐
│                  PERFORMANCE CONSIDERATIONS                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  REAL-TIME COLLABORATION LIMITS                                    │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Concurrent Sessions per Teacher:       5-10        │           │
│  │ Stroke Broadcast Latency:              <100ms      │           │
│  │ WebSocket Reconnection:                <5 seconds  │           │
│  │ Bandwidth per Active Session:          <50KB/min   │           │
│  │ Live Stroke Retention:                 1 hour      │           │
│  │ Heartbeat Interval:                    5 seconds   │           │
│  │ Offline Detection Timeout:             10 seconds  │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  TUTORIAL MODE OPTIMIZATION                                        │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Video Load Time:                       <3 seconds  │           │
│  │ Progress Save Interval:                5 seconds   │           │
│  │ Lesson Completion Criteria:            80% watch   │           │
│  │ Prefetch Next Lesson:                  At 80%      │           │
│  │ Transcript Lazy Load:                  On demand   │           │
│  │ Video Quality Options:                 480p, 720p  │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  ASSESSMENT MODE PERFORMANCE                                       │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Batch Validation (10 steps):           <10 seconds │           │
│  │ Parallel API Requests:                 5 max       │           │
│  │ Validation Cache TTL:                  24 hours    │           │
│  │ Score Calculation:                     <100ms      │           │
│  │ Results Screen Render:                 <1 second   │           │
│  │ Assessment Sync Retry:                 3 attempts  │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  DATABASE SCALABILITY (Per 1000 Users)                             │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Table                   │ Rows/Month │ Size/Month  │           │
│  ├─────────────────────────┼────────────┼─────────────┤           │
│  │ collaboration_sessions  │     2,000  │    200 KB   │           │
│  │ live_strokes (ephemeral)│    50,000  │   (pruned)  │           │
│  │ tutorial_progress       │     5,000  │    500 KB   │           │
│  │ assessments             │    10,000  │      2 MB   │           │
│  │ assessment_strokes      │    50,000  │     10 MB   │           │
│  │                         │            │             │           │
│  │ TOTAL NEW DATA:                      │   ~13 MB    │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  BANDWIDTH ESTIMATES (Per Active User)                             │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Feature                 │ Upload     │ Download    │           │
│  ├─────────────────────────┼────────────┼─────────────┤           │
│  │ Collaboration (active)  │  20 KB/min │  20 KB/min  │           │
│  │ Tutorial (video)        │   1 KB/min │ 500 KB/min  │           │
│  │ Assessment (submission) │  10 KB     │   5 KB      │           │
│  │ Sync (background)       │   5 KB/min │   2 KB/min  │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  CACHING STRATEGY                                                  │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Tutorial Lessons:           Cache locally (MMKV)   │           │
│  │ Video Positions:            Save every 5 seconds   │           │
│  │ Assessment Results:         Cache 30 days          │           │
│  │ Validation Results:         Cache 24 hours         │           │
│  │ Collaboration Sessions:     No caching (real-time) │           │
│  └────────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

## Security Model

```
┌───────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ROW-LEVEL SECURITY (RLS) POLICIES                                 │
│                                                                     │
│  DEFAULT RULE: auth.uid() = user_id                               │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Students can ONLY see own data:                    │           │
│  │ - attempts, steps, strokes, hints                  │           │
│  │ - tutorial_progress                                │           │
│  │ - assessments, assessment_strokes                  │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  COLLABORATION EXCEPTION                                           │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Teachers can see linked student data IF:           │           │
│  │ 1. Active teacher_student_link exists              │           │
│  │ 2. Link status = 'active'                          │           │
│  │ 3. Student explicitly accepted invite              │           │
│  │                                                     │           │
│  │ Teachers CANNOT:                                   │           │
│  │ - Access historical data before link               │           │
│  │ - See data from other teachers' students           │           │
│  │ - Modify student data (read-only)                  │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  REAL-TIME WEBSOCKET SECURITY                                      │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. JWT Authentication Required                     │           │
│  │    - Valid Supabase auth token                     │           │
│  │    - Verified on every channel subscription        │           │
│  │                                                     │           │
│  │ 2. Channel Authorization                           │           │
│  │    - User ID verified against session participants │           │
│  │    - Broadcast messages signed with user ID        │           │
│  │                                                     │           │
│  │ 3. Rate Limiting                                   │           │
│  │    - Max 100 broadcast messages/second             │           │
│  │    - Automatic throttling on excess                │           │
│  │                                                     │           │
│  │ 4. Session Isolation                               │           │
│  │    - Channel name includes session ID              │           │
│  │    - No cross-session data leakage                 │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  ASSESSMENT INTEGRITY                                              │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. No Hints During Assessment                      │           │
│  │    - hintStore.requestHint() disabled              │           │
│  │    - UI components hidden                          │           │
│  │                                                     │           │
│  │ 2. Immutable After Submission                      │           │
│  │    - Steps cannot be modified (DB constraint)      │           │
│  │    - Timestamp verification                        │           │
│  │                                                     │           │
│  │ 3. Future Enhancements                             │           │
│  │    - Screenshot blocking during assessment         │           │
│  │    - Copy-paste detection                          │           │
│  │    - Stroke data hashing for tamper detection      │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  DATA PRIVACY CONTROLS                                             │
│  ┌────────────────────────────────────────────────────┐           │
│  │ Student Controls:                                  │           │
│  │ - View all linked teachers (Settings screen)      │           │
│  │ - Revoke teacher access anytime                   │           │
│  │ - Pause/end collaboration sessions                │           │
│  │ - Export own data (GDPR compliance)               │           │
│  │                                                     │           │
│  │ Teacher Controls:                                  │           │
│  │ - Generate invite codes with expiration            │           │
│  │ - Revoke access to students                       │           │
│  │ - Set permissions per student                     │           │
│  │                                                     │           │
│  │ Data Retention:                                    │           │
│  │ - Live strokes: 1 hour (auto-deleted)             │           │
│  │ - Pending invites: 24 hours (auto-expired)        │           │
│  │ - User data: Deleted on account deletion (CASCADE)│           │
│  └────────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

## Deployment Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                    PHASED DEPLOYMENT PLAN                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WEEK 1-2: DATABASE & INFRASTRUCTURE                               │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. Apply DB_SCHEMA_EXTENSIONS.sql to t3-db         │           │
│  │ 2. Verify RLS policies with test users             │           │
│  │ 3. Set up pg_cron cleanup jobs                     │           │
│  │ 4. Add Supabase Realtime to package.json           │           │
│  │ 5. Create type definitions (TypeScript)            │           │
│  │ 6. Extend syncClient with new methods              │           │
│  │                                                     │           │
│  │ Deployment: Backend only (no app changes)          │           │
│  │ Risk: Low (additive schema, no user impact)        │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  WEEK 3-4: TUTORIAL MODE BETA                                      │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. Build tutorialStore + TutorialScreen            │           │
│  │ 2. Seed 5 initial lessons (YouTube embeds)         │           │
│  │ 3. Add "Learn" section to HomeScreen               │           │
│  │ 4. Enable ENABLE_TUTORIAL_MODE feature flag        │           │
│  │                                                     │           │
│  │ Beta Users: 50 students                            │           │
│  │ Success Criteria:                                  │           │
│  │ - 60%+ lesson completion rate                      │           │
│  │ - <3s video load time                              │           │
│  │ - 99%+ progress save success                       │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  WEEK 5-6: ASSESSMENT MODE BETA                                    │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. Build assessmentStore + AssessmentScreen        │           │
│  │ 2. Implement batch validation logic                │           │
│  │ 3. Add "Test" section to HomeScreen                │           │
│  │ 4. Enable ENABLE_ASSESSMENT_MODE feature flag      │           │
│  │                                                     │           │
│  │ Beta Users: 50 students                            │           │
│  │ Success Criteria:                                  │           │
│  │ - <10s validation time (10 steps)                  │           │
│  │ - ±2 point scoring accuracy                        │           │
│  │ - 99.5%+ submission success                        │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  WEEK 7-10: COLLABORATION BETA                                     │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. Build collaborationStore + TeacherDashboard     │           │
│  │ 2. Implement Supabase Realtime subscriptions       │           │
│  │ 3. Add invite code system                          │           │
│  │ 4. Enable ENABLE_COLLABORATION feature flag        │           │
│  │                                                     │           │
│  │ Beta Users: 10 teachers + 50 students              │           │
│  │ Success Criteria:                                  │           │
│  │ - <100ms stroke broadcast latency                  │           │
│  │ - <5s reconnection time                            │           │
│  │ - Zero cross-session data leakage (security audit) │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  WEEK 11-12: FULL LAUNCH                                           │
│  ┌────────────────────────────────────────────────────┐           │
│  │ 1. Enable all features for 100% users              │           │
│  │ 2. Monitor Sentry for errors                       │           │
│  │ 3. Track engagement metrics                        │           │
│  │ 4. Gather user feedback                            │           │
│  │ 5. Plan Phase 2 enhancements                       │           │
│  └────────────────────────────────────────────────────┘           │
│                                                                     │
│  ROLLBACK PLAN                                                     │
│  ┌────────────────────────────────────────────────────┐           │
│  │ If critical issues detected:                       │           │
│  │ 1. Disable feature flags (instant)                 │           │
│  │ 2. Database migrations are non-destructive         │           │
│  │ 3. Local-first architecture = app works offline    │           │
│  │ 4. Revert to previous app version if needed        │           │
│  └────────────────────────────────────────────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

**End of Architecture Diagrams**

For implementation details, see:
- `PR13-15-16_IMPLEMENTATION_PLAN.md` - Full technical specification
- `PR13-16_EXECUTIVE_SUMMARY.md` - High-level overview
- `DB_SCHEMA_EXTENSIONS.sql` - Complete database schema
