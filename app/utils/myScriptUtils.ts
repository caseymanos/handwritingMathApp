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
  MyScriptRecognizeRequest,
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
 * Create a complete MyScript recognition request for /batch endpoint
 *
 * @param strokes - Strokes to recognize
 * @param contentType - Type of content (Math, Text, etc.)
 * @param pointerType - Input device type
 * @returns Complete request body for MyScript /batch API
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
      // Math-specific configuration with mimeTypes
      math: {
        mimeTypes: [
          'application/x-latex',            // Primary: LaTeX output
          'application/mathml+xml',         // Secondary: MathML
          'application/vnd.myscript.jiix',  // Tertiary: MyScript native format
        ],
        solver: {
          enable: true,
          'fractional-part-digits': 3,
          'decimal-separator': '.',
          'rounding-mode': 'half up',
          'angle-unit': 'deg',
        },
      },
      export: {
        jiix: {
          strokes: true,
          'bounding-box': true,
        },
        mathml: {
          flavor: 'standard',
        },
      },
    },
    strokeGroups: [convertStrokesToGroup(strokes, pointerType)],
    // Note: root-level mimeTypes is deprecated for Math content type
    // Use configuration.math.mimeTypes instead
  };
}

/**
 * Create a complete MyScript recognize request for /recognize endpoint
 * Uses flat strokes array instead of strokeGroups (key difference from /batch)
 *
 * @param strokes - Strokes to recognize
 * @param contentType - Type of content (Math, Text, etc.)
 * @param pointerType - Input device type
 * @returns Complete request body for MyScript /recognize API
 */
export function createRecognizeRequest(
  strokes: Stroke[],
  contentType: MyScriptContentType = 'Math',
  pointerType: 'PEN' | 'TOUCH' | 'MOUSE' = 'PEN'
): MyScriptRecognizeRequest {
  return {
    contentType,
    configuration: {
      lang: 'en_US',
      // Math-specific configuration with mimeTypes
      math: {
        mimeTypes: [
          'application/x-latex',            // Primary: LaTeX output
          'application/mathml+xml',         // Secondary: MathML
          'application/vnd.myscript.jiix',  // Tertiary: MyScript native format
        ],
        solver: {
          enable: true,
          'fractional-part-digits': 3,
          'decimal-separator': '.',
          'rounding-mode': 'half up',
          'angle-unit': 'deg',
        },
      },
      export: {
        jiix: {
          strokes: true,
          'bounding-box': true,
        },
        mathml: {
          flavor: 'standard',
        },
      },
    },
    // Key difference: flat strokes array instead of strokeGroups
    strokes: strokes.map(stroke => convertStrokeToMyScript(stroke, pointerType)),
    // Optional scale factors (default to 1.0 if not specified)
    scaleX: 1.0,
    scaleY: 1.0,
  };
}

/**
 * Extract LaTeX from JIIX expression tree
 * Parses the JIIX structure to build a LaTeX string
 *
 * @param jiix - JIIX object (can be full response or expression)
 * @returns LaTeX string or undefined
 */
export function extractLatexFromJIIX(jiix: any): string | undefined {
  if (!jiix) {
    return undefined;
  }

  // Check for direct latex-label or label at root
  if (jiix['latex-label']) {
    return jiix['latex-label'];
  }
  if (jiix.label && typeof jiix.label === 'string') {
    return jiix.label;
  }

  // Parse expressions array
  if (jiix.expressions && Array.isArray(jiix.expressions)) {
    const labels: string[] = [];

    const extractLabels = (node: any): void => {
      if (!node) return;

      // Extract label from this node
      if (node.label) {
        labels.push(node.label);
      }

      // Recursively extract from operands
      if (node.operands && Array.isArray(node.operands)) {
        node.operands.forEach(extractLabels);
      }

      // Handle items (individual strokes)
      if (node.items && !node.label) {
        // Items without labels are usually grouped under a parent with a label
        return;
      }
    };

    jiix.expressions.forEach(extractLabels);

    if (labels.length > 0) {
      return labels.join('');
    }
  }

  return undefined;
}

/**
 * Extract JIIX from MyScript response
 *
 * @param response - MyScript API response
 * @returns JIIX object or undefined if not found
 */
export function extractJIIX(response: any): any | undefined {
  console.log('[extractJIIX] Called with response type:', typeof response);
  console.log('[extractJIIX] Response keys:', Object.keys(response || {}));
  console.log('[extractJIIX] response.exports exists?', !!response?.exports);

  // If response has exports array, extract JIIX from it
  if (response && response.exports) {
    console.log('[extractJIIX] Searching in', response.exports.length, 'exports');
    const jiixExport = response.exports.find(
      (exp: any) => exp['mime-type'] === 'application/vnd.myscript.jiix'
    );

    console.log('[extractJIIX] JIIX export found?', !!jiixExport);
    return jiixExport?.data;
  }

  // If response IS a JIIX object (has type, expressions, etc.), return it directly
  if (response && (response.type === 'Math' || response.expressions)) {
    console.log('[extractJIIX] Response appears to be JIIX format directly');
    return response;
  }

  console.log('[extractJIIX] No JIIX found');
  return undefined;
}

/**
 * Extract LaTeX from MyScript response
 * Handles both plain text responses (/recognize endpoint) and JSON responses (/batch endpoint)
 *
 * @param response - MyScript API response (can be string or object)
 * @returns LaTeX string or undefined if not found
 */
export function extractLatex(response: any): string | undefined {
  console.log('[extractLatex] Called with response type:', typeof response);

  // Handle plain text/number response from /recognize endpoint
  // /recognize returns primitive values: strings ("8 x") or numbers (8)
  if (typeof response === 'string' || typeof response === 'number') {
    const result = String(response).trim();
    if (result) {
      console.log('[extractLatex] Plain text/number response from /recognize:', result);
      return result;
    }
    return undefined;
  }

  // Handle JSON response from /batch endpoint
  console.log('[extractLatex] Response keys:', Object.keys(response || {}));

  // Try direct LaTeX export first (if exports array exists)
  if (response?.exports && Array.isArray(response.exports)) {
    console.log('[extractLatex] Searching for LaTeX in', response.exports.length, 'exports');
    const latexExport = response.exports.find(
      (exp: any) => exp['mime-type'] === 'application/x-latex'
    );

    if (latexExport?.data) {
      console.log('[extractLatex] Found LaTeX export:', latexExport.data);
      return latexExport.data;
    }
  }

  // Fallback: Extract LaTeX from JIIX structure
  console.log('[extractLatex] No LaTeX export found, trying JIIX extraction fallback');
  const jiix = extractJIIX(response);
  if (jiix) {
    const latexFromJiix = extractLatexFromJIIX(jiix);
    if (latexFromJiix) {
      console.log('[extractLatex] Successfully extracted LaTeX from JIIX:', latexFromJiix);
      return latexFromJiix;
    }
  }

  console.log('[extractLatex] No LaTeX found in any format');
  return undefined;
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
  jiix?: any;
  latex?: string;
  mathml?: string;
  text?: string;
} {
  return {
    jiix: extractJIIX(response),
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
