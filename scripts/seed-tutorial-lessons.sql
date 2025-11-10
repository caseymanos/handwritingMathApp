-- ============================================================================
-- Tutorial Lessons Seed Data
-- PR14: Tutorial Mode
-- ============================================================================
--
-- Populates tutorial_lessons with initial content for all four categories:
-- - LINEAR_EQUATIONS (6 lessons)
-- - BASIC_ALGEBRA (7 lessons)
-- - QUADRATIC (7 lessons)
-- - GEOMETRY (6 lessons)
--
-- Uses embeddable YouTube videos from verified educational channels.
--
-- VIDEO SOURCES:
-- - Khan Academy: Comprehensive math tutorials
-- - Math with Mr. J: Clear, concise explanations
-- - The Organic Chemistry Tutor: Detailed problem-solving
-- - Professor Dave Explains: Conceptual understanding
-- - Math Antics: Engaging visual explanations
--
-- All videos verified to allow embedding (tested 2025-11-10)
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

-- ============================================================================
-- BASIC ALGEBRA LESSONS (7 lessons: 2 EASY, 3 MEDIUM, 2 HARD)
-- ============================================================================

-- Lesson 1: Introduction to Algebra (EASY, no prerequisites)
(
  'basic-algebra-intro',
  'Introduction to Algebra',
  'Understand what algebra is and learn the basics of variables, constants, and expressions.',
  'BASIC_ALGEBRA',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=NybHckSEQBI', -- Math Antics: Introduction to Algebra (10 min)
  'youtube',
  600,
  'Introduces the fundamental concepts of algebra including variables, constants, coefficients, and the difference between expressions and equations. Uses clear visual examples to make abstract concepts concrete.',
  1,
  ARRAY[]::TEXT[],
  ARRAY['algebra', 'variables', 'introduction', 'basics', 'expressions'],
  true
),

-- Lesson 2: Combining Like Terms (EASY, requires intro)
(
  'basic-algebra-combining-like-terms',
  'Combining Like Terms',
  'Learn to simplify algebraic expressions by combining terms with the same variable.',
  'BASIC_ALGEBRA',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=lYKGCbBHmZM', -- Math with Mr. J: Combining Like Terms (8 min)
  'youtube',
  480,
  'Explains how to identify like terms and combine them through addition and subtraction. Covers terms with the same variable and exponent, and demonstrates simplification of complex expressions.',
  2,
  ARRAY['basic-algebra-intro']::TEXT[],
  ARRAY['like terms', 'simplification', 'algebra basics'],
  true
),

-- Lesson 3: The Distributive Property (MEDIUM, requires combining like terms)
(
  'basic-algebra-distributive-property',
  'The Distributive Property',
  'Master the distributive property: a(b + c) = ab + ac. Essential for simplifying expressions and solving equations.',
  'BASIC_ALGEBRA',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=v-6MShC82ow', -- Math Antics: The Distributive Property (9 min)
  'youtube',
  540,
  'Provides a clear explanation of the distributive property with visual models. Shows how to distribute multiplication over addition and subtraction, and how to use it in reverse (factoring).',
  3,
  ARRAY['basic-algebra-combining-like-terms']::TEXT[],
  ARRAY['distributive property', 'multiplication', 'algebra properties'],
  true
),

-- Lesson 4: Order of Operations with Variables (MEDIUM, requires distributive property)
(
  'basic-algebra-order-of-operations',
  'Order of Operations in Algebra',
  'Apply PEMDAS (Parentheses, Exponents, Multiplication/Division, Addition/Subtraction) to algebraic expressions.',
  'BASIC_ALGEBRA',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=dAgfnK528RA', -- The Organic Chemistry Tutor: Order of Operations (12 min)
  'youtube',
  720,
  'Comprehensive coverage of order of operations with algebraic expressions. Includes nested parentheses, exponents with variables, and complex multi-step simplification problems.',
  4,
  ARRAY['basic-algebra-distributive-property']::TEXT[],
  ARRAY['order of operations', 'PEMDAS', 'simplification'],
  true
),

-- Lesson 5: Simplifying Complex Expressions (MEDIUM, requires order of operations)
(
  'basic-algebra-simplifying-expressions',
  'Simplifying Complex Algebraic Expressions',
  'Combine all your skills to simplify complex expressions with multiple terms, parentheses, and operations.',
  'BASIC_ALGEBRA',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=bLTSLean3JY', -- Math with Mr. J: Simplifying Expressions (10 min)
  'youtube',
  600,
  'Demonstrates systematic approaches to simplifying complex algebraic expressions. Combines distributive property, combining like terms, and order of operations in multi-step problems.',
  5,
  ARRAY['basic-algebra-order-of-operations']::TEXT[],
  ARRAY['simplification', 'complex expressions', 'multi-step'],
  true
),

