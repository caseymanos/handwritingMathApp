-- ============================================================================
-- Tutorial Lessons Seed Data
-- PR14: Tutorial Mode
-- ============================================================================
--
-- Populates tutorial_lessons with initial content for Linear Equations category.
-- Uses Khan Academy YouTube videos (free, educational, high quality).
--
-- IMPORTANT: Replace 'YOUTUBE_VIDEO_ID' placeholders with actual Khan Academy video IDs.
-- Find videos at: https://www.khanacademy.org/math/algebra
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
  'https://www.youtube.com/watch?v=_OYmal1r8bE', -- Khan Academy: Introduction to equations
  'youtube',
  480,
  'In this lesson, we introduce linear equations. A linear equation is an equation with one or more variables, where the highest power of any variable is 1. Examples: x + 5 = 10, 2y = 8, 3z - 7 = 14.',
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
  'https://www.youtube.com/watch?v=RYDeM8rP2Ls', -- Khan Academy: One-step equations
  'youtube',
  360,
  'One-step equations require only one operation to isolate the variable. Examples: x + 3 = 7 (subtract 3), 2x = 10 (divide by 2), x - 5 = 2 (add 5), x/4 = 3 (multiply by 4).',
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
  'https://www.youtube.com/watch?v=tLXPdQlgPIs', -- Khan Academy: Two-step equations
  'youtube',
  540,
  'Two-step equations require two operations to solve. Strategy: undo addition/subtraction first, then undo multiplication/division. Example: 2x + 5 = 15 → subtract 5 → divide by 2 → x = 5.',
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
  'https://www.youtube.com/watch?v=eKhfGTq0F7g', -- Khan Academy: Variables on both sides
  'youtube',
  660,
  'When variables appear on both sides, combine like terms first. Example: 3x + 5 = 2x + 15 → subtract 2x from both sides → x + 5 = 15 → subtract 5 → x = 10.',
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
  'https://www.youtube.com/watch?v=l8p5ScLSLzc', -- Khan Academy: Multi-step equations
  'youtube',
  720,
  'Multi-step equations combine all previous skills: distributive property, combining like terms, variables on both sides. Example: 2(x + 3) = 3x - 1 → distribute → 2x + 6 = 3x - 1 → solve.',
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
  'https://www.youtube.com/watch?v=ew-nHkHx0qU', -- Khan Academy: Word problems
  'youtube',
  840,
  'Word problems require translating English into algebra. Strategy: 1) Define the variable, 2) Write the equation, 3) Solve, 4) Check your answer. Example: "Five more than twice a number is 17. Find the number."',
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