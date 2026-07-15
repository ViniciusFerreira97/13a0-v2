// Estatísticas agregadas de uma partida simulada — gols (com tipo), cartões, finalizações e
// uma nota 0–10 por jogador. Não faz parte do motor de simulação em si (não influencia o
// resultado); é só leitura derivada de `MatchResult.events` para exibição.

import type { MatchEvent, MatchEventType } from './events';
import type { MatchResult } from './match';
import type { Player } from './types';

export type GoalKind = 'jogada' | 'penalti' | 'falta';

export interface GoalEntry {
  minute: number;
  teamId: 'home' | 'away';
  playerId: string;
  kind: GoalKind;
}

export interface TeamStatLine {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  yellow: number;
  red: number;
  offsides: number;
  penaltiesAwarded: number;
  penaltiesScored: number;
}

export interface PlayerStatLine {
  playerId: string;
  teamId: 'home' | 'away';
  goals: number;
  yellow: number;
  red: number;
  saves: number;
  tackles: number;
  goalsConceded: number;
  rating: number;
}

export interface MatchStats {
  home: TeamStatLine;
  away: TeamStatLine;
  goals: GoalEntry[];
  players: PlayerStatLine[];
}

const SHOT_EVENTS = new Set<MatchEventType>(['goal', 'shot_saved', 'shot_blocked', 'shot_wide']);
const ON_TARGET_EVENTS = new Set<MatchEventType>(['goal', 'shot_saved']);

function emptyTeamLine(): TeamStatLine {
  return { goals: 0, shots: 0, shotsOnTarget: 0, fouls: 0, yellow: 0, red: 0, offsides: 0, penaltiesAwarded: 0, penaltiesScored: 0 };
}

function goalKindOf(events: MatchEvent[], index: number): GoalKind {
  const prev = events[index - 1];
  const cur = events[index];
  if (prev && prev.playerId === cur.playerId) {
    if (prev.type === 'penalty_scored') return 'penalti';
    if (prev.type === 'free_kick_goal') return 'falta';
  }
  return 'jogada';
}

function computeRating(p: Omit<PlayerStatLine, 'rating'>): number {
  let r = 6.0;
  r += p.goals * 1.2;
  r += p.saves * 0.25;
  r += p.tackles * 0.15;
  r -= p.yellow * 0.4;
  r -= p.red * 1.3;
  r -= p.goalsConceded * 0.3;
  return Math.max(4, Math.min(9.8, Math.round(r * 10) / 10));
}

export function computeMatchStats(result: MatchResult, homeLineup: Player[], awayLineup: Player[]): MatchStats {
  const home = emptyTeamLine();
  const away = emptyTeamLine();
  const goals: GoalEntry[] = [];

  const homeGk = homeLineup.find((p) => p.position === 'GK');
  const awayGk = awayLineup.find((p) => p.position === 'GK');

  const players = new Map<string, Omit<PlayerStatLine, 'rating'>>();
  for (const p of homeLineup) players.set(p.id, { playerId: p.id, teamId: 'home', goals: 0, yellow: 0, red: 0, saves: 0, tackles: 0, goalsConceded: 0 });
  for (const p of awayLineup) players.set(p.id, { playerId: p.id, teamId: 'away', goals: 0, yellow: 0, red: 0, saves: 0, tackles: 0, goalsConceded: 0 });

  function stat(id: string | undefined, teamId: 'home' | 'away'): Omit<PlayerStatLine, 'rating'> | undefined {
    if (!id) return undefined;
    if (!players.has(id)) players.set(id, { playerId: id, teamId, goals: 0, yellow: 0, red: 0, saves: 0, tackles: 0, goalsConceded: 0 });
    return players.get(id);
  }

  const events = result.events;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const t = e.teamId === 'home' ? home : away;

    if (SHOT_EVENTS.has(e.type)) {
      t.shots++;
      if (ON_TARGET_EVENTS.has(e.type)) t.shotsOnTarget++;
    }

    switch (e.type) {
      case 'goal': {
        t.goals++;
        const kind = goalKindOf(events, i);
        if (e.playerId) {
          goals.push({ minute: e.minute, teamId: e.teamId, playerId: e.playerId, kind });
          const p = stat(e.playerId, e.teamId);
          if (p) p.goals++;
        }
        const concedingGk = e.teamId === 'home' ? awayGk : homeGk;
        const concedingTeam = e.teamId === 'home' ? 'away' : 'home';
        if (concedingGk) {
          const p = stat(concedingGk.id, concedingTeam);
          if (p) p.goalsConceded++;
        }
        break;
      }
      case 'penalty_scored':
        t.penaltiesScored++;
        break;
      case 'penalty_awarded':
        t.penaltiesAwarded++;
        break;
      case 'foul':
        t.fouls++;
        break;
      case 'offside':
        t.offsides++;
        break;
      case 'yellow_card': {
        t.yellow++;
        const p = stat(e.playerId, e.teamId);
        if (p) p.yellow++;
        break;
      }
      case 'red_card':
      case 'second_yellow': {
        t.red++;
        const p = stat(e.playerId, e.teamId);
        if (p) p.red++;
        break;
      }
      case 'shot_saved': {
        const gkTeam = e.teamId === 'home' ? 'away' : 'home';
        const p = stat(e.assistPlayerId, gkTeam);
        if (p) p.saves++;
        stat(e.playerId, e.teamId);
        break;
      }
      case 'shot_blocked':
      case 'shot_wide':
        stat(e.playerId, e.teamId);
        break;
      case 'clean_tackle': {
        const p = stat(e.playerId, e.teamId);
        if (p) p.tackles++;
        break;
      }
    }
  }

  return {
    home,
    away,
    goals,
    players: [...players.values()].map((p) => ({ ...p, rating: computeRating(p) })),
  };
}
