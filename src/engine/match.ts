// Loop de ticks do motor de partida (§5). Determinístico: mesma seed + mesmas escalações
// e estilos → mesmo resultado, bit-a-bit (replay compartilhável e anti-cheat no servidor, §8.2).

import type { Coach, Player, TacticalStyle } from './types.js';
import type { MatchEvent, MatchEventType } from './events.js';
import { Rng } from './rng.js';
import { clamp, sigma } from './math.js';
import { computeZoneRatings, applyZoneModifiers, type ZoneRatings } from './ratings.js';
import { outfieldAttrs } from './attrs.js';
import { pickBallCarrier, pickTackler, outfieldOnPitch, goalkeeperOnPitch } from './positionWeights.js';
import { pickChanceType, resolveOffside, type ChanceType } from './chances.js';
import { resolveShot, resolveDirectFreeKick, resolvePenalty, pickFreeKickTaker, pickPenaltyTaker } from './shooting.js';
import { aggressiveness, resolveCardSeverity } from './cards.js';
import { starBoost, type MatchPhase } from './clutch.js';

const TOTAL_TICKS = 110;
const MINUTES_PER_TICK = 90 / TOTAL_TICKS;
const EXTRA_TIME_TICKS = 30;
const EXTRA_TIME_MINUTES_PER_TICK = 30 / EXTRA_TIME_TICKS;

export interface TeamSetup {
  side: 'home' | 'away';
  lineup: Player[]; // 11 titulares (1 GK + 10 de linha)
  coach: Coach;
  style: TacticalStyle;
}

export interface MatchOptions {
  seed: string;
  /** Mata-mata: empate após 90' vai para prorrogação + pênaltis. Fase de grupos: termina em empate. */
  knockout: boolean;
}

export interface PenaltyKick {
  round: number;
  teamId: 'home' | 'away';
  playerId: string;
  scored: boolean;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  wentToPenalties: boolean;
  penaltyScore?: { home: number; away: number };
  /** Cobrança a cobrança da disputa (§5.9) — não duplicada em `events` (ver runShootout). */
  penaltyKicks?: PenaltyKick[];
  events: MatchEvent[];
}

interface TeamRuntime {
  side: 'home' | 'away';
  onPitch: Player[];
  coach: Coach;
  style: TacticalStyle;
  score: number;
  yellow: Map<string, number>;
  sentOff: Set<string>;
  lastGoalMinute: number | null;
  lastConcededMinute: number | null;
}

interface EventSink {
  events: MatchEvent[];
  minute: number;
}

function pushEvent(
  sink: EventSink,
  type: MatchEventType,
  side: 'home' | 'away',
  playerId?: string,
  assistPlayerId?: string,
) {
  sink.events.push({ type, minute: sink.minute, teamId: side, playerId, assistPlayerId, narrationKey: type });
}

function initRuntime(setup: TeamSetup): TeamRuntime {
  return {
    side: setup.side,
    onPitch: setup.lineup,
    coach: setup.coach,
    style: setup.style,
    score: 0,
    yellow: new Map(),
    sentOff: new Set(),
    lastGoalMinute: null,
    lastConcededMinute: null,
  };
}

function eraChemistryTrios(onPitch: Player[]): number {
  const counts = new Map<string, number>();
  for (const p of onPitch) counts.set(p.editionId, (counts.get(p.editionId) ?? 0) + 1);
  let trios = 0;
  for (const c of counts.values()) trios += Math.floor(c / 3);
  return trios;
}

function fatigueFactor(style: TacticalStyle, minute: number): number {
  if (style !== 'ofensivo' || minute <= 60) return 1;
  return clamp(1 - 0.0015 * (minute - 60), 0.85, 1);
}

function momentumFactor(team: TeamRuntime, minute: number): number {
  let factor = 1;
  if (team.lastConcededMinute != null && minute - team.lastConcededMinute <= 10) factor *= 0.97;
  if (team.lastGoalMinute != null && minute - team.lastGoalMinute <= 8) factor *= 1.03;
  return factor;
}

function buildZones(team: TeamRuntime, minute: number): ZoneRatings {
  return applyZoneModifiers(computeZoneRatings(team.onPitch), {
    style: team.style,
    coach: team.coach,
    eraChemistryTrios: eraChemistryTrios(team.onPitch),
    fatigueFactor: fatigueFactor(team.style, minute),
    momentumFactor: momentumFactor(team, minute),
  });
}

