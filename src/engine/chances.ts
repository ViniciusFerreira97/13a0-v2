// Tipo de chance e risco de impedimento (§5.5).

import type { Player } from './types.js';
import type { Rng } from './rng.js';
import { outfieldAttrs } from './attrs.js';

export type ChanceType = 'jogada' | 'enfiada' | 'cruzamento' | 'fora_da_area' | 'contra_ataque';

const OFFSIDE_BASE: Record<ChanceType, number> = {
  jogada: 0.04,
  enfiada: 0.24, // ponto médio da faixa 18–30% do planejamento
  cruzamento: 0.08,
  fora_da_area: 0,
  contra_ataque: 0.1,
};

export interface ChanceContext {
  attackers: Player[];
  afterCleanTackle: boolean;
}

function attrAvg(players: Player[], pick: (a: ReturnType<typeof outfieldAttrs>) => number): number {
  if (players.length === 0) return 50;
  return players.reduce((sum, p) => sum + pick(outfieldAttrs(p)), 0) / players.length;
}

export function pickChanceType(ctx: ChanceContext, rng: Rng): ChanceType {
  const wingers = ctx.attackers.filter((p) => ['PD', 'PE', 'LD', 'LE'].includes(p.position));
  const midfield = ctx.attackers.filter((p) => ['MEI', 'MC', 'VOL'].includes(p.position));
  const strikers = ctx.attackers.filter((p) => ['CA', 'SA'].includes(p.position));

  const jogadaW = attrAvg(ctx.attackers, (a) => a.passe) * 0.5 + attrAvg(ctx.attackers, (a) => a.drible) * 0.5;
  const enfiadaW = attrAvg(midfield, (a) => a.passe) * 0.5 + attrAvg(strikers, (a) => a.velocidade) * 0.5;
  const cruzamentoW = attrAvg(wingers, (a) => a.cruzamento);
  const foraW = attrAvg(midfield, (a) => a.finalizacao) * 0.6;
  const contraW = ctx.afterCleanTackle ? attrAvg(ctx.attackers, (a) => a.velocidade) * 1.5 : 0;

  const types: ChanceType[] = ['jogada', 'enfiada', 'cruzamento', 'fora_da_area', 'contra_ataque'];
  const weights = [jogadaW, enfiadaW, cruzamentoW, foraW, contraW];
  return rng.weightedPick(types, weights);
}

export function resolveOffside(
  type: ChanceType,
  attackerVelocidade: number,
  defendingLinhaVelocidade: number,
  attackingCoachOverall: number,
  rng: Rng,
): boolean {
  const base = OFFSIDE_BASE[type];
  if (base === 0) return false;
  const lineFactor = attackerVelocidade < defendingLinhaVelocidade ? 1.3 : 0.8;
  const disciplina = attackingCoachOverall >= 82 ? 0.85 : 1;
  return rng.chance(base * lineFactor * disciplina);
}
