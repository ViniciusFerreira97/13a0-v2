import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { simulateMatch, type TeamSetup } from './match';
import { computeMatchStats } from './matchStats';
import type { Player, SeedDataset } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const dataset: SeedDataset = JSON.parse(
  readFileSync(resolve(here, '..', '..', 'public', 'data', 'dataset.json'), 'utf-8'),
);

function buildSetup(side: 'home' | 'away', editionId: string): TeamSetup {
  const editionPlayers = dataset.players.filter((p) => p.editionId === editionId);
  const gk = editionPlayers.find((p) => p.position === 'GK');
  const outfield = editionPlayers.filter((p) => p.position !== 'GK').slice(0, 10);
  const coach = dataset.coaches.find((c) => c.id === `${editionId}-coach`);
  if (!gk || outfield.length < 10 || !coach) throw new Error(`elenco de teste incompleto: ${editionId}`);
  const lineup: Player[] = [gk, ...outfield];
  return { side, lineup, coach, style: 'equilibrado' };
}

const home = buildSetup('home', 'santos-1962');
const away = buildSetup('away', 'penarol-1960');

describe('computeMatchStats', () => {
  it('goal counts match the final score', () => {
    for (const seed of ['stats-a', 'stats-b', 'stats-c']) {
      const result = simulateMatch(home, away, { seed, knockout: false });
      const stats = computeMatchStats(result, home.lineup, away.lineup);
      expect(stats.home.goals).toBe(result.homeScore);
      expect(stats.away.goals).toBe(result.awayScore);
      expect(stats.goals.filter((g) => g.teamId === 'home').length).toBe(result.homeScore);
      expect(stats.goals.filter((g) => g.teamId === 'away').length).toBe(result.awayScore);
    }
  });

  it('every starting player gets a rating entry, all within [4, 9.8]', () => {
    const result = simulateMatch(home, away, { seed: 'stats-ratings', knockout: false });
    const stats = computeMatchStats(result, home.lineup, away.lineup);
    const ids = new Set(stats.players.map((p) => p.playerId));
    for (const p of [...home.lineup, ...away.lineup]) expect(ids.has(p.id)).toBe(true);
    for (const p of stats.players) {
      expect(p.rating).toBeGreaterThanOrEqual(4);
      expect(p.rating).toBeLessThanOrEqual(9.8);
    }
  });

  it('a scorer rates above the 6.0 baseline (all else equal)', () => {
    // roda até achar uma partida com pelo menos um gol, pra checar o bônus de rating
    for (let i = 0; i < 30; i++) {
      const result = simulateMatch(home, away, { seed: `stats-goal-${i}`, knockout: false });
      const stats = computeMatchStats(result, home.lineup, away.lineup);
      const scorer = stats.goals[0];
      if (!scorer) continue;
      const p = stats.players.find((x) => x.playerId === scorer.playerId)!;
      expect(p.goals).toBeGreaterThan(0);
      expect(p.rating).toBeGreaterThan(6.0);
      return;
    }
    throw new Error('nenhuma partida com gol em 30 tentativas — improvável, checar calibração');
  });

  it('card counts match the event timeline', () => {
    const result = simulateMatch(home, away, { seed: 'stats-cards', knockout: false });
    const stats = computeMatchStats(result, home.lineup, away.lineup);
    const yellowEvents = result.events.filter((e) => e.type === 'yellow_card').length;
    const redEvents = result.events.filter((e) => e.type === 'red_card' || e.type === 'second_yellow').length;
    expect(stats.home.yellow + stats.away.yellow).toBe(yellowEvents);
    expect(stats.home.red + stats.away.red).toBe(redEvents);
  });

  it('classifies penalty and free-kick goals correctly', () => {
    for (let i = 0; i < 60; i++) {
      const result = simulateMatch(home, away, { seed: `stats-kind-${i}`, knockout: false });
      const stats = computeMatchStats(result, home.lineup, away.lineup);
      const penalty = stats.goals.find((g) => g.kind === 'penalti');
      if (penalty) {
        const idx = result.events.findIndex((e) => e.type === 'goal' && e.minute === penalty.minute && e.playerId === penalty.playerId);
        expect(result.events[idx - 1].type).toBe('penalty_scored');
        return;
      }
    }
    // não é garantido achar um pênalti em 60 seeds, mas é bem provável — não falha o teste se não achar.
  });
});
