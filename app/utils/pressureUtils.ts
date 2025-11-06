/**
 * Pressure Utilities
 *
 * Utilities for handling pressure-sensitive input and calculating stroke widths.
 */

import { InputDevice } from '../types/Canvas';

/**
 * Default stroke widths for different input devices
 */
const DEFAULT_WIDTHS = {
  [InputDevice.STYLUS]: 2.5,
  [InputDevice.FINGER]: 4.0,
  [InputDevice.MOUSE]: 2.5,
  [InputDevice.UNKNOWN]: 3.0,
};

/**
 * Pressure multiplier ranges
 */
const PRESSURE_MULTIPLIER = {
  MIN: 0.5, // Minimum width multiplier at low pressure
  MAX: 2.0, // Maximum width multiplier at high pressure
};

/**
 * Calculate stroke width based on pressure and input device
 *
 * @param pressure - Normalized pressure value (0-1)
 * @param deviceType - Type of input device
 * @param baseWidth - Optional base width override
 * @returns Calculated stroke width in pixels
 */
export function calculateStrokeWidth(
  pressure: number,
  deviceType: InputDevice,
  baseWidth?: number,
): number {
  // Use base width or default for device type
  const base = baseWidth ?? DEFAULT_WIDTHS[deviceType];

  // Clamp pressure to valid range
  const clampedPressure = Math.max(0, Math.min(1, pressure));

  // If no pressure sensitivity (pressure is 0 or 1), return base width
  if (clampedPressure === 0 || clampedPressure === 1) {
    return base;
  }

  // Calculate multiplier based on pressure (linear interpolation)
  const multiplier =
    PRESSURE_MULTIPLIER.MIN +
    (PRESSURE_MULTIPLIER.MAX - PRESSURE_MULTIPLIER.MIN) * clampedPressure;

  return base * multiplier;
}

/**
 * Normalize pressure from force value (iOS)
 *
 * iOS provides force values that typically range from 0 to ~6.67 (for iPhone)
 * or 0 to ~2.5 (for iPad with Apple Pencil). We normalize to 0-1 range.
 *
 * @param force - Force value from touch event
 * @param maxForce - Maximum expected force (default: 2.5 for iPad)
 * @returns Normalized pressure (0-1)
 */
export function normalizePressureFromForce(
  force: number,
  maxForce: number = 2.5,
): number {
  if (force <= 0) return 0;
  return Math.min(1, force / maxForce);
}

/**
 * Detect if pressure sensitivity is available
 *
 * @param pressure - Pressure value from touch event
 * @returns True if pressure appears to be varying (not just 0 or 1)
 */
export function hasPressureSensitivity(pressure: number): boolean {
  // If pressure is between 0 and 1 (exclusive), we have sensitivity
  return pressure > 0 && pressure < 1;
}

/**
 * Smooth pressure values to reduce jitter
 *
 * Uses exponential moving average to smooth pressure values
 *
 * @param currentPressure - Current pressure reading
 * @param previousPressure - Previous smoothed pressure
 * @param smoothingFactor - Smoothing factor (0-1, higher = more smoothing)
 * @returns Smoothed pressure value
 */
export function smoothPressure(
  currentPressure: number,
  previousPressure: number | null,
  smoothingFactor: number = 0.3,
): number {
  if (previousPressure === null) {
    return currentPressure;
  }

  // Exponential moving average
  return (
    smoothingFactor * currentPressure + (1 - smoothingFactor) * previousPressure
  );
}

/**
 * Get eraser width (larger than pen width)
 *
 * @param deviceType - Type of input device
 * @returns Eraser width in pixels
 */
export function getEraserWidth(deviceType: InputDevice): number {
  // Eraser is typically 3x the pen width
  return DEFAULT_WIDTHS[deviceType] * 3;
}
