// Exibição de nome de jogador, a partir dos campos Nome/Sobrenome-Apelido da planilha-fonte
// (ver scripts/seed-from-xlsx.ts).
//
// A planilha usa uma convenção consistente: jogador de um nome só (Pelé, Zico, Danilo…) tem o
// mesmo valor repetido nas duas colunas — nesse caso mostramos uma vez só.
//
// Regra de exibição: nome completo por padrão ("Diego Tardelli") em qualquer lugar com espaço
// (cards de draft, almanaque, narração da partida); a abreviação ("D. Tardelli") é só pra
// espaço realmente apertado, hoje unicamente as bolinhas do campo tático em PitchFormation.vue.

import type { Player } from './types.js';

/**
 * Junta nome + sobrenome/apelido, sem repetir quando os dois vêm iguais — convenção da
 * planilha-fonte pra nome único ("Cuca" na coluna de nome e na de apelido vira só "Cuca", nunca
 * "Cuca Cuca"). Usado tanto para jogadores quanto para técnicos (seed script).
 */
export function joinNameParts(first: string | null | undefined, last: string | null | undefined): string {
  const f = (first ?? '').trim();
  const l = (last ?? '').trim();
  if (!f) return l;
  if (!l || f.toLowerCase() === l.toLowerCase()) return f;
  return `${f} ${l}`;
}

/** Nome completo, com o mononimo já resolvido: "Diego Tardelli", "Danilo", "Pelé". */
export function formatPlayerNameFull(player: Pick<Player, 'firstName' | 'lastName'>): string {
  return joinNameParts(player.firstName, player.lastName);
}

/** Abreviado — só para espaço apertado (bolinhas do campo tático): "D. Tardelli". */
export function formatPlayerName(player: Pick<Player, 'firstName' | 'lastName'>): string {
  const first = player.firstName.trim();
  const last = player.lastName.trim();

  if (!last || first.toLowerCase() === last.toLowerCase()) {
    return first || last;
  }
  return `${first.charAt(0)}. ${last}`;
}
