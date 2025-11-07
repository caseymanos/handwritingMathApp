/**
 * Validation Store
 *
 * Zustand store for managing validation state, API calls, and feedback.
 * Integrates with CameraMath API via mathValidation utilities.
 */

import { create } from 'zustand';
import {
  ValidationResult,
  ValidationStatus,
  ValidationRequest,
} from '../types/Validation';
import {
  validateMathStep,
  validateMathStepDebounced,
  isFinalAnswer,
} from '../utils/mathValidation';
import { getCacheStats } from '../utils/storage';

/**
 * Validation store state interface
 */
interface ValidationStoreState {
  // Current validation state
  status: ValidationStatus;
  currentValidation: ValidationResult | null;
  validationHistory: ValidationResult[];
  error: string | null;

  // Current problem context
  currentProblemId: string | null;
  currentStepNumber: number;
  previousSteps: string[];

  // API and cache stats
  apiAvailable: boolean;
  cacheStats: {
    hits: number;
    misses: number;
    totalSize: number;
  };

  // Validation timing
  lastValidationTime: number | null;
  validationCount: number;

  // Hint state
  currentHint: string | null;
  hintLevel: 'concept' | 'direction' | 'micro' | null;

  // Actions: Validation operations
  validateStep: (request: ValidationRequest) => Promise<ValidationResult>;
  validateStepDebounced: (request: ValidationRequest, debounceMs?: number) => Promise<ValidationResult>;

  // Actions: State management
  setStatus: (status: ValidationStatus) => void;
  setCurrentValidation: (result: ValidationResult | null) => void;
  setError: (error: string | null) => void;
  addToHistory: (result: ValidationResult) => void;
  clearHistory: () => void;

  // Actions: Problem context
  setCurrentProblem: (problemId: string) => void;
  setCurrentStepNumber: (stepNumber: number) => void;
  addPreviousStep: (step: string) => void;
  clearPreviousSteps: () => void;

  // Actions: Hint management
  requestHint: () => void;
  getNextHintLevel: () => 'concept' | 'direction' | 'micro';
  clearHint: () => void;

  // Actions: API status
  setApiAvailable: (available: boolean) => void;
  updateCacheStats: () => void;

  // Utility actions
  checkIfFinalAnswer: (studentStep: string, problemId: string) => boolean;
  getValidationForStep: (stepNumber: number) => ValidationResult | null;
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  status: ValidationStatus.IDLE,
  currentValidation: null,
  validationHistory: [],
  error: null,
  currentProblemId: null,
  currentStepNumber: 1,
  previousSteps: [],
  apiAvailable: true,
  cacheStats: {
    hits: 0,
    misses: 0,
    totalSize: 0,
  },
  lastValidationTime: null,
  validationCount: 0,
  currentHint: null,
  hintLevel: null,
};

/**
 * Validation store
 */
