/**
 * Progress Store
 *
 * Zustand store for managing student progress, attempt history, and learning analytics.
 * Tracks all problem attempts, completion status, and performance metrics.
 * Persists to MMKV for offline access and cloud sync preparation.
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import {
  Attempt,
  Step,
  AttemptSummary,
  ProblemProgress,
  StudentProgress,
} from '../types/Attempt';
import { storage } from '../utils/storage';

/**
 * Storage keys for MMKV persistence
 */
const STORAGE_KEYS = {
  ATTEMPTS: '@progress:attempts',
  CURRENT_ATTEMPT: '@progress:current_attempt',
  PROBLEM_PROGRESS: '@progress:problem_progress',
  SESSION_ID: '@progress:session_id',
  STATS: '@progress:stats',
};

/**
 * Progress store state interface
 */
interface ProgressStoreState {
  // Current session
  currentAttempt: Attempt | null;
  currentSessionId: string;
  sessionStartTime: number;

  // Attempt history
  attempts: Attempt[];
  attemptCount: number;

  // Problem progress tracking
  completedProblems: Set<string>;
  problemProgress: Record<string, ProblemProgress>;

  // Analytics & statistics
  totalCorrectSteps: number;
  totalIncorrectSteps: number;
  totalHintsRequested: number;
  totalTime: number;
  averageStepTime: number;
  lastActivityTime: number;

  // Actions: Attempt management
  startAttempt: (problemId: string) => void;
  endAttempt: (solved: boolean) => void;
  addStepToAttempt: (step: Step) => void;
  updateAttemptMetadata: (metadata: Record<string, any>) => void;

  // Actions: Query & retrieval
  getAttemptHistory: (problemId?: string) => Attempt[];
  getAttemptById: (attemptId: string) => Attempt | null;
  getProblemStats: (problemId: string) => ProblemProgress | null;
  getRecentAttempts: (limit?: number) => Attempt[];
  getStudentProgress: () => StudentProgress;
  getAttemptSummary: (attemptId: string) => AttemptSummary | null;

  // Actions: Analytics
  updateStats: () => void;
  calculateAccuracyRate: () => number;
  calculateAverageTime: (problemId?: string) => number;
  getTotalProblemsAttempted: () => number;
  getTotalProblemsSolved: () => number;

  // Actions: Data management
  clearHistory: () => void;
  clearProblemHistory: (problemId: string) => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
  reset: () => void;

