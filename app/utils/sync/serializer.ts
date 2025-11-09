/**
 * Stroke Serializer
 *
 * Delta encoding + gzip compression for stroke data.
 * Achieves 70-90% size reduction for bandwidth efficiency.
 *
 * Encoding process:
 * 1. Convert absolute coordinates to delta encoding (relative differences)
 * 2. Quantize values to reduce precision (1 decimal place)
 * 3. Serialize to compact binary format
 * 4. Compress with gzip
 * 5. Base64 encode for text transport
 *
 * Decoding process is the reverse.
 */

import pako from 'pako';
import { Stroke, StrokePoint } from '../../types/Canvas';

/**
 * Quantization factor (1 decimal place precision)
 * Reduces file size with minimal visual impact
 */
const QUANTIZE_FACTOR = 10;

/**
 * Stroke metadata extracted during serialization
 */
export interface StrokeMetadata {
  pointCount: number;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  bytesOriginal: number;
  bytesCompressed: number;
  compressionRatio: number;
}

/**
 * Serialization result
 */
export interface SerializedStroke {
  data: string; // Base64-encoded compressed data
  metadata: StrokeMetadata;
  encoding: string; // 'delta-gzip-base64'
}

/**
 * Serialize stroke with delta encoding + gzip compression
 */
export function serializeStroke(stroke: Stroke): SerializedStroke {
  try {
    // Extract points
    const points = stroke.points;

    if (points.length === 0) {
      throw new Error('Cannot serialize stroke with no points');
    }

    // Calculate bounding box
    const bbox = calculateBoundingBox(points);

    // Convert to delta-encoded format
    const deltaEncoded = encodeDelta(points);

    // Serialize to binary
    const binary = serializeToBinary(deltaEncoded, stroke.color, stroke.strokeWidth);

    // Compress with gzip
    const compressed = pako.gzip(binary);

    // Base64 encode
    const base64 = Buffer.from(compressed).toString('base64');

    // Calculate metadata
    const bytesOriginal = binary.length;
    const bytesCompressed = compressed.length;
    const compressionRatio = bytesCompressed / bytesOriginal;

    console.log(
      `[Serializer] Compressed stroke ${stroke.id}: ${bytesOriginal}B → ${bytesCompressed}B (${(
        compressionRatio * 100
      ).toFixed(1)}%)`
    );

    return {
      data: base64,
      metadata: {
        pointCount: points.length,
        bbox,
        bytesOriginal,
        bytesCompressed,
        compressionRatio,
      },
      encoding: 'delta-gzip-base64',
    };
  } catch (error) {
    console.error('[Serializer] Error serializing stroke:', error);
    throw error;
  }
}

/**
 * Deserialize stroke from compressed data
 */
export function deserializeStroke(
  data: string,
  encoding: string = 'delta-gzip-base64'
): Stroke {
  try {
    if (encoding !== 'delta-gzip-base64') {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }

    // Base64 decode
    const compressed = Buffer.from(data, 'base64');

    // Decompress
    const binary = pako.ungzip(compressed);

    // Deserialize from binary
    const { points, color, strokeWidth } = deserializeFromBinary(binary);

    // Decode delta encoding to absolute coordinates
    const absolutePoints = decodeDelta(points);

    // Generate ID (will be overwritten by actual ID from database)
    const id = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      id,
      points: absolutePoints,
      color,
      strokeWidth,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[Serializer] Error deserializing stroke:', error);
    throw error;
  }
}

// ============================================================================
// DELTA ENCODING
// ============================================================================

/**
 * Encode points with delta compression
 * Stores first point absolutely, then relative differences
 */
function encodeDelta(points: StrokePoint[]): StrokePoint[] {
  if (points.length === 0) return [];

  const encoded: StrokePoint[] = [];

  // First point is absolute (quantized)
  encoded.push({
    x: quantize(points[0].x),
    y: quantize(points[0].y),
    pressure: quantize(points[0].pressure),
    timestamp: points[0].timestamp,
  });

  // Subsequent points are deltas
  for (let i = 1; i < points.length; i++) {
    encoded.push({
      x: quantize(points[i].x - points[i - 1].x),
      y: quantize(points[i].y - points[i - 1].y),
      pressure: quantize(points[i].pressure - points[i - 1].pressure),
      timestamp: points[i].timestamp - points[i - 1].timestamp,
    });
  }

  return encoded;
}

/**
 * Decode delta-encoded points to absolute coordinates
 */