function registerGoal(sink: EventSink, scoring: TeamRuntime, conceding: TeamRuntime, playerId: string) {
  scoring.score++;
  scoring.lastGoalMinute = sink.minute;
  conceding.lastConcededMinute = sink.minute;
  pushEvent(sink, 'goal', scoring.side, playerId);
}

interface PossessionCtx {
  rng: Rng;
  sink: EventSink;
  phase: MatchPhase;
  attacking: TeamRuntime;
  defending: TeamRuntime;
  attackingOnPitch: Player[];
  defendingOnPitch: Player[];
  attackingZones: ZoneRatings;
  defendingZones: ZoneRatings;
}

function resolveChance(ctx: PossessionCtx, forcedType?: ChanceType, afterCleanTackle = false) {
  const type = forcedType ?? pickChanceType({ attackers: ctx.attackingOnPitch, afterCleanTackle }, ctx.rng);
  const shooter = pickBallCarrier(ctx.attackingOnPitch, ctx.rng);
  const shooterAtt = outfieldAttrs(shooter);

  const offside = resolveOffside(
    type,
    shooterAtt.velocidade,
    ctx.defendingZones.linhaVelocidade,
    ctx.attacking.coach.overall,
    ctx.rng,
  );
  if (offside) {
    pushEvent(ctx.sink, 'offside', ctx.attacking.side, shooter.id);
    return;
  }

  const gk = goalkeeperOnPitch(ctx.defending.onPitch);
  if (!gk) return; // segurança: nunca deveria faltar goleiro em campo

  const boost = starBoost(shooter, ctx.phase);
  const outcome = resolveShot(type, shooter, gk, ctx.rng, boost);
  if (outcome === 'goal') {
    registerGoal(ctx.sink, ctx.attacking, ctx.defending, shooter.id);
  } else if (outcome === 'saved') {
    pushEvent(ctx.sink, 'shot_saved', ctx.attacking.side, shooter.id, gk.id);
  } else if (outcome === 'blocked') {
    pushEvent(ctx.sink, 'shot_blocked', ctx.attacking.side, shooter.id);
  } else {
    pushEvent(ctx.sink, 'shot_wide', ctx.attacking.side, shooter.id);
  }
}

const FOUL_ZONES = ['own_third', 'midfield', 'edge_of_box', 'inside_box'] as const;
// Pesos calibrados para bater a meta de pênaltis/partida do §5.10 (o 3% "dentro da área" do
// §5.6 sozinho gera pênaltis demais frente ao volume real de faltas simuladas — ver calibrate.ts).
const FOUL_ZONE_WEIGHTS = [0.565, 0.315, 0.108, 0.012];

function resolveFoul(ctx: PossessionCtx, fouler: Player) {
  pushEvent(ctx.sink, 'foul', ctx.defending.side, fouler.id);

  const alreadyBooked = (ctx.defending.yellow.get(fouler.id) ?? 0) >= 1;
  const agr = aggressiveness(ctx.defending.style, ctx.defending.score - ctx.attacking.score);
  const severity = resolveCardSeverity(fouler, ctx.sink.minute, agr, alreadyBooked, ctx.rng);

  if (severity === 'yellow') {
    ctx.defending.yellow.set(fouler.id, 1);
    pushEvent(ctx.sink, 'yellow_card', ctx.defending.side, fouler.id);
  } else if (severity === 'red') {
    pushEvent(ctx.sink, alreadyBooked ? 'second_yellow' : 'red_card', ctx.defending.side, fouler.id);
    ctx.defending.sentOff.add(fouler.id);
    ctx.defending.onPitch = ctx.defending.onPitch.filter((p) => p.id !== fouler.id);
    ctx.defendingOnPitch = outfieldOnPitch(ctx.defending.onPitch);
  }

  const gk = goalkeeperOnPitch(ctx.defending.onPitch);
  if (!gk) return;

  const zone = ctx.rng.weightedPick([...FOUL_ZONES], FOUL_ZONE_WEIGHTS);

  if (zone === 'inside_box') {
    pushEvent(ctx.sink, 'penalty_awarded', ctx.attacking.side);
    const taker = pickPenaltyTaker(ctx.attackingOnPitch);
    const boost = starBoost(taker, ctx.phase);
    const result = resolvePenalty(taker, gk, ctx.rng, 0, boost);
    if (result === 'goal') {
      pushEvent(ctx.sink, 'penalty_scored', ctx.attacking.side, taker.id);
      registerGoal(ctx.sink, ctx.attacking, ctx.defending, taker.id);
    } else {
      pushEvent(ctx.sink, 'penalty_missed', ctx.attacking.side, taker.id);
    }
  } else if (zone === 'edge_of_box') {
    const taker = pickFreeKickTaker(ctx.attackingOnPitch);
    const boost = starBoost(taker, ctx.phase);
    const outcome = resolveDirectFreeKick(taker, gk, ctx.rng, boost);
    if (outcome === 'goal') {
      pushEvent(ctx.sink, 'free_kick_goal', ctx.attacking.side, taker.id);
      registerGoal(ctx.sink, ctx.attacking, ctx.defending, taker.id);
    }
  } else if (zone === 'midfield') {
    // indireto perto do ataque — só às vezes vira um cruzamento perigoso (§5.6);
    // faltas no campo defensivo (own_third) apenas reiniciam a posse.
    if (ctx.rng.chance(0.25)) resolveChance(ctx, 'cruzamento');
  }
}

