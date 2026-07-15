// Bônus de estrelas e "clutch" em mata-mata (§5.9). Aplicado ao atributo decisivo de
// finalização (chute, cobrança de falta, pênalti) — o ponto onde o arquétipo do
// "herói de final" se manifesta de forma mais legível para quem está jogando.

import type { Player } from './types.js';

export interface MatchPhase {
  knockout: boolean;
  minute: number;
  extraTime: boolean;
}

export function starBoost(player: Player, phase: MatchPhase): number {
  if (!phase.knockout) return 1;
  let boost = 1;
  if (player.star) boost *= phase.extraTime || phase.minute >= 80 ? 1.08 : 1.04;
  if (player.clutch && phase.extraTime) boost *= 1.12;
  return boost;
}
