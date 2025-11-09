/**
 * Canvas Types
 *
 * Type definitions for handwriting canvas, strokes, and drawing tools.
 */

/**
 * Individual point in a stroke with pressure sensitivity
 */
export interface StrokePoint {
  x: number;
  y: number;
  pressure: number; // 0-1 range, 1 = max pressure
  timestamp: number; // milliseconds since epoch
}

/**
 * Complete stroke representing a continuous line drawn by the user
 */
export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string; // hex color
  strokeWidth: number; // base width, will be modified by pressure
  timestamp: number; // when stroke started
}

/**
 * Canvas drawing state
 */
export interface CanvasState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  selectedColor: string;
  selectedTool: DrawingTool;
  isDrawing: boolean;
}

/**
 * Available drawing tools
 */
export enum DrawingTool {
  PEN = 'pen',
  ERASER = 'eraser',
}

/**
 * Canvas color options
 */
export const CANVAS_COLORS = {
  BLACK: '#000000',
  BLUE: '#0066CC',
  RED: '#CC0000',
  GREEN: '#008800',
  PURPLE: '#8B00FF',
} as const;

export type CanvasColor = typeof CANVAS_COLORS[keyof typeof CANVAS_COLORS];

/**
 * Canvas dimensions and configuration
 */
export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
  lineGuideSpacing: number; // spacing between horizontal line guides
  showLineGuides: boolean;
}

/**
 * Input device type detection
 */
export enum InputDevice {
  STYLUS = 'stylus',
  FINGER = 'finger',
  MOUSE = 'mouse',
  UNKNOWN = 'unknown',
}

/**
 * Stylus capabilities for the current device
 */
export interface StylusCapabilities {
  hasPressureSensitivity: boolean;
  hasTiltSupport: boolean;
  deviceType: InputDevice;
}

/**
 * Toolbar position on screen (2 snap positions)
 * MIDDLE_LEFT: Vertical toolbar on left side (rotated)
 * BOTTOM_CENTER: Horizontal toolbar on bottom (not rotated)
 */
export enum ToolbarPosition {
  MIDDLE_LEFT = 'middle-left',
  BOTTOM_CENTER = 'bottom-center',
}

/**
 * Toolbar state
 */
export interface ToolbarState {
  position: ToolbarPosition;
  isVisible: boolean;
  isDragging: boolean;
}
