// CLI: node/tsx scripts/calibrate.ts [nMatches] — roda o harness de §5.10 e imprime o
// relatório comparado às metas. Uso: `npm run calibrate`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runCalibration, CALIBRATION_TARGETS } from '../src/engine/calibrate.js';
import type { TeamSetup } from '../src/engine/match.js';
import type { Player, SeedDataset } from '../src/engine/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const dataset: SeedDataset = JSON.parse(
  readFileSync(resolve(here, '..', 'public', 'data', 'dataset.json'), 'utf-8'),
);

function buildSetup(side: 'home' | 'away', editionId: string, sortBy: 'best' | 'worst' | 'first' = 'first'): TeamSetup {
  const editionPlayers = dataset.players.filter((p) => p.editionId === editionId);
  const gksByOverall = editionPlayers.filter((p) => p.position === 'GK').sort((a, b) => b.overall - a.overall);
  const outfieldAll = editionPlayers.filter((p) => p.position !== 'GK');
  const outfield =
    sortBy === 'best'
      ? [...outfieldAll].sort((a, b) => b.overall - a.overall).slice(0, 10)
      : sortBy === 'worst'
        ? [...outfieldAll].sort((a, b) => a.overall - b.overall).slice(0, 10)
        : outfieldAll.slice(0, 10);
  const gk = sortBy === 'worst' ? gksByOverall[gksByOverall.length - 1] : gksByOverall[0];
  const coach = dataset.coaches.find((c) => c.id === `${editionId}-coach`);
  if (!gk || outfield.length < 10 || !coach) throw new Error(`elenco incompleto: ${editionId}`);
  const lineup: Player[] = [gk, ...outfield];
  return { side, lineup, coach, style: 'equilibrado' };
}

function avgOverall(setup: TeamSetup): number {
  return setup.lineup.reduce((s, p) => s + p.overall, 0) / setup.lineup.length;
}

const n = Number(process.argv[2] ?? 2000);

// Par equilibrado (times fortes recentes) para métricas gerais…
const home = buildSetup('home', 'flamengo-2025');
const away = buildSetup('away', 'river-plate-2018');

// …e um par com gap de overall grande (XI ideal do melhor elenco vs XI fraco do pior) para
// medir a taxa de zebra (§5.10) — a diferença média entre elencos inteiros é pequena demais.
const strong = buildSetup('home', 'river-plate-1996', 'best');
const weak = buildSetup('away', 'atletico-mg-2013', 'worst');

const general = runCalibration(home, away, { knockout: false }, n, avgOverall(home), avgOverall(away));
const upsetPair = runCalibration(strong, weak, { knockout: false }, n, avgOverall(strong), avgOverall(weak));

function line(label: string, value: number, target: number, tolerance: number) {
  const ok = Math.abs(value - target) <= tolerance ? 'OK ' : 'FORA';
  console.log(`${ok}  ${label.padEnd(24)} ${value.toFixed(3).padStart(8)}  (meta ${target} ± ${tolerance})`);
}

console.log(`\n${n} partidas simuladas — ${home.lineup[1]?.editionId} × ${away.lineup[1]?.editionId}\n`);
line('Gols/partida', general.goalsPerMatch, CALIBRATION_TARGETS.goalsPerMatch, 0.3);
line('Finalizações/time', general.shotsPerTeam, CALIBRATION_TARGETS.shotsPerTeam, 3);
line('Faltas/partida', general.foulsPerMatch, CALIBRATION_TARGETS.foulsPerMatch, 5);
line('Amarelos/partida', general.yellowsPerMatch, CALIBRATION_TARGETS.yellowsPerMatch, 1);
line('Vermelhos/partida', general.redsPerMatch, CALIBRATION_TARGETS.redsPerMatch, 0.08);
line('Impedimentos/partida', general.offsidesPerMatch, CALIBRATION_TARGETS.offsidesPerMatch, 1.5);
line('Pênaltis/partida', general.penaltiesPerMatch, CALIBRATION_TARGETS.penaltiesPerMatch, 0.1);

console.log(`\n${n} partidas — zebra (gap de overall ${Math.abs(avgOverall(strong) - avgOverall(weak)).toFixed(1)} pts)\n`);
line('Taxa de zebra', upsetPair.upsetRate, CALIBRATION_TARGETS.upsetRate, 0.04);
