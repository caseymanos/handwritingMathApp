/**
 * Math Validation Utility
 *
 * Core validation orchestration layer for CameraMath API integration.
 * Handles validation requests, caching, debouncing, and response mapping.
 *
 * IMPORTANT: This implementation contains placeholder API response handling.
 * Update `parseCameraMathResponse()` once actual API documentation is reviewed.
 *
 * Usage:
 *   import { validateMathStep } from '@/utils/mathValidation';
 *   const result = await validateMathStep(request);
 */

import {
  ValidationResult,
  ValidationRequest,
  ValidationApiResponse,
  ValidationErrorType,
} from '../types/Validation';
import { Problem, ExpectedStep } from '../types/Problem';
import {
  getCachedValidationResult,
  cacheValidationResult,
} from './storage';
import {
  cameraMathConfig,
  getCameraMathHeaders,
  buildEndpointUrl,
  apiRequestWithRetry,
  checkRateLimit,
} from './apiConfig';
import { getProblemById } from './problemData';

/**
 * Debouncing state for validation requests
 */
let validationTimer: NodeJS.Timeout | null = null;
let pendingValidation: Promise<ValidationResult> | null = null;

/**
 * Generate unique validation ID
 */
function generateValidationId(): string {
  return `validation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalize LaTeX expressions for comparison
 * Removes whitespace, normalizes fractions, etc.
 */
function normalizeLaTeX(latex: string): string {
  return latex
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/\\left/g, '') // Remove \left
    .replace(/\\right/g, '') // Remove \right
    .replace(/\\\s+/g, '\\') // Normalize backslashes
    .toLowerCase()
    .trim();
}

/**
 * Compare student step with expected steps
 * Returns matching expected step or null
 */
function findMatchingExpectedStep(
  studentStep: string,
  expectedSteps: ExpectedStep[],
  currentStepNumber: number
): ExpectedStep | null {
  const normalizedStudent = normalizeLaTeX(studentStep);

  // First, check if it matches the current expected step
  const currentExpected = expectedSteps.find(s => s.stepNumber === currentStepNumber);
  if (currentExpected && normalizeLaTeX(currentExpected.expression) === normalizedStudent) {
    return currentExpected;
  }

  // Check if it matches any nearby steps (within 2 steps)
  const nearbySteps = expectedSteps.filter(
    s => Math.abs(s.stepNumber - currentStepNumber) <= 2
  );

  for (const step of nearbySteps) {
    if (normalizeLaTeX(step.expression) === normalizedStudent) {
      return step;
    }
  }

  return null;
}

/**
 * Determine if a step is useful (not a tautology)
 * Examples of non-useful steps:
 * - Adding 0: "x + 5 + 0 = 12 + 0"
 * - Multiplying by 1: "1 * x = 1 * 7"
 * - Rewriting without progress: "x + 5 = 12" → "x + 5 = 12"
 */
function isStepUseful(
  currentStep: string,
  previousStep: string | undefined,
  expectedStep: ExpectedStep | null
): boolean {
  const normalized = normalizeLaTeX(currentStep);

  // Check for common tautologies
  const tautologyPatterns = [
    /\+0/g, // Adding 0
    /-0/g, // Subtracting 0
    /\*1/g, // Multiplying by 1
    /\/1/g, // Dividing by 1
  ];

  for (const pattern of tautologyPatterns) {
    if (pattern.test(normalized)) {
      console.log('[Validation] Step contains tautology:', currentStep);
      return false;
    }
  }

  // If we have a previous step, check if this is identical
  if (previousStep && normalizeLaTeX(previousStep) === normalized) {
    console.log('[Validation] Step is identical to previous step');
    return false;
  }

  // If we have an expected step match, it's useful
  if (expectedStep) {
    return true;
  }

  // Default: assume useful (CameraMath API will provide definitive answer)
  return true;
}

/**
 * Classify error type based on step analysis
 */
function classifyError(
  studentStep: string,
  expectedSteps: ExpectedStep[],
  stepNumber: number
): ValidationErrorType {
  // Check for basic syntax issues
  const hasMismatchedParens = (studentStep.match(/\(/g) || []).length !==
    (studentStep.match(/\)/g) || []).length;

  if (hasMismatchedParens) {
    return ValidationErrorType.SYNTAX;
  }

  // Check if using wrong method (e.g., trying to add when should subtract)
  const currentExpected = expectedSteps.find(s => s.stepNumber === stepNumber);
  if (currentExpected) {
    const expectedOp = currentExpected.operation.toLowerCase();

    if (
      (expectedOp.includes('add') && studentStep.includes('-')) ||
      (expectedOp.includes('subtract') && studentStep.includes('+'))
    ) {
      return ValidationErrorType.METHOD;
    }

    if (
      (expectedOp.includes('multiply') && studentStep.includes('/')) ||
      (expectedOp.includes('divide') && studentStep.includes('*'))
    ) {
      return ValidationErrorType.METHOD;
    }
  }

  // Default to arithmetic error
  return ValidationErrorType.ARITHMETIC;
}

/**
 * Generate feedback message based on validation result
 */
function generateFeedback(
  isCorrect: boolean,
  isUseful: boolean,
  errorType?: ValidationErrorType,
  expectedStep?: ExpectedStep
): string {
  if (isCorrect && isUseful) {
    return expectedStep
      ? `Great! ${expectedStep.description}.`
      : 'Correct step! Keep going.';
  }

  if (isCorrect && !isUseful) {
    return 'This step is mathematically correct, but it doesn\'t advance your solution. Try an operation that simplifies the equation.';
  }

  // Incorrect step - provide specific feedback
  switch (errorType) {
    case ValidationErrorType.SYNTAX:
      return 'There seems to be a syntax error in your expression. Check for mismatched parentheses or invalid mathematical notation.';

    case ValidationErrorType.ARITHMETIC:
      return expectedStep
        ? `This step has an arithmetic error. Remember: you need to ${expectedStep.operation}.`
        : 'Check your arithmetic. One of the calculations in this step is incorrect.';

    case ValidationErrorType.METHOD:
      return expectedStep
        ? `You're using the wrong operation. Try to ${expectedStep.operation} instead.`
        : 'The method you\'re using won\'t help solve this problem. Think about what operation would isolate the variable.';

    case ValidationErrorType.LOGIC:
      return 'This step doesn\'t follow logically from the previous one. Review your work.';

    default:
      return 'This step is incorrect. Review your work and try again.';
  }
}