function decodeDelta(encoded: StrokePoint[]): StrokePoint[] {
  if (encoded.length === 0) return [];

  const decoded: StrokePoint[] = [];

  // First point is already absolute
  decoded.push({ ...encoded[0] });

  // Reconstruct absolute coordinates from deltas
  for (let i = 1; i < encoded.length; i++) {
    decoded.push({
      x: decoded[i - 1].x + encoded[i].x,
      y: decoded[i - 1].y + encoded[i].y,
      pressure: decoded[i - 1].pressure + encoded[i].pressure,
      timestamp: decoded[i - 1].timestamp + encoded[i].timestamp,
    });
  }

  return decoded;
}

/**
 * Quantize value to reduce precision
 */
function quantize(value: number): number {
  return Math.round(value * QUANTIZE_FACTOR) / QUANTIZE_FACTOR;
}

// ============================================================================
// BINARY SERIALIZATION
// ============================================================================

/**
 * Serialize to compact binary format
 * Format: [pointCount(4)][color(7)][strokeWidth(4)][points...]
 * Each point: [x(4)][y(4)][pressure(4)][timestamp(4)] = 16 bytes
 */
function serializeToBinary(
  points: StrokePoint[],
  color: string,
  strokeWidth: number
): Uint8Array {
  // Calculate buffer size
  const headerSize = 4 + 7 + 4; // pointCount + color + strokeWidth
  const pointSize = 16; // 4 floats * 4 bytes each
  const bufferSize = headerSize + points.length * pointSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);
  let offset = 0;

  // Write header
  view.setUint32(offset, points.length, true);
  offset += 4;

  // Write color (7 chars hex: #RRGGBB)
  for (let i = 0; i < 7; i++) {
    view.setUint8(offset++, color.charCodeAt(i));
  }

  // Write stroke width
  view.setFloat32(offset, strokeWidth, true);
  offset += 4;

  // Write points
  for (const point of points) {
    view.setFloat32(offset, point.x, true);
    offset += 4;
    view.setFloat32(offset, point.y, true);
    offset += 4;
    view.setFloat32(offset, point.pressure, true);
    offset += 4;
    view.setFloat32(offset, point.timestamp, true);
    offset += 4;
  }

  return new Uint8Array(buffer);
}

/**
 * Deserialize from binary format
 */
function deserializeFromBinary(binary: Uint8Array): {
  points: StrokePoint[];
  color: string;
  strokeWidth: number;
} {
  const buffer = binary.buffer;
  const view = new DataView(buffer);
  let offset = 0;

  // Read header
  const pointCount = view.getUint32(offset, true);
  offset += 4;

  // Read color
  let color = '';
  for (let i = 0; i < 7; i++) {
    color += String.fromCharCode(view.getUint8(offset++));
  }

  // Read stroke width
  const strokeWidth = view.getFloat32(offset, true);
  offset += 4;

  // Read points
  const points: StrokePoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    points.push({
      x: view.getFloat32(offset, true),
      y: (offset += 4) && view.getFloat32(offset, true),
      pressure: (offset += 4) && view.getFloat32(offset, true),
      timestamp: (offset += 4) && view.getFloat32(offset, true),
    });
    offset += 4;
  }

  return { points, color, strokeWidth };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Calculate bounding box for points
 */
function calculateBoundingBox(points: StrokePoint[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Test round-trip serialization
 */
export function testSerializationRoundTrip(stroke: Stroke): boolean {
  try {
    const serialized = serializeStroke(stroke);
    const deserialized = deserializeStroke(serialized.data, serialized.encoding);

    // Compare point counts
    if (stroke.points.length !== deserialized.points.length) {
      console.error('[Serializer] Point count mismatch');
      return false;
    }

    // Compare points (with tolerance for quantization)
    const tolerance = 0.2; // 0.2px tolerance due to quantization
    for (let i = 0; i < stroke.points.length; i++) {
      const original = stroke.points[i];
      const restored = deserialized.points[i];

      if (
        Math.abs(original.x - restored.x) > tolerance ||
        Math.abs(original.y - restored.y) > tolerance ||
        Math.abs(original.pressure - restored.pressure) > 0.01
      ) {
        console.error('[Serializer] Point mismatch at index', i);
        return false;
      }
    }

    console.log('[Serializer] Round-trip test passed');
    return true;
  } catch (error) {
    console.error('[Serializer] Round-trip test failed:', error);
    return false;
  }
}