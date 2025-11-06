/**
 * MyScript Utilities
 *
 * Utilities for converting between our internal stroke format and MyScript API format.
 */

import { Stroke, StrokePoint, InputDevice } from '../types/Canvas';
import {
  MyScriptStroke,
  MyScriptStrokeGroup,
  MyScriptRecognitionRequest,
  MyScriptContentType,
} from '../types/MyScript';

/**
 * Convert a single internal Stroke to MyScript format
 *
 * @param stroke - Internal stroke with points array
 * @param pointerType - Type of input device used
 * @returns MyScript formatted stroke with parallel arrays
 */
export function convertStrokeToMyScript(
  stroke: Stroke,
  pointerType: 'PEN' | 'TOUCH' | 'MOUSE' = 'PEN'
): MyScriptStroke {
  const x: number[] = [];
  const y: number[] = [];
  const t: number[] = [];
  const p: number[] = [];

  // Convert from points array to parallel arrays
  stroke.points.forEach((point: StrokePoint) => {
    x.push(Math.round(point.x));
    y.push(Math.round(point.y));
    t.push(point.timestamp);
    p.push(point.pressure);
  });

  return {
    id: stroke.id,
    x,
    y,
    t,
    p,
    pointerId: 0, // Single pointer for MVP
    pointerType,
  };
}

/**
 * Convert multiple strokes to a MyScript stroke group
 *
 * @param strokes - Array of internal strokes
 * @param pointerType - Type of input device
 * @returns MyScript stroke group
 */
export function convertStrokesToGroup(
  strokes: Stroke[],
  pointerType: 'PEN' | 'TOUCH' | 'MOUSE' = 'PEN'
): MyScriptStrokeGroup {
  return {
    strokes: strokes.map(stroke => convertStrokeToMyScript(stroke, pointerType)),
  };
}

/**
 * Create a complete MyScript recognition request
 *
 * @param strokes - Strokes to recognize
 * @param contentType - Type of content (Math, Text, etc.)
 * @param pointerType - Input device type
 * @returns Complete request body for MyScript API
 */
export function createRecognitionRequest(
  strokes: Stroke[],
  contentType: MyScriptContentType = 'Math',
  pointerType: 'PEN' | 'TOUCH' | 'MOUSE' = 'PEN'
): MyScriptRecognitionRequest {
  return {
    contentType,
    configuration: {
      lang: 'en_US',
      export: {
        jiix: {
          strokes: true,
          'bounding-box': true,
        },
      },
    },
    strokeGroups: [convertStrokesToGroup(strokes, pointerType)],
    mimeTypes: [
      'application/x-latex',       // Primary: LaTeX output
      'application/mathml+xml',    // Secondary: MathML
      'text/plain',                // Fallback: Plain text
    ],
  };
}

/**
 * Extract LaTeX from MyScript response
 *
 * @param response - MyScript API response
 * @returns LaTeX string or undefined if not found
 */
export function extractLatex(response: any): string | undefined {
  if (!response || !response.exports) {
    return undefined;
  }

  const latexExport = response.exports.find(
    (exp: any) => exp['mime-type'] === 'application/x-latex'
  );

  return latexExport?.data;
}

/**
 * Extract MathML from MyScript response
 *
 * @param response - MyScript API response
 * @returns MathML string or undefined if not found
 */
export function extractMathML(response: any): string | undefined {
  if (!response || !response.exports) {
    return undefined;
  }

  const mathmlExport = response.exports.find(
    (exp: any) => exp['mime-type'] === 'application/mathml+xml'
  );

  return mathmlExport?.data;
}

/**
 * Extract plain text from MyScript response
 *
 * @param response - MyScript API response
 * @returns Plain text string or undefined if not found
 */
export function extractText(response: any): string | undefined {
  if (!response || !response.exports) {
    return undefined;
  }

  const textExport = response.exports.find(
    (exp: any) => exp['mime-type'] === 'text/plain'
  );

  return textExport?.data;
}

/**
 * Get all available exports from response
 *
 * @param response - MyScript API response
 * @returns Object with all available export formats
 */
export function extractAllFormats(response: any): {
  latex?: string;
  mathml?: string;
  text?: string;
} {
  return {
    latex: extractLatex(response),
    mathml: extractMathML(response),
    text: extractText(response),
  };
}

/**
 * Determine pointer type from input device
 *
 * @param device - Input device type
 * @returns MyScript pointer type
 */
export function getPointerType(device: InputDevice): 'PEN' | 'TOUCH' | 'MOUSE' {
  switch (device) {
    case InputDevice.STYLUS:
      return 'PEN';
    case InputDevice.FINGER:
      return 'TOUCH';
    case InputDevice.MOUSE:
      return 'MOUSE';
    default:
      return 'PEN'; // Default to pen for unknown devices
  }
}

/**
 * Validate that strokes have valid data for recognition
 *
 * @param strokes - Strokes to validate
 * @returns True if strokes are valid for recognition
 */
export function validateStrokes(strokes: Stroke[]): boolean {
  if (!strokes || strokes.length === 0) {
    return false;
  }

  // Check that all strokes have at least 2 points (minimum for a line)
  return strokes.every(stroke => stroke.points && stroke.points.length >= 2);
}

/**
 * Calculate total number of points across all strokes
 * Useful for determining if input is too complex
 *
 * @param strokes - Strokes to count
 * @returns Total number of points
 */
export function countTotalPoints(strokes: Stroke[]): number {
  return strokes.reduce((total, stroke) => total + stroke.points.length, 0);
}

/**
 * Split strokes into smaller groups if too large
 * MyScript may have limits on request size
 *
 * @param strokes - Strokes to potentially split
 * @param maxPointsPerGroup - Maximum points per group
 * @returns Array of stroke groups
 */
export function splitStrokesIntoGroups(
  strokes: Stroke[],
  maxPointsPerGroup: number = 5000
): Stroke[][] {
  const groups: Stroke[][] = [];
  let currentGroup: Stroke[] = [];
  let currentPoints = 0;

  for (const stroke of strokes) {
    const strokePoints = stroke.points.length;

    if (currentPoints + strokePoints > maxPointsPerGroup && currentGroup.length > 0) {
      // Start a new group
      groups.push(currentGroup);
      currentGroup = [stroke];
      currentPoints = strokePoints;
    } else {
      currentGroup.push(stroke);
      currentPoints += strokePoints;
    }
  }

  // Add the last group if not empty
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