/**
 * Parse UpStudy API response and validate student step
 *
 * UpStudy API returns the complete solution with solving_steps.
 * We compare the student's step against these steps to validate.
 */
function parseCameraMathResponse(
  apiResponse: ValidationApiResponse,
  request: ValidationRequest,
  problem: Problem
): Omit<ValidationResult, 'id' | 'stepId' | 'timestamp' | 'cachedResult'> {
  // Default values
  let isCorrect = false;
  let isUseful = false;
  let errorType: ValidationErrorType | undefined;
  let feedback = '';
  let suggestedSteps: string[] = [];
  let expectedNext: string | undefined;
  let confidence: number | undefined;

  // Parse UpStudy API response
  if (apiResponse.success && apiResponse.data) {
    console.log('[Validation] Parsing UpStudy API response...');

    // Extract solving steps from API response
    // Response structure: { data: { solution: {...}, solving_steps: [...] } }
    const solvingSteps = apiResponse.data.solving_steps || [];

    if (solvingSteps.length > 0) {
      // Try to match student's step with any of the solution steps
      const normalizedStudentStep = normalizeLaTeX(request.studentStep);

      // Check if student's step matches any solving step
      const matchedApiStep = solvingSteps.find((step: any) => {
        const stepLatex = step.latex || step.expression || step.result || '';
        return normalizeLaTeX(stepLatex) === normalizedStudentStep;
      });

      if (matchedApiStep) {
        isCorrect = true;
        isUseful = true; // If it matches a solution step, it's useful
        feedback = 'Great! This step is correct and advances your solution.';
        confidence = 0.95;

        // Provide next step hint if available
        const matchedIndex = solvingSteps.indexOf(matchedApiStep);
        if (matchedIndex < solvingSteps.length - 1) {
          const nextStep = solvingSteps[matchedIndex + 1];
          expectedNext = nextStep.latex || nextStep.expression || nextStep.result;
          suggestedSteps = [nextStep.description || 'Continue to next step'];
        }
      }
    }

    // If no match found in API steps, fall back to local validation
    if (!isCorrect) {
      console.log('[Validation] No match in API steps, using local validation');
    }
  }

  // If API failed or no match found, use local validation
  if (!apiResponse.success || !isCorrect) {
    console.log('[Validation] Using local validation against expected steps');

    const matchingStep = findMatchingExpectedStep(
      request.studentStep,
      problem.expectedSteps,
      request.stepNumber
    );

    isCorrect = matchingStep !== null;
    isUseful = isStepUseful(
      request.studentStep,
      request.previousSteps?.[request.previousSteps.length - 1],
      matchingStep
    );

    if (!isCorrect) {
      errorType = classifyError(request.studentStep, problem.expectedSteps, request.stepNumber);
    }

    feedback = generateFeedback(isCorrect, isUseful, errorType, matchingStep || undefined);

    // Provide expected next step if available
    const nextExpectedStep = problem.expectedSteps.find(
      s => s.stepNumber === request.stepNumber
    );
    if (nextExpectedStep) {
      expectedNext = nextExpectedStep.expression;
    }

    confidence = 0.85; // Local validation confidence
  }

  return {
    isCorrect,
    isUseful,
    errorType,
    feedback,
    suggestedSteps,
    expectedNext,
    confidence,
    apiResponse,
  };
}

