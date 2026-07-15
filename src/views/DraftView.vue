<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDatasetStore } from '../stores/datasetStore';
import { useDraftStore } from '../stores/draftStore';
import { useMatchStore } from '../stores/matchStore';
import { FORMATIONS } from '../engine/formations';
import { formatPlayerName, formatPlayerNameFull } from '../engine/naming';
import { getClubColors, clubInitials, getContrastText } from '../engine/clubColors';
import PitchFormation, { type PitchSlot } from '../components/PitchFormation.vue';
import type { Player, Coach, TacticalStyle, Position } from '../engine/types';

const dataset = useDatasetStore();
const draft = useDraftStore();
const match = useMatchStore();
const router = useRouter();

onMounted(() => dataset.load());

const STYLES: { id: TacticalStyle; label: string }[] = [
  { id: 'defensivo', label: 'Defensivo' },
  { id: 'equilibrado', label: 'Equilibrado' },
  { id: 'ofensivo', label: 'Ofensivo' },
];

const GROUPS: { label: string; positions: Position[] }[] = [
  { label: 'Goleiro', positions: ['GK'] },
  { label: 'Defesa', positions: ['ZAG', 'LD', 'LE'] },
  { label: 'Meio-campo', positions: ['VOL', 'MC', 'MEI', 'MD', 'ME'] },
  { label: 'Ataque', positions: ['PD', 'PE', 'SA', 'CA'] },
];

const positionBoard = computed(() => {
  if (!draft.formation) return [];
  const totals = new Map<Position, number>();
  for (const pos of draft.formation.slots) totals.set(pos, (totals.get(pos) ?? 0) + 1);
  return [...totals.entries()].map(([position, total]) => ({
    position,
    total,
    filled: total - (draft.remainingNeeds.get(position) ?? 0),
  }));
});

/** Mapeia os picks já feitos para as instâncias de slot da formação (o campinho tático). */
const pitchSlots = computed<PitchSlot[]>(() => {
  if (!draft.formation) return [];
  const byPosition = new Map<Position, Player[]>();
  for (const pick of draft.picks) {
    const arr = byPosition.get(pick.slot) ?? [];
    arr.push(pick.player);
    byPosition.set(pick.slot, arr);
  }
  const consumed = new Map<Position, number>();
  return draft.formation.slots.map((position) => {
    const idx = consumed.get(position) ?? 0;
    consumed.set(position, idx + 1);
    const player = (byPosition.get(position) ?? [])[idx];
    return {
      position,
      filled: !!player,
      label: player ? formatPlayerName(player) : undefined,
      shirtNumber: player?.shirtNumber,
      overall: player?.overall,
    };
  });
});

const rosterByGroup = computed(() => {
  return GROUPS.map((g) => ({
    label: g.label,
    players: draft.candidateRoster.filter((p) => g.positions.includes(p.position)),
  })).filter((g) => g.players.length > 0);
});

const finalXIByGroup = computed(() => {
  return GROUPS.map((g) => ({
    label: g.label,
    picks: draft.picks.filter((p) => g.positions.includes(p.slot)),
  })).filter((g) => g.picks.length > 0);
});

function bannerStyle(club: string) {
  const c = getClubColors(club);
  return {
    background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
    color: getContrastText(c.primary),
  };
}

function crestStyle(club: string) {
  const c = getClubColors(club);
  return { background: c.secondary, color: getContrastText(c.secondary), borderColor: c.primary };
}

function choosePlayer(p: Player) {
  if (!draft.isPositionOpen(p.position)) return;
  draft.pickPlayer(p);
}

function chooseCoach(c: Coach) {
  draft.pickCoach(c);
}

function goToMatch() {
  match.reset();
  match.startCampaign();
  router.push('/match');
}
</script>

