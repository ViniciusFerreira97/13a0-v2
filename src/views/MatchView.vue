<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faFutbol, faSquare, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useDatasetStore } from '../stores/datasetStore';
import { useMatchStore, computeGroupStandings, type CampaignRound } from '../stores/matchStore';
import { narrate } from '../narration';
import { formatPlayerNameFull } from '../engine/naming';
import { computeMatchStats, type GoalKind } from '../engine/matchStats';
import { getClubColors, clubInitials, getContrastText } from '../engine/clubColors';
import {
  soundEnabled,
  toggleSound,
  playKickoffWhistle,
  playFullTimeWhistle,
  playFoulWhistle,
  playGoalHorn,
  playBoo,
  playCardBuzz,
  playTick,
} from '../composables/useSound';
import type { MatchEventType } from '../engine/events';
import type { Position } from '../engine/types';

const dataset = useDatasetStore();
const match = useMatchStore();
const router = useRouter();
const { t } = useI18n();

const playedRound = ref<CampaignRound | null>(null);
const simulating = ref(false);
const visibleCount = ref(0);
const revealing = ref(false);
const feedEl = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

type Speed = 'normal' | 'fast' | 'ultra';
const SPEEDS: { id: Speed; delay: number }[] = [
  { id: 'normal', delay: 420 },
  { id: 'fast', delay: 160 },
  { id: 'ultra', delay: 40 },
];
const speed = ref<Speed>('normal');
const currentDelay = computed(() => SPEEDS.find((s) => s.id === speed.value)!.delay);

const NEUTRAL_EVENTS = new Set<MatchEventType>(['kickoff', 'half_time', 'full_time', 'extra_time_start']);

function roundLabel(id: CampaignRound['id']): string {
  return t(`match.rounds.${id}`);
}

/** `match.currentIndex` já avança assim que a partida é simulada, antes do lance a lance
 *  terminar de revelar — então a rodada "em foco" na lateral precisa seguir a que está sendo
 *  assistida (playedRound), não o índice já incrementado no store. */
const activeRoundId = computed(() => playedRound.value?.id ?? match.currentRound?.id);

const opponentEdition = computed(() => {
  if (!playedRound.value) return null;
  return dataset.editions.find((e) => e.id === playedRound.value!.opponentEditionId) ?? null;
});

const CARD_TYPES = new Set<MatchEventType>(['yellow_card', 'red_card', 'second_yellow']);

const narratedEvents = computed(() => {
  if (!playedRound.value?.result) return [];
  const events = playedRound.value.result.events;
  return events
    .filter((e, i) => {
      if (e.type === 'sterile_possession') return false;
      // a maioria das faltas não rende cartão nem lance — narrar todas vira "falta de X, falta
      // de X" repetitivo no feed. Só mantemos a falta quando ela puxa um cartão logo em seguida.
      if (e.type === 'foul') return CARD_TYPES.has(events[i + 1]?.type);
      return true;
    })
    .map((e) => ({
      minute: e.minute,
      type: e.type,
      teamId: e.teamId,
      text: narrate(e, dataset.playersById, 'pt-BR') || e.type,
    }));
});

const visibleEvents = computed(() => narratedEvents.value.slice(0, visibleCount.value));

/** Placar acompanhando só o que já foi revelado — o resultado final só aparece ao fim do lance a lance. */
const liveScore = computed(() => {
  let home = 0;
  let away = 0;
  for (const e of visibleEvents.value) {
    if (GOAL_EVENTS.has(e.type)) {
      if (e.teamId === 'home') home++;
      else away++;
    }
  }
  return { home, away };
});

/** Classificação exibida: enquanto a rodada de grupo do jogador está sendo revelada lance a
 *  lance, a linha dele usa o placar AO VIVO (liveScore), não o resultado final já decidido —
 *  senão a tabela entregaria o resultado antes da hora, no meio da narração. */
const displayedStandings = computed(() => {
  const revealingRound = revealing.value ? playedRound.value : null;
  if (!revealingRound || revealingRound.knockout) return match.groupStandings;

  const groupRounds = match.rounds.filter((r) => !r.knockout);
  const liveRounds = groupRounds.map((r) => {
    if (r.id !== revealingRound.id || !r.result) return r;
    return { ...r, result: { ...r.result, homeScore: liveScore.value.home, awayScore: liveScore.value.away } };
  });
  return computeGroupStandings(liveRounds, match.otherGroupMatches);
});

