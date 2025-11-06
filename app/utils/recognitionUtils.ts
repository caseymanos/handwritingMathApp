/**
 * Recognition Utilities
 *
 * Utilities for handling handwriting recognition triggers, pause detection,
 * and stroke processing logic.
 */

import { Stroke } from '../types/Canvas';
import { RecognitionResult, RecognitionStatus } from '../types/MyScript';
import { MyScriptClient } from './myScriptClient';
import { createRecognitionRequest, validateStrokes } from './myScriptUtils';

/**
 * Configuration for recognition behavior
 */
export interface RecognitionConfig {
  /** Minimum pause duration before triggering recognition (ms) */
  pauseDuration: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence: number;
  /** Maximum strokes to recognize at once */
  maxStrokesPerRecognition: number;
  /** Debounce duration for recognition calls (ms) */
  debounceDuration: number;
  /** Whether to use HMAC authentication */
  useHMAC: boolean;
}

/**
 * Default recognition configuration
 */
export const DEFAULT_RECOGNITION_CONFIG: RecognitionConfig = {
  pauseDuration: 500, // 500ms pause as per PRD (250-500ms range)
  minConfidence: 0.85, // 85% confidence target
  maxStrokesPerRecognition: 50, // Reasonable limit
  debounceDuration: 500, // 500ms debounce for API calls
  useHMAC: false, // Disable HMAC for easier testing initially
};

/**
 * Recognition manager class to handle pause detection and recognition triggers
 */
export class RecognitionManager {
  private config: RecognitionConfig;
  private client: MyScriptClient;
  private lastRecognitionTime: number = 0;
  private pauseTimer: NodeJS.Timeout | null = null;

  constructor(client: MyScriptClient, config: Partial<RecognitionConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_RECOGNITION_CONFIG, ...config };
  }

  /**
   * Start pause detection timer
   * Calls onPauseDetected after configured pause duration
   *
   * @param onPauseDetected - Callback when pause is detected
   * @returns Timer ID that can be used to cancel
   */
  startPauseDetection(onPauseDetected: () => void): NodeJS.Timeout {
    // Clear any existing timer
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
    }

    // Start new timer
    this.pauseTimer = setTimeout(() => {
      onPauseDetected();
      this.pauseTimer = null;
    }, this.config.pauseDuration);

    return this.pauseTimer;
  }

  /**
   * Cancel pause detection timer
   */
  cancelPauseDetection(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  /**
   * Check if enough time has passed since last recognition (debouncing)
   *
   * @returns True if we can make another recognition call
   */
  canRecognize(): boolean {
    const now = Date.now();
    const timeSinceLastRecognition = now - this.lastRecognitionTime;
    return timeSinceLastRecognition >= this.config.debounceDuration;
  }

  /**
   * Perform recognition on strokes
   *
   * @param strokes - Strokes to recognize
   * @returns Recognition result
   */
  async recognizeStrokes(strokes: Stroke[]): Promise<RecognitionResult> {
    // Update last recognition time for debouncing
    this.lastRecognitionTime = Date.now();

    // Validate strokes
    if (!validateStrokes(strokes)) {
      return {
        status: RecognitionStatus.ERROR,
        error: 'Invalid strokes: must have at least 2 points per stroke',
        timestamp: Date.now(),
        strokeIds: strokes.map(s => s.id),
      };
    }

    // Limit number of strokes
    const limitedStrokes = strokes.slice(0, this.config.maxStrokesPerRecognition);
    if (limitedStrokes.length < strokes.length) {
      console.warn(
        `Limiting recognition to ${this.config.maxStrokesPerRecognition} strokes ` +
        `(had ${strokes.length})`
      );
    }

    // Create recognition request
    const request = createRecognitionRequest(limitedStrokes, 'Math', 'PEN');

    // Perform recognition
    const result = await this.client.recognize(request, this.config.useHMAC);

    // Check confidence threshold
    if (
      result.status === RecognitionStatus.SUCCESS &&
      result.confidence !== undefined &&
      result.confidence < this.config.minConfidence
    ) {
      return {
        ...result,
        status: RecognitionStatus.ERROR,
        error: `Low confidence: ${(result.confidence * 100).toFixed(1)}% ` +
               `(minimum: ${(this.config.minConfidence * 100).toFixed(1)}%)`,
      };
    }

    return result;
  }

  /**
   * Update recognition configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<RecognitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   *
   * @returns Current recognition configuration
   */
  getConfig(): RecognitionConfig {
    return { ...this.config };
  }
}

