<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faTrophy, faFutbol } from '@fortawesome/free-solid-svg-icons';
import { useDraftStore } from '../stores/draftStore';
import { useMatchStore } from '../stores/matchStore';
import type { CampaignRound } from '../stores/matchStore';
import { buildPitchSlots } from '../engine/pitch';
import { computeTeamOverall, computeTeamRadar } from '../engine/teamStats';
import { computeMatchStats } from '../engine/matchStats';
import { formatPlayerNameFull } from '../engine/naming';
import PitchFormation from '../components/PitchFormation.vue';
import RadarChart, { type RadarAxis } from '../components/RadarChart.vue';

const draft = useDraftStore();
const match = useMatchStore();
const router = useRouter();
const { t } = useI18n();

function roundLabel(id: CampaignRound['id']): string {
  return t(`match.rounds.${id}`);
}

const pitchSlots = computed(() => buildPitchSlots(draft.formation, draft.picks));
const teamOverall = computed(() => computeTeamOverall(draft.picks.map((p) => p.player)));
const teamRadar = computed<RadarAxis[]>(() =>
  computeTeamRadar(draft.picks.map((p) => p.player)).map((axis) => ({
    label: t(`team.radar.${axis.key}`),
    value: axis.value,
  })),
);

const playedRounds = computed(() => match.rounds.filter((r) => r.result));
const groupRounds = computed(() => playedRounds.value.filter((r) => !r.knockout));
const knockoutRounds = computed(() => playedRounds.value.filter((r) => r.knockout));

const wins = computed(() => playedRounds.value.filter((r) => match.wonRound(r)).length);
// Empate só existe na fase de grupos (mata-mata sempre decide no pênalti) — tratar todo
// não-vencido como derrota ignorava esse caso.
const draws = computed(
  () => playedRounds.value.filter((r) => !r.knockout && r.result!.homeScore === r.result!.awayScore).length,
);
const losses = computed(() => playedRounds.value.length - wins.value - draws.value);

/** Gols do time do jogador (sempre "home") na campanha inteira, por jogador — pra artilheiro. */
const goalsByPlayer = computed(() => {
  const totals = new Map<string, number>();
  for (const r of playedRounds.value) {
    if (!r.result || !r.homeLineup || !r.awayLineup) continue;
    const stats = computeMatchStats(r.result, r.homeLineup, r.awayLineup);
    for (const g of stats.goals) {
      if (g.teamId !== 'home') continue;
      totals.set(g.playerId, (totals.get(g.playerId) ?? 0) + 1);
    }
  }
  return totals;
});

const totalGoals = computed(() => [...goalsByPlayer.value.values()].reduce((a, b) => a + b, 0));

/** Só mostra artilheiro quando há um único líder — em caso de empate na artilharia, não faz
 *  sentido destacar um jogador específico. */
const topScorer = computed(() => {
  const entries = [...goalsByPlayer.value.entries()];
  if (!entries.length) return null;
  const maxGoals = Math.max(...entries.map(([, goals]) => goals));
  const leaders = entries.filter(([, goals]) => goals === maxGoals);
  if (leaders.length !== 1) return null;
  const player = draft.picks.find((p) => p.player.id === leaders[0][0])?.player;
  if (!player) return null;
  return { name: formatPlayerNameFull(player), goals: maxGoals };
});

const shareText = computed(() => {
  const lines = playedRounds.value.map((r) => `${roundLabel(r.id)}: ${r.result!.homeScore}×${r.result!.awayScore}`);
  const header = match.glory ? t('result.shareHeaderGlory') : t('result.shareHeaderDefault');
  return [header, ...lines].join('\n');
});

const shareUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`);

function rematch() {
  match.reset();
  match.startCampaign();
  router.push('/match');
}

function playAgain() {
  draft.reset();
  match.reset();
  router.push('/draft');
}
</script>

<template>
  <main class="screen screen-wide result">
    <div class="medal" :class="{ glory: match.glory }">
      <div v-if="match.glory" class="sunburst" aria-hidden="true" />
      <FontAwesomeIcon :icon="match.glory ? faTrophy : faFutbol" class="medal-icon" :class="{ 'is-ball': !match.glory }" />
    </div>
    <h1 :class="{ 'foil-text': match.glory }">{{ match.glory ? t('result.glory') : t('result.over') }}</h1>
    <p class="record">
      {{ t('result.wins', { n: wins }, wins) }}
      <template v-if="draws > 0"> · {{ t('result.draws', { n: draws }, draws) }}</template>
      · {{ t('result.losses', { n: losses }, losses) }}
    </p>
    <p class="record">
      {{ t('result.goals', { n: totalGoals }, totalGoals) }}
      <template v-if="topScorer"> · {{ t('result.topScorer', { name: topScorer.name, goals: topScorer.goals }) }}</template>
    </p>

    <a class="btn btn-primary btn-block" :href="shareUrl" target="_blank" rel="noopener">{{ $t('result.share') }}</a>
    <button class="btn btn-ghost btn-block" @click="rematch">{{ $t('result.rematch') }}</button>
    <button class="btn btn-link" @click="playAgain">{{ t('result.newDraft') }}</button>

    <div class="squad-card card">
      <div class="squad-pitch">
        <PitchFormation :slots="pitchSlots" />
      </div>
      <div class="squad-radar">
        <RadarChart :axes="teamRadar" :size="200" />
        <p class="team-overall">
          <span class="label">{{ t('team.overall') }}</span>
          <span class="value num">{{ teamOverall }}</span>
        </p>

        <div class="rounds">
          <div v-if="groupRounds.length" class="rounds-section">
            <span class="eyebrow">{{ t('result.groupStage') }}</span>
            <div v-for="r in groupRounds" :key="r.id" class="round-row" :class="{ won: match.wonRound(r) }">
              <span class="dot" />
              <span class="label">{{ roundLabel(r.id) }}</span>
              <span class="score">{{ r.result!.homeScore }} × {{ r.result!.awayScore }}</span>
            </div>
          </div>

          <div v-if="knockoutRounds.length" class="rounds-section knockout">
            <span class="eyebrow">{{ t('result.knockoutStage') }}</span>
            <div
              v-for="r in knockoutRounds"
              :key="r.id"
              class="round-row"
              :class="{ won: match.wonRound(r), final: r.id === 'final' }"
            >
              <span class="dot" />
              <span class="label">{{ roundLabel(r.id) }}</span>
              <span class="score">
                {{ r.result!.homeScore }} × {{ r.result!.awayScore }}
                <span v-if="r.result!.wentToPenalties" class="pen">
                  ({{ t('match.penaltyScore', { home: r.result!.penaltyScore!.home, away: r.result!.penaltyScore!.away }) }})
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  text-align: center;
}

.medal {
  position: relative;
  width: 5.5rem;
  height: 5.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--gold);
  box-shadow: var(--shadow);
  font-size: 2.6rem;
}

.medal.glory {
  border-color: var(--gold-bright);
}

.medal-icon {
  position: relative;
  z-index: 1;
  line-height: 1;
  color: var(--gold);
}

.medal-icon.is-ball {
  color: var(--text-muted);
}

.sunburst {
  position: absolute;
  z-index: 0;
  inset: -2.75rem;
  border-radius: 50%;
  opacity: 0.5;
  background: repeating-conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--gold) 40%, transparent) 0deg 8deg,
    transparent 8deg 20deg
  );
  animation: spin 50s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result h1 {
  margin-bottom: 0;
}

.record {
  font-family: var(--numeral);
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 0.4rem;
}

.squad-card {
  width: 100%;
  max-width: 46rem;
  padding: 1.25rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: center;
  justify-items: center;
}

@media (min-width: 480px) {
  .squad-card {
    grid-template-columns: minmax(0, 20rem) minmax(0, 16rem);
    justify-content: center;
  }
}

.squad-pitch {
  width: 100%;
  max-width: 22rem;
  margin: 0 auto;
}

.squad-radar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.team-overall {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.team-overall .label {
  font-size: 0.72rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.team-overall .value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--gold);
}

.rounds {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1.5px solid var(--border);
  text-align: left;
}

.rounds-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.round-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.rounds-section:last-child .round-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--border);
}

.round-row.won .dot {
  background: var(--pitch);
}

.round-row.final {
  padding: 0.5rem 0.6rem;
  margin: -0.5rem -0.6rem 0;
  border-radius: 0.4rem;
  border-bottom: none;
}

.round-row.final.won {
  background: color-mix(in srgb, var(--gold) 14%, transparent);
  border: 1.5px solid var(--gold);
}

.label {
  flex: 1;
  min-width: 0;
  color: var(--text-muted);
}

.round-row.won .label {
  color: var(--text);
  font-weight: 700;
}

.score {
  flex-shrink: 0;
  font-family: var(--numeral);
  font-weight: 700;
}

.pen {
  font-family: var(--body);
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text-muted);
}

.btn {
  max-width: 20rem;
}
</style>
