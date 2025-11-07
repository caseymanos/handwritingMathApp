/**
 * Storage Utility (MMKV)
 *
 * Fast, synchronous key-value storage for validation caching,
 * attempt history, and app state persistence.
 *
 * MMKV is 20x faster than AsyncStorage and supports encryption.
 */

import { MMKV } from 'react-native-mmkv';
import crypto from 'crypto-js';
import { ValidationResult, ValidationCacheEntry } from '../types/Validation';
import { Attempt, AttemptStorageEntry } from '../types/Attempt';

/**
 * Initialize MMKV storage instances
 */

// Main storage for validation cache
export const validationStorage = new MMKV({
  id: 'validation-cache',
  encryptionKey: 'handwriting-math-validation-key', // Basic encryption
});

// Storage for attempt history
export const attemptStorage = new MMKV({
  id: 'attempt-history',
  encryptionKey: 'handwriting-math-attempts-key',
});

// Storage for app state and preferences
export const appStorage = new MMKV({
  id: 'app-state',
});

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  VALIDATION_PREFIX: 'validation:',
  ATTEMPT_PREFIX: 'attempt:',
  CACHE_STATS: 'cache:stats',
  LAST_SYNC: 'sync:last',
  WELCOME_SHOWN: 'ui:welcome_shown',
} as const;

/**
 * Default cache TTL (7 days in milliseconds)
 */
const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// ============================================================================
// VALIDATION CACHE
// ============================================================================

/**
 * Generate cache key for validation
 * Format: validation:{problemId}:{stepNumber}:{latexHash}
 */
export function generateValidationCacheKey(
  problemId: string,
  stepNumber: number,
  latex: string
): string {
  const latexHash = crypto.MD5(latex).toString().substring(0, 8);
  return `${STORAGE_KEYS.VALIDATION_PREFIX}${problemId}:${stepNumber}:${latexHash}`;
}

/**
 * Cache a validation result
 */
export function cacheValidationResult(
  problemId: string,
  stepNumber: number,
  latex: string,
  result: ValidationResult,
  ttl: number = DEFAULT_CACHE_TTL
): void {
  try {
    const key = generateValidationCacheKey(problemId, stepNumber, latex);

    const entry: ValidationCacheEntry = {
      key,
      result,
      cachedAt: Date.now(),
      ttl,
    };

    validationStorage.set(key, JSON.stringify(entry));

    // Update cache stats
    updateCacheStats('hit', 0);

    console.log(`[Storage] Cached validation: ${key}`);
  } catch (error) {
    console.error('[Storage] Error caching validation:', error);
  }
}

/**
 * Get cached validation result
 * Returns null if not found or expired
 */
export function getCachedValidationResult(
  problemId: string,
  stepNumber: number,
  latex: string
): ValidationResult | null {
  try {
    const key = generateValidationCacheKey(problemId, stepNumber, latex);
    const cached = validationStorage.getString(key);

    if (!cached) {
      updateCacheStats('miss', 0);
      return null;
    }

    const entry: ValidationCacheEntry = JSON.parse(cached);

    // Check if expired
    const age = Date.now() - entry.cachedAt;
    if (age > entry.ttl) {
      // Expired - delete and return null
      validationStorage.delete(key);
      updateCacheStats('miss', -1); // -1 to decrement size
      console.log(`[Storage] Cache expired: ${key}`);
      return null;
    }

    updateCacheStats('hit', 0);
    console.log(`[Storage] Cache hit: ${key}`);

    return {
      ...entry.result,
      cachedResult: true,
    };
  } catch (error) {
    console.error('[Storage] Error getting cached validation:', error);
    return null;
  }
}

/**
 * Clear all validation cache
 */
export function clearValidationCache(): void {
  try {
    const keys = validationStorage.getAllKeys();
    const validationKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.VALIDATION_PREFIX));

    validationKeys.forEach(key => validationStorage.delete(key));

    // Reset cache stats
    validationStorage.set(STORAGE_KEYS.CACHE_STATS, JSON.stringify({
      hits: 0,
      misses: 0,
      totalSize: 0,
    }));

    console.log(`[Storage] Cleared ${validationKeys.length} validation cache entries`);
  } catch (error) {
    console.error('[Storage] Error clearing validation cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { hits: number; misses: number; totalSize: number } {
  try {
    const stats = validationStorage.getString(STORAGE_KEYS.CACHE_STATS);
    if (!stats) {
      return { hits: 0, misses: 0, totalSize: 0 };
    }
    return JSON.parse(stats);
  } catch (error) {
    console.error('[Storage] Error getting cache stats:', error);
    return { hits: 0, misses: 0, totalSize: 0 };
  }
}

/**
 * Update cache statistics
 */
function updateCacheStats(type: 'hit' | 'miss', sizeDelta: number): void {
  try {
    const stats = getCacheStats();

    if (type === 'hit') {
      stats.hits += 1;
    } else {
      stats.misses += 1;
    }

    stats.totalSize += sizeDelta;

    validationStorage.set(STORAGE_KEYS.CACHE_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('[Storage] Error updating cache stats:', error);
  }
}

// ============================================================================
// ATTEMPT STORAGE
// ============================================================================

/**
 * Save an attempt
 */
export function saveAttempt(attempt: Attempt): void {
  try {
    const key = `${STORAGE_KEYS.ATTEMPT_PREFIX}${attempt.id}`;

    const entry: AttemptStorageEntry = {
      attempt,
      storedAt: Date.now(),
      syncStatus: 'pending', // Will sync in PR12+
    };

    attemptStorage.set(key, JSON.stringify(entry));

    console.log(`[Storage] Saved attempt: ${attempt.id}`);
  } catch (error) {
    console.error('[Storage] Error saving attempt:', error);
  }
}

/**
 * Get an attempt by ID
 */
export function getAttempt(attemptId: string): Attempt | null {
  try {
    const key = `${STORAGE_KEYS.ATTEMPT_PREFIX}${attemptId}`;
    const stored = attemptStorage.getString(key);

    if (!stored) {
      return null;
    }

    const entry: AttemptStorageEntry = JSON.parse(stored);
    return entry.attempt;
  } catch (error) {
    console.error('[Storage] Error getting attempt:', error);
    return null;
  }
}

/**
 * Get all attempts for a problem
 */
export function getAttemptsByProblem(problemId: string): Attempt[] {
  try {
    const keys = attemptStorage.getAllKeys();
    const attemptKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.ATTEMPT_PREFIX));

    const attempts: Attempt[] = [];

    for (const key of attemptKeys) {
      const stored = attemptStorage.getString(key);
      if (stored) {
        const entry: AttemptStorageEntry = JSON.parse(stored);
        if (entry.attempt.problemId === problemId) {
          attempts.push(entry.attempt);
        }
      }
    }

    // Sort by start time (most recent first)
    return attempts.sort((a, b) => b.startTime - a.startTime);
  } catch (error) {
    console.error('[Storage] Error getting attempts by problem:', error);
    return [];
  }
}

