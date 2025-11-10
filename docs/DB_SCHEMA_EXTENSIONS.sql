-- ============================================================================
-- Handwriting Math App - Database Schema Extensions
-- PR13-16: Teacher Collaboration, Tutorial Mode, and Assessment Mode
-- ============================================================================
--
-- Project: t3-db (nhadlfbxbivlhtkbolve)
-- Created: 2025-11-08
-- Description: Extends existing schema (sessions, attempts, steps, strokes, hints)
--              with new tables for collaboration, tutorials, and assessments
--
-- Execution Order:
-- 1. Run this file after DB_SCHEMA.sql
-- 2. Test RLS policies with multiple users
-- 3. Verify indexes with EXPLAIN queries
-- 4. Seed tutorial_lessons with initial content
--
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PR13: REAL-TIME COLLABORATION TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: teacher_student_links
-- Purpose: Manages teacher-student relationships via invite codes
-- RLS: Teachers see own links, students see own links
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teacher_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'revoked'
  permissions JSONB NOT NULL DEFAULT '{"can_write": true, "can_view_all": true, "can_annotate": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, student_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'revoked'))
);

-- Indexes for teacher_student_links
CREATE INDEX idx_teacher_student_links_teacher ON public.teacher_student_links(teacher_id);
CREATE INDEX idx_teacher_student_links_student ON public.teacher_student_links(student_id);
CREATE INDEX idx_teacher_student_links_invite_code ON public.teacher_student_links(invite_code);
CREATE INDEX idx_teacher_student_links_status ON public.teacher_student_links(status);
CREATE INDEX idx_teacher_student_links_expires ON public.teacher_student_links(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies for teacher_student_links
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
  USING (
    auth.uid() = student_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = student_id
    AND status = 'active'
  );

CREATE POLICY "Teachers can revoke links"
  ON public.teacher_student_links FOR UPDATE
  USING (auth.uid() = teacher_id);

-- Allow nullable student_id to support claim-by-code workflow
ALTER TABLE public.teacher_student_links
  ALTER COLUMN student_id DROP NOT NULL;

-- Security-definer helper to claim invite codes without exposing tables
CREATE OR REPLACE FUNCTION public.claim_invite_code(p_invite_code TEXT)
RETURNS teacher_student_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link teacher_student_links;
BEGIN
  SELECT *
    INTO v_link
    FROM public.teacher_student_links
   WHERE invite_code = upper(p_invite_code)
     AND status = 'pending'
     AND (expires_at IS NULL OR expires_at > NOW())
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite code not found or expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_link.student_id IS NOT NULL AND v_link.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'Invite code already claimed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.teacher_student_links
     SET student_id = auth.uid(),
         status = 'active',
         accepted_at = NOW(),
         updated_at = NOW()
   WHERE id = v_link.id
   RETURNING * INTO v_link;

  RETURN v_link;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_invite_code(TEXT) TO authenticated;

-- Comment for documentation
COMMENT ON TABLE public.teacher_student_links IS 'Manages teacher-student relationships via invite codes. Students must accept invite to activate link.';
COMMENT ON COLUMN public.teacher_student_links.invite_code IS '6-character alphanumeric code (e.g., ABC123) shared by teacher';
COMMENT ON COLUMN public.teacher_student_links.permissions IS 'JSONB object defining what teacher can do: can_write, can_view_all, can_annotate';

-- ----------------------------------------------------------------------------
-- Table: collaboration_sessions
-- Purpose: Tracks active and past collaboration sessions
-- RLS: Students see own sessions, teachers see linked student sessions
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.teacher_student_links(id) ON DELETE CASCADE,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'ended'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  student_last_seen TIMESTAMPTZ DEFAULT NOW(),
  teacher_last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'ended')),
  CONSTRAINT ended_sessions_have_ended_at CHECK (
    (status = 'ended' AND ended_at IS NOT NULL) OR status != 'ended'
  )
);

-- Indexes for collaboration_sessions
CREATE INDEX idx_collaboration_sessions_student ON public.collaboration_sessions(student_id);
CREATE INDEX idx_collaboration_sessions_teacher ON public.collaboration_sessions(teacher_id);
CREATE INDEX idx_collaboration_sessions_link ON public.collaboration_sessions(link_id);
CREATE INDEX idx_collaboration_sessions_attempt ON public.collaboration_sessions(attempt_id) WHERE attempt_id IS NOT NULL;
CREATE INDEX idx_collaboration_sessions_status ON public.collaboration_sessions(status);
CREATE INDEX idx_collaboration_sessions_started ON public.collaboration_sessions(started_at DESC);
CREATE INDEX idx_collaboration_sessions_active ON public.collaboration_sessions(student_id, teacher_id) WHERE status = 'active';

