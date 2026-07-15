// Mapeia os picks do draft para os slots visuais do PitchFormation — compartilhado entre a
// tela de draft e a de resultado (§ o card final também mostra o campinho tático).

import type { Formation } from './formations';
import { formatPlayerName } from './naming';
import type { Player, Position } from './types';

export interface PitchSlot {
  position: Position;
  filled: boolean;
  label?: string;
  shirtNumber?: number | null;
  overall?: number;
}

export function buildPitchSlots(
  formation: Formation | null | undefined,
  picks: { slot: Position; player: Player }[],
): PitchSlot[] {
  if (!formation) return [];
  const byPosition = new Map<Position, Player[]>();
  for (const pick of picks) {
    const arr = byPosition.get(pick.slot) ?? [];
    arr.push(pick.player);
    byPosition.set(pick.slot, arr);
  }
  const consumed = new Map<Position, number>();
  return formation.slots.map((position) => {
    const idx = consumed.get(position) ?? 0;
    consumed.set(position, idx + 1);
    const player = (byPosition.get(position) ?? [])[idx];
    return {
      position,
      filled: !!player,
      label: player ? formatPlayerName(player) : undefined,
      shirtNumber: player?.shirtNumber,
      overall: player?.overall,
    };
  });
}