  // Actions: Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

/**
 * Generate unique attempt ID
 */
function generateAttemptId(): string {
  return `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  const stored = storage.getString(STORAGE_KEYS.SESSION_ID);
  if (stored) {
    return stored;
  }

  const newSessionId = generateSessionId();
  storage.set(STORAGE_KEYS.SESSION_ID, newSessionId);
  return newSessionId;
}

/**
 * Initial state
 */
const initialState = {
  currentAttempt: null,
  currentSessionId: getSessionId(),
  sessionStartTime: Date.now(),
  attempts: [],
  attemptCount: 0,
  completedProblems: new Set<string>(),
  problemProgress: {},
  totalCorrectSteps: 0,
  totalIncorrectSteps: 0,
  totalHintsRequested: 0,
  totalTime: 0,
  averageStepTime: 0,
  lastActivityTime: Date.now(),
};

/**
 * Progress store
 */
export const useProgressStore = create<ProgressStoreState>((set, get) => ({
  ...initialState,

  // Attempt management
  startAttempt: (problemId: string) => {
    const attemptId = generateAttemptId();
    const startTime = Date.now();

    const newAttempt: Attempt = {
      id: attemptId,
      problemId,
      steps: [],
      startTime,
      endTime: null,
      completed: false,
      solved: false,
      hintsRequested: 0,
      hintHistory: [],
      totalTime: 0,
      deviceInfo: {
        platform: Platform.OS as 'ios' | 'android',
        deviceType: 'tablet', // Default for iPad
        osVersion: Platform.Version.toString(),
      },
      metadata: {
        sessionId: get().currentSessionId,
      },
    };

    set({
      currentAttempt: newAttempt,
      lastActivityTime: startTime,
    });

    console.log('[ProgressStore] Started attempt:', attemptId, 'for problem:', problemId);
  },

  endAttempt: (solved: boolean) => {
    const state = get();
    const { currentAttempt } = state;

    if (!currentAttempt) {
      console.warn('[ProgressStore] No current attempt to end');
      return;
    }

    const endTime = Date.now();
    const totalTime = endTime - currentAttempt.startTime;

    const completedAttempt: Attempt = {
      ...currentAttempt,
      endTime,
      completed: true,
      solved,
      totalTime,
    };

    // Add to attempts history
    const updatedAttempts = [...state.attempts, completedAttempt];

    // Update problem progress
    const problemId = currentAttempt.problemId;
    const existingProgress = state.problemProgress[problemId];

    const problemProgress: ProblemProgress = {
      problemId,
      attempts: (existingProgress?.attempts || 0) + 1,
      solved: solved || existingProgress?.solved || false,
      bestTime: solved
        ? Math.min(totalTime, existingProgress?.bestTime || Infinity)
        : existingProgress?.bestTime || null,
      averageSteps:
        ((existingProgress?.averageSteps || 0) * (existingProgress?.attempts || 0) +
          currentAttempt.steps.length) /
        ((existingProgress?.attempts || 0) + 1),
      firstAttemptDate: existingProgress?.firstAttemptDate || currentAttempt.startTime,
      lastAttemptDate: endTime,
    };

    // Update completed problems set
    const updatedCompletedProblems = new Set(state.completedProblems);
    if (solved) {
      updatedCompletedProblems.add(problemId);
    }

    set({
      currentAttempt: null,
      attempts: updatedAttempts,
      attemptCount: state.attemptCount + 1,
      completedProblems: updatedCompletedProblems,
      problemProgress: {
        ...state.problemProgress,
        [problemId]: problemProgress,
      },
      lastActivityTime: endTime,
    });

    // Update statistics
    get().updateStats();

    // Persist to storage
    get().saveToStorage();

    console.log('[ProgressStore] Ended attempt:', completedAttempt.id, 'solved:', solved);
  },

  addStepToAttempt: (step: Step) => {
    const state = get();
    const { currentAttempt } = state;

    if (!currentAttempt) {
      console.warn('[ProgressStore] No current attempt to add step to');
      return;
    }

    const updatedAttempt: Attempt = {
      ...currentAttempt,
      steps: [...currentAttempt.steps, step],
    };

    set({
      currentAttempt: updatedAttempt,
      lastActivityTime: Date.now(),
    });
  },

  updateAttemptMetadata: (metadata: Record<string, any>) => {
    const state = get();
    const { currentAttempt } = state;

    if (!currentAttempt) {
      console.warn('[ProgressStore] No current attempt to update metadata');
      return;
    }

    set({
      currentAttempt: {
        ...currentAttempt,
        metadata: {
          ...currentAttempt.metadata,
          ...metadata,
        },
      },
    });
  },

  // Query & retrieval
  getAttemptHistory: (problemId?: string) => {
    const state = get();
    if (!problemId) {
      return state.attempts;
    }
    return state.attempts.filter(a => a.problemId === problemId);
  },

  getAttemptById: (attemptId: string) => {
    const state = get();
    return state.attempts.find(a => a.id === attemptId) || null;
  },

  getProblemStats: (problemId: string) => {
    const state = get();
    return state.problemProgress[problemId] || null;
  },

  getRecentAttempts: (limit = 10) => {
    const state = get();
    return state.attempts
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  },

  getStudentProgress: () => {
    const state = get();
    const totalProblems = Object.keys(state.problemProgress).length;
    const completedProblems = state.completedProblems.size;
    const solvedProblems = Object.values(state.problemProgress).filter(
      p => p.solved
    ).length;

    return {
      totalProblems,
      completedProblems,
      solvedProblems,
      totalAttempts: state.attemptCount,
      totalTime: state.totalTime,
      problemProgress: state.problemProgress,
      lastActivity: state.lastActivityTime,
    };
  },

  getAttemptSummary: (attemptId: string) => {
    const state = get();
    const attempt = state.attempts.find(a => a.id === attemptId);

    if (!attempt) {
      return null;
    }

    const correctSteps = attempt.steps.filter(
      s => s.validation?.isCorrect
    ).length;
    const incorrectSteps = attempt.steps.filter(
      s => s.validation && !s.validation.isCorrect
    ).length;

    return {
      attemptId: attempt.id,
      problemId: attempt.problemId,
      completed: attempt.completed,
      solved: attempt.solved,
      totalSteps: attempt.steps.length,
      correctSteps,
      incorrectSteps,
      totalTime: attempt.totalTime,
      timestamp: attempt.startTime,
    };
  },

  // Analytics
  updateStats: () => {
    const state = get();
    let totalCorrectSteps = 0;
    let totalIncorrectSteps = 0;
    let totalHintsRequested = 0;
    let totalTime = 0;
    let totalSteps = 0;

    state.attempts.forEach(attempt => {
      totalHintsRequested += attempt.hintsRequested;
      totalTime += attempt.totalTime;

      attempt.steps.forEach(step => {
        totalSteps++;
        if (step.validation?.isCorrect) {
          totalCorrectSteps++;
        } else if (step.validation) {
          totalIncorrectSteps++;
        }
      });
    });

    const averageStepTime = totalSteps > 0 ? totalTime / totalSteps : 0;

    set({
      totalCorrectSteps,
      totalIncorrectSteps,
      totalHintsRequested,
      totalTime,
      averageStepTime,
    });
  },

  calculateAccuracyRate: () => {
    const state = get();
    const totalSteps = state.totalCorrectSteps + state.totalIncorrectSteps;
    if (totalSteps === 0) return 0;
    return (state.totalCorrectSteps / totalSteps) * 100;
  },

  calculateAverageTime: (problemId?: string) => {
    const state = get();
    const relevantAttempts = problemId
      ? state.attempts.filter(a => a.problemId === problemId)
      : state.attempts;

    if (relevantAttempts.length === 0) return 0;

    const totalTime = relevantAttempts.reduce((sum, a) => sum + a.totalTime, 0);
    return totalTime / relevantAttempts.length;
  },

  getTotalProblemsAttempted: () => {
    const state = get();
    return Object.keys(state.problemProgress).length;
  },

  getTotalProblemsSolved: () => {
    const state = get();
    return state.completedProblems.size;
  },

  // Data management
  clearHistory: () => {
    set({
      attempts: [],
      attemptCount: 0,
      completedProblems: new Set(),
      problemProgress: {},
      totalCorrectSteps: 0,
      totalIncorrectSteps: 0,
      totalHintsRequested: 0,
      totalTime: 0,
      averageStepTime: 0,
    });

    // Clear from storage
    storage.delete(STORAGE_KEYS.ATTEMPTS);
    storage.delete(STORAGE_KEYS.PROBLEM_PROGRESS);
    storage.delete(STORAGE_KEYS.STATS);

    console.log('[ProgressStore] Cleared all history');
  },

  clearProblemHistory: (problemId: string) => {
    const state = get();
    const updatedAttempts = state.attempts.filter(a => a.problemId !== problemId);
    const updatedCompletedProblems = new Set(state.completedProblems);
    updatedCompletedProblems.delete(problemId);

    const updatedProblemProgress = { ...state.problemProgress };
    delete updatedProblemProgress[problemId];

    set({
      attempts: updatedAttempts,
      attemptCount: updatedAttempts.length,
      completedProblems: updatedCompletedProblems,
      problemProgress: updatedProblemProgress,
    });

    // Update stats
    get().updateStats();

    // Persist to storage
    get().saveToStorage();

    console.log('[ProgressStore] Cleared history for problem:', problemId);
  },

  exportData: () => {
    const state = get();
    const exportData = {
      version: '1.0.0',
      exportDate: Date.now(),
      sessionId: state.currentSessionId,
      attempts: state.attempts,
      problemProgress: state.problemProgress,
      stats: {
        totalCorrectSteps: state.totalCorrectSteps,
        totalIncorrectSteps: state.totalIncorrectSteps,
        totalHintsRequested: state.totalHintsRequested,
        totalTime: state.totalTime,
        averageStepTime: state.averageStepTime,
      },
    };

    return JSON.stringify(exportData, null, 2);
  },

  importData: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);

      if (!data.version || !data.attempts) {
        console.error('[ProgressStore] Invalid import data format');
        return false;
      }

      set({
        attempts: data.attempts || [],
        attemptCount: data.attempts?.length || 0,
        problemProgress: data.problemProgress || {},
        totalCorrectSteps: data.stats?.totalCorrectSteps || 0,
        totalIncorrectSteps: data.stats?.totalIncorrectSteps || 0,
        totalHintsRequested: data.stats?.totalHintsRequested || 0,
        totalTime: data.stats?.totalTime || 0,
        averageStepTime: data.stats?.averageStepTime || 0,
      });

      // Persist to storage
      get().saveToStorage();

      console.log('[ProgressStore] Imported data successfully');
      return true;
    } catch (error) {
      console.error('[ProgressStore] Failed to import data:', error);
      return false;
    }
  },

  reset: () => {
    set(initialState);
    // Generate new session ID
    const newSessionId = generateSessionId();
    storage.set(STORAGE_KEYS.SESSION_ID, newSessionId);
    set({ currentSessionId: newSessionId });
  },

  // Persistence
  saveToStorage: () => {
    const state = get();

    try {
      // Save attempts
      storage.set(STORAGE_KEYS.ATTEMPTS, JSON.stringify(state.attempts));

      // Save current attempt
      if (state.currentAttempt) {
        storage.set(STORAGE_KEYS.CURRENT_ATTEMPT, JSON.stringify(state.currentAttempt));
      }

      // Save problem progress
      storage.set(STORAGE_KEYS.PROBLEM_PROGRESS, JSON.stringify(state.problemProgress));

      // Save stats
      const stats = {
        totalCorrectSteps: state.totalCorrectSteps,
        totalIncorrectSteps: state.totalIncorrectSteps,
        totalHintsRequested: state.totalHintsRequested,
        totalTime: state.totalTime,
        averageStepTime: state.averageStepTime,
        lastActivityTime: state.lastActivityTime,
      };
      storage.set(STORAGE_KEYS.STATS, JSON.stringify(stats));

      console.log('[ProgressStore] Saved to storage');
    } catch (error) {
      console.error('[ProgressStore] Failed to save to storage:', error);
    }
  },

  loadFromStorage: () => {
    try {
      // Load attempts
      const attemptsData = storage.getString(STORAGE_KEYS.ATTEMPTS);
      const attempts = attemptsData ? JSON.parse(attemptsData) : [];

      // Load current attempt
      const currentAttemptData = storage.getString(STORAGE_KEYS.CURRENT_ATTEMPT);
      const currentAttempt = currentAttemptData ? JSON.parse(currentAttemptData) : null;

      // Load problem progress
      const problemProgressData = storage.getString(STORAGE_KEYS.PROBLEM_PROGRESS);
      const problemProgress = problemProgressData ? JSON.parse(problemProgressData) : {};

      // Load stats
      const statsData = storage.getString(STORAGE_KEYS.STATS);
      const stats = statsData ? JSON.parse(statsData) : {};

      // Rebuild completedProblems set
      const completedProblems = new Set(
        Object.entries(problemProgress)
          .filter(([_, progress]: [string, any]) => progress.solved)
          .map(([problemId]) => problemId)
      );

      set({
        attempts,
        attemptCount: attempts.length,
        currentAttempt,
        problemProgress,
        completedProblems,
        totalCorrectSteps: stats.totalCorrectSteps || 0,
        totalIncorrectSteps: stats.totalIncorrectSteps || 0,
        totalHintsRequested: stats.totalHintsRequested || 0,
        totalTime: stats.totalTime || 0,
        averageStepTime: stats.averageStepTime || 0,
        lastActivityTime: stats.lastActivityTime || Date.now(),
      });

      console.log('[ProgressStore] Loaded from storage:', attempts.length, 'attempts');
    } catch (error) {
      console.error('[ProgressStore] Failed to load from storage:', error);
    }
  },
}));

// Load from storage on initialization
useProgressStore.getState().loadFromStorage();

/**
 * Selectors for optimized re-renders
 */

// Get current attempt
export const selectCurrentAttempt = (state: ProgressStoreState) => state.currentAttempt;

// Get attempt count
export const selectAttemptCount = (state: ProgressStoreState) => state.attemptCount;

// Get completed problems
export const selectCompletedProblems = (state: ProgressStoreState) => state.completedProblems;

// Get accuracy rate
export const selectAccuracyRate = (state: ProgressStoreState) => state.calculateAccuracyRate();

// Get total time
export const selectTotalTime = (state: ProgressStoreState) => state.totalTime;

// Get student progress summary
export const selectStudentProgress = (state: ProgressStoreState) => state.getStudentProgress();

// Check if problem is completed
export const selectIsProblemCompleted = (state: ProgressStoreState, problemId: string) =>
  state.completedProblems.has(problemId);