export const useValidationStore = create<ValidationStoreState>((set, get) => ({
  ...initialState,

  // Validation operations
  validateStep: async (request: ValidationRequest): Promise<ValidationResult> => {
    const state = get();

    try {
      // Set validating status
      set({
        status: ValidationStatus.VALIDATING,
        error: null,
      });

      console.log('[ValidationStore] Starting validation for step', request.stepNumber);

      // Call validation utility
      const result = await validateMathStep(request);

      // Update state with result
      set({
        status: ValidationStatus.SUCCESS,
        currentValidation: result,
        lastValidationTime: Date.now(),
        validationCount: state.validationCount + 1,
      });

      // Add to history
      get().addToHistory(result);

      // Update cache stats
      get().updateCacheStats();

      console.log('[ValidationStore] Validation complete:', result.isCorrect, result.isUseful);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';

      console.error('[ValidationStore] Validation failed:', errorMessage);

      // Set error status
      set({
        status: ValidationStatus.ERROR,
        error: errorMessage,
        currentValidation: null,
      });

      // Check if API is unavailable
      if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
        set({ apiAvailable: false });
      }

      throw error;
    }
  },

  validateStepDebounced: async (
    request: ValidationRequest,
    debounceMs?: number
  ): Promise<ValidationResult> => {
    const state = get();

    try {
      // Set validating status
      set({
        status: ValidationStatus.VALIDATING,
        error: null,
      });

      console.log('[ValidationStore] Starting debounced validation for step', request.stepNumber);

      // Call debounced validation utility
      const result = await validateMathStepDebounced(request, debounceMs);

      // Update state with result
      set({
        status: ValidationStatus.SUCCESS,
        currentValidation: result,
        lastValidationTime: Date.now(),
        validationCount: state.validationCount + 1,
      });

      // Add to history
      get().addToHistory(result);

      // Update cache stats
      get().updateCacheStats();

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';

      console.error('[ValidationStore] Debounced validation failed:', errorMessage);

      // Set error status
      set({
        status: ValidationStatus.ERROR,
        error: errorMessage,
        currentValidation: null,
      });

      throw error;
    }
  },

  // State management actions
  setStatus: (status: ValidationStatus) => {
    set({ status });
  },

  setCurrentValidation: (result: ValidationResult | null) => {
    set({ currentValidation: result });
  },

  setError: (error: string | null) => {
    set({ error, status: error ? ValidationStatus.ERROR : ValidationStatus.IDLE });
  },

  addToHistory: (result: ValidationResult) => {
    set(state => ({
      validationHistory: [...state.validationHistory, result],
    }));
  },

  clearHistory: () => {
    set({ validationHistory: [] });
  },

  // Problem context actions
  setCurrentProblem: (problemId: string) => {
    set({
      currentProblemId: problemId,
      currentStepNumber: 1,
      previousSteps: [],
      validationHistory: [],
      currentValidation: null,
      error: null,
      status: ValidationStatus.IDLE,
      currentHint: null,
      hintLevel: null,
    });
  },

  setCurrentStepNumber: (stepNumber: number) => {
    set({ currentStepNumber: stepNumber });
  },

  addPreviousStep: (step: string) => {
    set(state => ({
      previousSteps: [...state.previousSteps, step],
    }));
  },

  clearPreviousSteps: () => {
    set({ previousSteps: [] });
  },

  // Hint management actions
  requestHint: () => {
    const state = get();
    const nextLevel = state.getNextHintLevel();

    console.log('[ValidationStore] Requesting hint at level:', nextLevel);

    set({
      hintLevel: nextLevel,
      // The actual hint text will be set in CanvasDemoScreen
      // by calling getNextStepHint() from mathValidation utils
    });
  },

  getNextHintLevel: (): 'concept' | 'direction' | 'micro' => {
    const state = get();

    // Progressive escalation: concept → direction → micro
    if (state.hintLevel === null) {
      return 'concept';
    }
    if (state.hintLevel === 'concept') {
      return 'direction';
    }
    if (state.hintLevel === 'direction') {
      return 'micro';
    }
    // Stay at micro level (most specific)
    return 'micro';
  },

  clearHint: () => {
    set({
      currentHint: null,
      hintLevel: null,
    });
  },

  // API status actions
  setApiAvailable: (available: boolean) => {
    set({ apiAvailable: available });
  },

  updateCacheStats: () => {
    const stats = getCacheStats();
    set({ cacheStats: stats });
  },

  // Utility actions
  checkIfFinalAnswer: (studentStep: string, problemId: string): boolean => {
    // Import getProblemById dynamically to avoid circular dependency
    const { getProblemById } = require('../utils/problemData');
    const problem = getProblemById(problemId);

    if (!problem) {
      console.warn('[ValidationStore] Problem not found:', problemId);
      return false;
    }

    return isFinalAnswer(studentStep, problem);
  },

  getValidationForStep: (stepNumber: number): ValidationResult | null => {
    const state = get();
    return state.validationHistory.find(v => {
      // Parse step number from stepId (format: "step_problemId_stepNumber")
      const parts = v.stepId.split('_');
      const stepNum = parseInt(parts[parts.length - 1], 10);
      return stepNum === stepNumber;
    }) || null;
  },

  reset: () => {
    set(initialState);
  },
}));

/**
 * Selectors for optimized re-renders
 */

// Get current validation state
export const selectValidationState = (state: ValidationStoreState) => ({
  status: state.status,
  currentValidation: state.currentValidation,
  error: state.error,
});

// Get validation history
export const selectValidationHistory = (state: ValidationStoreState) =>
  state.validationHistory;

// Get current problem context
export const selectProblemContext = (state: ValidationStoreState) => ({
  problemId: state.currentProblemId,
  stepNumber: state.currentStepNumber,
  previousSteps: state.previousSteps,
});

// Get API status
export const selectApiStatus = (state: ValidationStoreState) => ({
  available: state.apiAvailable,
  cacheStats: state.cacheStats,
});

// Check if currently validating
export const selectIsValidating = (state: ValidationStoreState) =>
  state.status === ValidationStatus.VALIDATING;

// Get latest validation result
export const selectLatestValidation = (state: ValidationStoreState) =>
  state.currentValidation;

// Get validation statistics
export const selectValidationStats = (state: ValidationStoreState) => {
  const history = state.validationHistory;
  const correct = history.filter(v => v.isCorrect).length;
  const incorrect = history.filter(v => !v.isCorrect).length;
  const useful = history.filter(v => v.isUseful).length;
  const notUseful = history.filter(v => !v.isUseful).length;

  return {
    total: history.length,
    correct,
    incorrect,
    useful,
    notUseful,
    correctRate: history.length > 0 ? correct / history.length : 0,
    usefulRate: history.length > 0 ? useful / history.length : 0,
  };
};

// Get count of correct steps
export const selectCorrectStepCount = (state: ValidationStoreState) =>
  state.validationHistory.filter(v => v.isCorrect).length;

// Get count of incorrect steps
export const selectIncorrectStepCount = (state: ValidationStoreState) =>
  state.validationHistory.filter(v => !v.isCorrect).length;

// Check if has any validation results
export const selectHasValidations = (state: ValidationStoreState) =>
  state.validationHistory.length > 0;

// Get validation count
export const selectValidationCount = (state: ValidationStoreState) =>
  state.validationCount;

// Get last validation time
export const selectLastValidationTime = (state: ValidationStoreState) =>
  state.lastValidationTime;
