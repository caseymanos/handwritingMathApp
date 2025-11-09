/**
 * Tutorial Types
 *
 * Type definitions for tutorial lessons, progress tracking, and video playback.
 * Used for Tutorial Mode (PR14).
 */

import { ProblemCategory, ProblemDifficulty } from './Problem';

// Re-export for convenience
export { ProblemCategory, ProblemDifficulty };

/**
 * Content type for lessons
 */
export enum TutorialContentType {
  VIDEO = 'video',
  INTERACTIVE = 'interactive',
  TEXT = 'text',
}

/**
 * Video platform for hosting
 */
export enum VideoPlatform {
  YOUTUBE = 'youtube',
  CLOUDFLARE = 'cloudflare',
  CUSTOM = 'custom',
}

/**
 * Lesson completion status
 */
export enum TutorialLessonStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * Tutorial lesson metadata
 */
export interface TutorialLesson {
  /** Unique lesson ID */
  id: string;

  /** URL-friendly slug (e.g., "linear-equations-intro") */
  slug: string;

  /** Lesson title */
  title: string;

  /** Description/summary */
  description: string | null;

  /** Skill category this lesson teaches */
  skillCategory: ProblemCategory;

  /** Difficulty level */
  difficulty: ProblemDifficulty;

  /** Content type */
  contentType: TutorialContentType;

  /** Video URL (YouTube URL or custom) */
  videoUrl: string;

  /** Video platform */
  videoPlatform: VideoPlatform;

  /** Duration in seconds */
  durationSeconds: number | null;

  /** Full transcript for accessibility */
  transcript: string | null;

  /** Interactive content (for future use) */
  interactiveContent: any | null;

  /** Display order within category */
  sortOrder: number;

  /** Prerequisites (array of lesson slugs) */
  prerequisites: string[];

  /** Tags for search/filtering */
  tags: string[];

  /** Thumbnail URL */
  thumbnailUrl: string | null;

  /** Is published? */
  published: boolean;

  /** Created timestamp */
  createdAt: number;

  /** Updated timestamp */
  updatedAt: number;
}

/**
 * User progress for a lesson
 */
export interface TutorialProgress {
  /** Unique progress ID */
  id: string;

  /** User ID */
  userId: string;

  /** Lesson ID */
  lessonId: string;

  /** Completion status */
  status: TutorialLessonStatus;

  /** Progress percentage (0-100) */
  progressPercent: number;

  /** Video position for resume (seconds) */
  videoPositionSeconds: number;

  /** When lesson was started */
  startedAt: number | null;

  /** When lesson was completed */
  completedAt: number | null;

  /** Total time spent (seconds) */
  timeSpentSeconds: number;

  /** Last watched timestamp */
  lastWatchedAt: number | null;

  /** Created timestamp */
  createdAt: number;

  /** Updated timestamp */
  updatedAt: number;
}

/**
 * Tutorial session (for analytics)
 */
export interface TutorialSession {
  /** Session ID */
  id: string;

  /** User ID */
  userId: string;

  /** Lesson ID */
  lessonId: string;

  /** Session start time */
  startedAt: number;

  /** Session end time */
  endedAt: number | null;

  /** Watch time in this session (seconds) */
  watchTimeSeconds: number;

  /** Video position at session start */
  startPosition: number;

  /** Video position at session end */
  endPosition: number | null;

  /** Did user complete lesson in this session? */
  completed: boolean;
}

/**
 * Category progress summary
 */
export interface CategoryProgress {
  /** Category */
  category: ProblemCategory;

  /** Total lessons in category */
  totalLessons: number;

  /** Completed lessons */
  completedLessons: number;

  /** In-progress lessons */
  inProgressLessons: number;

  /** Completion percentage */
  completionPercent: number;

  /** Total watch time (seconds) */
  totalWatchTime: number;
}

/**
 * Overall tutorial progress
 */
export interface OverallTutorialProgress {
  /** Total lessons */
  totalLessons: number;

  /** Completed lessons */
  completedLessons: number;

  /** In-progress lessons */
  inProgressLessons: number;

  /** Completion percentage */
  completionPercent: number;

  /** Total watch time (seconds) */
  totalWatchTime: number;

  /** Progress by category */
  byCategory: Record<ProblemCategory, CategoryProgress>;

  /** Last activity timestamp */
  lastActivity: number | null;
}