function resolvePossession(ctx: PossessionCtx) {
  const carrier = pickBallCarrier(ctx.attackingOnPitch, ctx.rng);
  const others = ctx.attackingOnPitch.filter((p) => p.id !== carrier.id);
  const support = others.length ? pickBallCarrier(others, ctx.rng) : carrier;
  const tackler = pickTackler(ctx.defendingOnPitch, ctx.rng);

  const carrierAtt = outfieldAttrs(carrier);
  const supportAtt = outfieldAttrs(support);
  const tacklerAtt = outfieldAttrs(tackler);

  const qualidadeAtaque = 0.6 * carrierAtt.drible + 0.4 * supportAtt.passe;
  const qualidadeDesarme = 0.6 * tacklerAtt.desarme + 0.4 * tacklerAtt.marcacao;
  // Divisor calibrado acima do valor literal do §5.4 — a versão original tornava o resultado
  // excessivamente determinístico pelo overall em ~110 ticks, achatando a taxa de zebra do §5.10.
  const pDesarmeLimpo = sigma((qualidadeDesarme - qualidadeAtaque) / 46) * 0.42;

  const agr = aggressiveness(ctx.defending.style, ctx.defending.score - ctx.attacking.score);
  // pTentativa/taxaSucesso não são fixados pelo planejamento; taxaSucesso é aproximada pela
  // própria taxa de desarme limpo — uma tentativa de tackle que falha vira falta.
  const pFalta = 0.5 * (1 - pDesarmeLimpo) * agr * 0.55;

  const roll = ctx.rng.next();
  if (roll < pDesarmeLimpo) {
    pushEvent(ctx.sink, 'clean_tackle', ctx.defending.side, tackler.id);
    if (ctx.rng.chance(0.22)) {
      // contra-ataque imediato do time que acabou de recuperar a bola
      resolveChance(
        {
          ...ctx,
          attacking: ctx.defending,
          defending: ctx.attacking,
          attackingOnPitch: ctx.defendingOnPitch,
          defendingOnPitch: ctx.attackingOnPitch,
          attackingZones: ctx.defendingZones,
          defendingZones: ctx.attackingZones,
        },
        'contra_ataque',
        true,
      );
    }
    return;
  }

  if (roll < pDesarmeLimpo + pFalta) {
    resolveFoul(ctx, tackler);
    return;
  }

  const qualityDiff = qualidadeAtaque - qualidadeDesarme;
  const pProgress = clamp(0.2 + sigma(qualityDiff / 30) * 0.18, 0.15, 0.42);
  if (ctx.rng.next() < pProgress) {
    resolveChance(ctx);
    return;
  }

  pushEvent(ctx.sink, 'sterile_possession', ctx.attacking.side);
}

function runTick(rng: Rng, sink: EventSink, home: TeamRuntime, away: TeamRuntime, phase: MatchPhase) {
  const homeOnPitch = outfieldOnPitch(home.onPitch);
  const awayOnPitch = outfieldOnPitch(away.onPitch);
  if (homeOnPitch.length === 0 || awayOnPitch.length === 0) return; // segurança: expulsões em massa

  const homeZones = buildZones(home, sink.minute);
  const awayZones = buildZones(away, sink.minute);

  const pHome = Math.pow(homeZones.meio, 1.6) / (Math.pow(homeZones.meio, 1.6) + Math.pow(awayZones.meio, 1.6));
  const possessingHome = rng.chance(pHome);

  const ctx: PossessionCtx = possessingHome
    ? {
        rng,
        sink,
        phase,
        attacking: home,
        defending: away,
        attackingOnPitch: homeOnPitch,
        defendingOnPitch: awayOnPitch,
        attackingZones: homeZones,
        defendingZones: awayZones,
      }
    : {
        rng,
        sink,
        phase,
        attacking: away,
        defending: home,
        attackingOnPitch: awayOnPitch,
        defendingOnPitch: homeOnPitch,
        attackingZones: awayZones,
        defendingZones: homeZones,
      };

  resolvePossession(ctx);
}

