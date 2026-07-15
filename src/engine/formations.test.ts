import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORMATIONS } from './formations';
import type { SeedDataset } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const dataset: SeedDataset = JSON.parse(
  readFileSync(resolve(here, '..', '..', 'public', 'data', 'dataset.json'), 'utf-8'),
);

describe('FORMATIONS', () => {
  it('only uses positions that actually exist in the dataset', () => {
    const supply = new Set(dataset.players.map((p) => p.position));
    for (const f of FORMATIONS) {
      for (const position of f.slots) {
        expect(supply.has(position), `formação ${f.id} usa "${position}", sem jogador nenhum na base`).toBe(true);
      }
    }
  });

  it('every formation has exactly 1 GK + 10 outfield slots', () => {
    for (const f of FORMATIONS) {
      expect(f.slots.length).toBe(11);
      expect(f.slots.filter((p) => p === 'GK').length).toBe(1);
    }
  });
});
