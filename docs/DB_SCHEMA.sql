-- Handwriting Math App - Supabase Database Schema
-- PR12: Cloud Storage Integration
--
-- Tables:
-- - sessions: App sessions with device info
-- - attempts: Problem-solving attempts
-- - steps: Individual solution steps within attempts
-- - strokes: Compressed stroke data for each step
-- - hints: Hint history entries
--
-- Features:
-- - Row-Level Security (RLS) for user isolation
-- - Idempotent upserts using client-generated UUIDs
-- - JSONB for flexible metadata storage
-- - Timestamps for sync conflict resolution
-- - Indexes for query performance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SESSIONS TABLE
-- Tracks app sessions with device metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  device_info JSONB NOT NULL DEFAULT '{}',
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);

-- RLS Policies
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ATTEMPTS TABLE
-- Problem-solving attempts with completion status
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  problem_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  solved BOOLEAN NOT NULL DEFAULT FALSE,
  hints_requested INTEGER NOT NULL DEFAULT 0,
  total_time INTEGER NOT NULL DEFAULT 0, -- milliseconds
  device_info JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attempts_user_id ON public.attempts(user_id);
CREATE INDEX idx_attempts_problem_id ON public.attempts(problem_id);
CREATE INDEX idx_attempts_started_at ON public.attempts(started_at DESC);
CREATE INDEX idx_attempts_session_id ON public.attempts(session_id);

-- RLS Policies
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON public.attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON public.attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEPS TABLE
-- Individual solution steps with validation results
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.steps (
  id UUID PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  line_number INTEGER,
  latex TEXT NOT NULL,
  recognized_text TEXT,
  is_correct BOOLEAN,
  is_useful BOOLEAN,
  validation JSONB NOT NULL DEFAULT '{}', -- Full ValidationResult object
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  manual_input BOOLEAN NOT NULL DEFAULT FALSE,
  recognition_confidence FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_steps_attempt_id ON public.steps(attempt_id);
CREATE INDEX idx_steps_user_id ON public.steps(user_id);
CREATE INDEX idx_steps_step_number ON public.steps(attempt_id, step_number);

-- RLS Policies
ALTER TABLE public.steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own steps"
  ON public.steps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own steps"
  ON public.steps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own steps"
  ON public.steps FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STROKES TABLE
-- Compressed stroke data with delta encoding + gzip
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.strokes (
  id UUID PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.steps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_number INTEGER,
  point_count INTEGER NOT NULL,
  bbox JSONB NOT NULL DEFAULT '{}', -- {minX, minY, maxX, maxY}
  bytes_compressed INTEGER NOT NULL, -- Compressed size in bytes
  bytes_original INTEGER NOT NULL, -- Original size for compression ratio tracking
  encoding TEXT NOT NULL DEFAULT 'delta-gzip-base64', -- Compression method
  data TEXT NOT NULL, -- Base64-encoded compressed stroke data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_strokes_step_id ON public.strokes(step_id);
CREATE INDEX idx_strokes_user_id ON public.strokes(user_id);

-- RLS Policies
ALTER TABLE public.strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strokes"
  ON public.strokes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strokes"
  ON public.strokes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strokes"
  ON public.strokes FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HINTS TABLE
-- Hint history entries with escalation tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.hints (
  id UUID PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.steps(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL, -- 'concept', 'direction', 'micro'
  error_type TEXT NOT NULL, -- 'syntax', 'arithmetic', 'logic', 'method', 'unknown'
  hint_text TEXT NOT NULL,
  auto_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  step_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hints_attempt_id ON public.hints(attempt_id);
CREATE INDEX idx_hints_user_id ON public.hints(user_id);
CREATE INDEX idx_hints_created_at ON public.hints(created_at DESC);

-- RLS Policies
ALTER TABLE public.hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hints"
  ON public.hints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hints"
  ON public.hints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hints"
  ON public.hints FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- Automatically update updated_at timestamp on row updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attempts_updated_at
  BEFORE UPDATE ON public.attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_steps_updated_at
  BEFORE UPDATE ON public.steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strokes_updated_at
  BEFORE UPDATE ON public.strokes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hints_updated_at
  BEFORE UPDATE ON public.hints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR ANALYTICS (Optional - for future dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW public.user_progress AS
SELECT
  a.user_id,
  COUNT(DISTINCT a.problem_id) AS total_problems_attempted,
  COUNT(DISTINCT CASE WHEN a.solved THEN a.problem_id END) AS problems_solved,
  COUNT(*) AS total_attempts,
  SUM(a.total_time) AS total_time_ms,
  AVG(a.total_time) AS avg_attempt_time_ms,
  SUM(a.hints_requested) AS total_hints_requested,
  COUNT(DISTINCT a.session_id) AS total_sessions
FROM public.attempts a
GROUP BY a.user_id;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Expected table sizes (1000 active users, 50 problems/user/month):
-- - sessions: ~1000 rows/month (small)
-- - attempts: ~50,000 rows/month (medium)
-- - steps: ~250,000 rows/month (large, ~5 steps/attempt avg)
-- - strokes: ~250,000 rows/month (large, 1:1 with steps, but compressed)
-- - hints: ~50,000 rows/month (medium, ~1 hint/attempt avg)
--
-- Compression ratio: ~80% reduction with delta+gzip
-- - Original stroke: ~5KB average
-- - Compressed: ~1KB average
-- - Monthly bandwidth: 250MB compressed vs 1.25GB uncompressed
--
-- Indexes optimized for:
-- - User-scoped queries (user_id)
-- - Temporal queries (started_at, created_at DESC)
-- - Attempt hierarchy (attempt_id → steps → strokes)