/**
 * ID generator using UUID v4 for database compatibility.
 * Pure JavaScript implementation to avoid native module dependencies.
 */

/**
 * Generate a RFC 4122 compliant UUID v4
 * @returns A standard UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function genId(): string {
  // Generate 16 random bytes
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }

  // Set version (4) and variant bits according to RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to hex string with dashes
  const hex = bytes.map(b => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export default genId;

