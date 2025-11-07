/**
 * API Configuration
 *
 * Centralized configuration for CameraMath API integration.
 * Handles environment variables, endpoints, timeouts, and retry logic.
 *
 * Usage:
 *   import { cameraMathConfig, getCameraMathHeaders } from '@/utils/apiConfig';
 */

import {
  CAMERAMATH_API_KEY,
  CAMERAMATH_API_URL,
  CAMERAMATH_TIMEOUT_MS,
  CAMERAMATH_ENABLE_CACHING,
} from '@env';

/**
 * CameraMath API Configuration
 */
export interface CameraMathConfig {
  /** Base API URL */
  baseUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Enable response caching */
  enableCaching: boolean;

  /** API endpoints */
  endpoints: {
    validate: string;
    solve: string;
    steps: string;
  };

  /** Retry configuration */
  retry: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier: number;
  };

  /** Rate limiting */
  rateLimit: {
    maxRequestsPerMinute: number;
    debounceMs: number;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  baseUrl: 'https://api.cameramath.com/v1',
  timeout: 5000,
  enableCaching: true,
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  maxRequestsPerMinute: 30, // UpStudy API limit: 30 requests/minute
  debounceMs: 500,
} as const;

/**
 * Validate environment variables
 */
function validateEnvConfig(): void {
  if (!CAMERAMATH_API_KEY) {
    console.error('[API Config] Missing CAMERAMATH_API_KEY in environment variables');
    throw new Error(
      'CameraMath API key not configured. Please add CAMERAMATH_API_KEY to your .env file.'
    );
  }

  if (!CAMERAMATH_API_URL) {
    console.warn(
      '[API Config] CAMERAMATH_API_URL not set, using default:',
      DEFAULT_CONFIG.baseUrl
    );
  }

  console.log('[API Config] Environment variables validated successfully');
}

/**
 * Parse numeric environment variable with fallback
 */
function parseNumericEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`[API Config] Invalid numeric value: ${value}, using fallback: ${fallback}`);
    return fallback;
  }

  return parsed;
}

/**
 * Parse boolean environment variable with fallback
 */
function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;

  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;

  console.warn(`[API Config] Invalid boolean value: ${value}, using fallback: ${fallback}`);
  return fallback;
}

/**
 * Build CameraMath configuration from environment variables
 */
function buildConfig(): CameraMathConfig {
  // Validate required env vars
  validateEnvConfig();

  // Parse configuration
  const baseUrl = CAMERAMATH_API_URL || DEFAULT_CONFIG.baseUrl;
  const timeout = parseNumericEnv(CAMERAMATH_TIMEOUT_MS, DEFAULT_CONFIG.timeout);
  const enableCaching = parseBooleanEnv(CAMERAMATH_ENABLE_CACHING, DEFAULT_CONFIG.enableCaching);

  return {
    baseUrl,
    apiKey: CAMERAMATH_API_KEY,
    timeout,
    enableCaching,
    endpoints: {
      validate: `${baseUrl}/show-steps`, // UpStudy API: get full solution with steps
      solve: `${baseUrl}/single-answer`, // UpStudy API: quick answer
      steps: `${baseUrl}/show-steps`, // UpStudy API: detailed step-by-step
    },
    retry: {
      maxAttempts: DEFAULT_CONFIG.maxRetries,
      delayMs: DEFAULT_CONFIG.retryDelay,
      backoffMultiplier: DEFAULT_CONFIG.backoffMultiplier,
    },
    rateLimit: {
      maxRequestsPerMinute: DEFAULT_CONFIG.maxRequestsPerMinute,
      debounceMs: DEFAULT_CONFIG.debounceMs,
    },
  };
}

/**
 * CameraMath API Configuration (singleton)
 */
export const cameraMathConfig: CameraMathConfig = buildConfig();

/**
 * Get request headers for CameraMath API (UpStudy API)
 */
export function getCameraMathHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': cameraMathConfig.apiKey, // UpStudy API: no "Bearer" prefix
  };
}

/**
 * Build full URL for endpoint
 */
export function buildEndpointUrl(endpoint: keyof CameraMathConfig['endpoints']): string {
  return cameraMathConfig.endpoints[endpoint];
}

/**
 * Rate limiting state
 */
let requestCount = 0;
let windowStart = Date.now();

/**
 * Check if request is within rate limit
 * Returns true if allowed, false if rate limited
 */
export function checkRateLimit(): boolean {
  const now = Date.now();
  const windowDuration = 60000; // 1 minute

  // Reset window if expired
  if (now - windowStart >= windowDuration) {
    requestCount = 0;
    windowStart = now;
  }

  // Check if within limit
  if (requestCount >= cameraMathConfig.rateLimit.maxRequestsPerMinute) {
    console.warn('[API Config] Rate limit exceeded. Please wait before making more requests.');
    return false;
  }

  // Increment counter
  requestCount++;
  return true;
}

/**
 * Get remaining requests in current rate limit window
 */
export function getRemainingRequests(): number {
  return Math.max(0, cameraMathConfig.rateLimit.maxRequestsPerMinute - requestCount);
}

/**
 * Reset rate limit counter (for testing)
 */
export function resetRateLimit(): void {
  requestCount = 0;
  windowStart = Date.now();
  console.log('[API Config] Rate limit reset');
}

/**
 * Exponential backoff delay calculator
 */
export function calculateBackoffDelay(attemptNumber: number): number {
  const { delayMs, backoffMultiplier } = cameraMathConfig.retry;
  return delayMs * Math.pow(backoffMultiplier, attemptNumber - 1);
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('Network request failed')) return true;
  if (error.message?.includes('timeout')) return true;

  // HTTP status codes that should be retried
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (error.status && retryableStatusCodes.includes(error.status)) return true;

  return false;
}

/**
 * API request wrapper with retry logic
 */
export async function apiRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    onRetry?: (attempt: number, error: any) => void;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts || cameraMathConfig.retry.maxAttempts;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Check rate limit before making request
      if (!checkRateLimit()) {
        throw new Error('Rate limit exceeded. Please wait before making more requests.');
      }

      // Execute request
      const result = await requestFn();
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry if not a retryable error
      if (!isRetryableError(error)) {
        console.error(`[API Config] Non-retryable error on attempt ${attempt}:`, error);
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt >= maxAttempts) {
        console.error(`[API Config] Max retries (${maxAttempts}) exceeded:`, error);
        throw error;
      }

      // Calculate delay and retry
      const delay = calculateBackoffDelay(attempt);
      console.warn(
        `[API Config] Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`,
        error.message
      );

      // Call onRetry callback if provided
      options?.onRetry?.(attempt, error);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Log API configuration (for debugging)
 */
export function logApiConfig(): void {
  console.log('[API Config] Configuration:', {
    baseUrl: cameraMathConfig.baseUrl,
    timeout: cameraMathConfig.timeout,
    enableCaching: cameraMathConfig.enableCaching,
    endpoints: cameraMathConfig.endpoints,
    retry: cameraMathConfig.retry,
    rateLimit: cameraMathConfig.rateLimit,
    apiKeyPresent: !!cameraMathConfig.apiKey,
  });
}

// Log configuration on module load
console.log('[API Config] CameraMath configuration loaded');