function eventSide(e: { type: MatchEventType; teamId: 'home' | 'away' }): 'home' | 'away' | 'neutral' {
  return NEUTRAL_EVENTS.has(e.type) ? 'neutral' : e.teamId;
}

/** Esconde o placar da rodada em andamento na lateral enquanto o lance a lance ainda não
 *  terminou de revelar — senão o resultado "vaza" antes da hora. */
function scoreVisible(r: CampaignRound): boolean {
  if (!r.result) return false;
  if (revealing.value && playedRound.value && r.id === playedRound.value.id) return false;
  return true;
}

const GOAL_EVENTS = new Set<MatchEventType>(['goal', 'penalty_scored', 'free_kick_goal']);
function isGoalEvent(type: MatchEventType) {
  return GOAL_EVENTS.has(type);
}
function isYellowEvent(type: MatchEventType) {
  return type === 'yellow_card';
}
function isRedEvent(type: MatchEventType) {
  return type === 'red_card' || type === 'second_yellow';
}

const stats = computed(() => {
  const r = playedRound.value;
  if (!r?.result || !r.homeLineup || !r.awayLineup) return null;
  return computeMatchStats(r.result, r.homeLineup, r.awayLineup);
});

function goalKindLabel(kind: GoalKind): string {
  return kind === 'jogada' ? '' : t(`match.goalKind.${kind}`);
}

interface ShootoutRound {
  round: number;
  home?: { playerId: string; scored: boolean };
  away?: { playerId: string; scored: boolean };
}

const shootoutRounds = computed<ShootoutRound[]>(() => {
  const kicks = playedRound.value?.result?.penaltyKicks;
  if (!kicks) return [];
  const byRound = new Map<number, ShootoutRound>();
  for (const k of kicks) {
    const r = byRound.get(k.round) ?? { round: k.round };
    r[k.teamId] = { playerId: k.playerId, scored: k.scored };
    byRound.set(k.round, r);
  }
  return [...byRound.values()].sort((a, b) => a.round - b.round);
});

const statRows = computed(() =>
  stats.value
    ? [
        { labelKey: 'match.shots', home: stats.value.home.shots, away: stats.value.away.shots },
        { labelKey: 'match.shotsOnTarget', home: stats.value.home.shotsOnTarget, away: stats.value.away.shotsOnTarget },
        { labelKey: 'match.fouls', home: stats.value.home.fouls, away: stats.value.away.fouls },
        { labelKey: 'match.offsides', home: stats.value.home.offsides, away: stats.value.away.offsides },
      ]
    : [],
);

function playerLabel(id: string): string {
  const p = dataset.playersById.get(id);
  return p ? formatPlayerNameFull(p) : '?';
}

// GK → defesa → meio → ataque, a ordem que qualquer escalação é lida.
const POSITION_ORDER: Record<Position, number> = {
  GK: 0,
  ZAG: 1,
  LD: 2,
  LE: 2,
  VOL: 3,
  MC: 3,
  MEI: 4,
  MD: 4,
  ME: 4,
  PD: 5,
  PE: 5,
  SA: 5,
  CA: 5,
};

function positionRank(playerId: string): number {
  const position = dataset.playersById.get(playerId)?.position;
  return position ? POSITION_ORDER[position] : 99;
}

const homeRatings = computed(() =>
  (stats.value?.players.filter((p) => p.teamId === 'home') ?? []).sort(
    (a, b) => positionRank(a.playerId) - positionRank(b.playerId),
  ),
);
const awayRatings = computed(() =>
  (stats.value?.players.filter((p) => p.teamId === 'away') ?? []).sort(
    (a, b) => positionRank(a.playerId) - positionRank(b.playerId),
  ),
);

function soundFor(type: MatchEventType, teamId: 'home' | 'away') {
  switch (type) {
    case 'goal':
    case 'penalty_scored':
    case 'free_kick_goal':
      // comemoração só quando é o time do jogador — do contrário, vaia.
      if (teamId === 'home') playGoalHorn();
      else playBoo();
      break;
    case 'yellow_card':
      playCardBuzz('yellow');
      break;
    case 'red_card':
    case 'second_yellow':
      playCardBuzz('red');
      break;
    case 'foul':
    case 'offside':
    case 'penalty_awarded':
      playFoulWhistle();
      break;
    case 'kickoff':
      playKickoffWhistle();
      break;
    case 'full_time':
    case 'extra_time_start':
      playFullTimeWhistle();
      break;
    default:
      playTick();
  }
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
  }
}

