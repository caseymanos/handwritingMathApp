/**
 * Hint Store
 *
 * Zustand store for managing the progressive hint system.
 * Handles hint selection, escalation, history, and inactivity timers.
 * Features per-error-type escalation tracking.
 */

import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import {
  HintEntry,
  HintHistoryEntry,
  HintEscalationState,
  HintState,
  HintSelectionCriteria,
  HintLevel,
} from '../types/Hint';
import { ValidationErrorType } from '../types/Validation';
import { ProblemCategory } from '../types/Problem';
import { selectContextualHint, getFallbackHint } from '../../hint-library/hintMapper';

// Initialize MMKV storage for hints
const hintStorage = new MMKV({ id: 'hint-storage' });

// Configuration
const INACTIVITY_DELAY_MS = 10000; // 10 seconds
const MIN_INCORRECT_ATTEMPTS_FOR_AUTO = 2; // Show hint after 2 incorrect attempts

/**
 * Generate unique ID for hint history entries
 */
function generateHintHistoryId(): string {
  return `hint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize escalation state for an error type
 */
function initEscalationState(errorType: ValidationErrorType): HintEscalationState {
  return {
    errorType,
    currentLevel: 'concept',
    showCount: 0,
    lastShownAt: 0,
  };
}

/**
 * Get next escalation level
 */
function getNextEscalationLevel(currentLevel: HintLevel): HintLevel {
  const levels: HintLevel[] = ['concept', 'direction', 'micro'];
  const currentIndex = levels.indexOf(currentLevel);
  const nextIndex = Math.min(currentIndex + 1, levels.length - 1);
  return levels[nextIndex];
}

interface HintStore extends HintState {
  // Actions
  requestHint: (
    errorType: ValidationErrorType,
    category: ProblemCategory,
    stepNumber: number,
    studentInput?: string,
    expectedNext?: string
  ) => void;

  clearHint: () => void;

  startInactivityTimer: (callback: () => void) => void;

  resetInactivityTimer: () => void;

  stopInactivityTimer: () => void;

  incrementIncorrectAttempts: (errorType: ValidationErrorType) => void;

  resetIncorrectAttempts: () => void;

  setCurrentProblem: (problemId: string) => void;

  clearHintsForNewProblem: (problemId: string) => void;

  getEscalationLevel: (errorType: ValidationErrorType) => HintLevel;

  escalateHint: (errorType: ValidationErrorType) => void;

  getHintHistory: () => HintHistoryEntry[];

  shouldShowAutoHint: () => boolean;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
  clearStorage: () => void;
}

/**
 * Create hint store with Zustand
 */
export const useHintStore = create<HintStore>((set, get) => ({
  // Initial state
  currentHint: null,
  currentHintText: null,
  currentHintLevel: null,
  hintHistory: [],
  escalationStates: {
    [ValidationErrorType.SYNTAX]: initEscalationState(ValidationErrorType.SYNTAX),
    [ValidationErrorType.ARITHMETIC]: initEscalationState(ValidationErrorType.ARITHMETIC),
    [ValidationErrorType.LOGIC]: initEscalationState(ValidationErrorType.LOGIC),
    [ValidationErrorType.METHOD]: initEscalationState(ValidationErrorType.METHOD),
    [ValidationErrorType.UNKNOWN]: initEscalationState(ValidationErrorType.UNKNOWN),
  },
  incorrectAttemptCount: 0,
  lastIncorrectAttemptAt: null,
  inactivityTimer: {
    active: false,
    startedAt: null,
    delay: INACTIVITY_DELAY_MS,
    timerId: null,
  },
  currentProblemId: null,
  totalHintsShown: 0,

  // Request a hint for a specific error type
  requestHint: (errorType, category, stepNumber, studentInput, expectedNext) => {
    const state = get();

    // Get current escalation level for this error type
    const escalationLevel = state.getEscalationLevel(errorType);

    // Build hint selection criteria
    const criteria: HintSelectionCriteria = {
      errorType,
      category,
      level: escalationLevel,
      studentInput,
      expectedNext,
      previousHints: state.hintHistory.map((h) => h.hintText),
    };

    // Select appropriate hint
    const selectedHint = selectContextualHint(criteria);

    if (!selectedHint) {
      console.warn('[HintStore] No hint found, using fallback');
      const fallback = getFallbackHint(escalationLevel);
      set({
        currentHint: fallback,
        currentHintText: fallback.text,
        currentHintLevel: fallback.level,
      });
      return;
    }

    // Create history entry
    const historyEntry: HintHistoryEntry = {
      id: generateHintHistoryId(),
      timestamp: Date.now(),
      hintText: selectedHint.text,
      level: selectedHint.level,
      errorType,
      stepNumber,
      autoTriggered: false, // Set by caller if needed
    };

    // Cloud sync: upsert hint to cloud
    import('../utils/sync/syncClient').then(({ upsertHint }) => {
      // Get current attempt ID from progressStore
      import('./progressStore').then(({ useProgressStore }) => {
        const attemptId = useProgressStore.getState().currentAttempt?.id;
        if (attemptId) {
          upsertHint(historyEntry, attemptId).catch((error) => {
            console.error('[HintStore] Failed to sync hint:', error);
          });
        }
      }).catch(() => {
        // Progress store not available
      });
    }).catch(() => {
      // Sync module not available, skip
    });

    // Update state
    set({
      currentHint: selectedHint,
      currentHintText: selectedHint.text,
      currentHintLevel: selectedHint.level,
      hintHistory: [...state.hintHistory, historyEntry],
      totalHintsShown: state.totalHintsShown + 1,
    });

    // Update escalation state for this error type
    const updatedEscalationStates = { ...state.escalationStates };
    updatedEscalationStates[errorType] = {
      ...updatedEscalationStates[errorType],
      showCount: updatedEscalationStates[errorType].showCount + 1,
      lastShownAt: Date.now(),
    };

    set({ escalationStates: updatedEscalationStates });

    // Save to storage
    get().saveToStorage();

    console.log(`[HintStore] Hint requested: ${errorType} / ${escalationLevel}`);
  },

  // Clear current hint
  clearHint: () => {
    set({
      currentHint: null,
      currentHintText: null,
      currentHintLevel: null,
    });
  },

  // Start inactivity timer
  startInactivityTimer: (callback) => {
    const state = get();

    // Only start if we should show auto hints
    if (!state.shouldShowAutoHint()) {
      return;
    }

    // Clear existing timer
    if (state.inactivityTimer.timerId) {
      clearTimeout(state.inactivityTimer.timerId);
    }

    // Start new timer
    const timerId = setTimeout(() => {
      console.log('[HintStore] Inactivity timer triggered');
      callback();
      set({
        inactivityTimer: {
          ...state.inactivityTimer,
          active: false,
          timerId: null,
        },
      });
    }, INACTIVITY_DELAY_MS);

    set({
      inactivityTimer: {
        active: true,
        startedAt: Date.now(),
        delay: INACTIVITY_DELAY_MS,
        timerId,
      },
    });

    console.log('[HintStore] Inactivity timer started');
  },

  // Reset inactivity timer (call when user interacts)
  resetInactivityTimer: () => {
    const state = get();
    if (state.inactivityTimer.timerId) {
      clearTimeout(state.inactivityTimer.timerId);
      set({
        inactivityTimer: {
          ...state.inactivityTimer,
          active: false,
          startedAt: null,
          timerId: null,
        },
      });
    }
  },

  // Stop inactivity timer
  stopInactivityTimer: () => {
    get().resetInactivityTimer();
  },

  // Increment incorrect attempt counter
  incrementIncorrectAttempts: (errorType) => {
    const state = get();
    set({
      incorrectAttemptCount: state.incorrectAttemptCount + 1,
      lastIncorrectAttemptAt: Date.now(),
    });

    console.log(`[HintStore] Incorrect attempts: ${state.incorrectAttemptCount + 1}`);
  },

  // Reset incorrect attempt counter
  resetIncorrectAttempts: () => {
    set({
      incorrectAttemptCount: 0,
      lastIncorrectAttemptAt: null,
    });
  },

  // Set current problem
  setCurrentProblem: (problemId) => {
    set({ currentProblemId: problemId });
  },

  // Clear hints for new problem
  clearHintsForNewProblem: (problemId) => {
    const state = get();

    // Stop any active timers
    state.stopInactivityTimer();

    // Reset all state
    set({
      currentHint: null,
      currentHintText: null,
      currentHintLevel: null,
      hintHistory: [],
      escalationStates: {
        [ValidationErrorType.SYNTAX]: initEscalationState(ValidationErrorType.SYNTAX),
        [ValidationErrorType.ARITHMETIC]: initEscalationState(ValidationErrorType.ARITHMETIC),
        [ValidationErrorType.LOGIC]: initEscalationState(ValidationErrorType.LOGIC),
        [ValidationErrorType.METHOD]: initEscalationState(ValidationErrorType.METHOD),
        [ValidationErrorType.UNKNOWN]: initEscalationState(ValidationErrorType.UNKNOWN),
      },
      incorrectAttemptCount: 0,
      lastIncorrectAttemptAt: null,
      currentProblemId: problemId,
    });

    // Clear storage
    get().clearStorage();

    console.log(`[HintStore] Cleared hints for new problem: ${problemId}`);
  },

  // Get current escalation level for error type
  getEscalationLevel: (errorType) => {
    const state = get();
    return state.escalationStates[errorType]?.currentLevel || 'concept';
  },

  // Escalate hint level for error type
  escalateHint: (errorType) => {
    const state = get();
    const currentState = state.escalationStates[errorType];
    const nextLevel = getNextEscalationLevel(currentState.currentLevel);

    const updatedEscalationStates = { ...state.escalationStates };
    updatedEscalationStates[errorType] = {
      ...currentState,
      currentLevel: nextLevel,
    };

    set({ escalationStates: updatedEscalationStates });

    console.log(`[HintStore] Escalated ${errorType}: ${currentState.currentLevel} -> ${nextLevel}`);
  },

  // Get hint history
  getHintHistory: () => {
    return get().hintHistory;
  },

  // Check if should show auto hint
  shouldShowAutoHint: () => {
    const state = get();
    return state.incorrectAttemptCount >= MIN_INCORRECT_ATTEMPTS_FOR_AUTO;
  },

  // Load state from MMKV storage
  loadFromStorage: () => {
    try {
      const hintHistoryJson = hintStorage.getString('hintHistory');
      const escalationStatesJson = hintStorage.getString('escalationStates');
      const incorrectAttemptCount = hintStorage.getNumber('incorrectAttemptCount');
      const currentProblemId = hintStorage.getString('currentProblemId');
      const totalHintsShown = hintStorage.getNumber('totalHintsShown');

      if (hintHistoryJson) {
        set({ hintHistory: JSON.parse(hintHistoryJson) });
      }
      if (escalationStatesJson) {
        set({ escalationStates: JSON.parse(escalationStatesJson) });
      }
      if (incorrectAttemptCount !== undefined) {
        set({ incorrectAttemptCount });
      }
      if (currentProblemId) {
        set({ currentProblemId });
      }
      if (totalHintsShown !== undefined) {
        set({ totalHintsShown });
      }

      console.log('[HintStore] Loaded from storage');
    } catch (error) {
      console.error('[HintStore] Error loading from storage:', error);
    }
  },

  // Save state to MMKV storage
  saveToStorage: () => {
    try {
      const state = get();
      hintStorage.set('hintHistory', JSON.stringify(state.hintHistory));
      hintStorage.set('escalationStates', JSON.stringify(state.escalationStates));
      hintStorage.set('incorrectAttemptCount', state.incorrectAttemptCount);
      if (state.currentProblemId) {
        hintStorage.set('currentProblemId', state.currentProblemId);
      }
      hintStorage.set('totalHintsShown', state.totalHintsShown);
    } catch (error) {
      console.error('[HintStore] Error saving to storage:', error);
    }
  },

  // Clear storage
  clearStorage: () => {
    try {
      hintStorage.delete('hintHistory');
      hintStorage.delete('escalationStates');
      hintStorage.delete('incorrectAttemptCount');
      hintStorage.delete('currentProblemId');
      console.log('[HintStore] Cleared storage');
    } catch (error) {
      console.error('[HintStore] Error clearing storage:', error);
    }
  },
}));

// Load from storage on initialization
useHintStore.getState().loadFromStorage();
