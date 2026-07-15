<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDatasetStore } from '../stores/datasetStore';
import { formatPlayerNameFull } from '../engine/naming';
import { getClubColors, getClubGradient, clubInitials, getContrastText, getTextShadow } from '../engine/clubColors';
import type { Edition } from '../engine/types';

const dataset = useDatasetStore();
const router = useRouter();
const { t } = useI18n();

onMounted(() => dataset.load());

const query = ref('');
const selected = ref<Edition | null>(null);

const filteredEditions = computed(() => {
  const sorted = [...dataset.editions].sort((a, b) => b.year - a.year);
  const q = query.value.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter((e) => e.club.toLowerCase().includes(q) || e.country.toLowerCase().includes(q));
});

const editionsByDecade = computed(() => {
  const byDecade = new Map<number, Edition[]>();
  for (const e of filteredEditions.value) {
    const decade = Math.floor(e.year / 10) * 10;
    const group = byDecade.get(decade) ?? [];
    group.push(e);
    byDecade.set(decade, group);
  }
  return [...byDecade.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([decade, editions]) => ({ decade, editions }));
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
  const color = getContrastText(c.primary);
  return { background: getClubGradient(club), color, textShadow: getTextShadow(color) };
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

    <div v-if="dataset.loading">{{ t('almanaque.loading') }}</div>

    <template v-else-if="!selected">
      <input v-model="query" class="search" :placeholder="t('almanaque.searchPlaceholder')" />
      <div v-for="group in editionsByDecade" :key="group.decade" class="decade-section">
        <h2 class="decade-heading">{{ t('almanaque.decade', { decade: group.decade }) }}</h2>
        <div class="edition-list">
          <button v-for="e in group.editions" :key="e.id" class="edition-row card" @click="open(e)">
            <div class="edition-row-top">
              <span class="edition-year num">{{ e.year }}</span>
              <span class="edition-club">{{ e.club }}</span>
            </div>
            <div class="edition-row-bottom">
              <span class="edition-country">{{ e.country }}</span>
              <span class="edition-title num">{{ t('almanaque.titleNumber', { n: e.titleNumber }) }}</span>
            </div>
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="two-col">
        <div class="side-col">
          <div class="team-banner card" :style="bannerStyle(selected.club)">
            <span class="crest" :style="crestStyle(selected.club)">{{ clubInitials(selected.club) }}</span>
            <strong>{{ selected.club }}</strong>
            <span class="year">{{ selected.year }}</span>
            <span class="meta light">{{ selected.country }} · {{ t('almanaque.titleNumber', { n: selected.titleNumber }) }}</span>
          </div>
          <p v-if="selected.provisional" class="disclaimer">
            {{ t('almanaque.provisional') }}
          </p>
          <p v-if="selectedCoach" class="hint">
            {{ t('almanaque.coachLabel', { name: selectedCoach.name }) }} <span v-if="selectedCoach.star" class="star">★</span>
          </p>
        </div>

        <div class="main-col">
          <!-- Modo Almanaque (§4.2): atributos ocultos de propósito, só identificação. -->
          <div class="roster-list">
            <div v-for="p in selectedPlayers" :key="p.id" class="player-card">
              <span class="pos-badge">{{ p.position }}</span>
              <span class="info">
                <span class="name-row">
                  <span class="name">{{ formatPlayerNameFull(p) }}</span>
                  <span v-if="p.star" class="star">★</span>
                </span>
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
  border-radius: 0.4rem;
  border: 1.5px solid var(--text);
  background: var(--surface);
  color: inherit;
  margin-bottom: 1rem;
  font: inherit;
}

.decade-section {
  margin-bottom: 1.5rem;
}

.decade-section:last-child {
  margin-bottom: 0;
}

.decade-heading {
  font-size: 1.1rem;
  margin-bottom: 0.6rem;
  padding-bottom: 0.3rem;
  border-bottom: 2px solid var(--border);
}

.edition-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.5rem;
}

.edition-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border: 1.5px solid var(--text);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-sm);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  font: inherit;
  color: inherit;
  text-align: left;
}

.edition-row:active {
  transform: translate(1px, 1px);
  box-shadow: none;
}

.edition-row-top {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.edition-year {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--text-muted);
}

.edition-club {
  min-width: 0;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edition-row-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.edition-country {
  min-width: 0;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edition-title {
  flex-shrink: 0;
  color: var(--text-muted);
}

.team-banner {
  padding: 1.1rem;
  text-align: center;
  margin-bottom: 0.5rem;
  border: 1.5px solid var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
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

.roster-list {
  margin-top: 0.75rem;
}

.number {
  font-family: var(--numeral);
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
