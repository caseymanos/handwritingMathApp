/**
 * Tutorial Store
 *
 * Manages tutorial lessons, user progress, video playback state, and unlocking logic.
 * Persists progress to MMKV and syncs to Supabase.
 */

import { create } from 'zustand';
import { storage } from '../utils/storage';
import {
  TutorialLesson,
  TutorialProgress,
  TutorialLessonStatus,
} from '../types/Tutorial';
import {
  fetchTutorialLessons,
  fetchTutorialProgress,
  startLesson as syncStartLesson,
  updateVideoPosition as syncUpdateVideoPosition,
  completeLesson as syncCompleteLesson,
  isLessonUnlocked as checkLessonUnlocked,
} from '../utils/sync/tutorialSync';
import { Problem, ProblemCategory } from '../types/Problem';
import { captureException, addBreadcrumb } from '../utils/sentry';

const STORAGE_KEY = 'tutorial_store';
const LESSONS_CACHE_KEY = 'tutorial_lessons_cache';
const LESSONS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const VIDEO_POSITION_DEBOUNCE_MS = 5000; // 5 seconds

interface TutorialStoreState {
  // Lesson library
  lessons: TutorialLesson[];
  lessonsLoading: boolean;
  lessonsError: string | null;

  // User progress
  progress: Map<string, TutorialProgress>;
  progressLoading: boolean;

  // Current lesson state
  currentLesson: TutorialLesson | null;
  videoPosition: number;
  isPlaying: boolean;
  playbackRate: number;

  // Video position auto-save
  lastPositionSaveTime: number;
  positionSaveTimer: NodeJS.Timeout | null;

  // Actions
  fetchLessons: () => Promise<void>;
  fetchProgress: () => Promise<void>;
  startLesson: (lessonId: string) => Promise<void>;
  updateVideoPosition: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsPlaying: (playing: boolean) => void;
  completeLesson: (lessonId: string) => Promise<void>;
  isLessonUnlocked: (lessonId: string) => boolean;
  getUnlockedProblems: (category: ProblemCategory, allProblems: Problem[]) => Problem[];
  getLessonProgress: (lessonId: string) => TutorialProgress | null;
  getCategoryProgress: (category: ProblemCategory) => { completed: number; total: number };
  reset: () => void;
}

/**
 * Load persisted progress from MMKV
 */
function loadPersistedProgress(): Map<string, TutorialProgress> {
  try {
    const stored = storage.getString(STORAGE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed));
  } catch (error) {
    console.error('[TutorialStore] Failed to load persisted progress:', error);
    return new Map();
  }
}

/**
 * Save progress to MMKV
 */
