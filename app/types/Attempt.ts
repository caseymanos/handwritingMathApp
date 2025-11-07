/**
 * Attempt Types
 *
 * Type definitions for tracking student attempts and solution steps.
 * Used for progress tracking, analytics, and cloud storage (PR12+).
 */

import { Stroke } from './Canvas';
import { ValidationResult } from './Validation';

/**
 * A single step in a solution attempt
 */
export interface Step {
  /** Unique step ID */
  id: string;

  /** Raw stroke data from canvas */
  strokeData: Stroke[];

  /** Recognized text from MyScript (plain text) */
  recognizedText: string;

  /** Recognized LaTeX from MyScript */
  latex: string;

  /** Color used for this step */
  color: string;

  /** Validation result (if validated) */
  validation?: ValidationResult;

  /** When this step was started */
  startTime: number;

  /** When this step was completed */
  endTime: number;

  /** Was this step manually entered (fallback)? */
  manualInput: boolean;

  /** Confidence score from recognition (0-1) */
  recognitionConfidence?: number;
}

/**
 * A complete attempt at solving a problem
 */
export interface Attempt {
  /** Unique attempt ID */
  id: string;

  /** ID of the problem being attempted */
  problemId: string;

  /** All steps in this attempt */
  steps: Step[];

  /** When the attempt started */
  startTime: number;

  /** When the attempt ended (null if in progress) */
  endTime: number | null;

  /** Is this attempt completed? */
  completed: boolean;

  /** Did the student solve it correctly? */
  solved: boolean;

  /** Number of hints requested */
  hintsRequested: number;

  /** Total time spent (milliseconds) */
  totalTime: number;

  /** Device info (for analytics) */
  deviceInfo?: {
    platform: 'ios' | 'android';
    deviceType: 'phone' | 'tablet';
    osVersion: string;
  };

  /** Metadata */
  metadata?: {
    /** Session ID for grouping attempts */
    sessionId?: string;
    /** Student ID (for cloud sync PR12+) */
    studentId?: string;
    /** Notes or tags */
    tags?: string[];
  };
}

/**
 * Attempt summary (for progress tracking)
 */
export interface AttemptSummary {
  attemptId: string;
  problemId: string;
  completed: boolean;
  solved: boolean;
  totalSteps: number;
  correctSteps: number;
  incorrectSteps: number;
  totalTime: number;
  timestamp: number;
}

/**
 * Problem progress (aggregated attempts)
 */
export interface ProblemProgress {
  problemId: string;
  attempts: number;
  solved: boolean;
  bestTime: number | null;
  averageSteps: number;
  firstAttemptDate: number;
  lastAttemptDate: number;
}

/**
 * Student progress (all problems)
 */
export interface StudentProgress {
  totalProblems: number;
  completedProblems: number;
  solvedProblems: number;
  totalAttempts: number;
  totalTime: number;
  problemProgress: Record<string, ProblemProgress>;
  lastActivity: number;
}

/**
 * Attempt storage entry (for MMKV)
 */
export interface AttemptStorageEntry {
  attempt: Attempt;
  storedAt: number;
  syncStatus: 'pending' | 'synced' | 'failed';
}