function rankPenaltyTakers(onPitch: Player[]): Player[] {
  return [...onPitch]
    .filter((p) => p.position !== 'GK')
    .sort((a, b) => outfieldAttrs(b).finalizacao - outfieldAttrs(a).finalizacao);
}

/**
 * Cobrança a cobrança da disputa de pênaltis. Não empurra em `sink.events` — a disputa tem
 * exibição própria na UI (destaque especial, §5.9), e misturar com o feed normal também
 * inflaria as estatísticas de "pênaltis convertidos" da partida em si (matchStats.ts).
 */
function runShootout(rng: Rng, home: TeamRuntime, away: TeamRuntime): { home: number; away: number; kicks: PenaltyKick[] } {
  const homeTakers = rankPenaltyTakers(home.onPitch);
  const awayTakers = rankPenaltyTakers(away.onPitch);
  const homeGk = goalkeeperOnPitch(home.onPitch);
  const awayGk = goalkeeperOnPitch(away.onPitch);
  if (!homeGk || !awayGk || homeTakers.length === 0 || awayTakers.length === 0) {
    return { home: 0, away: 0, kicks: [] };
  }

  let homeGoals = 0;
  let awayGoals = 0;
  const kicks: PenaltyKick[] = [];
  for (let round = 1; round <= 20; round++) {
    const pressure = Math.max(0, round - 3);
    const homeTaker = homeTakers[(round - 1) % homeTakers.length];
    const awayTaker = awayTakers[(round - 1) % awayTakers.length];

    const homeResult = resolvePenalty(homeTaker, awayGk, rng, pressure);
    if (homeResult === 'goal') homeGoals++;
    kicks.push({ round, teamId: 'home', playerId: homeTaker.id, scored: homeResult === 'goal' });

    const awayResult = resolvePenalty(awayTaker, homeGk, rng, pressure);
    if (awayResult === 'goal') awayGoals++;
    kicks.push({ round, teamId: 'away', playerId: awayTaker.id, scored: awayResult === 'goal' });

    if (round >= 5 && homeGoals !== awayGoals) break;
  }
  return { home: homeGoals, away: awayGoals, kicks };
}

export function simulateMatch(homeSetup: TeamSetup, awaySetup: TeamSetup, options: MatchOptions): MatchResult {
  const rng = new Rng(options.seed);
  const home = initRuntime(homeSetup);
  const away = initRuntime(awaySetup);
  const sink: EventSink = { events: [], minute: 0 };

  pushEvent(sink, 'kickoff', 'home');

  for (let t = 1; t <= TOTAL_TICKS; t++) {
    sink.minute = Math.round(t * MINUTES_PER_TICK);
    runTick(rng, sink, home, away, { knockout: options.knockout, minute: sink.minute, extraTime: false });
  }
  sink.minute = 90;
  pushEvent(sink, 'full_time', 'home');

  let wentToPenalties = false;
  let penaltyScore: { home: number; away: number } | undefined;
  let penaltyKicks: PenaltyKick[] | undefined;

  if (options.knockout && home.score === away.score) {
    pushEvent(sink, 'extra_time_start', 'home');
    for (let t = 1; t <= EXTRA_TIME_TICKS; t++) {
      sink.minute = 90 + Math.round(t * EXTRA_TIME_MINUTES_PER_TICK);
      runTick(rng, sink, home, away, { knockout: true, minute: sink.minute, extraTime: true });
    }
    if (home.score === away.score) {
      wentToPenalties = true;
      const shootout = runShootout(rng, home, away);
      penaltyScore = { home: shootout.home, away: shootout.away };
      penaltyKicks = shootout.kicks;
    }
  }

  return {
    homeScore: home.score,
    awayScore: away.score,
    wentToPenalties,
    penaltyScore,
    penaltyKicks,
    events: sink.events,
  };
}
