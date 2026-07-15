// Tipos centrais do domínio — usados pelo motor, pelo seed script e pelos stores.

export type OutfieldPosition =
  | 'LD' | 'ZAG' | 'LE'
  | 'VOL' | 'MC' | 'MEI' | 'MD' | 'ME'
  | 'PD' | 'PE' | 'SA' | 'CA';

export type Position = 'GK' | OutfieldPosition;

export interface OutfieldAttributes {
  marcacao: number;
  desarme: number;
  velocidade: number;
  cruzamento: number;
  drible: number;
  cabeceio: number;
  finalizacao: number;
  passe: number;
}

export interface GoalkeeperAttributes {
  posicionamento: number;
  reflexo: number;
  saida: number;
  pes: number;
  penalti: number;
}

export type PlayerAttributes = OutfieldAttributes | GoalkeeperAttributes;

export function isGoalkeeperAttributes(
  att: PlayerAttributes,
): att is GoalkeeperAttributes {
  return 'reflexo' in att;
}

export interface Player {
  id: string;
  editionId: string;
  /** Nome completo bruto (concatenação direta da planilha) — para exibição, ver `naming.ts`. */
  name: string;
  /** Coluna "Nome" da planilha-fonte. */
  firstName: string;
  /** Coluna "Sobrenome/Apelido" da planilha-fonte — pode repetir `firstName` (jogador de um
   *  nome só, ex. Pelé/Zico) ou ficar vazia. */
  lastName: string;
  shirtNumber: number | null;
  numberOfficial: boolean;
  position: Position;
  nationality: string;
  star: boolean;
  clutch: boolean;
  overall: number;
  att: PlayerAttributes;
}

export interface Coach {
  id: string;
  name: string;
  nationality: string;
  star: boolean;
  overall: number;
  naturalStyle: TacticalStyle;
}

export type TacticalStyle = 'defensivo' | 'equilibrado' | 'ofensivo';

export interface Edition {
  id: string;
  year: number;
  club: string;
  country: string;
  coachId: string;
  titleNumber: number;
  flavorText?: string;
  provisional: boolean;
}

export interface SeedDataset {
  editions: Edition[];
  players: Player[];
  coaches: Coach[];
}
