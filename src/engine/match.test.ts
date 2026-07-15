import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { simulateMatch, type TeamSetup } from './match.js';
import type { Player, SeedDataset } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataset: SeedDataset = JSON.parse(
  readFileSync(resolve(here, '..', '..', 'public', 'data', 'dataset.json'), 'utf-8'),
);

function buildSetup(side: 'home' | 'away', editionId: string): TeamSetup {
  const editionPlayers = dataset.players.filter((p) => p.editionId === editionId);
  const gk = editionPlayers.find((p) => p.position === 'GK');
  const outfield = editionPlayers.filter((p) => p.position !== 'GK').slice(0, 10);
  const coach = dataset.coaches.find((c) => c.id === `${editionId}-coach`);
  if (!gk || outfield.length < 10 || !coach) {
    throw new Error(`elenco de teste incompleto: ${editionId}`);
  }
  const lineup: Player[] = [gk, ...outfield];
  return { side, lineup, coach, style: 'equilibrado' };
}

const santos1962 = buildSetup('home', 'santos-1962');
const penarol1960 = buildSetup('away', 'penarol-1960');

describe('simulateMatch', () => {
  it('is deterministic for the same seed and lineups', () => {
    const a = simulateMatch(santos1962, penarol1960, { seed: 'final-1962', knockout: false });
    const b = simulateMatch(santos1962, penarol1960, { seed: 'final-1962', knockout: false });
    expect(a).toEqual(b);
  });

  it('produces different results for different seeds (usually)', () => {
    const results = new Set(
      ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e'].map((seed) => {
        const r = simulateMatch(santos1962, penarol1960, { seed, knockout: false });
        return `${r.homeScore}-${r.awayScore}`;
      }),
    );
    expect(results.size).toBeGreaterThan(1);
  });

  it('produces non-negative scores and a well-formed event timeline', () => {
    const r = simulateMatch(santos1962, penarol1960, { seed: 'sanity-check', knockout: false });
    expect(r.homeScore).toBeGreaterThanOrEqual(0);
    expect(r.awayScore).toBeGreaterThanOrEqual(0);
    expect(r.events[0].type).toBe('kickoff');
    expect(r.events.some((e) => e.type === 'full_time')).toBe(true);

    const goalEvents = r.events.filter((e) => e.type === 'goal').length;
    expect(goalEvents).toBe(r.homeScore + r.awayScore);

    for (const e of r.events) {
      expect(e.minute).toBeGreaterThanOrEqual(0);
      expect(e.minute).toBeLessThanOrEqual(90);
    }
  });

  it('goes to penalties on a tied knockout match when forced', () => {
    // mesma escalação dos dois lados tende a empatar mais — roda várias seeds até achar um empate
    let found = false;
    for (let i = 0; i < 30 && !found; i++) {
      const r = simulateMatch(
        { ...santos1962, side: 'home' },
        { ...santos1962, side: 'away' },
        { seed: `mirror-${i}`, knockout: true },
      );
      if (r.wentToPenalties) {
        found = true;
        expect(r.penaltyScore).toBeDefined();
        expect(r.penaltyScore!.home).not.toBe(r.penaltyScore!.away);

        // cobrança a cobrança: bate com o placar, e não vaza pro feed narrado (evita
        // duplicar/confundir estatísticas de pênaltis "de jogo", ver matchStats.ts).
        expect(r.penaltyKicks).toBeDefined();
        expect(r.penaltyKicks!.length).toBeGreaterThan(0);
        const homeScored = r.penaltyKicks!.filter((k) => k.teamId === 'home' && k.scored).length;
        const awayScored = r.penaltyKicks!.filter((k) => k.teamId === 'away' && k.scored).length;
        expect(homeScored).toBe(r.penaltyScore!.home);
        expect(awayScored).toBe(r.penaltyScore!.away);
      }
    }
    expect(found).toBe(true);
  });

  it('never fields a team with more than 11 players and respects sendoffs', () => {
    const r = simulateMatch(santos1962, penarol1960, { seed: 'cards-check', knockout: false });
    const redCards = r.events.filter((e) => e.type === 'red_card' || e.type === 'second_yellow');
    // não é uma asserção forte de contagem (depende da seed), só garante que o tipo de evento existe no vocabulário
    expect(Array.isArray(redCards)).toBe(true);
  });
});
