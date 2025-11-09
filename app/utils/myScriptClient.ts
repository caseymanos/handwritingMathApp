/**
 * MyScript API Client
 *
 * Client for interacting with MyScript Cloud handwriting recognition API.
 * Handles authentication, request signing, and error handling.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import CryptoJS from 'crypto-js';
import {
  MYSCRIPT_APPLICATION_KEY,
  MYSCRIPT_HMAC_KEY,
} from '@env';
import {
  MyScriptConfig,
  MyScriptEndpoint,
  MyScriptRecognitionRequest,
  MyScriptRecognitionResponse,
  RecognitionResult,
  RecognitionStatus,
  RecognitionErrorType,
  RecognitionError,
} from '../types/MyScript';
import {
  extractLatex,
  extractMathML,
  extractText,
  createRecognitionRequest,
  createRecognizeRequest,
  getPointerType,
} from './myScriptUtils';

// Debug (safe): show only presence of env vars in development
if (__DEV__) {
  // Do not print actual keys to logs
  // eslint-disable-next-line no-console
  console.log('MyScript env loaded:', {
    hasAppKey: !!MYSCRIPT_APPLICATION_KEY,
    hasHmacKey: !!MYSCRIPT_HMAC_KEY,
  });
}

/**
 * Default MyScript API configuration
 */
const DEFAULT_CONFIG: Partial<MyScriptConfig> = {
  apiUrl: 'https://cloud.myscript.com/api/v4.0/iink',
  timeout: 10000, // 10 seconds
  endpoint: 'recognize', // Standard endpoint (latest engines, best accuracy)
};

/**
 * MyScript API Client Class
 */
export class MyScriptClient {
  private config: MyScriptConfig;
  private axiosInstance: AxiosInstance;

  constructor(config: Partial<MyScriptConfig>) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as MyScriptConfig;

    // Validate required config
    if (!this.config.applicationKey) {
      throw new Error('MyScript applicationKey is required');
    }

