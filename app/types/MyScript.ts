/**
 * MyScript iink Cloud API Types
 *
 * Type definitions for MyScript Cloud handwriting recognition API.
 * Documentation: https://developer.myscript.com
 */

/**
 * MyScript stroke format (different from our internal Stroke type)
 * Arrays for x, y, t, and p must all have the same length
 */
export interface MyScriptStroke {
  /** Unique identifier for the stroke */
  id: string;
  /** X coordinates array */
  x: number[];
  /** Y coordinates array */
  y: number[];
  /** Timestamps array (milliseconds since epoch) */
  t: number[];
  /** Pressure values array (0-1 range) */
  p: number[];
  /** Pointer ID (for multi-touch support) */
  pointerId: number;
  /** Pointer type */
  pointerType: 'PEN' | 'TOUCH' | 'MOUSE';
}

/**
 * Group of strokes (typically one line of handwriting)
 */
export interface MyScriptStrokeGroup {
  strokes: MyScriptStroke[];
}

/**
 * Content type for recognition
 */
export type MyScriptContentType =
  | 'Math'
  | 'Text'
  | 'Diagram'
  | 'Raw Content';

/**
 * MIME types for export formats
 */
export type MyScriptMimeType =
  | 'application/x-latex'
  | 'application/mathml+xml'
  | 'application/vnd.myscript.jiix'
  | 'text/plain'
  | 'image/svg+xml';

/**
 * Math solver configuration
 */
export interface MathSolverConfiguration {
  /** Enable math solving */
  enable?: boolean;
  /** Number of decimal places for fractional parts */
  'fractional-part-digits'?: number;
  /** Decimal separator character */
  'decimal-separator'?: '.' | ',';
  /** Rounding mode */
  'rounding-mode'?: 'half up' | 'truncate' | 'ceiling' | 'floor';
  /** Angle unit for trigonometric functions */
  'angle-unit'?: 'deg' | 'rad';
}

/**
 * Math recognition configuration
 */
export interface MathConfiguration {
  /** MIME types to receive in response for Math content */
  mimeTypes?: MyScriptMimeType[];
  /** Math solver configuration */
  solver?: MathSolverConfiguration;
  /** Grammar for math recognition */
  grammar?: string;
}

/**
 * Recognition request body for /batch endpoint (uses strokeGroups)
 */
export interface MyScriptRecognitionRequest {
  /** Content type to recognize */
  contentType: MyScriptContentType;
  /** Configuration for recognition */
  configuration: {
    /** Language code (e.g., 'en_US') */
    lang?: string;
    /** Math-specific configuration (required for Math content type) */
    math?: MathConfiguration;
    /** Export formats to receive */
    export?: {
      'image-resolution'?: number;
      jiix?: {
        strokes?: boolean;
        'bounding-box'?: boolean;
        text?: {
          words?: boolean;
          chars?: boolean;
        };
      };
      mathml?: {
        /** MathML flavor: 'standard' or 'ms-office' */
        flavor?: 'standard' | 'ms-office';
      };
    };
  };
  /** Stroke groups to recognize */
  strokeGroups: MyScriptStrokeGroup[];
  /** Optional context for better recognition */
  context?: {
    /** Theme for rendering (e.g., 'ink-on-paper') */
    theme?: string;
  };
  /** MIME types to receive in response (deprecated: use configuration.math.mimeTypes for Math content) */
  mimeTypes?: MyScriptMimeType[];
}

/**
 * Recognize request body for /recognize endpoint (uses flat strokes array)
 */
export interface MyScriptRecognizeRequest {
  /** Content type to recognize */
  contentType: MyScriptContentType;
  /** Configuration for recognition */
  configuration: {
    /** Language code (e.g., 'en_US') */
    lang?: string;
    /** Math-specific configuration (required for Math content type) */
    math?: MathConfiguration;
    /** Export formats to receive */
    export?: {
      'image-resolution'?: number;
      jiix?: {
        strokes?: boolean;
        'bounding-box'?: boolean;
        text?: {
          words?: boolean;
          chars?: boolean;
        };
      };
      mathml?: {
        /** MathML flavor: 'standard' or 'ms-office' */
        flavor?: 'standard' | 'ms-office';
      };
    };
  };
  /** Flat array of strokes (NOT strokeGroups - this is the key difference from /batch) */
  strokes: MyScriptStroke[];
  /** Optional horizontal scale factor */
  scaleX?: number;
  /** Optional vertical scale factor */
  scaleY?: number;
  /** Optional context for better recognition */
  context?: {
    /** Theme for rendering (e.g., 'ink-on-paper') */
    theme?: string;
  };
}

/**
 * Recognition confidence scores
 */
export interface MyScriptConfidence {
  /** Overall confidence (0-1) */
  overall?: number;
  /** Per-symbol confidence if available */
  symbols?: Array<{
    label: string;
    confidence: number;
  }>;
}

/**
 * Recognition result for a specific export format
 */
export interface MyScriptExport {
  /** MIME type of this export */
  'mime-type': MyScriptMimeType;
  /** Recognition result data */
  data?: string;
}

/**
 * Recognition response from MyScript API
 */
export interface MyScriptRecognitionResponse {
  /** Recognition result exports (LaTeX, MathML, etc.) */
  exports?: MyScriptExport[];
  /** Alternative label if recognition uncertain */
  label?: string;
  /** Confidence scores */
  confidence?: MyScriptConfidence;
  /** Error message if recognition failed */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * MyScript API endpoint types
 */
export type MyScriptEndpoint = 'batch' | 'recognize';

/**
 * MyScript API configuration
 */
export interface MyScriptConfig {
  /** Base URL for API */
  apiUrl: string;
  /** Application key from MyScript Developer portal */
  applicationKey: string;
  /** HMAC key for request signing (optional for testing) */
  hmacKey?: string;
  /** Timeout for API requests (ms) */
  timeout?: number;
  /** API endpoint to use (batch = legacy engines, recognize = latest engines) */
  endpoint?: MyScriptEndpoint;
}

/**
 * Recognition status for internal state management
 */
export enum RecognitionStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Recognition result with metadata
 */
export interface RecognitionResult {
  /** Recognition status */
  status: RecognitionStatus;
  /** LaTeX output (if available) */
  latex?: string;
  /** MathML output (if available) */
  mathml?: string;
  /** Plain text output (if available) */
  text?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Error message if failed */
  error?: string;
  /** Timestamp of recognition */
  timestamp: number;
  /** Stroke IDs that were recognized */
  strokeIds: string[];
}

/**
 * Error types for recognition failures
 */
export enum RecognitionErrorType {
  NETWORK_ERROR = 'network_error',
  AUTH_ERROR = 'auth_error',
  INVALID_REQUEST = 'invalid_request',
  LOW_CONFIDENCE = 'low_confidence',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Detailed recognition error
 */
export interface RecognitionError {
  type: RecognitionErrorType;
  message: string;
  originalError?: any;
  timestamp: number;
}