/**
 * Call CameraMath (UpStudy) API to get problem solution with steps
 *
 * Uses /show-steps endpoint to retrieve the complete solution,
 * then we compare student's step against the solution steps locally.
 */
async function callCameraMathAPI(
  request: ValidationRequest
): Promise<ValidationApiResponse> {
  try {
    const endpoint = buildEndpointUrl('validate'); // Points to /show-steps
    const headers = getCameraMathHeaders();

    // UpStudy API request format: { "input": "latex_problem", "lang": "EN" }
    const payload = {
      input: request.problemStatement,
      lang: 'EN',
    };

    console.log('[Validation] Calling UpStudy API (show-steps):', endpoint);
    console.log('[Validation] Request payload:', JSON.stringify(payload, null, 2));

    // Make request with retry logic
    const response = await apiRequestWithRetry(async () => {
      // Create abort controller for timeout (AbortSignal.timeout not available in Hermes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cameraMathConfig.timeout);

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(
            `UpStudy API error: ${res.status} ${res.statusText} - ${errorText}`
          );
        }

        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    console.log('[Validation] UpStudy API response:', JSON.stringify(response, null, 2));

    // UpStudy response format: { "data": {...}, "err_msg": null }
    if (response.err_msg) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: response.err_msg,
        },
      };
    }

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Validation] API call failed:', error);

    // Return error response
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Validate a math step
 *
 * This is the main entry point for validation.
 * Handles caching, debouncing, and API orchestration.
 */
