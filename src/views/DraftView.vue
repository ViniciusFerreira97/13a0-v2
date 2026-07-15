<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDatasetStore } from '../stores/datasetStore';
import { useDraftStore } from '../stores/draftStore';
import { useMatchStore } from '../stores/matchStore';
import { FORMATIONS } from '../engine/formations';
import { formatPlayerNameFull } from '../engine/naming';
import { getClubColors, getClubGradient, clubInitials, getContrastText, getTextShadow } from '../engine/clubColors';
import { buildPitchSlots } from '../engine/pitch';
import { computeTeamOverall, computeTeamRadar } from '../engine/teamStats';
import PitchFormation from '../components/PitchFormation.vue';
import RadarChart, { type RadarAxis } from '../components/RadarChart.vue';
import type { Player, Coach, TacticalStyle, Position } from '../engine/types';

const dataset = useDatasetStore();
const draft = useDraftStore();
const match = useMatchStore();
const router = useRouter();
const { t } = useI18n();

onMounted(() => dataset.load());

const STYLES: TacticalStyle[] = ['defensivo', 'equilibrado', 'ofensivo'];

const GROUPS: { id: string; positions: Position[] }[] = [
  { id: 'goleiro', positions: ['GK'] },
  { id: 'defesa', positions: ['ZAG', 'LD', 'LE'] },
  { id: 'meiocampo', positions: ['VOL', 'MC', 'MEI', 'MD', 'ME'] },
  { id: 'ataque', positions: ['PD', 'PE', 'SA', 'CA'] },
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
const pitchSlots = computed(() => buildPitchSlots(draft.formation, draft.picks));

const teamOverall = computed(() => computeTeamOverall(draft.picks.map((p) => p.player)));

const teamRadar = computed<RadarAxis[]>(() =>
  computeTeamRadar(draft.picks.map((p) => p.player)).map((axis) => ({
    label: t(`team.radar.${axis.key}`),
    value: axis.value,
  })),
);

const rosterByGroup = computed(() => {
  return GROUPS.map((g) => ({
    id: g.id,
    label: t(`draft.positionGroups.${g.id}`),
    players: draft.candidateRoster.filter((p) => g.positions.includes(p.position)),
  })).filter((g) => g.players.length > 0);
});

const finalXIByGroup = computed(() => {
  return GROUPS.map((g) => ({
    id: g.id,
    label: t(`draft.positionGroups.${g.id}`),
    picks: draft.picks.filter((p) => g.positions.includes(p.slot)),
  })).filter((g) => g.picks.length > 0);
});

function bannerStyle(club: string) {
  const c = getClubColors(club);
  const color = getContrastText(c.primary);
  return {
    background: getClubGradient(club),
    color,
    textShadow: getTextShadow(color),
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

/** Arrastar o card do jogador até o slot certo no minicampo (web) — alternativa ao clique.
 *  O estado de quem está sendo arrastado fica aqui, não no DataTransfer: é mais simples e
 *  confiável do que tentar ler dados customizados durante o dragover (o browser só libera o
 *  conteúdo do DataTransfer no evento de drop). */
const draggedPlayer = ref<Player | null>(null);

function onPlayerDragStart(p: Player, event: DragEvent) {
  if (!draft.isPositionOpen(p.position)) return;
  draggedPlayer.value = p;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', p.id);
    // Sem isso, o Firefox (e às vezes o Chrome) desenha o "fantasma" do drag bem apagado —
    // forçando a própria imagem do card como preview ele fica totalmente opaco/legível.
    const el = event.currentTarget as HTMLElement;
    event.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  }
}

function onPlayerDragEnd() {
  draggedPlayer.value = null;
}

function onPitchDrop(position: Position) {
  const p = draggedPlayer.value;
  draggedPlayer.value = null;
  if (!p || p.position !== position) return;
  choosePlayer(p);
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
    <div v-if="dataset.loading">{{ t('draft.loading') }}</div>
    <div v-else-if="dataset.error">{{ t('draft.error', { error: dataset.error }) }}</div>

    <section v-else-if="!draft.formation" class="setup-screen">
      <h1 class="brand foil-text">TICTACA</h1>
      <p class="tagline">{{ t('draft.tagline') }}</p>
      <div class="setup card">
        <h2>{{ t('draft.formation') }}</h2>
        <div class="chip-row">
          <button
            v-for="f in FORMATIONS"
            :key="f.id"
            class="formation-choice"
            @click="draft.startDraft(f.id, draft.style)"
          >
            {{ f.label }}
          </button>
        </div>
        <h2>{{ t('draft.style') }}</h2>
        <div class="chip-row">
          <button
            v-for="s in STYLES"
            :key="s"
            class="pill"
            :class="{ filled: draft.style === s }"
            @click="draft.style = s"
          >
            {{ t(`draft.styles.${s}`) }}
          </button>
        </div>
      </div>
      <button class="btn btn-link" @click="router.push('/almanaque')">{{ $t('nav.almanaque') }}</button>
    </section>

    <div v-else-if="draft.isPlayerPhase" class="two-col player-phase">
      <div class="sidebar">
        <div class="side-col side-top">
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

          <button class="btn btn-reroll btn-block" :disabled="draft.rerollsRemaining <= 0" @click="draft.reroll()">
            🎲 {{ t('draft.rerollTeam', { count: draft.rerollsRemaining }) }}
          </button>
        </div>

        <div class="side-col side-bottom">
          <div class="progress-row" :aria-label="t('draft.round', { current: draft.picks.length, total: draft.totalRounds })">
            <span class="progress-label">{{ draft.picks.length }}/{{ draft.totalRounds }}</span>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${(draft.picks.length / draft.totalRounds) * 100}%` }" />
            </div>
          </div>

          <PitchFormation :slots="pitchSlots" :drag-position="draggedPlayer?.position ?? null" @drop="onPitchDrop" />

          <div class="chip-row board">
            <span v-for="b in positionBoard" :key="b.position" class="pill" :class="{ filled: b.filled >= b.total }">
              {{ b.position }} {{ b.filled }}/{{ b.total }}
            </span>
          </div>
        </div>
      </div>

      <div class="main-col">
        <p class="hint">{{ t('draft.chooseHint') }}</p>
        <div v-for="group in rosterByGroup" :key="group.id" class="roster-group">
          <h3>{{ group.label }}</h3>
          <div class="roster-list">
            <button
              v-for="p in group.players"
              :key="p.id"
              class="player-card"
              :class="{ pickable: draft.isPositionOpen(p.position) }"
              :disabled="!draft.isPositionOpen(p.position)"
              :draggable="draft.isPositionOpen(p.position)"
              @click="choosePlayer(p)"
              @dragstart="onPlayerDragStart(p, $event)"
              @dragend="onPlayerDragEnd"
            >
              <span class="pos-badge">{{ p.position }}</span>
              <span class="info">
                <span class="name-row">
                  <span class="name">{{ formatPlayerNameFull(p) }}</span>
                  <span v-if="p.star" class="star">★</span>
                </span>
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
        <h2>{{ t('draft.coachRound') }}</h2>
        <div class="roster-list">
          <button v-for="c in draft.candidateCoaches" :key="c.id" class="player-card pickable" @click="chooseCoach(c)">
            <span class="pos-badge">{{ t('draft.coachBadge') }}</span>
            <span class="info">
              <span class="name-row">
                <span class="name">{{ c.name }}</span>
                <span v-if="c.star" class="star">★</span>
              </span>
            </span>
            <span class="overall">{{ c.overall }}</span>
          </button>
        </div>
        <button class="btn btn-reroll btn-block" :disabled="draft.rerollsRemaining <= 0" @click="draft.reroll()">
          🎲 {{ t('draft.rerollCoach', { count: draft.rerollsRemaining }) }}
        </button>
      </div>
    </div>

    <section v-else-if="draft.isDone" class="squad-done">
      <h2>{{ t('draft.squadDone') }}</h2>

      <div class="squad-hero">
        <div class="squad-pitch">
          <PitchFormation :slots="pitchSlots" />
        </div>
        <div class="squad-radar">
          <RadarChart :axes="teamRadar" />
          <p class="team-overall">
            <span class="label">{{ t('team.overall') }}</span>
            <span class="value num">{{ teamOverall }}</span>
          </p>
        </div>
      </div>

      <p v-if="draft.coach" class="hint">
        {{ t('draft.coachLabel', { name: draft.coach.name }) }} <span v-if="draft.coach.star" class="star">★</span>
      </p>
      <button class="btn btn-primary btn-block btn-lg" @click="goToMatch">{{ t('draft.startCampaign') }}</button>

      <details class="squad-roster">
        <summary>{{ t('team.viewSquad') }}</summary>
        <div v-for="group in finalXIByGroup" :key="group.id" class="roster-group">
          <h3>{{ group.label }}</h3>
          <div class="roster-list">
            <div v-for="pick in group.picks" :key="pick.player.id" class="player-card">
              <span class="pos-badge">{{ pick.slot }}</span>
              <span class="info">
                <span class="name-row">
                  <span class="name">{{ formatPlayerNameFull(pick.player) }}</span>
                  <span v-if="pick.player.star" class="star">★</span>
                </span>
              </span>
              <span class="overall">{{ pick.player.overall }}</span>
            </div>
          </div>
        </div>
      </details>
    </section>
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
  font-size: 3rem;
  letter-spacing: 0.02em;
  text-align: center;
  line-height: 0.9;
}

@media (min-width: 768px) {
  .brand {
    font-size: 3.6rem;
  }
}

.brand::after {
  content: '';
  display: block;
  width: 3.5rem;
  height: 3px;
  margin: 0.6rem auto 0;
  background: var(--gold);
}

.tagline {
  max-width: 24rem;
  margin: 0.75rem auto 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
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
  padding: 0.55rem 0.9rem;
  border-radius: 0.35rem;
  border: 1.5px solid var(--text);
  background: var(--surface);
  color: var(--text);
  font-family: var(--display);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  box-shadow: var(--shadow-sm);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.formation-choice:hover {
  border-color: var(--pitch);
}

.formation-choice:active {
  transform: translate(1px, 1px);
  box-shadow: none;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* No mobile (1 coluna): o wrapper ".sidebar" "desaparece" da árvore de caixas (display:
   contents), então seus dois filhos (side-top, side-bottom) viram itens diretos do grid,
   junto com main-col — daí dá pra reordenar os três com `order`: card do time + sortear
   primeiro, listagem (o que importa pra escolher) em seguida, e progresso/campinho/board por
   último, como referência. Em telas largas o wrapper volta a ser uma coluna normal (flex),
   um item só do grid ao lado da listagem — sem precisar de nenhum truque de grid-area/span. */
.player-phase .sidebar {
  display: contents;
}

.player-phase .side-top {
  order: 1;
}

.player-phase .main-col {
  order: 2;
}

.player-phase .side-bottom {
  order: 3;
}

.player-phase .player-card {
  padding: 0.5rem 0.65rem;
  gap: 0.5rem;
}

.player-phase .player-card .overall {
  font-size: 0.92rem;
}

@media (min-width: 860px) {
  .player-phase .sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    /* o wrapper inteiro fica "sticky" como um bloco só — banner, sortear, progresso, campinho
       e board rolam grudados juntos. .side-top/.side-bottom têm a classe .side-col, que por
       padrão (regra global) também é "sticky"; se os dois ficassem sticky ao mesmo tempo aqui
       dentro, disputariam o mesmo topo e se sobreporiam ao rolar — por isso ficam "static". */
    position: sticky;
    top: 1.5rem;
  }

  .player-phase .side-col.side-top,
  .player-phase .side-col.side-bottom {
    position: static;
  }

  .player-phase .side-top,
  .player-phase .main-col,
  .player-phase .side-bottom {
    order: 0;
  }

  .player-phase .player-card {
    padding: 0.65rem 0.85rem;
    gap: 0.7rem;
  }

  .player-phase .player-card .overall {
    font-size: 1.05rem;
  }
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.progress-label {
  font-family: var(--numeral);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.board {
  margin-bottom: 0;
}

.team-banner {
  padding: 1.1rem;
  text-align: center;
  border: 1.5px solid var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.team-banner strong {
  font-family: var(--display);
  text-transform: uppercase;
  font-size: 1.4rem;
}

.team-banner .year {
  font-family: var(--numeral);
  opacity: 0.85;
  font-weight: 700;
}

.crest {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  border: 2px solid;
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--display);
  font-size: 0.7rem;
  margin-bottom: 0.3rem;
  /* o crachá tem cor própria (crestStyle) já com contraste garantido — não herda a sombra
     do banner do time. */
  text-shadow: none;
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

.main-col > h2 {
  margin-bottom: 1.25rem;
}

.main-col .btn {
  margin-top: 0.75rem;
}

.squad-done {
  max-width: 40rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.squad-done > h2 {
  margin-bottom: 0.25rem;
}

.squad-hero {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .squad-hero {
    grid-template-columns: minmax(0, 22rem) minmax(0, 16rem);
    justify-content: center;
  }
}

.squad-pitch {
  width: 100%;
  max-width: 24rem;
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
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.team-overall .value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--gold);
}

.btn-lg {
  padding: 1.1rem 1.6rem;
  font-size: 1.15rem;
}

.squad-roster {
  width: 100%;
  text-align: left;
}

.squad-roster summary {
  cursor: pointer;
  text-align: center;
  padding: 0.6rem;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.squad-roster[open] summary {
  margin-bottom: 0.5rem;
}
</style>
