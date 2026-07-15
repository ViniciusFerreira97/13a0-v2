import type { GoalkeeperAttributes, OutfieldAttributes, Player } from './types.js';
import { isGoalkeeperAttributes } from './types.js';

export function outfieldAttrs(p: Player): OutfieldAttributes {
  if (isGoalkeeperAttributes(p.att)) {
    throw new Error(`jogador ${p.id} é goleiro mas foi tratado como jogador de linha`);
  }
  return p.att;
}

export function gkAttrs(p: Player): GoalkeeperAttributes {
  if (!isGoalkeeperAttributes(p.att)) {
    throw new Error(`jogador ${p.id} não é goleiro`);
  }
  return p.att;
}
