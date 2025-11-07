/**
 * Canvas Store
 *
 * Zustand store for managing canvas state, strokes, and handwriting recognition.
 */

import { create } from 'zustand';
import { Stroke, DrawingTool, CANVAS_COLORS, InputDevice } from '../types/Canvas';
import { RecognitionResult, RecognitionStatus } from '../types/MyScript';

/**
 * Performance limits to prevent unbounded memory growth
 */
const MAX_STROKES = 500; // Maximum strokes to keep in memory
const MAX_RECOGNITION_HISTORY = 50; // Maximum recognition results to keep

/**
 * Canvas store state interface
 */
interface CanvasStoreState {
  // Stroke management
  strokes: Stroke[];
  currentStroke: Stroke | null;
  selectedColor: string;
  selectedTool: DrawingTool;
  isDrawing: boolean;

  // Recognition state
  recognitionResult: RecognitionResult | null;
  recognitionStatus: RecognitionStatus;
  isRecognizing: boolean;
  recognitionHistory: RecognitionResult[];

  // Input device detection
  currentInputDevice: InputDevice;

  // Pause detection for triggering recognition
  lastStrokeTime: number | null;
  pauseDetectionTimer: NodeJS.Timeout | null;

  // Actions
  addStroke: (stroke: Stroke) => void;
  setCurrentStroke: (stroke: Stroke | null) => void;
  clearStrokes: () => void;
  undoLastStroke: () => void;
  setSelectedColor: (color: string) => void;
  setSelectedTool: (tool: DrawingTool) => void;
  setIsDrawing: (isDrawing: boolean) => void;

  // Recognition actions
  setRecognitionResult: (result: RecognitionResult | null) => void;
  setRecognitionStatus: (status: RecognitionStatus) => void;
  setIsRecognizing: (isRecognizing: boolean) => void;
  addToRecognitionHistory: (result: RecognitionResult) => void;
  clearRecognitionHistory: () => void;

  // Input device actions
  setCurrentInputDevice: (device: InputDevice) => void;

  // Pause detection actions
  setLastStrokeTime: (time: number | null) => void;
  setPauseDetectionTimer: (timer: NodeJS.Timeout | null) => void;
  clearPauseDetectionTimer: () => void;

  // Batch actions
  reset: () => void;
}

/**
 * Initial state
 */
const initialState = {
  strokes: [],
  currentStroke: null,
  selectedColor: CANVAS_COLORS.BLACK,
  selectedTool: DrawingTool.PEN,
  isDrawing: false,
  recognitionResult: null,
  recognitionStatus: RecognitionStatus.IDLE,
  isRecognizing: false,
  recognitionHistory: [],
  currentInputDevice: InputDevice.UNKNOWN,
  lastStrokeTime: null,
  pauseDetectionTimer: null,
};

/**
 * Canvas store
 */
export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  ...initialState,

  // Stroke actions
  addStroke: (stroke: Stroke) =>
    set(state => {
      // Add new stroke and enforce limit to prevent unbounded growth
      const newStrokes = [...state.strokes, stroke];
      
      // If we exceed the limit, remove oldest strokes (FIFO)
      const strokes = newStrokes.length > MAX_STROKES
        ? newStrokes.slice(newStrokes.length - MAX_STROKES)
        : newStrokes;
      
      return {
        strokes,
        lastStrokeTime: Date.now(),
      };
    }),

  setCurrentStroke: (stroke: Stroke | null) =>
    set({ currentStroke: stroke }),

  clearStrokes: () =>
    set({
      strokes: [],
      currentStroke: null,
      recognitionResult: null,
      recognitionStatus: RecognitionStatus.IDLE,
    }),

  undoLastStroke: () =>
    set(state => ({
      strokes: state.strokes.slice(0, -1),
      recognitionResult: null, // Clear recognition when undoing
    })),

  setSelectedColor: (color: string) =>
    set({ selectedColor: color }),

  setSelectedTool: (tool: DrawingTool) =>
    set({ selectedTool: tool }),

  setIsDrawing: (isDrawing: boolean) =>
    set({ isDrawing }),

  // Recognition actions
  setRecognitionResult: (result: RecognitionResult | null) =>
    set({ recognitionResult: result }),

  setRecognitionStatus: (status: RecognitionStatus) =>
    set({ recognitionStatus: status }),

  setIsRecognizing: (isRecognizing: boolean) =>
    set({ isRecognizing }),

  addToRecognitionHistory: (result: RecognitionResult) =>
    set(state => {
      // Add new result and enforce limit to prevent unbounded growth
      const newHistory = [...state.recognitionHistory, result];
      
      // If we exceed the limit, remove oldest results (FIFO)
      const recognitionHistory = newHistory.length > MAX_RECOGNITION_HISTORY
        ? newHistory.slice(newHistory.length - MAX_RECOGNITION_HISTORY)
        : newHistory;
      
      return { recognitionHistory };
    }),

  clearRecognitionHistory: () =>
    set({ recognitionHistory: [] }),

  // Input device actions
  setCurrentInputDevice: (device: InputDevice) =>
    set({ currentInputDevice: device }),

  // Pause detection actions
  setLastStrokeTime: (time: number | null) =>
    set({ lastStrokeTime: time }),

  setPauseDetectionTimer: (timer: NodeJS.Timeout | null) => {
    const currentTimer = get().pauseDetectionTimer;
    if (currentTimer) {
      clearTimeout(currentTimer);
    }
    set({ pauseDetectionTimer: timer });
  },

  clearPauseDetectionTimer: () => {
    const timer = get().pauseDetectionTimer;
    if (timer) {
      clearTimeout(timer);
      set({ pauseDetectionTimer: null });
    }
  },

  // Batch actions
  reset: () => {
    // Clear pause detection timer
    const timer = get().pauseDetectionTimer;
    if (timer) {
      clearTimeout(timer);
    }

    set(initialState);
  },
}));

/**
 * Selectors for optimized re-renders
 */

// Get all strokes
export const selectStrokes = (state: CanvasStoreState) => state.strokes;

// Get current drawing state
export const selectDrawingState = (state: CanvasStoreState) => ({
  currentStroke: state.currentStroke,
  selectedColor: state.selectedColor,
  selectedTool: state.selectedTool,
  isDrawing: state.isDrawing,
});

// Get recognition state
export const selectRecognitionState = (state: CanvasStoreState) => ({
  result: state.recognitionResult,
  status: state.recognitionStatus,
  isRecognizing: state.isRecognizing,
  history: state.recognitionHistory,
});

// Get latest recognition result
export const selectLatestRecognition = (state: CanvasStoreState) =>
  state.recognitionResult;

// Check if we have any strokes
export const selectHasStrokes = (state: CanvasStoreState) =>
  state.strokes.length > 0;

// Get stroke count
export const selectStrokeCount = (state: CanvasStoreState) =>
  state.strokes.length;
