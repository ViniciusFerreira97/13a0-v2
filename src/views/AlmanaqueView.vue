<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDatasetStore } from '../stores/datasetStore';
import { formatPlayerNameFull } from '../engine/naming';
import { getClubColors, clubInitials, getContrastText } from '../engine/clubColors';
import type { Edition } from '../engine/types';

const dataset = useDatasetStore();
const router = useRouter();

onMounted(() => dataset.load());

const query = ref('');
const selected = ref<Edition | null>(null);

const filteredEditions = computed(() => {
  const sorted = [...dataset.editions].sort((a, b) => b.year - a.year);
  const q = query.value.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter((e) => e.club.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
});

const selectedPlayers = computed(() => {
  if (!selected.value) return [];
  return dataset.playersByEdition.get(selected.value.id) ?? [];
});

const selectedCoach = computed(() => (selected.value ? dataset.coachByEditionId.get(selected.value.id) : null));

function open(edition: Edition) {
  selected.value = edition;
}

function bannerStyle(club: string) {
  const c = getClubColors(club);
  return { background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`, color: getContrastText(c.primary) };
}

function crestStyle(club: string) {
  const c = getClubColors(club);
  return { background: c.secondary, color: getContrastText(c.secondary), borderColor: c.primary };
}
</script>

<template>
  <main class="screen screen-wide almanaque">
    <header class="header">
      <button class="back" @click="selected ? (selected = null) : router.push('/')">←</button>
      <h1>{{ $t('nav.almanaque') }}</h1>
    </header>

    <div v-if="dataset.loading">Carregando…</div>

    <template v-else-if="!selected">
      <input v-model="query" class="search" placeholder="Buscar por clube ou país…" />
      <div class="edition-list">
        <button v-for="e in filteredEditions" :key="e.id" class="edition-row card" @click="open(e)">
          <span><strong>{{ e.club }}</strong> {{ e.year }}</span>
          <span class="meta">{{ e.country }} · {{ e.titleNumber }}º título</span>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="two-col">
        <div class="side-col">
          <div class="team-banner card" :style="bannerStyle(selected.club)">
            <span class="crest" :style="crestStyle(selected.club)">{{ clubInitials(selected.club) }}</span>
            <strong>{{ selected.club }}</strong>
            <span class="year">{{ selected.year }}</span>
            <span class="meta light">{{ selected.country }} · {{ selected.titleNumber }}º título</span>
          </div>
          <p v-if="selected.provisional" class="disclaimer">
            Elenco com registro histórico irregular — dados provisórios.
          </p>
          <p v-if="selectedCoach" class="hint">
            Técnico: {{ selectedCoach.name }} <span v-if="selectedCoach.star" class="star">★</span>
          </p>
        </div>

        <div class="main-col">
          <!-- Modo Almanaque (§4.2): atributos ocultos de propósito, só identificação. -->
          <div class="roster-list">
            <div v-for="p in selectedPlayers" :key="p.id" class="player-card">
              <span class="pos-badge">{{ p.position }}</span>
              <span class="info">
                <span class="name">{{ formatPlayerNameFull(p) }} <span v-if="p.star" class="star">★</span></span>
                <span class="meta">{{ p.nationality }}</span>
              </span>
              <span class="number">{{ p.shirtNumber ?? '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.header h1 {
  font-size: 1.4rem;
}

.back {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: inherit;
}

.search {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.75rem;
  border: 1.5px solid var(--border);
  background: var(--surface);
  color: inherit;
  margin-bottom: 1rem;
  font: inherit;
}

.edition-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.5rem;
}

.edition-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border: 1px solid var(--border);
  font: inherit;
  color: inherit;
  text-align: left;
}

.team-banner {
  padding: 1.1rem;
  text-align: center;
  margin-bottom: 0.5rem;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.team-banner strong {
  font-size: 1.4rem;
}

.team-banner .year {
  opacity: 0.85;
  font-weight: 600;
}

.team-banner .meta.light {
  color: inherit;
  opacity: 0.85;
  margin-top: 0.2rem;
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

.roster-list {
  margin-top: 0.75rem;
}

.number {
  color: var(--text-muted);
  font-weight: 700;
  width: 1.6rem;
  text-align: right;
}

.meta {
  color: var(--text-muted);
  font-size: 0.85em;
}

.hint {
  text-align: center;
  margin-bottom: 0.5rem;
}

.disclaimer {
  font-size: 0.85em;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  margin-bottom: 0.5rem;
}
</style>
