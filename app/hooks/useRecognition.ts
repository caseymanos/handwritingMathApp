/**
 * useRecognition Hook
 *
 * Custom hook for managing handwriting recognition flow with MyScript API.
 * Handles pause detection, recognition triggering, and state updates.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { getMyScriptClient } from '../utils/myScriptClient';
import { RecognitionManager, DEFAULT_RECOGNITION_CONFIG } from '../utils/recognitionUtils';
import { Stroke } from '../types/Canvas';
import { RecognitionStatus } from '../types/MyScript';

/**
 * Configuration for useRecognition hook
 */
interface UseRecognitionConfig {
  /** Whether recognition is enabled */
  enabled?: boolean;
  /** Pause duration before triggering recognition (ms) */
  pauseDuration?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Whether to use HMAC authentication */
  useHMAC?: boolean;
  /** Callback when recognition completes */
  onRecognitionComplete?: (latex?: string) => void;
  /** Callback when recognition fails */
  onRecognitionError?: (error: string) => void;
}

/**
 * Custom hook for managing handwriting recognition
 *
 * @param config - Configuration options
 * @returns Recognition management functions
 */
export function useRecognition(config: UseRecognitionConfig = {}) {
  const {
    enabled = true,
    pauseDuration = DEFAULT_RECOGNITION_CONFIG.pauseDuration,
    minConfidence = DEFAULT_RECOGNITION_CONFIG.minConfidence,
    useHMAC = DEFAULT_RECOGNITION_CONFIG.useHMAC,
    onRecognitionComplete,
    onRecognitionError,
  } = config;

  // Get Zustand store actions
  const canvasStore = useCanvasStore();
  const {
    setIsRecognizing,
    setRecognitionResult,
    setRecognitionStatus,
    setPauseDetectionTimer,
    clearPauseDetectionTimer,
  } = canvasStore;

  // Initialize MyScript client and recognition manager
  const managerRef = useRef<RecognitionManager | null>(null);

  useEffect(() => {
    if (enabled && !managerRef.current) {
      try {
        console.log('Initializing MyScript client...');
        const client = getMyScriptClient();
        console.log('Client initialized successfully');
        managerRef.current = new RecognitionManager(client, {
          pauseDuration,
          minConfidence,
          useHMAC,
        });
      } catch (error) {
        console.error('Failed to initialize recognition manager:', error);
        console.error('Error details:', error?.message);
      }
    }
  }, [enabled, pauseDuration, minConfidence, useHMAC]);

  /**
   * Perform recognition on current strokes
   */
  const recognizeStrokes = useCallback(
    async (strokesToRecognize: Stroke[]) => {
      if (!managerRef.current || !enabled) {
        return;
      }

      // Filter out invalid strokes (must have at least 2 points)
      const validStrokes = strokesToRecognize.filter(
        stroke => stroke.points && stroke.points.length >= 2
      );

      // Check if we have any valid strokes
      if (validStrokes.length === 0) {
        console.log('No valid strokes to recognize (all strokes have < 2 points)');
        return;
      }

      // Log filtered strokes
      if (validStrokes.length !== strokesToRecognize.length) {
        console.log(
          `Filtered out ${strokesToRecognize.length - validStrokes.length} invalid strokes ` +
          `(${validStrokes.length} valid strokes remaining)`
        );
      }

      // Check if we can recognize (debouncing)
      if (!managerRef.current.canRecognize()) {
        console.log('Recognition debounced - too soon after last call');
        return;
      }

      // Start recognition
      setIsRecognizing(true);
      setRecognitionStatus(RecognitionStatus.PROCESSING);

      try {
        console.log(`Recognizing ${validStrokes.length} strokes...`);
        const result = await managerRef.current.recognizeStrokes(validStrokes);

        // Update store with result
        setRecognitionResult(result);
        setRecognitionStatus(result.status);

        // Call callbacks
        if (result.status === RecognitionStatus.SUCCESS) {
          console.log('Recognition success:', result.latex);
          onRecognitionComplete?.(result.latex);
        } else {
          console.warn('Recognition failed:', result.error);
          onRecognitionError?.(result.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Recognition error:', error);
        setRecognitionStatus(RecognitionStatus.ERROR);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        onRecognitionError?.(errorMessage);
      } finally {
        setIsRecognizing(false);
      }
    },
    [
      enabled,
      setIsRecognizing,
      setRecognitionResult,
      setRecognitionStatus,
      onRecognitionComplete,
      onRecognitionError,
    ]
  );

  /**
   * Start pause detection after a stroke is completed
   * Will trigger recognition after the configured pause duration
   */
  const startPauseDetection = useCallback(() => {
    if (!managerRef.current || !enabled) {
      return;
    }

    // Clear any existing timer
    clearPauseDetectionTimer();

    // Start new pause detection
    const timer = managerRef.current.startPauseDetection(() => {
      console.log('Pause detected - triggering recognition');
      // Get fresh strokes from store at recognition time, not from closure
      const currentStrokes = useCanvasStore.getState().strokes;
      if (currentStrokes.length > 0) {
        recognizeStrokes(currentStrokes);
      }
    });

    setPauseDetectionTimer(timer);
  }, [
    enabled,
    recognizeStrokes,
    clearPauseDetectionTimer,
    setPauseDetectionTimer,
  ]);

  /**
   * Cancel pause detection (e.g., when user starts drawing again)
   */
  const cancelPauseDetection = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.cancelPauseDetection();
    }
    clearPauseDetectionTimer();
  }, [clearPauseDetectionTimer]);

  /**
   * Manually trigger recognition immediately
   */
  const triggerRecognition = useCallback(() => {
    // Get fresh strokes from store at recognition time, not from closure
    const currentStrokes = useCanvasStore.getState().strokes;
    if (currentStrokes.length > 0) {
      cancelPauseDetection();
      recognizeStrokes(currentStrokes);
    }
  }, [recognizeStrokes, cancelPauseDetection]);

  /**
   * Clear recognition result
   */
  const clearRecognition = useCallback(() => {
    setRecognitionResult(null);
    setRecognitionStatus(RecognitionStatus.IDLE);
  }, [setRecognitionResult, setRecognitionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPauseDetection();
    };
  }, [cancelPauseDetection]);

  return {
    // State
    isRecognizing: canvasStore.isRecognizing,
    recognitionResult: canvasStore.recognitionResult,
    recognitionStatus: canvasStore.recognitionStatus,

    // Actions
    startPauseDetection,
    cancelPauseDetection,
    triggerRecognition,
    clearRecognition,
    recognizeStrokes,
  };
}
