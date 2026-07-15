// Agregados de time (radar estilo PES/FIFA + overall médio) a partir dos 11 jogadores
// draftados — puro, sem i18n: a view traduz `key` pro rótulo no idioma certo.

import type { OutfieldAttributes, Player } from './types';

export interface TeamRadarAxis {
  key: 'attack' | 'dribbling' | 'passing' | 'defense' | 'pace';
  value: number;
}

function avgAttr(players: Player[], keys: (keyof OutfieldAttributes)[]): number {
  if (!players.length) return 0;
  const values = players.map((p) => {
    const att = p.att as OutfieldAttributes;
    return keys.reduce((sum, k) => sum + att[k], 0) / keys.length;
  });
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function computeTeamRadar(players: Player[]): TeamRadarAxis[] {
  const outfield = players.filter((p) => p.position !== 'GK');
  return [
    { key: 'attack', value: avgAttr(outfield, ['finalizacao', 'cabeceio']) },
    { key: 'dribbling', value: avgAttr(outfield, ['drible']) },
    { key: 'passing', value: avgAttr(outfield, ['passe', 'cruzamento']) },
    { key: 'defense', value: avgAttr(outfield, ['marcacao', 'desarme']) },
    { key: 'pace', value: avgAttr(outfield, ['velocidade']) },
  ];
}

export function computeTeamOverall(players: Player[]): number {
  if (!players.length) return 0;
  return Math.round(players.reduce((sum, p) => sum + p.overall, 0) / players.length);
}
