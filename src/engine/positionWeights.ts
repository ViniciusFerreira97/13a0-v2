// Pesos de envolvimento por posição — o planejamento (§5.4, §5.5) define as fórmulas de
// qualidade do lance mas não os pesos de sorteio de "quem está com a bola"/"quem marca".
// Estes valores são uma escolha de design deste motor, calibrável junto com §5.10.

import type { Player, Position } from './types.js';
import type { Rng } from './rng.js';

const CARRIER_WEIGHT: Record<Position, number> = {
  GK: 0.1, ZAG: 0.5, LD: 1, LE: 1,
  VOL: 2, MC: 2, MEI: 3, MD: 2, ME: 2,
  PD: 2.5, PE: 2.5, SA: 3, CA: 3,
};

const TACKLER_WEIGHT: Record<Position, number> = {
  GK: 0.1, ZAG: 3, LD: 2.5, LE: 2.5,
  VOL: 3, MC: 2, MEI: 1.5, MD: 1.5, ME: 1.5,
  PD: 0.5, PE: 0.5, SA: 0.5, CA: 0.3,
};

export function weightedPlayerPick(players: Player[], weights: Record<Position, number>, rng: Rng): Player {
  const w = players.map((p) => weights[p.position] ?? 1);
  return rng.weightedPick(players, w);
}

export function pickBallCarrier(attackers: Player[], rng: Rng): Player {
  return weightedPlayerPick(attackers, CARRIER_WEIGHT, rng);
}

export function pickTackler(defenders: Player[], rng: Rng): Player {
  return weightedPlayerPick(defenders, TACKLER_WEIGHT, rng);
}

export function outfieldOnPitch(lineup: Player[]): Player[] {
  return lineup.filter((p) => p.position !== 'GK');
}

export function goalkeeperOnPitch(lineup: Player[]): Player | undefined {
  return lineup.find((p) => p.position === 'GK');
}