-- RLS Policies for collaboration_sessions
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own sessions"
  ON public.collaboration_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view linked student sessions"
  ON public.collaboration_sessions FOR SELECT
  USING (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM public.teacher_student_links
      WHERE id = collaboration_sessions.link_id
      AND teacher_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Students can create sessions"
  ON public.collaboration_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND EXISTS (
      SELECT 1 FROM public.teacher_student_links
      WHERE id = link_id
      AND student_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "Both parties can update sessions"
  ON public.collaboration_sessions FOR UPDATE
  USING (
    auth.uid() = student_id OR auth.uid() = teacher_id
  );

-- Comment for documentation
COMMENT ON TABLE public.collaboration_sessions IS 'Tracks active and past collaboration sessions between teachers and students';
COMMENT ON COLUMN public.collaboration_sessions.student_last_seen IS 'Timestamp of last activity from student (used for presence tracking)';
COMMENT ON COLUMN public.collaboration_sessions.teacher_last_seen IS 'Timestamp of last activity from teacher (used for presence tracking)';

-- ----------------------------------------------------------------------------
-- Table: live_strokes
-- Purpose: Ephemeral storage for real-time stroke broadcasting
-- RLS: Session participants can view/insert strokes
-- NOTE: This table should be pruned regularly (delete strokes older than 1 hour)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stroke_data JSONB NOT NULL, -- Uncompressed for real-time; full Stroke object
  color TEXT NOT NULL,
  stroke_width FLOAT NOT NULL,
  line_number INTEGER,
  is_annotation BOOLEAN NOT NULL DEFAULT false, -- true if teacher annotation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for live_strokes
CREATE INDEX idx_live_strokes_session ON public.live_strokes(session_id);
CREATE INDEX idx_live_strokes_created ON public.live_strokes(created_at DESC);
CREATE INDEX idx_live_strokes_author ON public.live_strokes(author_id);

-- RLS Policies for live_strokes
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

-- Comment for documentation
COMMENT ON TABLE public.live_strokes IS 'Ephemeral real-time stroke data for collaboration. Pruned after 1 hour or session end.';
COMMENT ON COLUMN public.live_strokes.is_annotation IS 'True if stroke is a teacher annotation (displayed in different color)';
COMMENT ON COLUMN public.live_strokes.stroke_data IS 'Full Stroke object (points, color, width) - uncompressed for speed';

-- ============================================================================
-- PR14: TUTORIAL MODE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: tutorial_lessons
-- Purpose: Stores lesson content metadata (videos, transcripts, prerequisites)
-- RLS: All authenticated users can view published lessons
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tutorial_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  skill_category TEXT NOT NULL, -- Maps to ProblemCategory enum
  difficulty TEXT NOT NULL, -- Maps to ProblemDifficulty enum
  content_type TEXT NOT NULL DEFAULT 'video', -- 'video', 'interactive', 'text'
  video_url TEXT, -- YouTube URL or Cloudflare Stream URL
  video_platform TEXT DEFAULT 'youtube', -- 'youtube', 'cloudflare', 'custom'
  duration_seconds INTEGER,
  transcript TEXT, -- Full transcript for accessibility and search
  interactive_content JSONB, -- For future interactive lessons (diagrams, animations)
  sort_order INTEGER NOT NULL DEFAULT 0,
  prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of lesson slugs that must be completed first
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- For search and categorization
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valid_content_type CHECK (content_type IN ('video', 'interactive', 'text')),
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  CONSTRAINT video_has_url CHECK (
    (content_type = 'video' AND video_url IS NOT NULL) OR content_type != 'video'
  )
);

-- Indexes for tutorial_lessons
CREATE INDEX idx_tutorial_lessons_slug ON public.tutorial_lessons(slug);
CREATE INDEX idx_tutorial_lessons_category ON public.tutorial_lessons(skill_category);
CREATE INDEX idx_tutorial_lessons_difficulty ON public.tutorial_lessons(difficulty);
CREATE INDEX idx_tutorial_lessons_published ON public.tutorial_lessons(published);
CREATE INDEX idx_tutorial_lessons_sort ON public.tutorial_lessons(skill_category, sort_order);
CREATE INDEX idx_tutorial_lessons_tags ON public.tutorial_lessons USING GIN(tags);

-- RLS Policies for tutorial_lessons
ALTER TABLE public.tutorial_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view published lessons"
  ON public.tutorial_lessons FOR SELECT
  USING (published = true);

-- Future: Add admin policy for CRUD operations
-- CREATE POLICY "Admins can manage lessons"
--   ON public.tutorial_lessons FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');

-- Comment for documentation
COMMENT ON TABLE public.tutorial_lessons IS 'Lesson content library with videos, transcripts, and prerequisite relationships';
COMMENT ON COLUMN public.tutorial_lessons.slug IS 'URL-friendly identifier (e.g., "linear-equations-intro")';
COMMENT ON COLUMN public.tutorial_lessons.prerequisites IS 'Array of lesson slugs that must be completed before this lesson unlocks';
COMMENT ON COLUMN public.tutorial_lessons.sort_order IS 'Determines display order within skill_category (0 = first)';

-- ----------------------------------------------------------------------------
-- Table: tutorial_progress
-- Purpose: Tracks user progress through lessons
-- RLS: Users can only view/modify own progress
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.tutorial_lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  progress_percent INTEGER NOT NULL DEFAULT 0, -- 0-100
  video_position_seconds INTEGER DEFAULT 0, -- Resume position
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0, -- Total time spent
  last_watched_at TIMESTAMPTZ, -- Last activity timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id),
  CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed')),
  CONSTRAINT valid_progress CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT completed_has_completed_at CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR status != 'completed'
  ),
  CONSTRAINT started_has_started_at CHECK (
    (status != 'not_started' AND started_at IS NOT NULL) OR status = 'not_started'
  )
);

