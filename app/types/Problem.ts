/**
 * Problem Types
 *
 * Type definitions for math problems, solutions, and steps.
 * Used for displaying problems, tracking progress, and validation.
 */

/**
 * Difficulty levels for problems
 */
export enum ProblemDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

/**
 * Problem categories
 */
export enum ProblemCategory {
  LINEAR_EQUATIONS = 'linear_equations',
  BASIC_ALGEBRA = 'basic_algebra',
  QUADRATIC = 'quadratic',
  GEOMETRY = 'geometry',
}

/**
 * Expected solution step (for validation in PR5)
 */
export interface ExpectedStep {
  /** Sequential step number */
  stepNumber: number;
  /** Human-readable description of what this step does */
  description: string;
  /** Mathematical expression in LaTeX format */
  expression: string;
  /** Operation performed (e.g., "subtract 5 from both sides") */
  operation: string;
}

/**
 * Main problem data structure
 */
export interface Problem {
  /** Unique identifier (e.g., "le_easy_01") */
  id: string;
  /** Problem category */
  category: ProblemCategory;
  /** Difficulty level */
  difficulty: ProblemDifficulty;

  // Problem text and display
  /** Plain text version for accessibility */
  text: string;
  /** LaTeX formatted version for KaTeX rendering */
  latex: string;

  // Solution data
  /** Final answer (plain text) */
  answer: string;
  /** LaTeX formatted answer */
  answerLatex: string;
  /** Expected solution steps for validation */
  expectedSteps: ExpectedStep[];

  // Metadata
  /** Optional hints for this problem (used in PR6) */
  hints?: string[];
  /** Tags for categorization and filtering */
  tags?: string[];
}

/**
 * Problem selection/state
 */
export interface ProblemState {
  /** Currently selected problem */
  currentProblem: Problem | null;
  /** Index of current problem in the library */
  problemIndex: number;
  /** Total number of problems available */
  totalProblems: number;
  /** IDs of completed problems */
  completedProblems: string[];
}