/**
 * Get all attempts
 */
export function getAllAttempts(): Attempt[] {
  try {
    const keys = attemptStorage.getAllKeys();
    const attemptKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.ATTEMPT_PREFIX));

    const attempts: Attempt[] = [];

    for (const key of attemptKeys) {
      const stored = attemptStorage.getString(key);
      if (stored) {
        const entry: AttemptStorageEntry = JSON.parse(stored);
        attempts.push(entry.attempt);
      }
    }

    return attempts.sort((a, b) => b.startTime - a.startTime);
  } catch (error) {
    console.error('[Storage] Error getting all attempts:', error);
    return [];
  }
}

/**
 * Delete an attempt
 */
export function deleteAttempt(attemptId: string): void {
  try {
    const key = `${STORAGE_KEYS.ATTEMPT_PREFIX}${attemptId}`;
    attemptStorage.delete(key);
    console.log(`[Storage] Deleted attempt: ${attemptId}`);
  } catch (error) {
    console.error('[Storage] Error deleting attempt:', error);
  }
}

/**
 * Clear all attempts
 */
export function clearAllAttempts(): void {
  try {
    const keys = attemptStorage.getAllKeys();
    const attemptKeys = keys.filter(k => k.startsWith(STORAGE_KEYS.ATTEMPT_PREFIX));

    attemptKeys.forEach(key => attemptStorage.delete(key));

    console.log(`[Storage] Cleared ${attemptKeys.length} attempts`);
  } catch (error) {
    console.error('[Storage] Error clearing attempts:', error);
  }
}

// ============================================================================
// APP STATE
// ============================================================================

/**
 * Set app state value
 */
export function setAppState(key: string, value: any): void {
  try {
    appStorage.set(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[Storage] Error setting app state ${key}:`, error);
  }
}

/**
 * Get app state value
 */
export function getAppState<T>(key: string, defaultValue?: T): T | null {
  try {
    const value = appStorage.getString(key);
    if (!value) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Storage] Error getting app state ${key}:`, error);
    return defaultValue !== undefined ? defaultValue : null;
  }
}

/**
 * Delete app state value
 */
export function deleteAppState(key: string): void {
  try {
    appStorage.delete(key);
  } catch (error) {
    console.error(`[Storage] Error deleting app state ${key}:`, error);
  }
}

/**
 * Clear all app state
 */
export function clearAppState(): void {
  try {
    appStorage.clearAll();
    console.log('[Storage] Cleared all app state');
  } catch (error) {
    console.error('[Storage] Error clearing app state:', error);
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get total storage size (approximate)
 */
export function getStorageSize(): {
  validation: number;
  attempts: number;
  app: number;
  total: number;
} {
  try {
    const validationKeys = validationStorage.getAllKeys().length;
    const attemptKeys = attemptStorage.getAllKeys().length;
    const appKeys = appStorage.getAllKeys().length;

    return {
      validation: validationKeys,
      attempts: attemptKeys,
      app: appKeys,
      total: validationKeys + attemptKeys + appKeys,
    };
  } catch (error) {
    console.error('[Storage] Error getting storage size:', error);
    return { validation: 0, attempts: 0, app: 0, total: 0 };
  }
}

/**
 * Clear all storage (use with caution!)
 */
export function clearAllStorage(): void {
  try {
    validationStorage.clearAll();
    attemptStorage.clearAll();
    appStorage.clearAll();
    console.log('[Storage] Cleared ALL storage');
  } catch (error) {
    console.error('[Storage] Error clearing all storage:', error);
  }
}

/**
 * Export storage data (for debugging)
 */
export function exportStorageData(): {
  validation: any[];
  attempts: Attempt[];
  app: Record<string, any>;
} {
  try {
    const validationKeys = validationStorage.getAllKeys();
    const validationData = validationKeys.map(key => ({
      key,
      value: validationStorage.getString(key),
    }));

    const attempts = getAllAttempts();

    const appKeys = appStorage.getAllKeys();
    const appData: Record<string, any> = {};
    appKeys.forEach(key => {
      const value = appStorage.getString(key);
      if (value) {
        try {
          appData[key] = JSON.parse(value);
        } catch {
          appData[key] = value;
        }
      }
    });

    return {
      validation: validationData,
      attempts,
      app: appData,
    };
  } catch (error) {
    console.error('[Storage] Error exporting storage data:', error);
    return { validation: [], attempts: [], app: {} };
  }
}
