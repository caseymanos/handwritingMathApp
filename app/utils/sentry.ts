/**
 * Sentry Error Tracking Configuration
 *
 * Initializes and configures Sentry for error tracking,
 * performance monitoring, and crash reporting.
 */

import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

/**
 * Sentry configuration
 */
const SENTRY_DSN = process.env.SENTRY_DSN || '';
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const ENABLE_SENTRY = process.env.ENABLE_SENTRY === 'true' || ENVIRONMENT === 'production';

/**
 * Initialize Sentry
 * Call this once at app startup
 */
export function initSentry(): void {
  if (!ENABLE_SENTRY) {
    console.log('[Sentry] Disabled in development mode');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[Sentry] No DSN provided, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,

      // Performance monitoring
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 10000,

      // Enable tracing for performance monitoring
      tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,

      // Capture errors
      enableNative: true,
      enableNativeCrashHandling: true,

      // Release tracking
      release: `handwriting-math@${getAppVersion()}`,
      dist: Platform.OS,

      // Integrations
      integrations: [
        new Sentry.ReactNativeTracing({
          tracingOrigins: ['api.upstudy.com', 'localhost'],
          routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        }),
      ],

      // Filter out sensitive data
      beforeSend(event, hint) {
        // Don't send errors in test environment
        if (__DEV__ && !ENABLE_SENTRY) {
          return null;
        }

        // Filter out API keys and tokens from breadcrumbs and context
        if (event.request) {
          event.request.headers = filterSensitiveHeaders(event.request.headers || {});
        }

        return event;
      },

      // Ignore certain errors
      ignoreErrors: [
        // Network errors that are expected
        'Network request failed',
        'timeout',
        'AbortError',

        // Development-only errors
        '__DEV__',
      ],
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!ENABLE_SENTRY) {
    console.error('[Error]', error, context);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setExtra(key, context[key]);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  if (!ENABLE_SENTRY) {
    console.log(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      Object.keys(context).forEach((key) => {
        scope.setExtra(key, context[key]);
      });
    }
    Sentry.captureMessage(message);
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data: data ? filterSensitiveData(data) : undefined,
  });
}

/**
 * Set user context
 */
export function setUser(userId: string, metadata?: Record<string, any>): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  Sentry.setUser({
    id: userId,
    ...metadata,
  });
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  Sentry.setUser(null);
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Transaction | null {
  if (!ENABLE_SENTRY) {
    return null;
  }

  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Set context tags
 */
export function setTag(key: string, value: string): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  Sentry.setTag(key, value);
}

/**
 * Set context data
 */
export function setContext(name: string, context: Record<string, any>): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  Sentry.setContext(name, filterSensitiveData(context));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get app version
 */
function getAppVersion(): string {
  // In production, this would come from package.json or native build config
  return '0.1.0';
}

/**
 * Filter sensitive data from objects
 */
function filterSensitiveData(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['apiKey', 'token', 'password', 'secret', 'auth'];
  const filtered = { ...data };

  Object.keys(filtered).forEach((key) => {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      filtered[key] = '[FILTERED]';
    }
  });

  return filtered;
}

/**
 * Filter sensitive headers
 */
function filterSensitiveHeaders(headers: Record<string, any>): Record<string, any> {
  const filtered = { ...headers };
  const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];

  sensitiveHeaders.forEach((header) => {
    if (filtered[header]) {
      filtered[header] = '[FILTERED]';
    }
  });

  return filtered;
}

/**
 * Track validation performance
 */
export function trackValidationPerformance(
  problemId: string,
  stepNumber: number,
  duration: number,
  success: boolean
): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  addBreadcrumb('Validation completed', 'validation', {
    problemId,
    stepNumber,
    duration,
    success,
  });

  // Track slow validations (>2 seconds)
  if (duration > 2000) {
    captureMessage(
      `Slow validation: ${problemId} step ${stepNumber} took ${duration}ms`,
      'warning',
      { problemId, stepNumber, duration, success }
    );
  }
}

/**
 * Track recognition performance
 */
export function trackRecognitionPerformance(
  duration: number,
  success: boolean,
  confidence?: number
): void {
  if (!ENABLE_SENTRY) {
    return;
  }

  addBreadcrumb('Recognition completed', 'recognition', {
    duration,
    success,
    confidence,
  });

  // Track slow recognitions (>500ms)
  if (duration > 500) {
    captureMessage(
      `Slow recognition: took ${duration}ms`,
      'warning',
      { duration, success, confidence }
    );
  }
}

/**
 * Track API errors
 */
export function trackAPIError(
  endpoint: string,
  error: Error,
  statusCode?: number
): void {
  if (!ENABLE_SENTRY) {
    console.error('[API Error]', endpoint, error, statusCode);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('api.endpoint', endpoint);
    if (statusCode) {
      scope.setTag('api.status_code', statusCode.toString());
    }
    scope.setContext('api', {
      endpoint,
      statusCode,
      message: error.message,
    });

    Sentry.captureException(error);
  });
}

// Export Sentry instance for advanced usage
export { Sentry };
