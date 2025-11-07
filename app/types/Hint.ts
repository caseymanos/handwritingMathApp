/**
 * Hint System Types
 *
 * Type definitions for the progressive hint system (PR6).
 * Supports per-error-type escalation with KaTeX LaTeX rendering.
 */

import { ValidationErrorType } from './Validation';
import { ProblemCategory } from './Problem';

/**
 * Hint escalation levels (progressive disclosure)
 */
export type HintLevel = 'concept' | 'direction' | 'micro';

/**
 * Single hint entry with LaTeX support
 */
export interface HintEntry {
  /** Unique hint ID */
  id: string;

  /** Error type this hint addresses */
  errorType: ValidationErrorType;

  /** Problem category this hint applies to */
  category: ProblemCategory;

  /** Escalation level */
  level: HintLevel;

  /** Hint text (supports LaTeX with $ delimiters, e.g., "Try isolating $x$") */
  text: string;

  /** Plain text version (fallback for accessibility) */
  plainText: string;

  /** Keywords/tags for hint matching */
  tags?: string[];

  /** Priority (higher = shown first when multiple hints match) */
  priority?: number;
}

/**
 * Hint mapping configuration
 * Maps error type + category + level to specific hints
 */
export interface HintMapping {
  /** Error type */
  errorType: ValidationErrorType;

  /** Problem category */
  category: ProblemCategory;

  /** Hints by escalation level */
  hints: {
    concept: HintEntry[];
    direction: HintEntry[];
    micro: HintEntry[];
  };
}

/**
 * Hint history record (per attempt)
 */
export interface HintHistoryEntry {
  /** Unique ID for this hint instance */
  id: string;

  /** When this hint was shown */
  timestamp: number;

  /** Hint text that was shown */
  hintText: string;

  /** Escalation level */
  level: HintLevel;

  /** Error type that triggered this hint */
  errorType: ValidationErrorType;

  /** Step number when hint was shown */
  stepNumber: number;

  /** Was this hint auto-triggered by inactivity? */
  autoTriggered: boolean;
}

/**
 * Complete hint history for an attempt
 */
export type HintHistory = HintHistoryEntry[];

/**
 * Per-error-type escalation state
 * Tracks separate escalation levels for each error type
 */
export interface HintEscalationState {
  /** Error type */
  errorType: ValidationErrorType;

  /** Current escalation level for this error type */
  currentLevel: HintLevel;

  /** How many times hints shown for this error type */
  showCount: number;

  /** Last time a hint was shown for this error type */
  lastShownAt: number;
}

/**
 * Inactivity timer state
 */
export interface InactivityTimerState {
  /** Is timer currently active? */
  active: boolean;

  /** When timer was started */
  startedAt: number | null;

  /** Delay in milliseconds (default: 10000ms = 10s) */
  delay: number;

  /** Timer ID (for clearing) */
  timerId: NodeJS.Timeout | null;
}

/**
 * Hint store state structure
 */
export interface HintState {
  /** Currently displayed hint (if any) */
  currentHint: HintEntry | null;

  /** Current hint text (computed from currentHint) */
  currentHintText: string | null;

  /** Current hint level (computed from currentHint) */
  currentHintLevel: HintLevel | null;

  /** History of all hints shown in current attempt */
  hintHistory: HintHistoryEntry[];

  /** Per-error-type escalation tracking */
  escalationStates: Record<ValidationErrorType, HintEscalationState>;

  /** Count of incorrect validation attempts */
  incorrectAttemptCount: number;

  /** Timestamp of last incorrect attempt */
  lastIncorrectAttemptAt: number | null;

  /** Inactivity timer state */
  inactivityTimer: InactivityTimerState;

  /** Current problem ID (for resetting on problem change) */
  currentProblemId: string | null;

  /** Total hints shown in this session */
  totalHintsShown: number;
}

/**
 * Hint selection criteria
 * Used by hintMapper to select appropriate hints
 */
export interface HintSelectionCriteria {
  /** Error type from validation */
  errorType: ValidationErrorType;

  /** Problem category */
  category: ProblemCategory;

  /** Current escalation level for this error type */
  level: HintLevel;

  /** Student's input (for context-specific hints) */
  studentInput?: string;

  /** Expected next step (to prevent revealing solution) */
  expectedNext?: string;

  /** Previous hints shown (to avoid repetition) */
  previousHints?: string[];
}

/**
 * Hint validation result
 * Ensures hints don't reveal full solution
 */
export interface HintValidationResult {
  /** Is this hint safe to show? */
  safe: boolean;

  /** Reason if not safe */
  reason?: string;

  /** Modified hint (if adjustments needed) */
  modifiedHint?: string;
}

/**
 * Hint configuration
 */
export interface HintConfig {
  /** Enable inactivity timer? */
  enableInactivityTimer: boolean;

  /** Inactivity delay in milliseconds */
  inactivityDelay: number;

  /** Minimum incorrect attempts before auto-showing hints */
  minIncorrectAttemptsForAuto: number;

  /** Enable per-error-type escalation? */
  enablePerErrorEscalation: boolean;

  /** Enable KaTeX rendering in hints? */
  enableKaTeX: boolean;

  /** Maximum hints to show per attempt */
  maxHintsPerAttempt: number;
}
