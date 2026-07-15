<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDraftStore } from '../stores/draftStore';
import { useMatchStore } from '../stores/matchStore';

const draft = useDraftStore();
const match = useMatchStore();
const router = useRouter();

const ROUND_LABELS: Record<string, string> = {
  grupo1: 'Grupo 1',
  grupo2: 'Grupo 2',
  grupo3: 'Grupo 3',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semi: 'Semifinal',
  final: 'Final',
};

const shareText = computed(() => {
  const lines = match.rounds
    .filter((r) => r.result)
    .map((r) => `${ROUND_LABELS[r.id]}: ${r.result!.homeScore}×${r.result!.awayScore}`);
  const header = match.glory ? '🏆 GLÓRIA ETERNA — 7 de 7!' : 'Minha campanha:';
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
  <main class="screen result">
    <div class="trophy">{{ match.glory ? '🏆' : '⚽' }}</div>
    <h1>{{ match.glory ? $t('result.glory') : 'Fim de campanha' }}</h1>

    <div class="rounds card">
      <div v-for="r in match.rounds.filter((r) => r.result)" :key="r.id" class="round-row">
        <span class="label">{{ ROUND_LABELS[r.id] }}</span>
        <span class="score" :class="{ won: match.wonRound(r) }">{{ r.result!.homeScore }} × {{ r.result!.awayScore }}</span>
        <span v-if="r.result!.wentToPenalties" class="pen">
          (pên. {{ r.result!.penaltyScore!.home }}×{{ r.result!.penaltyScore!.away }})
        </span>
      </div>
    </div>

    <a class="btn btn-primary btn-block" :href="shareUrl" target="_blank" rel="noopener">{{ $t('result.share') }}</a>
    <button class="btn btn-ghost btn-block" @click="rematch">{{ $t('result.rematch') }}</button>
    <button class="btn btn-link" @click="playAgain">Novo draft</button>
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

.trophy {
  font-size: 3rem;
}

.rounds {
  width: 100%;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.round-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.label {
  color: var(--text-muted);
}

.score {
  font-weight: 700;
}

.score.won {
  color: var(--pitch);
}

.pen {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.btn {
  max-width: 20rem;
}
</style>
