// Ratings de zona derivados dos 13 atributos (§5.2 do planejamento).

import type { Coach, Player, TacticalStyle } from './types.js';
import { outfieldAttrs, gkAttrs } from './attrs.js';

export interface ZoneRatings {
  meio: number;
  defesa: number;
  ataque: number;
  gk: number;
  /** Velocidade média dos zagueiros — define a altura da linha (§5.5). */
  linhaVelocidade: number;
}

const MEIO_POSITIONS = new Set(['VOL', 'MC', 'MEI', 'MD', 'ME']);
const DEFESA_POSITIONS = new Set(['ZAG', 'LD', 'LE']);
const ATAQUE_POSITIONS = new Set(['PD', 'PE', 'SA', 'CA', 'MEI']);

function avg(values: number[]): number {
  if (values.length === 0) return 50; // fallback neutro se a posição não tem titular
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const outfield = outfieldAttrs;

export function computeZoneRatings(lineup: Player[]): ZoneRatings {
  const gkPlayer = lineup.find((p) => p.position === 'GK');
  const gkAtt = gkPlayer ? gkAttrs(gkPlayer) : null;

  const meioPlayers = lineup.filter((p) => MEIO_POSITIONS.has(p.position));
  const defPlayers = lineup.filter((p) => DEFESA_POSITIONS.has(p.position));
  const atkPlayers = lineup.filter((p) => ATAQUE_POSITIONS.has(p.position));

  const meio =
    avg(
      meioPlayers.map((p) => {
        const a = outfield(p);
        return a.passe * 0.4 + a.drible * 0.2 + a.marcacao * 0.2 + a.desarme * 0.2;
      }),
    ) + (gkAtt ? gkAtt.pes * 0.05 : 0);

  const defesa = avg(
    defPlayers.map((p) => {
      const a = outfield(p);
      return a.marcacao * 0.35 + a.desarme * 0.35 + a.velocidade * 0.15 + a.cabeceio * 0.15;
    }),
  );

  const ataque = avg(
    atkPlayers.map((p) => {
      const a = outfield(p);
      return a.finalizacao * 0.35 + a.drible * 0.2 + a.velocidade * 0.2 + a.passe * 0.1 + a.cabeceio * 0.15;
    }),
  );

  const gk = gkAtt
    ? gkAtt.posicionamento * 0.3 + gkAtt.reflexo * 0.3 + gkAtt.saida * 0.15 + gkAtt.pes * 0.1 + gkAtt.penalti * 0.15
    : 50;

  const zagueiros = lineup.filter((p) => p.position === 'ZAG');
  const linhaVelocidade = avg(zagueiros.map((p) => outfield(p).velocidade));

  return { meio, defesa, ataque, gk, linhaVelocidade };
}

export interface ZoneModifiers {
  style: TacticalStyle;
  coach: Coach;
  /** Número de jogadores repetidos do mesmo elenco campeão em campo (§5.2 química de era). */
  eraChemistryTrios: number;
  fatigueFactor: number; // 1 = sem fadiga
  momentumFactor: number; // 1 = neutro
}

/** Aplica os modificadores multiplicativos (estilo, overall do técnico, química, fadiga, momentum). */
export function applyZoneModifiers(base: ZoneRatings, mod: ZoneModifiers): ZoneRatings {
  const styleAtk = mod.style === 'ofensivo' ? 1.06 : mod.style === 'defensivo' ? 0.94 : 1;
  const styleDef = mod.style === 'defensivo' ? 1.06 : mod.style === 'ofensivo' ? 0.94 : 1;

  const coachBonus = 1 + Math.min(Math.max(mod.coach.overall - 78, 0) * 0.004, 0.03);
  const chemistryBonus = 1 + Math.min(mod.eraChemistryTrios * 0.02, 0.06);

  const allZonesFactor = coachBonus * chemistryBonus * mod.fatigueFactor * mod.momentumFactor;

  return {
    meio: base.meio * allZonesFactor,
    defesa: base.defesa * styleDef * allZonesFactor,
    ataque: base.ataque * styleAtk * allZonesFactor,
    gk: base.gk * allZonesFactor,
    linhaVelocidade: base.linhaVelocidade,
  };
}