function revealNext() {
  const total = narratedEvents.value.length;
  if (visibleCount.value >= total) {
    revealing.value = false;
    return;
  }
  const ev = narratedEvents.value[visibleCount.value];
  soundFor(ev.type, ev.teamId);
  visibleCount.value++;
  if (visibleCount.value < total) {
    timer = setTimeout(revealNext, currentDelay.value);
  } else {
    revealing.value = false;
  }
}

function simulate() {
  simulating.value = true;
  const round = match.playCurrentRound();
  playedRound.value = round;
  simulating.value = false;
  visibleCount.value = 0;
  revealing.value = true;
  revealNext();
}

function skipReveal() {
  clearTimer();
  visibleCount.value = narratedEvents.value.length;
  revealing.value = false;
}

function next() {
  clearTimer();
  playedRound.value = null;
  if (match.isCampaignOver) router.push('/result');
}

watch(visibleCount, () => {
  nextTick(() => {
    if (feedEl.value) feedEl.value.scrollTop = feedEl.value.scrollHeight;
  });
});

onUnmounted(clearTimer);

function bannerStyle(club: string) {
  const c = getClubColors(club);
  return { background: c.primary, color: getContrastText(c.primary) };
}

function standingClub(editionId: string): string {
  return dataset.editions.find((e) => e.id === editionId)?.club ?? '?';
}
</script>

