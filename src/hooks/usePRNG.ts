/**
 * Deterministic seedable PRNG using Mulberry32.
 * Used by the simulation engine for reproducible attacker behaviour.
 */
export function createPRNG(seedStr: string) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSequentialId(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
