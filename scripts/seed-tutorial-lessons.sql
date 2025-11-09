-- ============================================================================
-- Tutorial Lessons Seed Data
-- PR14: Tutorial Mode
-- ============================================================================
--
-- Populates tutorial_lessons with initial content for Linear Equations category.
-- Uses embeddable YouTube videos from verified educational channels.
--
-- VIDEO SOURCES:
-- - Najam Academy: Introduction to Linear Equations
-- - Math with Mr. J: One-Step, Two-Step, Variables Both Sides, Multi-Step
-- - The Organic Chemistry Tutor: Word Problems
--
-- All videos verified to allow embedding (tested 2025-01-09)
--
-- ============================================================================

-- Insert Linear Equations lessons
INSERT INTO public.tutorial_lessons (
  slug,
  title,
  description,
  skill_category,
  difficulty,
  content_type,
  video_url,
  video_platform,
  duration_seconds,
  transcript,
  sort_order,
  prerequisites,
  tags,
  published
) VALUES
-- Lesson 1: Introduction to Linear Equations (EASY, no prerequisites)
(
  'linear-equations-intro',
  'Introduction to Linear Equations',
  'Learn what linear equations are and why they''re important. Understand the basic structure of equations with one variable.',
  'LINEAR_EQUATIONS',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=tHm3X_Ta_iE', -- Najam Academy: Introduction to Linear Equations (11 min)
  'youtube',
  660,
  'Provides a clear definition of linear equations, their basic form (ax + b = c), and why they are called "linear." Covers simple examples to introduce the concept.',
  1,
  ARRAY[]::TEXT[],
  ARRAY['linear equations', 'algebra', 'introduction', 'basics'],
  true
),

-- Lesson 2: One-Step Equations (EASY, requires intro)
(
  'linear-equations-one-step',
  'Solving One-Step Equations',
  'Learn to solve equations that require only one operation (addition, subtraction, multiplication, or division).',
  'LINEAR_EQUATIONS',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=L0_K89UJfJY', -- Math with Mr. J: One-Step Equations (7 min)
  'youtube',
  420,
  'A concise, step-by-step guide to solving one-step equations, demonstrating the use of inverse operations for addition/subtraction and multiplication/division problems.',
  2,
  ARRAY['linear-equations-intro']::TEXT[],
  ARRAY['one-step equations', 'solving equations', 'basic algebra'],
  true
),

-- Lesson 3: Two-Step Equations (MEDIUM, requires one-step)
(
  'linear-equations-two-step',
  'Solving Two-Step Equations',
  'Build on one-step equations by learning to solve equations that require two operations.',
  'LINEAR_EQUATIONS',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=AP5MbH88cdo', -- Math with Mr. J: Two-Step Equations (9 min)
  'youtube',
  540,
  'Clearly explains the process for solving two-step equations (like 2x + 3 = 11), focusing on the correct order of operations (undoing addition/subtraction first).',
  3,
  ARRAY['linear-equations-one-step']::TEXT[],
  ARRAY['two-step equations', 'multi-step', 'order of operations'],
  true
),

-- Lesson 4: Variables on Both Sides (MEDIUM, requires two-step)
(
  'linear-equations-variables-both-sides',
  'Equations with Variables on Both Sides',
  'Learn to solve equations where the variable appears on both sides of the equals sign.',
  'LINEAR_EQUATIONS',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=eZsyV0ISzV8', -- Math with Mr. J: Variables on Both Sides (9 min)
  'youtube',
  540,
  'Introduces equations with variables on both sides (e.g., 3x + 7 = 2x + 15). Provides a step-by-step process for isolating the variable by moving terms.',
  4,
  ARRAY['linear-equations-two-step']::TEXT[],
  ARRAY['variables both sides', 'combining like terms', 'algebraic manipulation'],
  true
),

-- Lesson 5: Multi-Step Equations (HARD, requires variables both sides)
(
  'linear-equations-multi-step',
  'Solving Multi-Step Equations',
  'Master complex equations with parentheses, distributive property, and multiple operations.',
  'LINEAR_EQUATIONS',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=XCWkBAUiBxM', -- Math with Mr. J: Multi-Step Equations (14 min)
  'youtube',
  840,
  'Covers solving complex linear equations that require preliminary steps, such as using the distributive property (e.g., 2(x + 3) = 14) and combining like terms (e.g., 3x + 2x - 5 = 20).',
  5,
  ARRAY['linear-equations-variables-both-sides']::TEXT[],
  ARRAY['multi-step', 'distributive property', 'complex equations'],
  true
),

-- Lesson 6: Word Problems (HARD, requires multi-step)
(
  'linear-equations-word-problems',
  'Linear Equation Word Problems',
  'Apply your equation-solving skills to real-world scenarios and story problems.',
  'LINEAR_EQUATIONS',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=QEnFIgN8UBw', -- The Organic Chemistry Tutor: Word Problems (11 min)
  'youtube',
  660,
  'Focuses on the crucial first step: translating English words into algebraic expressions and setting up a basic equation. This foundational skill is essential before solving more complex word problems.',
  6,
  ARRAY['linear-equations-multi-step']::TEXT[],
  ARRAY['word problems', 'application', 'real-world', 'problem solving'],
  true
);

-- Verify insertion
SELECT
  slug,
  title,
  difficulty,
  sort_order,
  array_length(prerequisites, 1) AS prereq_count,
  published
FROM public.tutorial_lessons
WHERE skill_category = 'LINEAR_EQUATIONS'
ORDER BY sort_order;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
--
-- 1. Verify video URLs are accessible
-- 2. Add transcripts (optional, can be auto-generated from YouTube)
-- 3. Add thumbnail_url fields (optional, can use YouTube thumbnails)
-- 4. Create lessons for other categories (BASIC_ALGEBRA, QUADRATIC, GEOMETRY)
-- 5. Test prerequisite unlocking logic in app
--
-- ============================================================================