-- Indexes for tutorial_progress
CREATE INDEX idx_tutorial_progress_user ON public.tutorial_progress(user_id);
CREATE INDEX idx_tutorial_progress_lesson ON public.tutorial_progress(lesson_id);
CREATE INDEX idx_tutorial_progress_status ON public.tutorial_progress(status);
CREATE INDEX idx_tutorial_progress_user_status ON public.tutorial_progress(user_id, status);
CREATE INDEX idx_tutorial_progress_completed ON public.tutorial_progress(user_id, completed_at DESC) WHERE status = 'completed';

-- RLS Policies for tutorial_progress
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

-- Comment for documentation
COMMENT ON TABLE public.tutorial_progress IS 'User progress tracking for tutorial lessons';
COMMENT ON COLUMN public.tutorial_progress.video_position_seconds IS 'Resume position for video playback (saved every 5 seconds)';
COMMENT ON COLUMN public.tutorial_progress.time_spent_seconds IS 'Total accumulated watch time (used for completion criteria)';

-- ============================================================================
-- PR15: ASSESSMENT MODE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: assessments
-- Purpose: Stores assessment attempts with steps and validation results
-- RLS: Users can only view/modify own assessments
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL, -- References problemData.ts
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'submitted', 'graded'
  steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {latex, lineNumber, timestamp}
  validation_results JSONB, -- Array of ValidationResult objects after grading
  score FLOAT, -- 0-100, calculated after validation
  correct_steps INTEGER DEFAULT 0, -- Count of correct steps
  useful_steps INTEGER DEFAULT 0, -- Count of useful steps
  total_steps INTEGER DEFAULT 0, -- Total steps submitted
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  time_limit_seconds INTEGER, -- Optional time limit (NULL = no limit)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'submitted', 'graded')),
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  CONSTRAINT submitted_has_submitted_at CHECK (
    (status != 'in_progress' AND submitted_at IS NOT NULL) OR status = 'in_progress'
  ),
  CONSTRAINT graded_has_score CHECK (
    (status = 'graded' AND score IS NOT NULL) OR status != 'graded'
  )
);

-- Indexes for assessments
CREATE INDEX idx_assessments_user ON public.assessments(user_id);
CREATE INDEX idx_assessments_problem ON public.assessments(problem_id);
CREATE INDEX idx_assessments_status ON public.assessments(status);
CREATE INDEX idx_assessments_submitted ON public.assessments(submitted_at DESC) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_assessments_user_problem ON public.assessments(user_id, problem_id);
CREATE INDEX idx_assessments_user_score ON public.assessments(user_id, score DESC) WHERE score IS NOT NULL;

