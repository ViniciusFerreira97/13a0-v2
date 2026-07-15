import type { MatchEvent } from '../engine/events';
import type { Player } from '../engine/types';
import { formatPlayerNameFull } from '../engine/naming';
import { NARRATION_POOLS, type NarrationLocale } from './pools';

/** Resolve o texto narrado de um evento. Escolha de frase é cosmética — não usa o Rng do motor. */
export function narrate(event: MatchEvent, playersById: Map<string, Player>, locale: NarrationLocale): string {
  const pool = NARRATION_POOLS[locale][event.type];
  if (!pool || pool.length === 0) return '';
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  const player = event.playerId ? playersById.get(event.playerId) : undefined;
  const playerName = player ? formatPlayerNameFull(player) : '';
  return phrase.replace('{player}', playerName);
}
