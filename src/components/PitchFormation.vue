<script setup lang="ts">
import { computed } from 'vue';
import type { Position } from '../engine/types';
import type { PitchSlot } from '../engine/pitch';

export type { PitchSlot };

const props = defineProps<{
  slots: PitchSlot[];
  /** Posição do jogador sendo arrastado (drag-and-drop no draft, só web) — só slots vazios
   *  dessa posição aceitam o drop; qualquer outra coisa (posição errada, slot ocupado) não. */
  dragPosition?: Position | null;
}>();

const emit = defineEmits<{ drop: [position: Position] }>();

function isDropTarget(slot: PitchSlot): boolean {
  return !!props.dragPosition && !slot.filled && slot.position === props.dragPosition;
}

function onDragOver(slot: PitchSlot, event: DragEvent) {
  if (!isDropTarget(slot)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function onDrop(slot: PitchSlot, event: DragEvent) {
  if (!isDropTarget(slot)) return;
  event.preventDefault();
  emit('drop', slot.position);
}

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
          :class="{ filled: s.filled, 'drop-target': isDropTarget(s) }"
          :title="s.label ?? s.position"
          @dragover="onDragOver(s, $event)"
          @drop="onDrop(s, $event)"
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
  border-radius: 0.55rem;
  background:
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0 10%, rgba(0, 0, 0, 0.05) 10% 20%),
    linear-gradient(180deg, var(--pitch), var(--pitch-dark));
  border: 1.5px solid var(--text);
  box-shadow: var(--shadow);
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
  background: rgba(255, 255, 255, 0.12);
  border: 1.5px dashed rgba(255, 255, 255, 0.55);
  color: #fff;
  font-family: var(--numeral);
  font-size: 0.6rem;
  font-weight: 700;
  flex-shrink: 0;
}

.dot.filled {
  background: var(--surface);
  border-style: solid;
  border-color: var(--gold);
  border-width: 2px;
  color: var(--text);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.35);
}

.dot.drop-target {
  background: color-mix(in srgb, var(--gold) 35%, transparent);
  border-style: solid;
  border-color: var(--gold);
  animation: drop-target-pulse 1s ease-in-out infinite;
}

@keyframes drop-target-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 55%, transparent);
  }
  50% {
    box-shadow: 0 0 0 6px transparent;
  }
}

.dot .main {
  font-size: 1em;
  line-height: 1;
}

.dot .label {
  font-family: var(--body);
  font-size: 0.5rem;
  font-weight: 700;
  max-width: 2.4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overall-badge {
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.15rem;
  border-radius: 0.3rem;
  background: var(--gold);
  color: #211b12;
  font-family: var(--numeral);
  font-size: 0.55rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--text);
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
