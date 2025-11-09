/**
 * Assessment Types
 *
 * Type definitions for formal assessment mode (PR15).
 * Supports deferred validation, scoring, and step-by-step feedback.
 */

import { ValidationResult, ValidationErrorType } from './Validation';
import { Stroke } from './Canvas';

/**
 * Assessment workflow status
 */
export enum AssessmentStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

/**
 * Assessment attempt
 */
export interface Assessment {
  id: string;
  userId: string;
  problemId: string; // References problemData.ts
  startedAt: number;
  submittedAt: number | null;
  status: AssessmentStatus;
  steps: AssessmentStep[]; // Stored as JSONB in database
  validationResults: ValidationResult[] | null; // After grading
  score: number | null; // 0-100
  correctSteps: number;
  usefulSteps: number;
  totalSteps: number;
  timeSpentSeconds: number;
  timeLimitSeconds: number | null; // Optional time limit
  metadata: AssessmentMetadata;
  createdAt: number;
  updatedAt: number;
}

/**
 * Individual step in assessment (before submission)
 */
export interface AssessmentStep {
  stepIndex: number; // 0-based index
  latex: string; // Recognized LaTeX
  lineNumber: number | null;
  timestamp: number; // When step was written
  strokeIds: string[]; // References to assessment_strokes table
}

/**
 * Assessment metadata
 */
export interface AssessmentMetadata {
  attemptNumber: number; // How many times student attempted this problem
  hintsDisabled: boolean; // Always true for assessments
  manualInputUsed: boolean; // Did student use manual fallback?
  recognitionErrors: number; // Count of recognition failures
  deviceInfo?: {
    platform: 'ios' | 'android';
    deviceType: 'phone' | 'tablet';
  };
}

/**
 * Compressed stroke data for assessment
 */
export interface AssessmentStroke {
  id: string;
  assessmentId: string;
  userId: string;
  stepIndex: number; // Index in Assessment.steps array
  lineNumber: number | null;
  pointCount: number;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  bytesCompressed: number;
  bytesOriginal: number;
  encoding: 'delta-gzip-base64'; // Matches existing stroke compression
  data: string; // Base64-encoded compressed data
  createdAt: number;
  updatedAt: number;
}

/**
 * Assessment scoring breakdown
 */
export interface AssessmentScore {
  total: number; // 0-100
  correctnessScore: number; // 0-70 (70% weight)
  usefulnessScore: number; // 0-30 (30% weight)
  correctSteps: number;
  usefulSteps: number;
  totalSteps: number;
  breakdown: ScoreBreakdown[];
}

/**
 * Per-step score breakdown
 */
export interface ScoreBreakdown {
  stepIndex: number;
  latex: string;
  isCorrect: boolean;
  isUseful: boolean;
  feedback: string;
  errorType: ValidationErrorType | null;
  pointsAwarded: number; // Out of total possible for this step
}

/**
 * Assessment submission request
 */
export interface AssessmentSubmitRequest {
  assessmentId: string;
  steps: AssessmentStep[];
  strokeData: AssessmentStroke[]; // Compressed strokes
  finalTime: number; // Total time spent
}

/**
 * Batch validation request (for scoring)
 */
export interface BatchValidationRequest {
  problemId: string;
  steps: Array<{
    stepIndex: number;
    latex: string;
  }>;
  problemStatement: string;
}

/**
 * Batch validation response
 */
export interface BatchValidationResponse {
  results: ValidationResult[];
  score: AssessmentScore;
  processingTime: number; // milliseconds
}

/**
 * Assessment results (for display)
 */
export interface AssessmentResults {
  assessment: Assessment;
  score: AssessmentScore;
  stepFeedback: StepFeedback[];
  correctSolution: CorrectSolution;
  suggestions: string[]; // Improvement suggestions
}

/**
 * Step-by-step feedback
 */
export interface StepFeedback {
  stepIndex: number;
  studentLatex: string;
  isCorrect: boolean;
  isUseful: boolean;
  feedback: string;
  errorType: ValidationErrorType | null;
  expectedLatex: string | null; // What the step should have been
}

/**
 * Correct solution display
 */
export interface CorrectSolution {
  problemId: string;
  steps: Array<{
    stepNumber: number;
    latex: string;
    description: string; // What operation was performed
  }>;
}

/**
 * Assessment store state (for assessmentStore.ts)
 */
export interface AssessmentStoreState {
  // Current assessment
  currentAssessment: Assessment | null;
  assessmentStatus: AssessmentStatus;

  // Steps (local until submission)
  steps: AssessmentStep[];
  strokeData: Map<number, AssessmentStroke[]>; // stepIndex -> strokes

  // Timer
  timerStartedAt: number | null;
  elapsedSeconds: number;
  timeLimitSeconds: number | null;
  timerPaused: boolean;

  // Submission
  isSubmitting: boolean;
  submissionError: string | null;

  // Results
  results: AssessmentResults | null;

  // History
  pastAssessments: Assessment[];

  // Actions (to be implemented in store)
  startAssessment: (problemId: string, timeLimit?: number) => void;
  addStep: (latex: string, strokes: Stroke[], lineNumber: number | null) => void;
  submitAssessment: () => Promise<void>;
  retryAssessment: (problemId: string) => void;
  fetchAssessmentHistory: () => Promise<void>;

  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
}

/**
 * Assessment configuration
 */
export interface AssessmentConfig {
  allowRetries: boolean; // Default: true
  maxRetries: number | null; // null = unlimited
  timeLimitEnabled: boolean; // Default: false for MVP
  defaultTimeLimitSeconds: number; // Default: 600 (10 minutes)
  hintsEnabled: boolean; // Always false for assessments
  showCorrectSolutionAfterSubmit: boolean; // Default: true
  scoringFormula: {
    correctnessWeight: number; // Default: 0.7 (70%)
    usefulnessWeight: number; // Default: 0.3 (30%)
  };
}