function saveProgress(progress: Map<string, TutorialProgress>): void {
  try {
    const obj = Object.fromEntries(progress);
    storage.set(STORAGE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error('[TutorialStore] Failed to save progress:', error);
    captureException(error as Error, { context: 'TutorialStore.saveProgress' });
  }
}

/**
 * Load cached lessons from MMKV
 */
function loadCachedLessons(): TutorialLesson[] | null {
  try {
    const cached = storage.getString(LESSONS_CACHE_KEY);
    if (!cached) return null;

    const { lessons, cachedAt } = JSON.parse(cached);
    const age = Date.now() - cachedAt;

    if (age > LESSONS_CACHE_TTL) {
      console.log('[TutorialStore] Lessons cache expired');
      return null;
    }

    console.log('[TutorialStore] Loaded cached lessons:', lessons.length);
    return lessons;
  } catch (error) {
    console.error('[TutorialStore] Failed to load cached lessons:', error);
    return null;
  }
}

/**
 * Cache lessons to MMKV
 */
function cacheLessons(lessons: TutorialLesson[]): void {
  try {
    storage.set(
      LESSONS_CACHE_KEY,
      JSON.stringify({
        lessons,
        cachedAt: Date.now(),
      })
    );
  } catch (error) {
    console.error('[TutorialStore] Failed to cache lessons:', error);
  }
}

export const useTutorialStore = create<TutorialStoreState>((set, get) => ({
  // Initial state
  lessons: loadCachedLessons() || [],
  lessonsLoading: false,
  lessonsError: null,
  progress: loadPersistedProgress(),
  progressLoading: false,
  currentLesson: null,
  videoPosition: 0,
  isPlaying: false,
  playbackRate: 1,
  lastPositionSaveTime: 0,
  positionSaveTimer: null,

  /**
   * Fetch all tutorial lessons from Supabase
   */
  fetchLessons: async () => {
    set({ lessonsLoading: true, lessonsError: null });

    try {
      const lessons = await fetchTutorialLessons();
      set({ lessons, lessonsLoading: false });
      cacheLessons(lessons);
      addBreadcrumb('Lessons fetched', 'tutorial', { count: lessons.length });
    } catch (error) {
      console.error('[TutorialStore] Failed to fetch lessons:', error);
      set({
        lessonsError: (error as Error).message,
        lessonsLoading: false,
      });
      captureException(error as Error, { context: 'TutorialStore.fetchLessons' });
    }
  },

  /**
   * Fetch user's tutorial progress from Supabase
   */
  fetchProgress: async () => {
    set({ progressLoading: true });

    try {
      const progressArray = await fetchTutorialProgress();
      const progressMap = new Map(progressArray.map((p) => [p.lessonId, p]));

      set({ progress: progressMap, progressLoading: false });
      saveProgress(progressMap);
      addBreadcrumb('Progress fetched', 'tutorial', { count: progressArray.length });
    } catch (error) {
      console.error('[TutorialStore] Failed to fetch progress:', error);
      set({ progressLoading: false });
      captureException(error as Error, { context: 'TutorialStore.fetchProgress' });
    }
  },

  /**
   * Start a lesson (load current lesson and resume from saved position)
   */
  startLesson: async (lessonId: string) => {
    const { lessons, progress } = get();
    const lesson = lessons.find((l) => l.id === lessonId);

    if (!lesson) {
      console.error('[TutorialStore] Lesson not found:', lessonId);
      return;
    }

    // Get or create progress entry
    let lessonProgress = progress.get(lessonId);
    const resumePosition = lessonProgress?.videoPositionSeconds || 0;

    set({
      currentLesson: lesson,
      videoPosition: resumePosition,
      isPlaying: false,
    });

    try {
      // Sync lesson start to Supabase
      lessonProgress = await syncStartLesson(lessonId);
      const newProgress = new Map(progress);
      newProgress.set(lessonId, lessonProgress);

      set({ progress: newProgress });
      saveProgress(newProgress);
      addBreadcrumb('Lesson started', 'tutorial', { lessonId, resumePosition });
    } catch (error) {
      console.error('[TutorialStore] Failed to sync lesson start:', error);
      captureException(error as Error, { context: 'TutorialStore.startLesson', lessonId });
    }
  },

  /**
   * Update video position (debounced auto-save every 5 seconds)
   */
  updateVideoPosition: (seconds: number) => {
    const { currentLesson, positionSaveTimer, lastPositionSaveTime } = get();
    if (!currentLesson) return;

    set({ videoPosition: seconds });

    // Debounce: only save if 5 seconds have passed since last save
    const now = Date.now();
    if (now - lastPositionSaveTime < VIDEO_POSITION_DEBOUNCE_MS) {
      // Clear existing timer and set new one
      if (positionSaveTimer) {
        clearTimeout(positionSaveTimer);
      }

      const timer = setTimeout(() => {
        get().saveVideoPositionNow(currentLesson.id, seconds);
      }, VIDEO_POSITION_DEBOUNCE_MS);

      set({ positionSaveTimer: timer });
      return;
    }

    // Save immediately if debounce window passed
    get().saveVideoPositionNow(currentLesson.id, seconds);
  },

  /**
   * Internal: Save video position immediately (called by debounce)
   */
  saveVideoPositionNow: async (lessonId: string, seconds: number) => {
    const { progress } = get();

    try {
      const updatedProgress = await syncUpdateVideoPosition(lessonId, seconds);
      const newProgress = new Map(progress);
      newProgress.set(lessonId, updatedProgress);

      set({
        progress: newProgress,
        lastPositionSaveTime: Date.now(),
      });
      saveProgress(newProgress);
      console.log('[TutorialStore] Video position saved:', seconds);
    } catch (error) {
      console.error('[TutorialStore] Failed to save video position:', error);
      captureException(error as Error, { context: 'TutorialStore.saveVideoPosition', lessonId });
    }
  },

  /**
   * Set playback rate (1x, 1.25x, 1.5x, 2x)
   */
  setPlaybackRate: (rate: number) => {
    set({ playbackRate: rate });
    addBreadcrumb('Playback rate changed', 'tutorial', { rate });
  },

  /**
   * Set playing state
   */
  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  /**
   * Complete a lesson (mark as completed)
   */
  completeLesson: async (lessonId: string) => {
    const { progress } = get();

    try {
      const updatedProgress = await syncCompleteLesson(lessonId);
      const newProgress = new Map(progress);
      newProgress.set(lessonId, updatedProgress);

      set({ progress: newProgress });
      saveProgress(newProgress);
      addBreadcrumb('Lesson completed', 'tutorial', { lessonId });
      console.log('[TutorialStore] Lesson completed:', lessonId);
    } catch (error) {
      console.error('[TutorialStore] Failed to complete lesson:', error);
      captureException(error as Error, { context: 'TutorialStore.completeLesson', lessonId });
      throw error;
    }
  },

  /**
   * Check if a lesson is unlocked (based on prerequisites)
   */
  isLessonUnlocked: (lessonId: string) => {
    const { lessons, progress } = get();
    return checkLessonUnlocked(lessonId, lessons, progress);
  },

  /**
   * Get unlocked problems for a category based on lesson completion
   * Rules:
   * - Easy: 1+ lessons complete in category
   * - Medium: 2+ lessons complete in category
   * - Hard: All lessons complete in category
   */
  getUnlockedProblems: (category: ProblemCategory, allProblems: Problem[]) => {
    const { lessons, progress } = get();

    // Get lessons for this category
    const categoryLessons = lessons.filter((l) => l.skillCategory === category);
    const completedCount = categoryLessons.filter(
      (l) => progress.get(l.id)?.status === TutorialLessonStatus.COMPLETED
    ).length;

    // Filter problems by unlocking rules
    return allProblems.filter((p) => {
      if (p.category !== category) return false;

      switch (p.difficulty) {
        case 'EASY':
          return completedCount >= 1;
        case 'MEDIUM':
          return completedCount >= 2;
        case 'HARD':
          return completedCount >= categoryLessons.length;
        default:
          return false;
      }
    });
  },

  /**
   * Get progress for a specific lesson
   */
  getLessonProgress: (lessonId: string) => {
    return get().progress.get(lessonId) || null;
  },

  /**
   * Get completion stats for a category
   */
  getCategoryProgress: (category: ProblemCategory) => {
    const { lessons, progress } = get();
    const categoryLessons = lessons.filter((l) => l.skillCategory === category);
    const completed = categoryLessons.filter(
      (l) => progress.get(l.id)?.status === TutorialLessonStatus.COMPLETED
    ).length;

    return { completed, total: categoryLessons.length };
  },

  /**
   * Reset store (for testing or logout)
   */
  reset: () => {
    const { positionSaveTimer } = get();
    if (positionSaveTimer) {
      clearTimeout(positionSaveTimer);
    }

    set({
      lessons: [],
      lessonsLoading: false,
      lessonsError: null,
      progress: new Map(),
      progressLoading: false,
      currentLesson: null,
      videoPosition: 0,
      isPlaying: false,
      playbackRate: 1,
      lastPositionSaveTime: 0,
      positionSaveTimer: null,
    });

    storage.delete(STORAGE_KEY);
    storage.delete(LESSONS_CACHE_KEY);
  },
}));

// Add missing method to state interface
interface TutorialStoreState {
  saveVideoPositionNow: (lessonId: string, seconds: number) => Promise<void>;
}