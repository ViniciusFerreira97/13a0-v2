// Carrega public/data/dataset.json sob demanda (§8.1: dados servidos por CDN, não embutidos
// no bundle) e mantém índices auxiliares por edição/id para consumo rápido pelas outras stores.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SeedDataset, Player, Edition, Coach } from '../engine/types';

export const useDatasetStore = defineStore('dataset', () => {
  const dataset = ref<SeedDataset | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const playersById = computed<Map<string, Player>>(() => {
    const map = new Map<string, Player>();
    for (const p of dataset.value?.players ?? []) map.set(p.id, p);
    return map;
  });

  const playersByEdition = computed<Map<string, Player[]>>(() => {
    const map = new Map<string, Player[]>();
    for (const p of dataset.value?.players ?? []) {
      const list = map.get(p.editionId);
      if (list) list.push(p);
      else map.set(p.editionId, [p]);
    }
    return map;
  });

  const coachByEditionId = computed<Map<string, Coach>>(() => {
    const map = new Map<string, Coach>();
    for (const e of dataset.value?.editions ?? []) {
      const coach = dataset.value?.coaches.find((c) => c.id === e.coachId);
      if (coach) map.set(e.id, coach);
    }
    return map;
  });

  const editions = computed<Edition[]>(() => dataset.value?.editions ?? []);

  async function load(): Promise<void> {
    if (dataset.value || loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/dataset.json`);
      if (!res.ok) throw new Error(`falha ao carregar dataset: ${res.status}`);
      dataset.value = (await res.json()) as SeedDataset;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  return { dataset, loading, error, editions, playersById, playersByEdition, coachByEditionId, load };
});