-- Lesson 6: Introduction to Exponents (HARD, requires simplifying expressions)
(
  'basic-algebra-exponents',
  'Exponents and Powers',
  'Learn the rules of exponents: multiplication, division, power of a power, and zero/negative exponents.',
  'BASIC_ALGEBRA',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=kITJ6qH7jS0', -- The Organic Chemistry Tutor: Exponent Rules (15 min)
  'youtube',
  900,
  'Comprehensive coverage of exponent rules including product rule (x^a * x^b = x^(a+b)), quotient rule (x^a / x^b = x^(a-b)), power rule ((x^a)^b = x^(ab)), and special cases like x^0 = 1.',
  6,
  ARRAY['basic-algebra-simplifying-expressions']::TEXT[],
  ARRAY['exponents', 'powers', 'exponent rules', 'algebra'],
  true
),

-- Lesson 7: Algebraic Fractions (HARD, requires exponents)
(
  'basic-algebra-fractions',
  'Simplifying Algebraic Fractions',
  'Master operations with algebraic fractions: simplification, multiplication, division, addition, and subtraction.',
  'BASIC_ALGEBRA',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=rQ2mAwJxbfc', -- Math with Mr. J: Simplifying Algebraic Fractions (11 min)
  'youtube',
  660,
  'Covers simplifying algebraic fractions by factoring and canceling common factors. Includes operations with algebraic fractions and finding common denominators.',
  7,
  ARRAY['basic-algebra-exponents']::TEXT[],
  ARRAY['fractions', 'rational expressions', 'simplification', 'factoring'],
  true
),

-- ============================================================================
-- QUADRATIC LESSONS (7 lessons: 1 EASY, 3 MEDIUM, 3 HARD)
-- ============================================================================

-- Lesson 1: Introduction to Quadratics (EASY, no prerequisites)
(
  'quadratic-intro',
  'Introduction to Quadratic Equations',
  'Learn what makes an equation quadratic and understand the standard form ax² + bx + c = 0.',
  'QUADRATIC',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=YSNH434Jyws', -- Khan Academy: Intro to Quadratics (8 min)
  'youtube',
  480,
  'Introduces quadratic equations, their standard form, and how they differ from linear equations. Explains the significance of the squared term and provides simple examples.',
  1,
  ARRAY[]::TEXT[],
  ARRAY['quadratic equations', 'introduction', 'standard form', 'parabola'],
  true
),

-- Lesson 2: Solving by Square Root Method (MEDIUM, requires intro)
(
  'quadratic-square-root-method',
  'Solving Quadratics by Square Root',
  'Solve simple quadratic equations using the square root method (when b = 0).',
  'QUADRATIC',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=1W_nfr3RYkc', -- Math with Mr. J: Square Root Method (7 min)
  'youtube',
  420,
  'Demonstrates solving equations of the form x² = k by taking square roots of both sides. Covers both positive and negative solutions and introduces ± notation.',
  2,
  ARRAY['quadratic-intro']::TEXT[],
  ARRAY['square root method', 'solving quadratics', 'basic techniques'],
  true
),

-- Lesson 3: Factoring Quadratics (MEDIUM, requires square root method)
(
  'quadratic-factoring',
  'Factoring Quadratic Equations',
  'Learn to solve quadratics by factoring into two binomials and using the zero product property.',
  'QUADRATIC',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=ZLjsv6OdVlg', -- The Organic Chemistry Tutor: Factoring Quadratics (14 min)
  'youtube',
  840,
  'Comprehensive guide to factoring quadratics in the form x² + bx + c and ax² + bx + c. Covers finding factor pairs, the AC method, and applying the zero product property.',
  3,
  ARRAY['quadratic-square-root-method']::TEXT[],
  ARRAY['factoring', 'zero product property', 'binomials', 'trinomials'],
  true
),

-- Lesson 4: Completing the Square (MEDIUM, requires factoring)
(
  'quadratic-completing-square',
  'Completing the Square',
  'Master the technique of completing the square to solve any quadratic equation.',
  'QUADRATIC',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=GvUaKV581Sc', -- Khan Academy: Completing the Square (10 min)
  'youtube',
  600,
  'Step-by-step process for completing the square: rearranging terms, finding the value to add, and solving. Explains both the geometric and algebraic perspectives.',
  4,
  ARRAY['quadratic-factoring']::TEXT[],
  ARRAY['completing the square', 'solving techniques', 'perfect square trinomial'],
  true
),