/**
 * Split strokes into separate lines based on vertical spacing
 * Useful for multi-line equation recognition
 *
 * @param strokes - All strokes to split
 * @param lineThreshold - Vertical distance threshold for new line
 * @returns Array of stroke groups, one per line
 */
export function splitStrokesIntoLines(
  strokes: Stroke[],
  lineThreshold: number = 50
): Stroke[][] {
  if (strokes.length === 0) {
    return [];
  }

  // Sort strokes by vertical position (average y)
  const sortedStrokes = [...strokes].sort((a, b) => {
    const avgYA = a.points.reduce((sum, p) => sum + p.y, 0) / a.points.length;
    const avgYB = b.points.reduce((sum, p) => sum + p.y, 0) / b.points.length;
    return avgYA - avgYB;
  });

  // Group strokes into lines
  const lines: Stroke[][] = [];
  let currentLine: Stroke[] = [sortedStrokes[0]];
  let currentLineAvgY =
    sortedStrokes[0].points.reduce((sum, p) => sum + p.y, 0) /
    sortedStrokes[0].points.length;

  for (let i = 1; i < sortedStrokes.length; i++) {
    const stroke = sortedStrokes[i];
    const strokeAvgY =
      stroke.points.reduce((sum, p) => sum + p.y, 0) / stroke.points.length;

    // Check if this stroke is on a new line
    if (Math.abs(strokeAvgY - currentLineAvgY) > lineThreshold) {
      // Start new line
      lines.push(currentLine);
      currentLine = [stroke];
      currentLineAvgY = strokeAvgY;
    } else {
      // Add to current line
      currentLine.push(stroke);
      // Update average Y (weighted)
      currentLineAvgY =
        (currentLineAvgY * (currentLine.length - 1) + strokeAvgY) /
        currentLine.length;
    }
  }

  // Add the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Determine if recognition should be triggered based on stroke activity
 *
 * @param lastStrokeTime - Timestamp of last stroke (ms)
 * @param pauseDuration - Required pause duration (ms)
 * @returns True if pause duration has elapsed
 */
export function shouldTriggerRecognition(
  lastStrokeTime: number | null,
  pauseDuration: number = 500
): boolean {
  if (lastStrokeTime === null) {
    return false;
  }

  const now = Date.now();
  const timeSinceLastStroke = now - lastStrokeTime;

  return timeSinceLastStroke >= pauseDuration;
}

/**
 * Format recognition result for display
 *
 * @param result - Recognition result
 * @returns Formatted string for UI display
 */
export function formatRecognitionResult(result: RecognitionResult): string {
  if (result.status === RecognitionStatus.ERROR) {
    return `Error: ${result.error || 'Unknown error'}`;
  }

  if (result.status === RecognitionStatus.PROCESSING) {
    return 'Processing...';
  }

  if (result.latex) {
    return `LaTeX: ${result.latex}`;
  }

  if (result.text) {
    return `Text: ${result.text}`;
  }

  return 'No result';
}

/**
 * Get confidence level description
 *
 * @param confidence - Confidence score (0-1)
 * @returns Human-readable confidence level
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.95) return 'Very High';
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.70) return 'Medium';
  if (confidence >= 0.50) return 'Low';
  return 'Very Low';
}

/**
 * Calculate average stroke timestamp for ordering
 *
 * @param stroke - Stroke to calculate timestamp for
 * @returns Average timestamp of all points
 */
export function getStrokeAverageTimestamp(stroke: Stroke): number {
  if (stroke.points.length === 0) {
    return stroke.timestamp;
  }

  const sum = stroke.points.reduce((acc, point) => acc + point.timestamp, 0);
  return sum / stroke.points.length;
}
