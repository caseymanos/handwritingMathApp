/**
 * Lightweight ID generator for React Native without native crypto.
 * Avoids RNGetRandomValues dependency used by uuid().
 */

let counter = 0;

export function genId(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand1 = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  counter = (counter + 1) % 1_000_000;
  const seq = counter.toString(36).padStart(4, '0');
  return `${prefix}${time}-${rand1}-${rand2}-${seq}`;
}

export default genId;