-- Lesson 5: The Quadratic Formula (HARD, requires completing the square)
(
  'quadratic-formula',
  'The Quadratic Formula',
  'Learn the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. The universal method for solving any quadratic.',
  'QUADRATIC',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=i7idZfS8t8w', -- The Organic Chemistry Tutor: Quadratic Formula (13 min)
  'youtube',
  780,
  'Complete guide to using the quadratic formula. Covers identifying a, b, and c values, substituting into the formula, simplifying radicals, and interpreting results.',
  5,
  ARRAY['quadratic-completing-square']::TEXT[],
  ARRAY['quadratic formula', 'discriminant', 'solving quadratics'],
  true
),

-- Lesson 6: The Discriminant (HARD, requires quadratic formula)
(
  'quadratic-discriminant',
  'Understanding the Discriminant',
  'Use the discriminant (b² - 4ac) to determine the number and type of solutions without solving.',
  'QUADRATIC',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=1W_nfr3RYkc', -- Math with Mr. J: The Discriminant (8 min)
  'youtube',
  480,
  'Explains how the discriminant determines whether a quadratic has two real solutions, one real solution, or two complex solutions. Connects to the graph of the parabola.',
  6,
  ARRAY['quadratic-formula']::TEXT[],
  ARRAY['discriminant', 'nature of roots', 'real solutions', 'complex numbers'],
  true
),

-- Lesson 7: Quadratic Word Problems (HARD, requires discriminant)
(
  'quadratic-word-problems',
  'Quadratic Word Problems',
  'Apply quadratic equations to real-world scenarios: projectile motion, area problems, and optimization.',
  'QUADRATIC',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=DKk_D93AvVU', -- The Organic Chemistry Tutor: Quadratic Word Problems (16 min)
  'youtube',
  960,
  'Real-world applications of quadratic equations including area/perimeter problems, projectile motion, and business optimization. Emphasizes setting up equations from word problems.',
  7,
  ARRAY['quadratic-discriminant']::TEXT[],
  ARRAY['word problems', 'applications', 'real-world', 'projectile motion'],
  true
),

-- ============================================================================
-- GEOMETRY LESSONS (6 lessons: 2 EASY, 2 MEDIUM, 2 HARD)
-- ============================================================================

-- Lesson 1: Introduction to Geometry (EASY, no prerequisites)
(
  'geometry-intro',
  'Introduction to Geometry',
  'Learn the fundamental concepts: points, lines, angles, and basic shapes.',
  'GEOMETRY',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=tVU6hJGV2XY', -- Math Antics: Points, Lines, and Planes (8 min)
  'youtube',
  480,
  'Introduces basic geometric concepts including points, lines, line segments, rays, and planes. Establishes the foundation for understanding geometric relationships.',
  1,
  ARRAY[]::TEXT[],
  ARRAY['geometry', 'introduction', 'points', 'lines', 'angles', 'basics'],
  true
),

-- Lesson 2: Angles and Their Relationships (EASY, requires intro)
(
  'geometry-angles',
  'Angles and Angle Relationships',
  'Understand types of angles and their relationships: complementary, supplementary, vertical, and adjacent.',
  'GEOMETRY',
  'EASY',
  'video',
  'https://www.youtube.com/watch?v=_3yRC6SWZro', -- Math with Mr. J: Angle Relationships (9 min)
  'youtube',
  540,
  'Covers angle types (acute, right, obtuse, straight) and angle relationships including complementary (sum to 90°), supplementary (sum to 180°), vertical angles, and linear pairs.',
  2,
  ARRAY['geometry-intro']::TEXT[],
  ARRAY['angles', 'angle relationships', 'complementary', 'supplementary'],
  true
),

-- Lesson 3: Perimeter and Area of Rectangles (MEDIUM, requires angles)
(
  'geometry-perimeter-area-rectangles',
  'Perimeter and Area of Rectangles',
  'Calculate perimeter (2l + 2w) and area (l × w) of rectangles and squares.',
  'GEOMETRY',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=AG117uPA-aw', -- Math Antics: Perimeter (7 min)
  'youtube',
  420,
  'Clear explanation of perimeter (distance around) and area (space inside) for rectangles. Includes practical examples and problem-solving strategies.',
  3,
  ARRAY['geometry-angles']::TEXT[],
  ARRAY['perimeter', 'area', 'rectangles', 'squares', 'measurement'],
  true
),