<template>
  <main class="screen" :class="{ 'screen-wide': draft.formation }">
    <div v-if="dataset.loading">Carregando elencos…</div>
    <div v-else-if="dataset.error">Erro ao carregar dados: {{ dataset.error }}</div>

    <section v-else-if="!draft.formation" class="setup-screen">
      <h1 class="brand">Glórias da América</h1>
      <div class="setup card">
        <h2>Formação</h2>
        <div class="chip-row">
          <button
            v-for="f in FORMATIONS"
            :key="f.id"
            class="pill formation-choice"
            @click="draft.startDraft(f.id, draft.style)"
          >
            {{ f.label }}
          </button>
        </div>
        <h2>Estilo</h2>
        <div class="chip-row">
          <button
            v-for="s in STYLES"
            :key="s.id"
            class="pill"
            :class="{ filled: draft.style === s.id }"
            @click="draft.style = s.id"
          >
            {{ s.label }}
          </button>
        </div>
      </div>
      <button class="btn btn-link" @click="router.push('/almanaque')">{{ $t('nav.almanaque') }}</button>
    </section>

    <div v-else-if="draft.isPlayerPhase" class="two-col">
      <div class="side-col">
        <div
          v-if="draft.candidateEdition"
          class="team-banner card"
          :style="bannerStyle(draft.candidateEdition.club)"
        >
          <span class="crest" :style="crestStyle(draft.candidateEdition.club)">
            {{ clubInitials(draft.candidateEdition.club) }}
          </span>
          <strong>{{ draft.candidateEdition.club }}</strong>
          <span class="year">{{ draft.candidateEdition.year }}</span>
        </div>

        <button class="btn btn-ghost btn-block" :disabled="draft.rerollsRemaining <= 0" @click="draft.reroll()">
          🎲 Sortear outro time ({{ draft.rerollsRemaining }})
        </button>

        <div class="progress-row">
          <span class="progress-label">{{ draft.picks.length }}/{{ draft.totalRounds }}</span>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${(draft.picks.length / draft.totalRounds) * 100}%` }" />
          </div>
        </div>

        <PitchFormation :slots="pitchSlots" />

        <div class="chip-row board">
          <span v-for="b in positionBoard" :key="b.position" class="pill" :class="{ filled: b.filled >= b.total }">
            {{ b.position }} {{ b.filled }}/{{ b.total }}
          </span>
        </div>
      </div>

      <div class="main-col">
        <p class="hint">Escolha um jogador para uma posição em aberto.</p>
        <div v-for="group in rosterByGroup" :key="group.label" class="roster-group">
          <h3>{{ group.label }}</h3>
          <div class="roster-list">
            <button
              v-for="p in group.players"
              :key="p.id"
              class="player-card"
              :class="{ pickable: draft.isPositionOpen(p.position) }"
              :disabled="!draft.isPositionOpen(p.position)"
              @click="choosePlayer(p)"
            >
              <span class="pos-badge">{{ p.position }}</span>
              <span class="info">
                <span class="name">{{ formatPlayerNameFull(p) }} <span v-if="p.star" class="star">★</span></span>
                <span class="meta">{{ p.nationality }}</span>
              </span>
              <span class="overall">{{ p.overall }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="draft.isCoachPhase" class="two-col">
      <div class="side-col">
        <PitchFormation :slots="pitchSlots" />
      </div>
      <div class="main-col">
        <h2>Escolha o técnico</h2>
        <div class="roster-list">
          <button v-for="c in draft.candidateCoaches" :key="c.id" class="player-card pickable" @click="chooseCoach(c)">
            <span class="pos-badge">TÉC</span>
            <span class="info">
              <span class="name">{{ c.name }} <span v-if="c.star" class="star">★</span></span>
            </span>
            <span class="overall">{{ c.overall }}</span>
          </button>
        </div>
        <button class="btn btn-ghost btn-block" :disabled="draft.rerollsRemaining <= 0" @click="draft.reroll()">
          🎲 Sortear outros ({{ draft.rerollsRemaining }})
        </button>
      </div>
    </div>

    <div v-else-if="draft.isDone" class="two-col">
      <div class="side-col">
        <PitchFormation :slots="pitchSlots" />
        <p v-if="draft.coach" class="hint">
          Técnico: {{ draft.coach.name }} <span v-if="draft.coach.star" class="star">★</span>
        </p>
        <button class="btn btn-primary btn-block" @click="goToMatch">Começar a competição</button>
      </div>
      <div class="main-col">
        <h2>Elenco montado!</h2>
        <div v-for="group in finalXIByGroup" :key="group.label" class="roster-group">
          <h3>{{ group.label }}</h3>
          <div class="roster-list">
            <div v-for="pick in group.picks" :key="pick.player.id" class="player-card">
              <span class="pos-badge">{{ pick.slot }}</span>
              <span class="info">
                <span class="name">{{ formatPlayerNameFull(pick.player) }} <span v-if="pick.player.star" class="star">★</span></span>
              </span>
              <span class="overall">{{ pick.player.overall }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.setup-screen {
  min-height: 80svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.brand {
  font-size: 1.6rem;
  text-align: center;
}

.setup {
  width: 100%;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chip-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.chip-row:last-child {
  margin-bottom: 0;
}

.formation-choice {
  cursor: pointer;
  border: none;
  font: inherit;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.progress-label {
  font-weight: 800;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.board {
  margin-bottom: 0;
}

.team-banner {
  padding: 1.1rem;
  text-align: center;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.team-banner strong {
  font-size: 1.4rem;
}

.team-banner .year {
  opacity: 0.85;
  font-weight: 600;
}

.crest {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  border: 2px solid;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  margin-bottom: 0.3rem;
}

.hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  text-align: center;
}

.roster-group {
  margin-bottom: 1rem;
}

.roster-group h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.main-col .btn {
  margin-top: 0.75rem;
}
</style>
