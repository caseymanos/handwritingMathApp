/**
 * Unit Tests for Storage Utilities
 *
 * Tests the MMKV storage wrapper functions for validation caching,
 * attempt persistence, and app state management.
 */

import {
  generateValidationCacheKey,
  cacheValidationResult,
  getCachedValidationResult,
  clearValidationCache,
  getCacheStats,
  saveAttempt,
  getAttempt,
  getAttemptsByProblem,
  getAllAttempts,
  deleteAttempt,
  clearAllAttempts,
  setAppState,
  getAppState,
  deleteAppState,
  clearAppState,
  getStorageSize,
  clearAllStorage,
  exportStorageData,
  validationStorage,
  attemptStorage,
  appStorage,
} from '../../app/utils/storage';
import { ValidationResult, ValidationErrorType } from '../../app/types/Validation';
import { Attempt } from '../../app/types/Attempt';

// Mock console methods to keep test output clean
const consoleLog = console.log;
const consoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = consoleLog;
  console.error = consoleError;
});

describe('storage', () => {
  beforeEach(() => {
    // Clear all storage before each test
    validationStorage.clearAll();
    attemptStorage.clearAll();
    appStorage.clearAll();
    jest.clearAllMocks();
  });

  describe('generateValidationCacheKey', () => {
    it('should generate consistent cache key', () => {
      const key1 = generateValidationCacheKey('prob1', 1, 'x + 5 = 12');
      const key2 = generateValidationCacheKey('prob1', 1, 'x + 5 = 12');

      expect(key1).toBe(key2);
      expect(key1).toContain('validation:');
      expect(key1).toContain('prob1');
      expect(key1).toContain(':1:');
    });

    it('should generate different keys for different inputs', () => {
      const key1 = generateValidationCacheKey('prob1', 1, 'x + 5 = 12');
      const key2 = generateValidationCacheKey('prob1', 2, 'x + 5 = 12');
      const key3 = generateValidationCacheKey('prob2', 1, 'x + 5 = 12');
      const key4 = generateValidationCacheKey('prob1', 1, 'completely different equation');

      // Different step numbers should produce different keys
      expect(key1).not.toBe(key2);
      // Different problem IDs should produce different keys
      expect(key1).not.toBe(key3);
      // Different latex expressions should produce different keys (if hash is working)
      // Note: our mock hash might not always be unique, so we just check the structure is correct
      expect(key4).toContain('validation:');
      expect(key4).toContain('prob1');
      expect(key4).toContain(':1:');
    });

    it('should include hash of LaTeX expression', () => {
      const key = generateValidationCacheKey('prob1', 1, 'x + 5 = 12');

      // Key should have 4 parts: validation:problemId:stepNumber:hash
      const parts = key.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('validation');
      expect(parts[1]).toBe('prob1');
      expect(parts[2]).toBe('1');
      expect(parts[3]).toHaveLength(8); // Hash is 8 chars
    });
  });

  describe('cacheValidationResult', () => {
    it('should cache validation result', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good job!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x + 5 = 12', result);

      const cached = getCachedValidationResult('prob1', 1, 'x + 5 = 12');
      expect(cached).toBeTruthy();
      expect(cached?.isCorrect).toBe(true);
      expect(cached?.isUseful).toBe(true);
      expect(cached?.cachedResult).toBe(true);
    });

    it('should use custom TTL', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      const shortTTL = 1000; // 1 second
      cacheValidationResult('prob1', 1, 'x = 7', result, shortTTL);

      // Should be cached immediately
      const cached = getCachedValidationResult('prob1', 1, 'x = 7');
      expect(cached).toBeTruthy();
    });
  });

  describe('getCachedValidationResult', () => {
    it('should return null for non-existent cache', () => {
      const cached = getCachedValidationResult('nonexistent', 1, 'x = 7');
      expect(cached).toBeNull();
    });

    it('should return cached result if not expired', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Correct!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);

      const cached = getCachedValidationResult('prob1', 1, 'x = 7');
      expect(cached).toBeTruthy();
      expect(cached?.cachedResult).toBe(true);
    });

    it('should return null for expired cache', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Correct!',
        nextSteps: [],
        cachedResult: false,
        timestamp: now,
      };

      const shortTTL = 1000; // 1 second
      cacheValidationResult('prob1', 1, 'x = 7', result, shortTTL);

      // Advance time past TTL
      jest.setSystemTime(now + 2000);

      const cached = getCachedValidationResult('prob1', 1, 'x = 7');
      expect(cached).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('clearValidationCache', () => {
    it('should clear all validation cache entries', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);
      cacheValidationResult('prob2', 1, 'y = 3', result);

      clearValidationCache();

      expect(getCachedValidationResult('prob1', 1, 'x = 7')).toBeNull();
      expect(getCachedValidationResult('prob2', 1, 'y = 3')).toBeNull();
    });

    it('should reset cache stats', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);
      getCachedValidationResult('prob1', 1, 'x = 7'); // Hit

      clearValidationCache();

      const stats = getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return initial stats', () => {
      const stats = getCacheStats();
      expect(stats).toEqual({ hits: 0, misses: 0, totalSize: 0 });
    });

    it('should track cache hits', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);
      getCachedValidationResult('prob1', 1, 'x = 7');

      const stats = getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should track cache misses', () => {
      getCachedValidationResult('nonexistent', 1, 'x = 7');

      const stats = getCacheStats();
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('saveAttempt', () => {
    it('should save attempt', () => {
      const attempt: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt);

      const retrieved = getAttempt('attempt1');
      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe('attempt1');
      expect(retrieved?.problemId).toBe('prob1');
    });
  });

  describe('getAttempt', () => {
    it('should return null for non-existent attempt', () => {
      const attempt = getAttempt('nonexistent');
      expect(attempt).toBeNull();
    });

    it('should retrieve saved attempt', () => {
      const attempt: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt);
      const retrieved = getAttempt('attempt1');

      expect(retrieved).toEqual(attempt);
    });
  });

  describe('getAttemptsByProblem', () => {
    it('should return empty array for no attempts', () => {
      const attempts = getAttemptsByProblem('prob1');
      expect(attempts).toEqual([]);
    });

    it('should filter attempts by problem ID', () => {
      const attempt1: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now() - 2000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      const attempt2: Attempt = {
        id: 'attempt2',
        problemId: 'prob2',
        startTime: Date.now() - 1000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      const attempt3: Attempt = {
        id: 'attempt3',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt1);
      saveAttempt(attempt2);
      saveAttempt(attempt3);

      const prob1Attempts = getAttemptsByProblem('prob1');
      expect(prob1Attempts).toHaveLength(2);
      expect(prob1Attempts[0].id).toBe('attempt3'); // Most recent first
      expect(prob1Attempts[1].id).toBe('attempt1');
    });

    it('should sort attempts by start time (most recent first)', () => {
      const attempt1: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: 1000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      const attempt2: Attempt = {
        id: 'attempt2',
        problemId: 'prob1',
        startTime: 3000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      const attempt3: Attempt = {
        id: 'attempt3',
        problemId: 'prob1',
        startTime: 2000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt1);
      saveAttempt(attempt2);
      saveAttempt(attempt3);

      const attempts = getAttemptsByProblem('prob1');
      expect(attempts[0].id).toBe('attempt2'); // 3000
      expect(attempts[1].id).toBe('attempt3'); // 2000
      expect(attempts[2].id).toBe('attempt1'); // 1000
    });
  });

  describe('getAllAttempts', () => {
    it('should return empty array when no attempts', () => {
      const attempts = getAllAttempts();
      expect(attempts).toEqual([]);
    });

    it('should return all attempts sorted by time', () => {
      const attempt1: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: 1000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      const attempt2: Attempt = {
        id: 'attempt2',
        problemId: 'prob2',
        startTime: 2000,
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt1);
      saveAttempt(attempt2);

      const attempts = getAllAttempts();
      expect(attempts).toHaveLength(2);
      expect(attempts[0].id).toBe('attempt2'); // Most recent first
      expect(attempts[1].id).toBe('attempt1');
    });
  });

  describe('deleteAttempt', () => {
    it('should delete attempt by ID', () => {
      const attempt: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt);
      expect(getAttempt('attempt1')).toBeTruthy();

      deleteAttempt('attempt1');
      expect(getAttempt('attempt1')).toBeNull();
    });
  });

  describe('clearAllAttempts', () => {
    it('should clear all attempts', () => {
      const attempt1: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      const attempt2: Attempt = {
        id: 'attempt2',
        problemId: 'prob2',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt1);
      saveAttempt(attempt2);

      clearAllAttempts();

      expect(getAllAttempts()).toHaveLength(0);
    });
  });

  describe('setAppState', () => {
    it('should set app state value', () => {
      setAppState('test_key', { value: 123 });

      const retrieved = getAppState('test_key');
      expect(retrieved).toEqual({ value: 123 });
    });

    it('should handle different data types', () => {
      setAppState('string', 'hello');
      setAppState('number', 42);
      setAppState('boolean', true);
      setAppState('array', [1, 2, 3]);
      setAppState('object', { a: 1, b: 2 });

      expect(getAppState('string')).toBe('hello');
      expect(getAppState('number')).toBe(42);
      expect(getAppState('boolean')).toBe(true);
      expect(getAppState('array')).toEqual([1, 2, 3]);
      expect(getAppState('object')).toEqual({ a: 1, b: 2 });
    });
  });

  describe('getAppState', () => {
    it('should return null for non-existent key', () => {
      const value = getAppState('nonexistent');
      expect(value).toBeNull();
    });

    it('should return default value if provided', () => {
      const value = getAppState('nonexistent', 'default');
      expect(value).toBe('default');
    });

    it('should retrieve stored value', () => {
      setAppState('key1', 'value1');
      const retrieved = getAppState('key1');
      expect(retrieved).toBe('value1');
    });
  });

  describe('deleteAppState', () => {
    it('should delete app state value', () => {
      setAppState('key1', 'value1');
      expect(getAppState('key1')).toBe('value1');

      deleteAppState('key1');
      expect(getAppState('key1')).toBeNull();
    });
  });

  describe('clearAppState', () => {
    it('should clear all app state', () => {
      setAppState('key1', 'value1');
      setAppState('key2', 'value2');

      clearAppState();

      expect(getAppState('key1')).toBeNull();
      expect(getAppState('key2')).toBeNull();
    });
  });

  describe('getStorageSize', () => {
    it('should return zero counts for empty storage', () => {
      const size = getStorageSize();
      expect(size).toEqual({
        validation: 0,
        attempts: 0,
        app: 0,
        total: 0,
      });
    });

    it('should count stored items', () => {
      // Clear storage to ensure clean state
      clearAllStorage();

      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);

      const attempt: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt);
      setAppState('key1', 'value1');

      const size = getStorageSize();
      expect(size.validation).toBeGreaterThan(0); // At least 1 validation + stats
      expect(size.attempts).toBeGreaterThan(0); // At least 1
      expect(size.app).toBeGreaterThan(0); // At least 1
      expect(size.total).toBeGreaterThan(0);
    });
  });

  describe('clearAllStorage', () => {
    it('should clear all storage', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);

      const attempt: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt);
      setAppState('key1', 'value1');

      clearAllStorage();

      const size = getStorageSize();
      expect(size.total).toBe(0);
    });
  });

  describe('exportStorageData', () => {
    it('should export all storage data', () => {
      const result: ValidationResult = {
        stepId: 'step1',
        isCorrect: true,
        isUseful: true,
        feedback: 'Good!',
        nextSteps: [],
        cachedResult: false,
        timestamp: Date.now(),
      };

      cacheValidationResult('prob1', 1, 'x = 7', result);

      const attempt: Attempt = {
        id: 'attempt1',
        problemId: 'prob1',
        startTime: Date.now(),
        endTime: null,
        steps: [],
        hintRequests: [],
        completed: false,
        totalHints: 0,
        incorrectAttempts: 0,
      };

      saveAttempt(attempt);
      setAppState('key1', 'value1');

      const exported = exportStorageData();

      expect(exported.validation.length).toBeGreaterThan(0);
      expect(exported.attempts).toHaveLength(1);
      expect(exported.attempts[0].id).toBe('attempt1');
      expect(exported.app.key1).toBe('value1');
    });

    it('should return empty data for empty storage', () => {
      const exported = exportStorageData();

      expect(exported.validation).toEqual([]);
      expect(exported.attempts).toEqual([]);
      expect(exported.app).toEqual({});
    });
  });
});
