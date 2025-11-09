/**
 * Environment variable types
 *
 * Declarations for react-native-dotenv @env module
 */

declare module '@env' {
  // MyScript Configuration (PR3)
  export const MYSCRIPT_APPLICATION_KEY: string;
  export const MYSCRIPT_HMAC_KEY: string;
  export const MYSCRIPT_MIN_CONFIDENCE: string;

  // CameraMath Configuration (PR5)
  export const CAMERAMATH_API_KEY: string;
  export const CAMERAMATH_API_URL: string;
  export const CAMERAMATH_TIMEOUT_MS: string;
  export const CAMERAMATH_ENABLE_CACHING: string;

  // Supabase Configuration (PR12)
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const ENABLE_CLOUD_SYNC: string;
  export const SYNC_RETRY_MAX_ATTEMPTS: string;
  export const SYNC_RETRY_DELAY_MS: string;

  // Tutorial Mode (PR14)
  export const ENABLE_TUTORIAL_MODE: string;
  export const TUTORIAL_VIDEO_PLATFORM: string;
  export const TUTORIAL_CACHE_TTL_HOURS: string;

  // Assessment Mode (PR15)
  export const ENABLE_ASSESSMENT_MODE: string;
  export const ASSESSMENT_BATCH_VALIDATION_ENABLED: string;
  export const ASSESSMENT_MAX_RETRIES: string;
  export const ASSESSMENT_DEFAULT_TIME_LIMIT_SECONDS: string;

  // Collaboration (PR13)
  export const ENABLE_COLLABORATION: string;
  export const COLLABORATION_STROKE_CLEANUP_INTERVAL_MS: string;
  export const COLLABORATION_SESSION_TIMEOUT_MS: string;
  export const COLLABORATION_MAX_BROADCAST_RATE: string;
}
