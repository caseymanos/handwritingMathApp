/**
 * Validation Types
 *
 * Type definitions for math step validation results and states.
 * Used for checking correctness and usefulness of student work.
 */

/**
 * Validation status enum
 */
export enum ValidationStatus {
  IDLE = 'idle',                 // No validation in progress
  VALIDATING = 'validating',     // API call in progress
  SUCCESS = 'success',           // Validation completed successfully
  ERROR = 'error',               // Validation failed (network, API error)
}

/**
 * Error types for incorrect steps
 */
export enum ValidationErrorType {
  SYNTAX = 'syntax',           // Invalid mathematical syntax
  ARITHMETIC = 'arithmetic',   // Arithmetic error (e.g., 2+2=5)
  LOGIC = 'logic',            // Logical error in step progression
  METHOD = 'method',          // Wrong method/approach for this problem
  UNKNOWN = 'unknown',        // Unclassified error
}

/**
 * Validation result for a single step
 */
export interface ValidationResult {
  /** Unique ID for this validation */
  id: string;

  /** ID of the step being validated */
  stepId: string;

  /** Is the math correct? */
  isCorrect: boolean;

  /** Does this step advance the solution? (not a tautology) */
  isUseful: boolean;

  /** Type of error if incorrect */
  errorType?: ValidationErrorType;

  /** Human-readable feedback message */
  feedback: string;

  /** Suggested next steps (for hints in PR6) */
  suggestedSteps?: string[];

  /** Expected next expression (LaTeX format) */
  expectedNext?: string;

  /** Was this result retrieved from cache? */
  cachedResult: boolean;

  /** Confidence score from API (0-1) */
  confidence?: number;

  /** Timestamp of validation */
  timestamp: number;

  /** Raw API response (for debugging) */
  apiResponse?: any;

  /** Is this the final answer to the problem? */
  isFinalAnswer?: boolean;
}

/**
 * Validation request payload
 */
export interface ValidationRequest {
  /** ID of the problem being solved */
  problemId: string;

  /** Recognized LaTeX expression from student */
  studentStep: string;

  /** Step number (1-indexed) */
  stepNumber: number;

  /** Previous steps for context */
  previousSteps?: string[];

  /** Original problem statement (LaTeX) */
  problemStatement: string;
}

/**
 * Validation store state
 */
export interface ValidationState {
  /** Current validation status */
  status: ValidationStatus;

  /** Current validation result (if any) */
  currentValidation: ValidationResult | null;

  /** History of all validations in current attempt */
  validationHistory: ValidationResult[];

  /** Error message if validation failed */
  error: string | null;

  /** Is API available? (for offline handling) */
  apiAvailable: boolean;

  /** Cache statistics */
  cacheStats: {
    hits: number;
    misses: number;
    totalSize: number;
  };
}

/**
 * Validation API response (CameraMath format - to be confirmed)
 */
export interface ValidationApiResponse {
  success: boolean;
  data?: {
    correct: boolean;
    useful: boolean;
    explanation: string;
    error_type?: string;
    next_steps?: string[];
    expected_expression?: string;
    confidence?: number;
    solution_path?: Array<{
      step: number;
      expression: string;
      operation: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Cache entry for validation results
 */
export interface ValidationCacheEntry {
  /** Cache key (hash of problem + step) */
  key: string;

  /** Validation result */
  result: ValidationResult;

  /** When this was cached */
  cachedAt: number;

  /** TTL in milliseconds (default: 7 days) */
  ttl: number;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** API base URL */
  apiUrl: string;

  /** API key */
  apiKey: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Enable caching */
  enableCaching: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl: number;

  /** Debounce delay in milliseconds */
  debounceDelay: number;

  /** Minimum confidence threshold (0-1) */
  minConfidence: number;
}