-- RLS Policies for assessments
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

-- Future: Teachers can view student assessments
-- CREATE POLICY "Teachers can view linked student assessments"
--   ON public.assessments FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.teacher_student_links
--       WHERE teacher_id = auth.uid()
--       AND student_id = assessments.user_id
--       AND status = 'active'
--     )
--   );

-- Comment for documentation
COMMENT ON TABLE public.assessments IS 'Assessment attempts with deferred validation (no hints during assessment)';
COMMENT ON COLUMN public.assessments.steps IS 'Array of step objects: [{latex, lineNumber, timestamp}, ...]';
COMMENT ON COLUMN public.assessments.validation_results IS 'Full ValidationResult objects after batch validation';
COMMENT ON COLUMN public.assessments.score IS 'Final score (0-100): 70% correctness + 30% usefulness';

-- ----------------------------------------------------------------------------
-- Table: assessment_strokes
-- Purpose: Compressed stroke data for assessment steps
-- RLS: Users can only view/insert own strokes
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.assessment_strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL, -- Index in assessments.steps array
  line_number INTEGER,
  point_count INTEGER NOT NULL,
  bbox JSONB NOT NULL DEFAULT '{}'::jsonb, -- {minX, minY, maxX, maxY}
  bytes_compressed INTEGER NOT NULL,
  bytes_original INTEGER NOT NULL,
  encoding TEXT NOT NULL DEFAULT 'delta-gzip-base64',
  data TEXT NOT NULL, -- Base64-encoded compressed stroke data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_encoding CHECK (encoding = 'delta-gzip-base64')
);

-- Indexes for assessment_strokes
CREATE INDEX idx_assessment_strokes_assessment ON public.assessment_strokes(assessment_id);
CREATE INDEX idx_assessment_strokes_user ON public.assessment_strokes(user_id);
CREATE INDEX idx_assessment_strokes_step ON public.assessment_strokes(assessment_id, step_index);

-- RLS Policies for assessment_strokes
ALTER TABLE public.assessment_strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment strokes"
  ON public.assessment_strokes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessment strokes"
  ON public.assessment_strokes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE public.assessment_strokes IS 'Compressed stroke data for assessment steps (same compression as steps.strokes table)';
COMMENT ON COLUMN public.assessment_strokes.step_index IS 'Index in assessments.steps array (0-based)';
COMMENT ON COLUMN public.assessment_strokes.encoding IS 'Compression method: delta encoding + gzip + base64';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for teacher_student_links
CREATE TRIGGER update_teacher_student_links_updated_at
  BEFORE UPDATE ON public.teacher_student_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for collaboration_sessions
CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON public.collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tutorial_lessons
CREATE TRIGGER update_tutorial_lessons_updated_at
  BEFORE UPDATE ON public.tutorial_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tutorial_progress
CREATE TRIGGER update_tutorial_progress_updated_at
  BEFORE UPDATE ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for assessments
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for assessment_strokes
CREATE TRIGGER update_assessment_strokes_updated_at
  BEFORE UPDATE ON public.assessment_strokes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR ANALYTICS (Optional - for future dashboard)
-- ============================================================================

-- View: Active collaboration sessions with student/teacher info
CREATE OR REPLACE VIEW public.active_collaborations AS
SELECT
  cs.id AS session_id,
  cs.student_id,
  cs.teacher_id,
  cs.started_at,
  cs.student_last_seen,
  cs.teacher_last_seen,
  tsl.permissions,
  EXTRACT(EPOCH FROM (NOW() - cs.started_at)) AS duration_seconds,
  (cs.student_last_seen > NOW() - INTERVAL '30 seconds') AS student_active,
  (cs.teacher_last_seen > NOW() - INTERVAL '30 seconds') AS teacher_active
FROM public.collaboration_sessions cs
JOIN public.teacher_student_links tsl ON tsl.id = cs.link_id
WHERE cs.status = 'active';

COMMENT ON VIEW public.active_collaborations IS 'Real-time view of active collaboration sessions with presence tracking';

-- View: Tutorial completion stats per user
CREATE OR REPLACE VIEW public.tutorial_completion_stats AS
SELECT
  tp.user_id,
  COUNT(*) AS total_lessons,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_lessons,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_lessons,
  SUM(time_spent_seconds) AS total_time_seconds,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0),
    2
  ) AS completion_percent
