# Tutorial Content Guide
# PR14: Tutorial Mode

**Created**: 2025-11-08
**Last Updated**: 2025-11-08

---

## Overview

This guide explains how to add, manage, and organize tutorial lessons in the Handwriting Math app. Tutorial Mode uses video-based Direct Instruction to teach math concepts before students practice.

---

## Table of Contents

1. [Adding New Lessons](#adding-new-lessons)
2. [Video Content Guidelines](#video-content-guidelines)
3. [Prerequisite Best Practices](#prerequisite-best-practices)
4. [Lesson Slug Naming Conventions](#lesson-slug-naming-conventions)
5. [Category Organization](#category-organization)
6. [Testing New Lessons](#testing-new-lessons)

---

## Adding New Lessons

### SQL Insert Template

```sql
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
) VALUES (
  'category-topic-descriptor',  -- Unique slug
  'Lesson Title',               -- Human-readable title
  'Brief description...',       -- 1-2 sentence summary
  'LINEAR_EQUATIONS',           -- ProblemCategory enum value
  'EASY',                       -- EASY | MEDIUM | HARD
  'video',                      -- video | interactive | text
  'https://youtube.com/...',    -- Full YouTube URL
  'youtube',                    -- youtube | cloudflare | custom
  480,                          -- Duration in seconds (8 min)
  'Transcript text...',         -- Full transcript (optional)
  1,                            -- Display order within category
  ARRAY[]::TEXT[],              -- Array of prerequisite slugs
  ARRAY['tag1', 'tag2'],        -- Searchable tags
  true                          -- Published (true | false)
);
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | TEXT | ✅ | URL-friendly unique identifier (see naming conventions below) |
| `title` | TEXT | ✅ | Human-readable lesson title (max 100 chars) |
| `description` | TEXT | ❌ | Brief summary shown in lesson cards |
| `skill_category` | TEXT | ✅ | Must match `ProblemCategory` enum: `LINEAR_EQUATIONS`, `BASIC_ALGEBRA`, `QUADRATIC`, `GEOMETRY` |
| `difficulty` | TEXT | ✅ | `EASY`, `MEDIUM`, or `HARD` |
| `content_type` | TEXT | ✅ | `video` (only supported type currently) |
| `video_url` | TEXT | ✅ | Full YouTube URL (e.g., `https://www.youtube.com/watch?v=abc123`) |
| `video_platform` | TEXT | ❌ | Defaults to `youtube` |
| `duration_seconds` | INTEGER | ❌ | Video length in seconds (for progress tracking) |
| `transcript` | TEXT | ❌ | Full transcript for accessibility (auto-generated or manual) |
| `sort_order` | INTEGER | ✅ | Display order within category (0 = first, 1 = second, etc.) |
| `prerequisites` | TEXT[] | ❌ | Array of lesson slugs that must be completed before this lesson unlocks |
| `tags` | TEXT[] | ❌ | Keywords for search and filtering |
| `published` | BOOLEAN | ✅ | `true` to show in app, `false` to hide |

---

## Video Content Guidelines

### Recommended Sources

#### Phase 1: YouTube Embeds (Current)
- **Khan Academy** - Free, high-quality, comprehensive math curriculum
  - URL: https://www.khanacademy.org/math
  - License: Creative Commons (free to embed)
  - Coverage: All categories (Algebra, Geometry, Quadratic, etc.)

- **Math Antics** - Engaging explanations with animations
  - URL: https://mathantics.com/
  - License: Free to embed for educational use
  - Coverage: Basic algebra, fractions, geometry

- **Professor Leonard** - Detailed college-level explanations
  - URL: https://www.youtube.com/user/professorleonard57
  - Coverage: Advanced algebra, calculus prerequisites

#### Phase 2: Custom Content (Future)
- Record branded videos with consistent style
- Interactive elements (clickable examples, quizzes)
- Host on Cloudflare Stream or Supabase Storage

### Video Quality Requirements

✅ **Good Video Characteristics:**
- Clear audio (no background noise)
- Visible handwriting or annotations
- Paced for learning (not too fast)
- Step-by-step progression
- 5-15 minute duration (ideal)
- Closed captions available

❌ **Avoid:**
- Videos longer than 20 minutes (split into parts)
- Poor audio quality
- Cluttered visuals
- Assumes prior knowledge not covered in prerequisites
- No captions/transcript

### Finding YouTube Video IDs

Extract the video ID from YouTube URLs:
- Full URL: `https://www.youtube.com/watch?v=abc123` → ID: `abc123`
- Short URL: `https://youtu.be/abc123` → ID: `abc123`
- Embed URL: `https://www.youtube.com/embed/abc123` → ID: `abc123`

Store the **full URL** in `video_url` field (the app will extract the ID automatically).

---

## Prerequisite Best Practices

### Unlocking Logic

Lessons unlock when **ALL** prerequisites are completed:

```sql
-- Example: Lesson 4 requires Lessons 1, 2, and 3
prerequisites = ARRAY['lesson-1-slug', 'lesson-2-slug', 'lesson-3-slug']
```

### Prerequisite Patterns

#### Linear Progression (Recommended)
Each lesson requires only the previous lesson:
```
Lesson 1 (no prereqs) → Lesson 2 (requires L1) → Lesson 3 (requires L2)
```

#### Branching
Multiple prerequisites for advanced topics:
```
Lesson 1 ──┐
           ├─→ Lesson 3 (requires L1 + L2)
Lesson 2 ──┘
```

#### No Prerequisites
Intro lessons or standalone topics:
```sql
prerequisites = ARRAY[]::TEXT[]
```

### Rules

1. **Always specify at least one prerequisite-free lesson per category** (entry point)
2. **Use slugs, not IDs** in prerequisite arrays (slugs are stable, IDs may change)
3. **Avoid circular dependencies** (Lesson A requires B, B requires A)
4. **Test prerequisite chains** before publishing

---

## Lesson Slug Naming Conventions

### Format
```
{category}-{topic}-{descriptor}
```

### Examples

| Category | Topic | Descriptor | Slug |
|----------|-------|------------|------|
| Linear Equations | Introduction | N/A | `linear-equations-intro` |
| Linear Equations | One-step | N/A | `linear-equations-one-step` |
| Linear Equations | Two-step | N/A | `linear-equations-two-step` |
| Basic Algebra | Distributive | Property | `basic-algebra-distributive-property` |
| Quadratic | Factoring | Basics | `quadratic-factoring-basics` |
| Geometry | Pythagorean | Theorem | `geometry-pythagorean-theorem` |

### Rules

1. **All lowercase**
2. **Use hyphens** (not underscores or spaces)
3. **Start with category** (for easy grouping)
4. **Be descriptive but concise** (max 50 chars)
5. **Avoid special characters** (letters, numbers, hyphens only)

---

## Category Organization

### Current Categories

| Category | Slug | Description |
|----------|------|-------------|
| Linear Equations | `LINEAR_EQUATIONS` | One-variable equations, solving for x |
| Basic Algebra | `BASIC_ALGEBRA` | Distributive property, like terms, simplification |
| Quadratic | `QUADRATIC` | Quadratic equations, factoring, quadratic formula |
| Geometry | `GEOMETRY` | Shapes, area, perimeter, Pythagorean theorem |

### Recommended Lesson Counts

| Category | Easy | Medium | Hard | Total |
|----------|------|--------|------|-------|
| Linear Equations | 2 | 2 | 2 | 6 |
| Basic Algebra | 2 | 3 | 2 | 7 |
| Quadratic | 1 | 3 | 3 | 7 |
| Geometry | 2 | 2 | 2 | 6 |

### Problem Unlocking Rules

Based on lesson completion count per category:

| Difficulty | Lessons Required |
|------------|------------------|
| EASY | 1+ lesson complete |
| MEDIUM | 2+ lessons complete |
| HARD | All lessons complete |

**Example:**
- Student completes 1 LINEAR_EQUATIONS lesson → unlocks EASY linear equations problems
- Student completes 2 LINEAR_EQUATIONS lessons → unlocks EASY + MEDIUM problems
- Student completes all 6 LINEAR_EQUATIONS lessons → unlocks EASY + MEDIUM + HARD problems

---

## Testing New Lessons

### Before Publishing

1. **Preview video** - Ensure it loads and plays correctly
2. **Check transcript** - Verify accuracy (auto-generate from YouTube if needed)
3. **Test prerequisites** - Confirm unlocking logic works as expected
4. **Verify duration** - Ensure `duration_seconds` matches video length
5. **Test on device** - Load in app, check rendering and controls

### Testing Checklist

```sql
-- 1. Verify lesson appears in query
SELECT slug, title, difficulty, sort_order, prerequisites
FROM public.tutorial_lessons
WHERE skill_category = 'LINEAR_EQUATIONS'
ORDER BY sort_order;

-- 2. Check prerequisite chain
WITH RECURSIVE prereq_chain AS (
  SELECT slug, title, prerequisites, 0 AS depth
  FROM public.tutorial_lessons
  WHERE slug = 'your-lesson-slug'
  
  UNION ALL
  
  SELECT tl.slug, tl.title, tl.prerequisites, pc.depth + 1
  FROM public.tutorial_lessons tl
  JOIN prereq_chain pc ON tl.slug = ANY(pc.prerequisites)
)
SELECT * FROM prereq_chain ORDER BY depth;

-- 3. Verify no circular dependencies
-- (Manual check: ensure no lesson appears in its own prerequisite chain)
```

### In-App Testing

1. Navigate to **Tutorial Library** screen
2. Select category filter
3. Verify lesson appears in correct sort order
4. Confirm lock icon if prerequisites not met
5. Complete prerequisite lessons
6. Verify lesson unlocks
7. Test video playback, speed control, progress tracking
8. Complete lesson → verify problems unlock

---

## Appendix: Sample Lesson (Full)

```sql
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
) VALUES (
  'linear-equations-two-step',
  'Solving Two-Step Equations',
  'Build on one-step equations by learning to solve equations that require two operations. Master the strategy of undoing operations in reverse order.',
  'LINEAR_EQUATIONS',
  'MEDIUM',
  'video',
  'https://www.youtube.com/watch?v=tLXPdQlgPIs',
  'youtube',
  540,
  'Two-step equations require two operations to solve. The strategy is to undo addition or subtraction first, then undo multiplication or division. For example, to solve 2x + 5 = 15, we first subtract 5 from both sides to get 2x = 10, then divide both sides by 2 to get x = 5. This follows the reverse order of operations.',
  3,
  ARRAY['linear-equations-one-step']::TEXT[],
  ARRAY['two-step equations', 'multi-step', 'order of operations', 'algebra'],
  true
);
```

---

## Questions?

For issues or suggestions, contact the development team or create a GitHub issue with the `tutorial-content` label.