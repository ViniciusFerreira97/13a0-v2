// Tipos de evento gerados pelo motor a cada tick (§5.1, §5.5–§5.9).

export type MatchEventType =
  | 'kickoff'
  | 'sterile_possession'
  | 'clean_tackle'
  | 'foul'
  | 'offside'
  | 'shot_saved'
  | 'shot_blocked'
  | 'shot_wide'
  | 'goal'
  | 'yellow_card'
  | 'second_yellow'
  | 'red_card'
  | 'penalty_awarded'
  | 'penalty_scored'
  | 'penalty_missed'
  | 'free_kick_goal'
  | 'substitution'
  | 'half_time'
  | 'full_time'
  | 'extra_time_start'
  | 'shootout_kick';

export interface MatchEvent {
  type: MatchEventType;
  minute: number;
  teamId: 'home' | 'away';
  playerId?: string;
  assistPlayerId?: string;
  /** Chave para o pool de narração (§narration) — resolvida por locale na UI, não aqui. */
  narrationKey: string;
}

export interface MatchScoreState {
  home: number;
  away: number;
}
