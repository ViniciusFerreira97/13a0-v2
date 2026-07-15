// Esquemas táticos (§4.1). As posições usadas aqui têm que ter jogadores de verdade na base —
// MD e ME (meia direita/esquerda) não existem em nenhum dos 66 elencos da planilha-fonte, então
// nunca aparecem numa formação (deixar uma formação pedir uma posição sem nenhuma oferta trava
// o draft: o sorteio de time nunca acha ninguém pra preencher aquela vaga). Ver formations.test.ts.

import type { Position } from './types';

export interface Formation {
  id: string;
  label: string;
  /** 1 GK + 10 slots de linha, na ordem em que são draftados. */
  slots: Position[];
}

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    label: '4-3-3',
    slots: ['GK', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'VOL', 'MEI', 'PD', 'CA', 'PE'],
  },
  {
    id: '4-4-2',
    label: '4-4-2',
    slots: ['GK', 'LD', 'ZAG', 'ZAG', 'LE', 'PD', 'VOL', 'VOL', 'PE', 'CA', 'SA'],
  },
  {
    id: '3-5-2',
    label: '3-5-2',
    slots: ['GK', 'ZAG', 'ZAG', 'ZAG', 'LD', 'VOL', 'MC', 'MEI', 'LE', 'CA', 'SA'],
  },
  {
    id: '4-2-3-1',
    label: '4-2-3-1',
    slots: ['GK', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'VOL', 'PD', 'MEI', 'PE', 'CA'],
  },
  {
    id: '3-4-3',
    label: '3-4-3',
    slots: ['GK', 'ZAG', 'ZAG', 'ZAG', 'LD', 'LE', 'VOL', 'VOL', 'PD', 'CA', 'PE'],
  },
  {
    id: '5-3-2',
    label: '5-3-2',
    slots: ['GK', 'ZAG', 'ZAG', 'ZAG', 'LD', 'LE', 'VOL', 'VOL', 'MEI', 'CA', 'SA'],
  },
];

export function getFormation(id: string): Formation {
  const f = FORMATIONS.find((f) => f.id === id);
  if (!f) throw new Error(`formação desconhecida: ${id}`);
  return f;
}