export async function validateMathStep(
  request: ValidationRequest
): Promise<ValidationResult> {
  console.log('[Validation] validateMathStep called:', request.problemId, request.stepNumber);

  // Get problem data
  const problem = getProblemById(request.problemId);
  if (!problem) {
    throw new Error(`Problem not found: ${request.problemId}`);
  }

  // Check cache first
  if (cameraMathConfig.enableCaching) {
    const cached = getCachedValidationResult(
      request.problemId,
      request.stepNumber,
      request.studentStep
    );

    if (cached) {
      console.log('[Validation] Returning cached result');
      return cached;
    }
  }

  // Check rate limit
  if (!checkRateLimit()) {
    throw new Error('Rate limit exceeded. Please wait before validating more steps.');
  }

  // Call API (with retry logic built-in)
  const apiResponse = await callCameraMathAPI(request);

  // Parse response
  const parsedResult = parseCameraMathResponse(apiResponse, request, problem);

  // Build final ValidationResult
  const validationResult: ValidationResult = {
    id: generateValidationId(),
    stepId: `step_${request.problemId}_${request.stepNumber}`,
    ...parsedResult,
    cachedResult: false,
    timestamp: Date.now(),
  };

  // Cache the result
  if (cameraMathConfig.enableCaching) {
    cacheValidationResult(
      request.problemId,
      request.stepNumber,
      request.studentStep,
      validationResult
    );
  }

  console.log('[Validation] Validation complete:', validationResult);

  return validationResult;
}

/**
 * Validate step with debouncing
 *
 * Ensures only one validation request happens per debounce period.
 * Useful for real-time validation as user writes.
 */
export async function validateMathStepDebounced(
  request: ValidationRequest,
  debounceMs: number = cameraMathConfig.rateLimit.debounceMs
): Promise<ValidationResult> {
  // Clear existing timer
  if (validationTimer) {
    clearTimeout(validationTimer);
    validationTimer = null;
  }

  // Return existing pending validation if available
  if (pendingValidation) {
    console.log('[Validation] Returning existing pending validation');
    return pendingValidation;
  }

  // Create new debounced validation
  return new Promise((resolve, reject) => {
    validationTimer = setTimeout(async () => {
      try {
        pendingValidation = validateMathStep(request);
        const result = await pendingValidation;
        pendingValidation = null;
        resolve(result);
      } catch (error) {
        pendingValidation = null;
        reject(error);
      }
    }, debounceMs);
  });
}

/**
 * Batch validate multiple steps
 *
 * Useful for validating an entire solution at once.
 * Returns array of validation results in order.
 */
export async function validateMultipleSteps(
  problemId: string,
  problemStatement: string,
  steps: string[]
): Promise<ValidationResult[]> {
  console.log('[Validation] Batch validating', steps.length, 'steps');

  const results: ValidationResult[] = [];
  const previousSteps: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const request: ValidationRequest = {
      problemId,
      studentStep: steps[i],
      stepNumber: i + 1,
      previousSteps: [...previousSteps],
      problemStatement,
    };

    const result = await validateMathStep(request);
    results.push(result);
    previousSteps.push(steps[i]);

    // Stop if step is incorrect (no point validating further)
    if (!result.isCorrect) {
      console.log('[Validation] Stopping batch validation at incorrect step', i + 1);
      break;
    }
  }

  return results;
}

/**
 * Check if student has reached the final answer
 */
export function isFinalAnswer(
  studentStep: string,
  problem: Problem
): boolean {
  const normalizedStudent = normalizeLaTeX(studentStep);
  const normalizedAnswer = normalizeLaTeX(problem.answerLatex);

  return normalizedStudent === normalizedAnswer;
}

/**
 * Get hint for next step
 *
 * Returns a hint based on current progress and expected steps.
 * Used by hint system (PR6).
 */
export function getNextStepHint(
  problemId: string,
  currentStepNumber: number,
  hintLevel: 'concept' | 'direction' | 'micro'
): string {
  const problem = getProblemById(problemId);
  if (!problem) {
    return 'Problem not found.';
  }

  const nextExpectedStep = problem.expectedSteps.find(
    s => s.stepNumber === currentStepNumber
  );

  if (!nextExpectedStep) {
    return 'You\'re almost there! Check if you\'ve reached the solution.';
  }

  switch (hintLevel) {
    case 'concept':
      return `Think about what operation would help ${nextExpectedStep.description.toLowerCase()}.`;

    case 'direction':
      return `Try to ${nextExpectedStep.operation}.`;

    case 'micro':
      return `The next step is: ${nextExpectedStep.description}`;

    default:
      return nextExpectedStep.description;
  }
}
