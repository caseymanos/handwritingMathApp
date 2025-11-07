/**
 * Unit Tests for Math Validation
 *
 * Tests the core validation logic, LaTeX normalization, error classification,
 * and API integration for the mathValidation utility.
 */

import {
  validateMathStep,
  validateMathStepDebounced,
  validateMultipleSteps,
  isFinalAnswer,
  getNextStepHint,
} from '../../app/utils/mathValidation';
import {
  ValidationRequest,
  ValidationErrorType,
} from '../../app/types/Validation';
import { Problem, ProblemDifficulty, ProblemCategory } from '../../app/types/Problem';
import * as storage from '../../app/utils/storage';
import * as apiConfig from '../../app/utils/apiConfig';
import * as problemData from '../../app/utils/problemData';

// Mock dependencies
jest.mock('../../app/utils/storage');
jest.mock('../../app/utils/apiConfig');
jest.mock('../../app/utils/problemData');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockApiConfig = apiConfig as jest.Mocked<typeof apiConfig>;
const mockProblemData = problemData as jest.Mocked<typeof problemData>;

// Test data
const testProblem: Problem = {
  id: 'test_001',
  category: ProblemCategory.LINEAR_EQUATIONS,
  difficulty: ProblemDifficulty.EASY,
  text: 'Solve for x: x + 5 = 12',
  latex: 'x + 5 = 12',
  answer: 'x = 7',
  answerLatex: 'x = 7',
  expectedSteps: [
    {
      stepNumber: 1,
      description: 'Subtract 5 from both sides',
      expression: 'x + 5 - 5 = 12 - 5',
      operation: 'subtract 5 from both sides',
    },
    {
      stepNumber: 2,
      description: 'Simplify',
      expression: 'x = 7',
      operation: 'simplify',
    },
  ],
};

