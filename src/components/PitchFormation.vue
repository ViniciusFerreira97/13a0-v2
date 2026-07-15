<script setup lang="ts">
import { computed } from 'vue';
import type { Position } from '../engine/types';

export interface PitchSlot {
  position: Position;
  filled: boolean;
  label?: string;
  shirtNumber?: number | null;
  overall?: number;
}

const props = defineProps<{ slots: PitchSlot[] }>();

// Goleiro embaixo, ataque em cima — leitura padrão de campo tático.
const ROW_OF: Record<Position, number> = {
  GK: 0,
  ZAG: 1,
  LD: 1,
  LE: 1,
  VOL: 2,
  MC: 2,
  MEI: 3,
  MD: 3,
  ME: 3,
  PD: 4,
  PE: 4,
  SA: 4,
  CA: 4,
};

// Posição horizontal dentro da linha: esquerda do time = esquerda da tela (visão padrão de
// prancheta tática, olhando do gol do próprio time para o ataque) — "E" sempre à esquerda,
// "D" sempre à direita, independente da ordem em que o slot aparece no array da formação.
const X_ORDER: Record<Position, number> = {
  GK: 1,
  LE: 0,
  ZAG: 1,
  LD: 2,
  VOL: 1,
  MC: 1,
  ME: 0,
  MEI: 1,
  MD: 2,
  PE: 0,
  SA: 1,
  CA: 1,
  PD: 2,
};

const rows = computed(() => {
  const byRow = new Map<number, PitchSlot[]>();
  for (const s of props.slots) {
    const r = ROW_OF[s.position];
    if (!byRow.has(r)) byRow.set(r, []);
    byRow.get(r)!.push(s);
  }
  return [...byRow.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, items]) => [...items].sort((a, b) => X_ORDER[a.position] - X_ORDER[b.position]));
});
</script>

<template>
  <div class="pitch">
    <div class="pitch-marking center-circle" />
    <div class="pitch-marking halfway-line" />
    <div class="pitch-marking box box-top" />
    <div class="pitch-marking box box-bottom" />
    <div class="rows">
      <div v-for="(row, i) in rows" :key="i" class="row">
        <div
          v-for="(s, j) in row"
          :key="j"
          class="dot"
          :class="{ filled: s.filled }"
          :title="s.label ?? s.position"
        >
          <span v-if="s.filled && s.overall != null" class="overall-badge">{{ s.overall }}</span>
          <span class="main">{{ s.filled ? (s.shirtNumber ?? s.position) : s.position }}</span>
          <span v-if="s.filled && s.label" class="label">{{ s.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitch {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 0.85rem;
  background: linear-gradient(180deg, #1a8a4a, #0e6e3a);
  border: 2px solid rgba(255, 255, 255, 0.35);
  overflow: hidden;
}

.pitch-marking {
  position: absolute;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
}

.center-circle {
  width: 22%;
  aspect-ratio: 1;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.halfway-line {
  width: 100%;
  height: 0;
  top: 50%;
  left: 0;
}

.box {
  width: 46%;
  height: 12%;
  left: 27%;
  border-top: none;
}

.box-top {
  top: 0;
  border-top: none;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.35);
}

.box-bottom {
  bottom: 0;
  border-bottom: none;
}

.rows {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-evenly;
  padding: 0.75rem 0.5rem;
}

.row {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
}

.dot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 1.5px dashed rgba(255, 255, 255, 0.55);
  color: #fff;
  font-size: 0.6rem;
  font-weight: 800;
  flex-shrink: 0;
}

.dot.filled {
  background: #fff;
  border-style: solid;
  border-color: #fff;
  color: var(--pitch-dark);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.dot .main {
  font-size: 1em;
  line-height: 1;
}

.dot .label {
  font-size: 0.5rem;
  font-weight: 700;
  max-width: 2.4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overall-badge {
  position: absolute;
  top: -0.35rem;
  right: -0.35rem;
  min-width: 1.3rem;
  height: 1.3rem;
  padding: 0 0.15rem;
  border-radius: 999px;
  background: var(--gold);
  color: #14171a;
  font-size: 0.52rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  line-height: 1;
}

@media (min-width: 768px) {
  .dot {
    width: 3.4rem;
    height: 3.4rem;
    font-size: 0.78rem;
  }

  .dot .label {
    font-size: 0.58rem;
    max-width: 3.1rem;
  }

  .overall-badge {
    min-width: 1.5rem;
    height: 1.5rem;
    font-size: 0.6rem;
  }
}
</style>
