-- ============================================================================
-- Migration: Add Problem Synchronization to Collaboration Sessions
-- Created: 2025-11-10
-- Description: Adds current_problem_id field to collaboration_sessions table
--              to enable problem synchronization between teacher and student
-- ============================================================================

-- Add current_problem_id column to collaboration_sessions
ALTER TABLE public.collaboration_sessions
ADD COLUMN IF NOT EXISTS current_problem_id TEXT;

-- Add index for faster queries on current_problem_id
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_problem
ON public.collaboration_sessions(current_problem_id)
WHERE current_problem_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.collaboration_sessions.current_problem_id IS 'ID of the currently active problem in this session (synced between teacher and student)';

-- Verify the migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'collaboration_sessions'
    AND column_name = 'current_problem_id'
  ) THEN
    RAISE NOTICE 'Migration successful: current_problem_id column added to collaboration_sessions';
  ELSE
    RAISE EXCEPTION 'Migration failed: current_problem_id column not found';
  END IF;
END;
$$;
