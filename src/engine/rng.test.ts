import { describe, expect, it } from 'vitest';
import { Rng } from './rng.js';

describe('Rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Rng('santos-1962');
    const b = new Rng('santos-1962');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new Rng('santos-1962');
    const b = new Rng('penarol-1960');
    expect(a.next()).not.toBe(b.next());
  });

  it('stays within [0, 1)', () => {
    const rng = new Rng('bounds-check');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('chance() respects extremes', () => {
    const rng = new Rng('chance-check');
    expect(Array.from({ length: 100 }, () => rng.chance(0)).some(Boolean)).toBe(false);
    expect(Array.from({ length: 100 }, () => rng.chance(1)).every(Boolean)).toBe(true);
  });
});
