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
}
