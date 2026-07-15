// Exibição de nome de jogador, a partir dos campos Nome/Sobrenome-Apelido da planilha-fonte
// (ver scripts/seed-from-xlsx.ts).
//
// A planilha usa uma convenção consistente: jogador de um nome só (Pelé, Zico, Danilo…) tem o
// mesmo valor repetido nas duas colunas — nesse caso mostramos uma vez só.
//
// Regra de exibição: nome completo por padrão ("Diego Tardelli") em qualquer lugar com espaço
// (cards de draft, almanaque, narração da partida); a abreviação ("D. Tardelli") é só pra
// espaço realmente apertado, hoje unicamente as bolinhas do campo tático em PitchFormation.vue.

import type { Player } from './types';

/** Nome completo, com o mononimo já resolvido: "Diego Tardelli", "Danilo", "Pelé". */
export function formatPlayerNameFull(player: Pick<Player, 'firstName' | 'lastName'>): string {
  const first = player.firstName.trim();
  const last = player.lastName.trim();

  if (!last || first.toLowerCase() === last.toLowerCase()) {
    return first || last;
  }
  return `${first} ${last}`;
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