describe('mathValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockProblemData.getProblemById.mockReturnValue(testProblem);
    mockStorage.getCachedValidationResult.mockReturnValue(null);
    mockApiConfig.checkRateLimit.mockReturnValue(true);
    mockApiConfig.cameraMathConfig = {
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com',
      timeout: 10000,
      enableCaching: true,
      rateLimit: {
        maxRequestsPerMinute: 60,
        debounceMs: 500,
      },
    };
  });

  describe('normalizeLaTeX', () => {
    it('should remove whitespace from LaTeX expressions', () => {
      // Test is internal, but we can test it indirectly through isFinalAnswer
      expect(isFinalAnswer('x = 7', testProblem)).toBe(true);
      expect(isFinalAnswer('x=7', testProblem)).toBe(true);
      expect(isFinalAnswer('x = 7 ', testProblem)).toBe(true);
    });

    it('should normalize \\left and \\right', () => {
      const problemWithParens: Problem = {
        ...testProblem,
        answerLatex: '\\left(x\\right) = 7',
      };
      expect(isFinalAnswer('(x) = 7', problemWithParens)).toBe(true);
    });
  });

  describe('isFinalAnswer', () => {
    it('should return true when student step matches final answer', () => {
      expect(isFinalAnswer('x = 7', testProblem)).toBe(true);
      expect(isFinalAnswer('x=7', testProblem)).toBe(true);
    });

    it('should return false when student step does not match final answer', () => {
      expect(isFinalAnswer('x = 6', testProblem)).toBe(false);
      expect(isFinalAnswer('x + 5 = 12', testProblem)).toBe(false);
    });
  });

  describe('getNextStepHint', () => {
    it('should provide concept-level hint', () => {
      const hint = getNextStepHint('test_001', 1, 'concept');
      expect(hint).toContain('operation');
      expect(hint.toLowerCase()).toContain('subtract');
    });

    it('should provide directional hint', () => {
      const hint = getNextStepHint('test_001', 1, 'direction');
      expect(hint).toContain('subtract 5 from both sides');
    });

    it('should provide micro-step hint', () => {
      const hint = getNextStepHint('test_001', 1, 'micro');
      expect(hint).toContain('Subtract 5 from both sides');
    });

    it('should return generic message when problem not found', () => {
      mockProblemData.getProblemById.mockReturnValue(null);
      const hint = getNextStepHint('invalid_id', 1, 'concept');
      expect(hint).toBe('Problem not found.');
    });

    it('should return completion message when no more steps', () => {
      const hint = getNextStepHint('test_001', 10, 'concept');
      expect(hint).toContain('almost there');
    });
  });

  describe('validateMathStep', () => {
    const validRequest: ValidationRequest = {
      problemId: 'test_001',
      studentStep: 'x + 5 - 5 = 12 - 5',
      stepNumber: 1,
      previousSteps: [],
      problemStatement: 'x + 5 = 12',
    };

    it('should return cached result if available', async () => {
      const cachedResult = {
        id: 'cached_001',
        stepId: 'step_test_001_1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Cached feedback',
        suggestedSteps: [],
        cachedResult: true,
        timestamp: Date.now(),
      };

      mockStorage.getCachedValidationResult.mockReturnValue(cachedResult);

      const result = await validateMathStep(validRequest);

      expect(result).toEqual(cachedResult);
      expect(mockStorage.getCachedValidationResult).toHaveBeenCalledWith(
        'test_001',
        1,
        'x + 5 - 5 = 12 - 5'
      );
    });

    it('should throw error when problem not found', async () => {
      mockProblemData.getProblemById.mockReturnValue(null);

      await expect(validateMathStep(validRequest)).rejects.toThrow(
        'Problem not found: test_001'
      );
    });

    it('should throw error when rate limit exceeded', async () => {
      mockApiConfig.checkRateLimit.mockReturnValue(false);

      await expect(validateMathStep(validRequest)).rejects.toThrow(
        'Rate limit exceeded'
      );
    });

    it('should validate correct step and mark as useful', async () => {
      // Mock API response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            solving_steps: [
              {
                latex: 'x + 5 - 5 = 12 - 5',
                description: 'Subtract 5 from both sides',
              },
              {
                latex: 'x = 7',
                description: 'Solution',
              },
            ],
          },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const result = await validateMathStep(validRequest);

      expect(result.isCorrect).toBe(true);
      expect(result.isUseful).toBe(true);
      expect(result.feedback).toContain('Great');
      expect(result.cachedResult).toBe(false);
      expect(mockStorage.cacheValidationResult).toHaveBeenCalled();
    });

    it('should detect incorrect step with syntax error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { solving_steps: [] },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const incorrectRequest: ValidationRequest = {
        ...validRequest,
        studentStep: 'x + 5 - 5 = 12 - 5))', // Mismatched parentheses
      };

      const result = await validateMathStep(incorrectRequest);

      expect(result.isCorrect).toBe(false);
      expect(result.errorType).toBe(ValidationErrorType.SYNTAX);
      expect(result.feedback).toContain('syntax error');
    });

    it('should detect correct but not useful step (tautology)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { solving_steps: [] },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const tautologyRequest: ValidationRequest = {
        ...validRequest,
        studentStep: 'x + 5 + 0 = 12 + 0', // Adding 0
      };

      const result = await validateMathStep(tautologyRequest);

      // Tautology steps are not correct because they don't match expected steps
      expect(result.isCorrect).toBe(false);
      expect(result.isUseful).toBe(false);
    });

    it('should handle API error gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const result = await validateMathStep(validRequest);

      // Should fall back to local validation
      expect(result.isCorrect).toBe(true); // Matches expected step
      expect(result.confidence).toBe(0.85); // Local validation confidence
    });
  });

  describe('validateMathStepDebounced', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce validation requests', async () => {
      const request: ValidationRequest = {
        problemId: 'test_001',
        studentStep: 'x = 7',
        stepNumber: 2,
        previousSteps: ['x + 5 - 5 = 12 - 5'],
        problemStatement: 'x + 5 = 12',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            solving_steps: [{ latex: 'x = 7' }],
          },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const promise = validateMathStepDebounced(request, 500);

      // Validation should not happen immediately
      expect(global.fetch).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(500);

      const result = await promise;

      expect(result.isCorrect).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateMultipleSteps', () => {
    it('should validate all steps in sequence', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            solving_steps: [
              { latex: 'x + 5 - 5 = 12 - 5' },
              { latex: 'x = 7' },
            ],
          },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const steps = ['x + 5 - 5 = 12 - 5', 'x = 7'];

      const results = await validateMultipleSteps('test_001', 'x + 5 = 12', steps);

      expect(results).toHaveLength(2);
      expect(results[0].isCorrect).toBe(true);
      expect(results[1].isCorrect).toBe(true);
    });

    it('should stop validating after first incorrect step', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            solving_steps: [{ latex: 'x + 5 - 5 = 12 - 5' }],
          },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const steps = [
        'x + 5 - 5 = 12 - 5', // Correct
        'x = 99', // Incorrect
        'x = 7', // Should not be validated
      ];

      const results = await validateMultipleSteps('test_001', 'x + 5 = 12', steps);

      expect(results).toHaveLength(2); // Only first 2 steps
      expect(results[0].isCorrect).toBe(true);
      expect(results[1].isCorrect).toBe(false);
    });
  });

  describe('error classification', () => {
    it('should detect METHOD error when using wrong operation', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { solving_steps: [] },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const wrongMethodRequest: ValidationRequest = {
        problemId: 'test_001',
        studentStep: 'x + 5 + 5 = 12 + 5', // Adding instead of subtracting
        stepNumber: 1,
        previousSteps: [],
        problemStatement: 'x + 5 = 12',
      };

      const result = await validateMathStep(wrongMethodRequest);

      expect(result.isCorrect).toBe(false);
      expect(result.errorType).toBe(ValidationErrorType.METHOD);
      expect(result.feedback).toContain('method');
    });

    it('should detect ARITHMETIC error for calculation mistakes', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { solving_steps: [] },
          err_msg: null,
        }),
      });

      mockApiConfig.getCameraMathHeaders.mockReturnValue({
        'Content-Type': 'application/json',
      });
      mockApiConfig.buildEndpointUrl.mockReturnValue('https://api.test.com/validate');
      mockApiConfig.apiRequestWithRetry.mockImplementation(async (fn) => fn());

      const arithmeticErrorRequest: ValidationRequest = {
        problemId: 'test_001',
        studentStep: 'x = 9', // Wrong final answer (correct operation but wrong arithmetic)
        stepNumber: 2,
        previousSteps: ['x + 5 - 5 = 12 - 5'],
        problemStatement: 'x + 5 = 12',
      };

      const result = await validateMathStep(arithmeticErrorRequest);

      expect(result.isCorrect).toBe(false);
      // Since expected step 2 is simplify (no specific operation like add/subtract)
      // it should be classified as ARITHMETIC error
      expect(result.errorType).toBe(ValidationErrorType.ARITHMETIC);
    });
  });
});