<template>
  <main class="screen screen-wide">
    <div v-if="!match.rounds.length" class="empty">
      <p>{{ t('match.noCampaign') }}</p>
      <button class="btn btn-primary" @click="router.push('/draft')">{{ t('match.goToDraft') }}</button>
    </div>

    <div v-else class="two-col match-live">
      <div class="sidebar">
        <div class="side-col side-top">
          <button class="btn btn-ghost btn-block sound-toggle" @click="toggleSound">
            {{ soundEnabled ? t('match.soundOn') : t('match.soundOff') }}
          </button>
        </div>

        <div class="side-col side-bottom">
          <ol class="rounds">
            <li
              v-for="r in match.rounds"
              :key="r.id"
              class="round-item"
              :class="{ done: scoreVisible(r), won: scoreVisible(r) && match.wonRound(r), active: r.id === activeRoundId }"
            >
              <span class="round-label">{{ roundLabel(r.id) }}</span>
              <span v-if="scoreVisible(r)" class="round-score">{{ r.result!.homeScore }}×{{ r.result!.awayScore }}</span>
            </li>
          </ol>

          <div v-if="displayedStandings.length" class="standings card">
            <span class="eyebrow">{{ t('match.standings.title') }}</span>
            <div class="standings-row header">
              <span class="pos"></span>
              <span class="team">{{ t('match.standings.team') }}</span>
              <span class="num">{{ t('match.standings.points') }}</span>
              <span class="num">{{ t('match.standings.goalDiff') }}</span>
            </div>
            <div
              v-for="(row, i) in displayedStandings"
              :key="row.id"
              class="standings-row"
              :class="{ me: row.id === 'player', qualified: i === 0 }"
            >
              <span class="pos">{{ i + 1 }}</span>
              <span class="team">{{ row.id === 'player' ? t('match.standings.you') : standingClub(row.id) }}</span>
              <span class="num">{{ row.points }}</span>
              <span class="num">{{ row.goalsFor - row.goalsAgainst > 0 ? '+' : '' }}{{ row.goalsFor - row.goalsAgainst }}</span>
            </div>
            <p class="standings-hint">{{ t('match.standings.qualifyHint') }}</p>
          </div>
        </div>
      </div>

      <div class="main-col">
        <section v-if="!playedRound && !match.isCampaignOver" class="stage card">
          <h2>{{ roundLabel(match.currentRound!.id) }}</h2>
          <button class="btn btn-primary btn-block" :disabled="simulating" @click="simulate">{{ $t('match.live') }}</button>
        </section>

        <section v-else-if="playedRound" class="stage">
          <button class="btn btn-primary btn-block" :disabled="revealing" @click="next">
            {{ match.isCampaignOver ? t('match.viewFinalResult') : t('match.nextMatch') }}
          </button>

          <div class="scoreboard card">
            <div class="teams">
              <div class="team">
                <span class="crest home-crest">{{ t('match.youBadge') }}</span>
                <span class="team-name">{{ t('match.yourTeam') }}</span>
              </div>
              <div class="score-box">
                <span class="score">{{ liveScore.home }} × {{ liveScore.away }}</span>
                <span v-if="revealing" class="live-dot">● {{ t('match.liveDot') }}</span>
                <span v-else-if="playedRound.result!.wentToPenalties" class="hint">
                  {{ t('match.penaltyScore', { home: playedRound.result!.penaltyScore!.home, away: playedRound.result!.penaltyScore!.away }) }}
                </span>
              </div>
              <div class="team">
                <span class="team-name">{{ opponentEdition ? `${opponentEdition.club} ${opponentEdition.year}` : '' }}</span>
                <span v-if="opponentEdition" class="crest" :style="bannerStyle(opponentEdition.club)">
                  {{ clubInitials(opponentEdition.club) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="revealing" class="reveal-controls">
            <div class="chip-row">
              <button
                v-for="s in SPEEDS"
                :key="s.id"
                class="pill"
                :class="{ filled: speed === s.id }"
                @click="speed = s.id"
              >
                {{ t(`match.speeds.${s.id}`) }}
              </button>
            </div>
            <button class="btn btn-ghost btn-block" @click="skipReveal">⏭ {{ t('match.skipReveal') }}</button>
          </div>

          <ul ref="feedEl" class="feed">
            <li v-for="(e, i) in visibleEvents" :key="i" class="feed-item" :class="[e.type, eventSide(e)]">
              <span class="minute">{{ e.minute }}'</span>
              <FontAwesomeIcon v-if="isGoalEvent(e.type)" :icon="faFutbol" class="icon-ball" />
              <FontAwesomeIcon v-else-if="isYellowEvent(e.type)" :icon="faSquare" class="icon-card icon-card-yellow" />
              <FontAwesomeIcon v-else-if="isRedEvent(e.type)" :icon="faSquare" class="icon-card icon-card-red" />
              <span class="feed-text">{{ e.text }}</span>
            </li>
          </ul>

          <div v-if="!revealing && shootoutRounds.length" class="shootout card">
            <h3>⚡ {{ t('match.shootoutTitle') }}</h3>
            <p class="shootout-score">
              {{ playedRound.result!.penaltyScore!.home }} <span class="dash">—</span> {{ playedRound.result!.penaltyScore!.away }}
            </p>
            <div class="shootout-rounds">
              <div v-for="r in shootoutRounds" :key="r.round" class="shootout-round">
                <div class="kick home">
                  <span v-if="r.home" class="kick-name">{{ playerLabel(r.home.playerId) }}</span>
                  <FontAwesomeIcon
                    v-if="r.home"
                    :icon="r.home.scored ? faCheck : faXmark"
                    class="kick-icon"
                    :class="r.home.scored ? 'ok' : 'miss'"
                  />
                </div>
                <span class="round-num">{{ r.round }}</span>
                <div class="kick away">
                  <FontAwesomeIcon
                    v-if="r.away"
                    :icon="r.away.scored ? faCheck : faXmark"
                    class="kick-icon"
                    :class="r.away.scored ? 'ok' : 'miss'"
                  />
                  <span v-if="r.away" class="kick-name">{{ playerLabel(r.away.playerId) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!revealing && stats" class="stats card">
            <h3>{{ t('match.stats') }}</h3>
            <div class="stat-row" v-for="row in statRows" :key="row.labelKey">
              <span class="stat-value">{{ row.home }}</span>
              <span class="stat-label">{{ t(row.labelKey) }}</span>
              <span class="stat-value">{{ row.away }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">{{ stats.home.yellow }}</span>
              <span class="stat-label"><FontAwesomeIcon :icon="faSquare" class="icon-card icon-card-yellow" /> {{ t('match.yellowCards') }}</span>
              <span class="stat-value">{{ stats.away.yellow }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-value">{{ stats.home.red }}</span>
              <span class="stat-label"><FontAwesomeIcon :icon="faSquare" class="icon-card icon-card-red" /> {{ t('match.redCards') }}</span>
              <span class="stat-value">{{ stats.away.red }}</span>
            </div>

            <template v-if="stats.goals.length">
              <h3>{{ t('match.goals') }}</h3>
              <ul class="goal-list">
                <li v-for="(g, i) in stats.goals" :key="i" :class="g.teamId">
                  <FontAwesomeIcon :icon="faFutbol" class="icon-ball" />
                  <span class="goal-text">{{ g.minute }}' {{ playerLabel(g.playerId) }}</span>
                  <span class="goal-kind">{{ goalKindLabel(g.kind) }}</span>
                </li>
              </ul>
            </template>

            <h3>{{ t('match.ratings') }}</h3>
            <div class="ratings-cols">
              <ul class="rating-list">
                <li v-for="p in homeRatings" :key="p.playerId">
                  <span class="rating-name">{{ playerLabel(p.playerId) }}</span>
                  <span class="rating-badge" :class="{ high: p.rating >= 7.5, low: p.rating < 5.5 }">{{ p.rating.toFixed(1) }}</span>
                </li>
              </ul>
              <ul class="rating-list">
                <li v-for="p in awayRatings" :key="p.playerId">
                  <span class="rating-name">{{ playerLabel(p.playerId) }}</span>
                  <span class="rating-badge" :class="{ high: p.rating >= 7.5, low: p.rating < 5.5 }">{{ p.rating.toFixed(1) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section v-else class="stage card center">
          <h2>{{ match.glory ? t('match.gloryFullTime') : t('match.campaignOver') }}</h2>
          <button class="btn btn-primary btn-block" @click="router.push('/result')">{{ $t('match.fullTime') }}</button>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  padding-top: 3rem;
}

/* No mobile (1 coluna), a disputa da partida (main-col) fica logo abaixo do CTA de som,
   antes dos detalhes das rodadas e da classificação do grupo — o wrapper ".sidebar" "some" da
   árvore de layout (display: contents) pra isso, deixando side-top/main-col/side-bottom como
   itens diretos e reordenáveis do grid. Em telas largas o wrapper volta a ser uma coluna
   normal — som e rodadas/classificação empilhados à esquerda, como antes. */
.match-live .sidebar {
  display: contents;
}

.match-live .side-top {
  order: 1;
}

.match-live .main-col {
  order: 2;
}

.match-live .side-bottom {
  order: 3;
}

@media (min-width: 860px) {
  .match-live .sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: sticky;
    top: 1.5rem;
  }

  .match-live .side-col.side-top,
  .match-live .side-col.side-bottom {
    position: static;
  }

  .match-live .side-top,
  .match-live .main-col,
  .match-live .side-bottom {
    order: 0;
  }
}

.sound-toggle {
  margin-bottom: 0.75rem;
}

.rounds {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.standings {
  padding: 0.85rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.standings .eyebrow {
  margin-bottom: 0.15rem;
}

.standings-row {
  display: grid;
  grid-template-columns: 1.4rem 1fr 2.2rem 2.2rem;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0;
  font-size: 0.82rem;
  border-bottom: 1px solid var(--border);
}

.standings-row:last-child {
  border-bottom: none;
}

.standings-row.header {
  color: var(--text-muted);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 800;
  border-bottom: 1.5px solid var(--text);
}

.standings-row .pos {
  font-family: var(--numeral);
  color: var(--text-muted);
}

.standings-row .team {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.standings-row .num {
  font-family: var(--numeral);
  font-weight: 700;
  text-align: right;
}

.standings-row.qualified {
  border-bottom: 2px solid var(--gold);
}

.standings-row.me {
  background: color-mix(in srgb, var(--pitch) 12%, transparent);
  font-weight: 700;
}

.standings-row.me .team {
  color: var(--text);
}

.standings-hint {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.round-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.85rem;
  border-radius: 0.4rem;
  border: 1.5px solid var(--border);
  color: var(--text-muted);
  font-size: 0.88rem;
}

.round-item.done {
  color: var(--text);
}

.round-item.won {
  border-color: var(--pitch);
}

.round-item.active {
  position: relative;
  border: 2px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 14%, var(--surface));
  color: var(--text);
  font-weight: 800;
  box-shadow: var(--shadow-sm);
}

.round-item.active .round-label::before {
  content: '▸ ';
  color: var(--gold);
}

.round-score {
  font-family: var(--numeral);
  font-weight: 700;
}

.stage {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stage.card {
  padding: 1.25rem;
  text-align: center;
}

.stage.card h2 {
  margin-bottom: 0.5rem;
}

.stage.center {
  align-items: center;
}

.scoreboard {
  padding: 1rem 1.1rem;
}

.teams {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.team {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.team-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.crest {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 2px solid var(--text);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--display);
  font-size: 0.65rem;
  flex-shrink: 0;
}

.home-crest {
  background: var(--pitch);
  color: #fff;
}

.score-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  flex-shrink: 0;
}

.score {
  font-family: var(--numeral);
  font-size: 1.9rem;
  font-weight: 700;
}

.live-dot {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--danger);
}

.hint {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.reveal-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reveal-controls .chip-row {
  display: flex;
  gap: 0.4rem;
  justify-content: center;
}

.feed {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 26rem;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.feed-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.7rem;
  border-radius: 0.6rem;
  background: var(--surface-2);
  font-size: 0.9rem;
  animation: pop-in 0.2s ease;
  max-width: 82%;
  min-width: 0;
}

.feed-text {
  min-width: 0;
  overflow-wrap: break-word;
}

.feed-item.home {
  align-self: flex-start;
}

.feed-item.away {
  align-self: flex-end;
  flex-direction: row-reverse;
  text-align: right;
}

.feed-item.neutral {
  align-self: center;
  max-width: 65%;
  justify-content: center;
  background: transparent;
  border: 1px dashed var(--border);
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.feed-item.goal,
.feed-item.penalty_scored,
.feed-item.free_kick_goal {
  background: color-mix(in srgb, var(--pitch) 18%, var(--surface-2));
  font-weight: 700;
}

.feed-item.away.goal,
.feed-item.away.penalty_scored,
.feed-item.away.free_kick_goal {
  background: color-mix(in srgb, var(--danger) 14%, var(--surface-2));
}

.feed-item.red_card,
.feed-item.second_yellow {
  background: color-mix(in srgb, var(--danger) 18%, var(--surface-2));
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.minute {
  flex-shrink: 0;
  font-family: var(--numeral);
  font-weight: 700;
  color: var(--pitch);
  width: 2.2rem;
}

.icon-ball {
  flex-shrink: 0;
  width: 1.2em;
  height: 1.2em;
  color: currentColor;
  vertical-align: middle;
}

.icon-card {
  flex-shrink: 0;
  width: 0.85em;
  height: 1.2em;
  border-radius: 0.08em;
  vertical-align: middle;
}

.icon-card-yellow {
  color: var(--gold);
}

.icon-card-red {
  color: var(--danger);
}

.shootout {
  padding: 1.1rem;
  text-align: center;
  border: 2px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 8%, var(--surface));
}

.shootout h3 {
  margin: 0 0 0.3rem;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  color: var(--text);
}

.shootout-score {
  font-family: var(--numeral);
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.9rem;
}

.shootout-score .dash {
  color: var(--text-muted);
  font-weight: 400;
}

.shootout-rounds {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shootout-round {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.6rem;
}

.kick {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  animation: pop-in 0.2s ease;
}

.kick.home {
  justify-content: flex-end;
}

.kick.away {
  justify-content: flex-start;
}

.kick-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.round-num {
  flex-shrink: 0;
  font-family: var(--numeral);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  width: 1.4rem;
  text-align: center;
}

.kick-icon {
  flex-shrink: 0;
  width: 1.1em;
  height: 1.1em;
}

.kick-icon.ok {
  color: var(--pitch);
}

.kick-icon.miss {
  color: var(--danger);
}

.stats {
  padding: 1rem 1.1rem;
  text-align: left;
}

.stats h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin: 0.9rem 0 0.5rem;
}

.stats h3:first-child {
  margin-top: 0;
}

.stat-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0;
  font-size: 0.9rem;
}

.stat-row .stat-value {
  min-width: 0;
  font-family: var(--numeral);
  font-weight: 700;
}

.stat-row .stat-value:first-child {
  text-align: right;
}

.stat-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-width: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  text-align: center;
  overflow-wrap: break-word;
}

.goal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.88rem;
}

.goal-list li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.goal-text {
  min-width: 0;
  overflow-wrap: break-word;
}

.goal-list li.away {
  justify-content: flex-end;
  text-align: right;
}

.goal-kind {
  color: var(--text-muted);
  font-size: 0.78em;
}

.ratings-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.rating-list {
  min-width: 0;
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rating-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.rating-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rating-badge {
  flex-shrink: 0;
  font-family: var(--numeral);
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.1rem 0.45rem;
  border-radius: 0.3rem;
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-muted);
}

.rating-badge.high {
  background: color-mix(in srgb, var(--pitch) 25%, var(--surface-2));
  color: var(--pitch);
}

.rating-badge.low {
  background: color-mix(in srgb, var(--danger) 20%, var(--surface-2));
  color: var(--danger);
}
</style>
