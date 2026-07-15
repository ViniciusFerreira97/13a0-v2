// Resolução do chute, tiro livre direto e pênalti (§5.6, §5.8).

import type { Player } from './types.js';
import type { Rng } from './rng.js';
import { outfieldAttrs, gkAttrs } from './attrs.js';
import { sigma, clamp } from './math.js';
import type { ChanceType } from './chances.js';

export type ShotOutcome = 'goal' | 'saved' | 'blocked' | 'wide';

// Valores-base do §5.8, escalados por ~0.65 na calibração (scripts/calibrate.ts) — a taxa de
// conversão observada com os valores literais do planejamento ficava bem acima da meta real
// de ~11% de gols por finalização.
const XG_BASE: Record<ChanceType, number> = {
  fora_da_area: 0.047,
  cruzamento: 0.08, // cabeçada
  jogada: 0.095,
  contra_ataque: 0.18, // tratado como 1×1
  enfiada: 0.18, // 1×1 com o goleiro
};

function resolveNonGoal(rng: Rng): ShotOutcome {
  const r = rng.next();
  if (r < 0.55) return 'saved';
  if (r < 0.75) return 'blocked';
  return 'wide';
}

export function resolveShot(type: ChanceType, shooter: Player, gk: Player, rng: Rng, attackBoost = 1): ShotOutcome {
  const shooterAtt = outfieldAttrs(shooter);
  const gkAtt = gkAttrs(gk);
  const ataque = (type === 'cruzamento' ? shooterAtt.cabeceio : shooterAtt.finalizacao) * attackBoost;
  const is1x1 = type === 'contra_ataque' || type === 'enfiada';
  const defesaGK = is1x1
    ? gkAtt.posicionamento * 0.4 + gkAtt.reflexo * 0.3 + gkAtt.saida * 0.3
    : gkAtt.posicionamento * 0.5 + gkAtt.reflexo * 0.5;

  // Divisor calibrado acima do valor literal do §5.8 — mesmo racional do pDesarmeLimpo em match.ts.
  const pGol = clamp((XG_BASE[type] * (1 + (ataque - defesaGK) / 240)), 0.02, 0.55);
  return rng.chance(pGol) ? 'goal' : resolveNonGoal(rng);
}

function freeKickScore(p: Player): number {
  return p.position === 'GK' ? gkAttrs(p).pes : outfieldAttrs(p).finalizacao * 0.7 + outfieldAttrs(p).cruzamento * 0.3;
}

/** Melhor cobrador de falta em campo — inclui o goleiro (easter egg à la Chilavert, §5.6). */
export function pickFreeKickTaker(players: Player[]): Player {
  return players.reduce((best, p) => (freeKickScore(p) > freeKickScore(best) ? p : best));
}

export function resolveDirectFreeKick(taker: Player, gk: Player, rng: Rng, attackBoost = 1): ShotOutcome {
  const takerScore = freeKickScore(taker) * attackBoost;
  const gkAtt = gkAttrs(gk);
  const pGol = sigma((takerScore - 0.5 * (gkAtt.posicionamento + gkAtt.reflexo)) / 15) * 0.11;
  return rng.chance(pGol) ? 'goal' : resolveNonGoal(rng);
}

export function pickPenaltyTaker(players: Player[]): Player {
  const outfield = players.filter((p) => p.position !== 'GK');
  return outfield.reduce((best, p) => (outfieldAttrs(p).finalizacao > outfieldAttrs(best).finalizacao ? p : best));
}

export function resolvePenalty(taker: Player, gk: Player, rng: Rng, pressureIndex = 0, attackBoost = 1): 'goal' | 'missed' {
  const fin = outfieldAttrs(taker).finalizacao * attackBoost;
  const def = gkAttrs(gk).penalti;
  let pGol = 0.76 + (fin - 75) * 0.004 - (def - 75) * 0.005;
  pGol -= pressureIndex * 0.015; // §5.9: disputa de pênaltis, −1.5%/cobrança a partir da 4ª
  pGol = clamp(pGol, 0.6, 0.9);
  return rng.chance(pGol) ? 'goal' : 'missed';
}
