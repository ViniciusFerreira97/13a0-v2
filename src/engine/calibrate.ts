// Harness de calibração (§5.10) — roda N partidas simuladas e agrega métricas contra as
// metas do planejamento. Não é um teste de asserção (as constantes ainda pedem ajuste fino);
// é uma ferramenta de inspeção usada por scripts/calibrate.ts.

import { simulateMatch, type TeamSetup, type MatchOptions } from './match.js';

export interface CalibrationTargets {
  goalsPerMatch: number;
  shotsPerTeam: number;
  foulsPerMatch: number;
  yellowsPerMatch: number;
  redsPerMatch: number;
  offsidesPerMatch: number;
  penaltiesPerMatch: number;
  upsetRate: number;
}

export const CALIBRATION_TARGETS: CalibrationTargets = {
  goalsPerMatch: 2.6,
  shotsPerTeam: 12,
  foulsPerMatch: 24,
  yellowsPerMatch: 4.2,
  redsPerMatch: 0.2,
  offsidesPerMatch: 3.5,
  penaltiesPerMatch: 0.28,
  upsetRate: 0.26,
};

export interface CalibrationReport {
  matches: number;
  goalsPerMatch: number;
  shotsPerTeam: number;
  foulsPerMatch: number;
  yellowsPerMatch: number;
  redsPerMatch: number;
  offsidesPerMatch: number;
  penaltiesPerMatch: number;
  upsetRate: number;
}

const SHOT_EVENTS = new Set(['goal', 'shot_saved', 'shot_blocked', 'shot_wide']);

export function runCalibration(
  home: TeamSetup,
  away: TeamSetup,
  options: Omit<MatchOptions, 'seed'>,
  matches: number,
  homeOverall: number,
  awayOverall: number,
): CalibrationReport {
  let goals = 0;
  let shots = 0;
  let fouls = 0;
  let yellows = 0;
  let reds = 0;
  let offsides = 0;
  let penalties = 0;
  let upsets = 0;

  const overallGap = Math.abs(homeOverall - awayOverall);
  const underdogIsHome = homeOverall < awayOverall;

  for (let i = 0; i < matches; i++) {
    const r = simulateMatch(home, away, { ...options, seed: `calib-${i}` });
    goals += r.homeScore + r.awayScore;
    for (const e of r.events) {
      if (SHOT_EVENTS.has(e.type)) shots++;
      if (e.type === 'foul') fouls++;
      if (e.type === 'yellow_card') yellows++;
      if (e.type === 'red_card' || e.type === 'second_yellow') reds++;
      if (e.type === 'offside') offsides++;
      if (e.type === 'penalty_awarded') penalties++;
    }
    if (overallGap >= 5) {
      const underdogWon = underdogIsHome ? r.homeScore > r.awayScore : r.awayScore > r.homeScore;
      if (underdogWon) upsets++;
    }
  }

  return {
    matches,
    goalsPerMatch: goals / matches,
    shotsPerTeam: shots / matches / 2,
    foulsPerMatch: fouls / matches,
    yellowsPerMatch: yellows / matches,
    redsPerMatch: reds / matches,
    offsidesPerMatch: offsides / matches,
    penaltiesPerMatch: penalties / matches,
    upsetRate: overallGap >= 5 ? upsets / matches : NaN,
  };
}