    // Create axios instance
    this.axiosInstance = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        // Accept header must include JIIX for Math recognition
        'Accept': 'application/vnd.myscript.jiix,application/x-latex,application/mathml+xml,application/json',
      },
    });
  }

  /**
   * Compute HMAC signature for request authentication
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - API path
   * @param body - Request body
   * @returns HMAC signature
   */
  private computeHMAC(method: string, path: string, body: string): string {
    if (!this.config.hmacKey) {
      throw new Error('HMAC key is required for signed requests');
    }

    // Create message to sign: METHOD + PATH + BODY
    const message = `${method.toUpperCase()}${path}${body}`;

    // Compute HMAC-SHA512 hash
    const hmac = CryptoJS.HmacSHA512(message, this.config.hmacKey);

    // Return as base64
    return CryptoJS.enc.Base64.stringify(hmac);
  }

  /**
   * Perform handwriting recognition on strokes
   *
   * @param request - Recognition request with strokes (format depends on endpoint)
   * @param useHMAC - Whether to use HMAC authentication (can be disabled for testing)
   * @returns Recognition result with LaTeX, MathML, etc.
   */
  async recognize(
    request: MyScriptRecognitionRequest | MyScriptRecognizeRequest,
    useHMAC: boolean = true
  ): Promise<RecognitionResult> {
    const startTime = Date.now();

    // Extract stroke IDs based on request format
    const strokeIds = 'strokeGroups' in request
      ? request.strokeGroups.flatMap(group => group.strokes.map(stroke => stroke.id))
      : request.strokes.map(stroke => stroke.id);

    try {
      // Serialize request body
      const body = JSON.stringify(request);
      // Use configured endpoint (base URL already includes /iink)
      const endpoint = this.config.endpoint || 'batch';
      const path = `/${endpoint}`;

      // Debug: Log request details (safe, minimal)
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[MyScript] Request', {
          endpoint,
          url: `${this.config.apiUrl}${path}`,
          strokeGroupCount: 'strokeGroups' in request ? request.strokeGroups.length : 1,
          strokeCount:
            'strokeGroups' in request
              ? request.strokeGroups.reduce((n, g) => n + g.strokes.length, 0)
              : request.strokes.length,
        });
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'applicationKey': this.config.applicationKey,
      };

      // Add HMAC if enabled and key available
      if (useHMAC && this.config.hmacKey) {
        const hmac = this.computeHMAC('POST', path, body);
        headers['hmac'] = hmac;
      }

      // Make API request
      const response = await this.axiosInstance.post<MyScriptRecognitionResponse>(
        path,
        body,
        { headers }
      );

      // Debug: Log API response structure (safe, minimal)
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[MyScript] Response', {
          status: response.status,
          statusText: response.statusText,
          keys: Object.keys(response.data || {}),
        });
      }

      // Parse response
      const latex = extractLatex(response.data);
      const mathml = extractMathML(response.data);
      const text = extractText(response.data);

      // Extract confidence if available
      const confidence = response.data.confidence?.overall;

      // Check if we got any usable output
      if (!latex && !mathml && !text) {
        return {
          status: RecognitionStatus.ERROR,
          error: 'No recognized output from API',
          timestamp: Date.now(),
          strokeIds,
        };
      }

      // Success!
      return {
        status: RecognitionStatus.SUCCESS,
        latex,
        mathml,
        text,
        confidence,
        timestamp: Date.now(),
        strokeIds,
      };

    } catch (error) {
      // Handle errors
      return this.handleError(error, strokeIds);
    }
  }

  /**
   * Handle API errors and convert to RecognitionResult
   *
   * @param error - Error from axios or other source
   * @param strokeIds - IDs of strokes that failed
   * @returns RecognitionResult with error details
   */
  private handleError(error: any, strokeIds: string[]): RecognitionResult {
    const recognitionError = this.parseError(error);

    return {
      status: RecognitionStatus.ERROR,
      error: recognitionError.message,
      timestamp: Date.now(),
      strokeIds,
    };
  }

  /**
   * Parse error into structured RecognitionError
   *
   * @param error - Raw error
   * @returns Structured recognition error
   */
  private parseError(error: any): RecognitionError {
    const timestamp = Date.now();

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network error
      if (!axiosError.response) {
        console.warn('=== MyScript Network Error Debug ===');
        console.warn('Error message:', axiosError.message);
        console.warn('Error code:', axiosError.code);
        console.warn('Request URL:', axiosError.config?.url);
        console.warn('Base URL:', axiosError.config?.baseURL);
        console.warn('Full URL:', `${axiosError.config?.baseURL}${axiosError.config?.url}`);
        console.warn('Error details:', JSON.stringify(axiosError, null, 2));
        console.warn('===================================');

        return {
          type: RecognitionErrorType.NETWORK_ERROR,
          message: `Network error: ${axiosError.message} (${axiosError.code || 'UNKNOWN'})`,
          originalError: error,
          timestamp,
        };
      }

      // HTTP error codes
      switch (axiosError.response.status) {
        case 401:
        case 403:
          return {
            type: RecognitionErrorType.AUTH_ERROR,
            message: 'Authentication failed: Check your API keys',
            originalError: error,
            timestamp,
          };

        case 400:
          return {
            type: RecognitionErrorType.INVALID_REQUEST,
            message: 'Invalid request: Check stroke data format',
            originalError: error,
            timestamp,
          };

        case 408:
        case 504:
          return {
            type: RecognitionErrorType.TIMEOUT,
            message: 'Request timeout: API took too long to respond',
            originalError: error,
            timestamp,
          };

        default:
          return {
            type: RecognitionErrorType.UNKNOWN,
            message: `API error: ${axiosError.response.status} - ${axiosError.response.statusText}`,
            originalError: error,
            timestamp,
          };
      }
    }

    // Non-axios error
    return {
      type: RecognitionErrorType.UNKNOWN,
      message: error?.message || 'Unknown error occurred',
      originalError: error,
      timestamp,
    };
  }

  /**
   * Test the API connection and authentication
   *
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Create a simple test request with minimal stroke data
      const testRequest: MyScriptRecognitionRequest = {
        contentType: 'Math',
        configuration: {
          lang: 'en_US',
        },
        strokeGroups: [{
          strokes: [{
            id: 'test-stroke',
            x: [10, 20, 30],
            y: [10, 10, 10],
            t: [0, 100, 200],
            p: [0.5, 0.5, 0.5],
            pointerId: 0,
            pointerType: 'PEN',
          }],
        }],
        mimeTypes: ['application/x-latex'],
      };

      const result = await this.recognize(testRequest, false); // Test without HMAC first
      return result.status === RecognitionStatus.SUCCESS;

    } catch (error) {
      console.error('MyScript connection test failed:', error);
      return false;
    }
  }

  /**
   * Set the API endpoint to use
   *
   * @param endpoint - 'batch' (legacy engines) or 'recognize' (latest engines)
   */
  setEndpoint(endpoint: MyScriptEndpoint): void {
    this.config.endpoint = endpoint;
    console.log(`MyScript endpoint changed to: ${endpoint}`);
  }

  /**
   * Get current configuration (without exposing keys)
   *
   * @returns Safe config info
   */
  getConfig(): {
    apiUrl: string;
    hasApplicationKey: boolean;
    hasHmacKey: boolean;
    endpoint: MyScriptEndpoint;
  } {
    return {
      apiUrl: this.config.apiUrl,
      hasApplicationKey: !!this.config.applicationKey,
      hasHmacKey: !!this.config.hmacKey,
      endpoint: this.config.endpoint || 'recognize',
    };
  }
}

/**
 * Create a MyScript client instance from environment variables
 *
 * @returns Configured MyScript client
 */
export function createMyScriptClientFromEnv(): MyScriptClient {
  const applicationKey = MYSCRIPT_APPLICATION_KEY || '';
  const hmacKey = MYSCRIPT_HMAC_KEY;

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('MyScript Config (safe):', {
      hasApplicationKey: !!applicationKey,
      hasHmacKey: !!hmacKey,
    });
  }

  if (!applicationKey) {
    throw new Error(
      'MYSCRIPT_APPLICATION_KEY not found in environment variables. ' +
      'Please set it in your .env file.'
    );
  }

  return new MyScriptClient({
    applicationKey,
    hmacKey,
  });
}

/**
 * Singleton instance for app-wide use
 */
let sharedClient: MyScriptClient | null = null;

/**
 * Get or create shared MyScript client instance
 *
 * @returns Shared client instance
 */
export function getMyScriptClient(): MyScriptClient {
  if (!sharedClient) {
    sharedClient = createMyScriptClientFromEnv();
  }
  return sharedClient;
}

/**
 * Reset shared client (useful for testing or config changes)
 */
export function resetMyScriptClient(): void {
  sharedClient = null;
}