FROM public.tutorial_progress tp
GROUP BY tp.user_id;

COMMENT ON VIEW public.tutorial_completion_stats IS 'Per-user tutorial completion statistics';

-- View: Assessment performance summary per user
CREATE OR REPLACE VIEW public.assessment_performance AS
SELECT
  a.user_id,
  COUNT(*) AS total_assessments,
  COUNT(*) FILTER (WHERE status = 'graded') AS graded_assessments,
  ROUND(AVG(score), 2) AS average_score,
  MAX(score) AS best_score,
  MIN(score) AS worst_score,
  SUM(time_spent_seconds) AS total_time_seconds,
  ROUND(AVG(time_spent_seconds), 0) AS average_time_seconds
FROM public.assessments a
WHERE status = 'graded'
GROUP BY a.user_id;

COMMENT ON VIEW public.assessment_performance IS 'Per-user assessment performance summary';

-- ============================================================================
-- FUNCTIONS FOR CLEANUP (Run via cron job)
-- ============================================================================

-- Function: Clean up old live_strokes (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_live_strokes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.live_strokes
  WHERE created_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old live_strokes', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_live_strokes IS 'Deletes live_strokes older than 1 hour. Run hourly via pg_cron.';

-- Function: Expire pending teacher invites (older than 24 hours)
CREATE OR REPLACE FUNCTION expire_pending_invites()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.teacher_student_links
  SET status = 'revoked', updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RAISE NOTICE 'Expired % pending invites', expired_count;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_pending_invites IS 'Expires pending teacher invites past their expiration date. Run daily via pg_cron.';

-- ============================================================================
-- VALIDATION QUERIES (Run these to verify schema)
-- ============================================================================

-- Verify all new tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teacher_student_links') = 1, 'teacher_student_links table missing';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collaboration_sessions') = 1, 'collaboration_sessions table missing';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'live_strokes') = 1, 'live_strokes table missing';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tutorial_lessons') = 1, 'tutorial_lessons table missing';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tutorial_progress') = 1, 'tutorial_progress table missing';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessments') = 1, 'assessments table missing';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_strokes') = 1, 'assessment_strokes table missing';
  RAISE NOTICE 'All new tables created successfully';
END;
$$;

-- Verify RLS is enabled on all new tables
DO $$
BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'teacher_student_links') = true, 'RLS not enabled on teacher_student_links';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'collaboration_sessions') = true, 'RLS not enabled on collaboration_sessions';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'live_strokes') = true, 'RLS not enabled on live_strokes';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'tutorial_lessons') = true, 'RLS not enabled on tutorial_lessons';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'tutorial_progress') = true, 'RLS not enabled on tutorial_progress';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'assessments') = true, 'RLS not enabled on assessments';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'assessment_strokes') = true, 'RLS not enabled on assessment_strokes';
  RAISE NOTICE 'RLS enabled on all new tables';
END;
$$;

-- ============================================================================
-- SETUP INSTRUCTIONS
-- ============================================================================

/*
1. APPLY SCHEMA:
   psql -d t3-db -f DB_SCHEMA_EXTENSIONS.sql

2. VERIFY TABLES:
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

3. TEST RLS POLICIES:
   - Create 2 test users
   - Create teacher-student link
   - Verify student cannot see other student's data
   - Verify teacher can only see linked students

4. SEED TUTORIAL CONTENT:
   psql -d t3-db -f seed-tutorial-lessons.sql

5. SET UP CLEANUP CRON JOBS (if using pg_cron):
   SELECT cron.schedule('cleanup-live-strokes', '0 * * * *', 'SELECT cleanup_old_live_strokes()');
   SELECT cron.schedule('expire-invites', '0 0 * * *', 'SELECT expire_pending_invites()');

6. MONITOR PERFORMANCE:
   EXPLAIN ANALYZE SELECT * FROM collaboration_sessions WHERE student_id = 'user-uuid';
   EXPLAIN ANALYZE SELECT * FROM tutorial_progress WHERE user_id = 'user-uuid';
   EXPLAIN ANALYZE SELECT * FROM assessments WHERE user_id = 'user-uuid';

7. BACKUP BEFORE GOING TO PRODUCTION:
   pg_dump -d t3-db -F c -f t3-db-backup-$(date +%Y%m%d).dump
*/

-- ============================================================================
-- END OF SCHEMA EXTENSIONS
-- ============================================================================
