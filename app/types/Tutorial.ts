/**
 * Tutorial Types
 *
 * Type definitions for Direct Instruction tutorial mode (PR14).
 * Supports video lessons, progress tracking, and prerequisite unlocking.
 */

import { ProblemCategory, ProblemDifficulty } from './Problem';

/**
 * Tutorial content types
 */
export enum TutorialContentType {
  VIDEO = 'video',
  INTERACTIVE = 'interactive', // Future: code-based diagrams
  TEXT = 'text', // Future: article-style lessons
}

/**
 * Video platform types
 */
export enum VideoPlatform {
  YOUTUBE = 'youtube',
  CLOUDFLARE = 'cloudflare', // Future
  CUSTOM = 'custom', // Future
}

/**
 * Tutorial lesson metadata
 */
export interface TutorialLesson {
  id: string;
  slug: string; // URL-friendly identifier (e.g., "linear-equations-intro")
  title: string;
  description: string | null;
  skillCategory: ProblemCategory; // Maps to problem categories
  difficulty: ProblemDifficulty;
  contentType: TutorialContentType;
  videoUrl: string | null; // YouTube URL or other platform
  videoPlatform: VideoPlatform;
  durationSeconds: number | null;
  transcript: string | null; // Full transcript for accessibility
  interactiveContent: Record<string, any> | null; // Future: interactive elements
  sortOrder: number; // Display order within category
  prerequisites: string[]; // Array of lesson slugs required before this one
  tags: string[]; // For search and categorization
  thumbnailUrl: string | null;
  createdAt: number;
  updatedAt: number;
  published: boolean;
}

/**
 * Lesson progress status
 */
export enum LessonProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

/**
 * User progress for a single lesson
 */
export interface TutorialProgress {
  id: string;
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  progressPercent: number; // 0-100
  videoPositionSeconds: number; // Resume position
  startedAt: number | null;
  completedAt: number | null;
  timeSpentSeconds: number; // Total watch time
  lastWatchedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Lesson prerequisite relationship
 */
export interface LessonPrerequisite {
  lessonId: string;
  prerequisiteSlug: string;
  isCompleted: boolean;
}

/**
 * Video player state
 */
export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number; // 0.5, 1.0, 1.5, 2.0
  volume: number; // 0-1
  isMuted: boolean;
  isFullscreen: boolean;
}

/**
 * Lesson completion criteria
 */
export interface CompletionCriteria {
  minWatchPercent: number; // Default: 80%
  allowSkipping: boolean; // Default: true for MVP
  requireQuiz: boolean; // Future: false for MVP
}

/**
 * Tutorial category with lessons
 */
export interface LessonCategory {
  category: ProblemCategory;
  displayName: string;
  description: string;
  lessons: TutorialLesson[];
  totalLessons: number;
  completedLessons: number;
  completionPercent: number;
}

/**
 * Tutorial store state (for tutorialStore.ts)
 */
export interface TutorialStoreState {
  // Lesson library
  lessons: TutorialLesson[];
  lessonsLoading: boolean;
  lessonsError: string | null;

  // User progress
  progress: Map<string, TutorialProgress>; // lessonId -> progress

  // Current lesson
  currentLesson: TutorialLesson | null;
  videoPlayerState: VideoPlayerState;

  // Filtering and search
  selectedCategory: ProblemCategory | null;
  searchQuery: string;

  // Actions (to be implemented in store)
  fetchLessons: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  startLesson: (lessonId: string) => void;
  updateVideoPosition: (seconds: number) => void;
  completeLesson: (lessonId: string) => Promise<void>;
  isLessonUnlocked: (lessonId: string) => boolean;
  getUnlockedProblems: (category: ProblemCategory) => string[];
}

/**
 * Lesson unlock rules
 */
export interface UnlockRules {
  category: ProblemCategory;
  difficulty: ProblemDifficulty;
  requiredCompletedLessons: number; // How many lessons in category must be complete
}

/**
 * Tutorial sync payload (for cloud storage)
 */
export interface TutorialProgressSyncPayload {
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  progressPercent: number;
  videoPositionSeconds: number;
  timeSpentSeconds: number;
  lastWatchedAt: number;
}