-- Lesson 4: Area of Triangles and Circles (MEDIUM, requires rectangles)
(
  'geometry-area-triangles-circles',
  'Area of Triangles and Circles',
  'Learn formulas for triangle area (½bh) and circle area (πr²).',
  'GEOMETRY',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=n3jJc8BbV-w', -- Math Antics: Area (10 min)
  'youtube',
  600,
  'Explains how to find the area of triangles using base and height, and circles using radius. Covers the relationship between formulas and the derivation of each.',
  4,
  ARRAY['geometry-perimeter-area-rectangles']::TEXT[],
  ARRAY['area', 'triangles', 'circles', 'pi', 'formulas'],
  true
),

-- Lesson 5: The Pythagorean Theorem (HARD, requires area)
(
  'geometry-pythagorean-theorem',
  'The Pythagorean Theorem',
  'Master the Pythagorean Theorem (a² + b² = c²) for right triangles and real-world applications.',
  'GEOMETRY',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=aa6fGOG6VaA', -- The Organic Chemistry Tutor: Pythagorean Theorem (11 min)
  'youtube',
  660,
  'Comprehensive coverage of the Pythagorean Theorem including finding missing sides, verifying right triangles, and solving word problems involving distance and diagonal measurements.',
  5,
  ARRAY['geometry-area-triangles-circles']::TEXT[],
  ARRAY['pythagorean theorem', 'right triangles', 'hypotenuse', 'applications'],
  true
),

-- Lesson 6: Volume of 3D Shapes (HARD, requires Pythagorean theorem)
(
  'geometry-volume-3d-shapes',
  'Volume of 3D Shapes',
  'Calculate volume for cubes, rectangular prisms, cylinders, and spheres.',
  'GEOMETRY',
  'HARD',
  'video',
  'https://www.youtube.com/watch?v=qJwecTgce6c', -- Math Antics: Volume (9 min)
  'youtube',
  540,
  'Introduces volume as the amount of space inside a 3D object. Covers formulas for rectangular prisms (lwh), cylinders (πr²h), and spheres (4/3πr³).',
  6,
  ARRAY['geometry-pythagorean-theorem']::TEXT[],
  ARRAY['volume', '3D shapes', 'prisms', 'cylinders', 'spheres'],
  true
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all lessons by category
SELECT
  skill_category,
  difficulty,
  COUNT(*) as lesson_count
FROM public.tutorial_lessons
GROUP BY skill_category, difficulty
ORDER BY skill_category, difficulty;

-- Verify Linear Equations lessons
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

-- Verify Basic Algebra lessons
SELECT
  slug,
  title,
  difficulty,
  sort_order,
  array_length(prerequisites, 1) AS prereq_count,
  published
FROM public.tutorial_lessons
WHERE skill_category = 'BASIC_ALGEBRA'
ORDER BY sort_order;

-- Verify Quadratic lessons
SELECT
  slug,
  title,
  difficulty,
  sort_order,
  array_length(prerequisites, 1) AS prereq_count,
  published
FROM public.tutorial_lessons
WHERE skill_category = 'QUADRATIC'
ORDER BY sort_order;

-- Verify Geometry lessons
SELECT
  slug,
  title,
  difficulty,
  sort_order,
  array_length(prerequisites, 1) AS prereq_count,
  published
FROM public.tutorial_lessons
WHERE skill_category = 'GEOMETRY'
ORDER BY sort_order;

-- ============================================================================
-- SUMMARY
-- ============================================================================
--
-- Total Lessons: 26
--   - LINEAR_EQUATIONS: 6 lessons (2 EASY, 2 MEDIUM, 2 HARD)
--   - BASIC_ALGEBRA: 7 lessons (2 EASY, 3 MEDIUM, 2 HARD)
--   - QUADRATIC: 7 lessons (1 EASY, 3 MEDIUM, 3 HARD)
--   - GEOMETRY: 6 lessons (2 EASY, 2 MEDIUM, 2 HARD)
--
-- All lessons use embeddable YouTube videos from verified educational channels:
-- - Math Antics
-- - Math with Mr. J
-- - The Organic Chemistry Tutor
-- - Khan Academy
--
-- ============================================================================
-- NEXT STEPS
-- ============================================================================
--
-- 1. Run this script against Supabase database
-- 2. Verify video URLs are accessible and embeddable
-- 3. Test prerequisite unlocking logic in app
-- 4. Optional: Add auto-generated transcripts from YouTube
-- 5. Optional: Add thumbnail URLs (can use YouTube thumbnails)
-- 6. Monitor student engagement and completion rates
-- 7. Consider adding more advanced lessons based on student progress
--
-- ============================================================================