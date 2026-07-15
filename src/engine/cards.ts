// Severidade de cartão por falta (§5.7).

import type { Player, TacticalStyle } from './types.js';
import type { Rng } from './rng.js';
import { outfieldAttrs } from './attrs.js';

export type CardOutcome = 'none' | 'yellow' | 'red';

/** §5.4/§5.7: estilo defensivo e placar adverso elevam a agressividade do time sem a bola. */
export function aggressiveness(style: TacticalStyle, scoreDiffForTeam: number): number {
  const base = style === 'defensivo' ? 1.15 : style === 'ofensivo' ? 0.9 : 1.0;
  const adverse = scoreDiffForTeam < 0 ? 1.15 : scoreDiffForTeam > 0 ? 0.9 : 1.0;
  return base * adverse;
}

/**
 * Distribuição base por falta: 72% sem cartão, 24% amarelo, 2.5% vermelho direto.
 * O "1.5% amarelo em quem já tem" do planejamento é a estatística agregada resultante de
 * qualquer segundo amarelo — aqui isso emerge naturalmente de `alreadyBooked` virar vermelho.
 */
export function resolveCardSeverity(
  fouler: Player,
  minute: number,
  agressividade: number,
  alreadyBooked: boolean,
  rng: Rng,
): CardOutcome {
  const minuteFactor = 1 + (minute / 90) * 0.3;
  const att = fouler.position !== 'GK' ? outfieldAttrs(fouler) : null;
  const faltoso =
    att && ['ZAG', 'LD', 'LE', 'VOL'].includes(fouler.position) && att.marcacao - att.desarme > 15 ? 1.25 : 1;

  // Jogador já advertido joga com mais cautela — sem isso, o mesmo zagueiro/volante
  // (concentrado pelos pesos de posição em §positionWeights) acumula 2º amarelo demais.
  const caution = alreadyBooked ? 0.3 : 1;

  const pRed = Math.min(0.0007 * minuteFactor * agressividade, 0.004);
  const pYellow = Math.min(0.17 * minuteFactor * agressividade * faltoso * caution, 0.4);

  const r = rng.next();
  if (r < pRed) return 'red';
  if (r < pRed + pYellow) return alreadyBooked ? 'red' : 'yellow';
  return 'none';
}
