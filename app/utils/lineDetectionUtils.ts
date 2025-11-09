/**
 * Utility functions for detecting which line guide handwritten strokes belong to
 */

import { Stroke } from '../types';

export const LINE_GUIDE_SPACING = 60; // Must match HandwritingCanvas LINE_GUIDE_SPACING
export const TOP_OFFSET = 150; // Pixel offset before first line (space for problem header)
// First line guide in canvas is at y=TOP_OFFSET, then +60, +120, etc (relative to canvas)

/**
 * Calculate the average Y-coordinate from an array of strokes
 * Y coordinates are relative to the canvas element
 */
export const getAverageYFromStrokes = (strokes: Stroke[]): number => {
  if (strokes.length === 0) return 0;

  let totalY = 0;
  let pointCount = 0;

  strokes.forEach(stroke => {
    stroke.points.forEach(point => {
      totalY += point.y;
      pointCount++;
    });
  });

  return pointCount > 0 ? totalY / pointCount : 0;
};

/**
 * Determine which line number (0-indexed) the strokes belong to based on canvas coordinates
 * Line 0 is at y=60, Line 1 is at y=120, Line 2 is at y=180, etc.
 * Returns the closest line number
 */
export const getLineNumberFromStrokes = (strokes: Stroke[]): number | null => {
  if (strokes.length === 0) return null;

  const avgY = getAverageYFromStrokes(strokes);

  // Adjust for top offset space reserved for the problem header
  const adjustedY = Math.max(0, avgY - TOP_OFFSET);

  // Calculate which line guide this is closest to
  // Line guides are at y = TOP_OFFSET + LINE_GUIDE_SPACING * n, where n is 0-indexed
  const lineNumber = Math.round(adjustedY / LINE_GUIDE_SPACING);

  // Clamp to reasonable range (0-10 lines)
  return Math.max(0, Math.min(10, lineNumber));
};

/**
 * Get the Y-coordinate for a specific line number (in canvas coordinates)
 * Line 0 is at y=60, Line 1 at y=120, etc
 */
export const getYCoordinateForLine = (lineNumber: number): number => {
  return TOP_OFFSET + lineNumber * LINE_GUIDE_SPACING;
};
