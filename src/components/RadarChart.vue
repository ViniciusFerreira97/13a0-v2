<script setup lang="ts">
import { computed } from 'vue';

export interface RadarAxis {
  label: string;
  value: number;
}

const props = withDefaults(defineProps<{ axes: RadarAxis[]; max?: number; size?: number }>(), {
  max: 99,
  size: 200,
});

const center = computed(() => props.size / 2);
const maxRadius = computed(() => props.size / 2 - 26);
const RINGS = [0.25, 0.5, 0.75, 1];

function pointFor(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / props.axes.length;
  return { x: center.value + radius * Math.cos(angle), y: center.value + radius * Math.sin(angle) };
}

function ringPoints(fraction: number): string {
  return props.axes.map((_, i) => { const p = pointFor(i, maxRadius.value * fraction); return `${p.x},${p.y}`; }).join(' ');
}

const valuePoints = computed(() =>
  props.axes
    .map((axis, i) => {
      const radius = (Math.max(0, Math.min(axis.value, props.max)) / props.max) * maxRadius.value;
      const p = pointFor(i, radius);
      return `${p.x},${p.y}`;
    })
    .join(' '),
);

const spokes = computed(() => props.axes.map((_, i) => pointFor(i, maxRadius.value)));

const labels = computed(() =>
  props.axes.map((axis, i) => ({ ...pointFor(i, maxRadius.value + 14), text: axis.label })),
);
</script>

<template>
  <svg :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" class="radar" role="img">
    <polygon v-for="r in RINGS" :key="r" :points="ringPoints(r)" class="ring" />
    <line v-for="(p, i) in spokes" :key="i" :x1="center" :y1="center" :x2="p.x" :y2="p.y" class="spoke" />
    <polygon :points="valuePoints" class="value-shape" />
    <text
      v-for="(p, i) in labels"
      :key="i"
      :x="p.x"
      :y="p.y"
      class="axis-label"
      text-anchor="middle"
      dominant-baseline="middle"
    >
      {{ p.text }}
    </text>
  </svg>
</template>

<style scoped>
.radar {
  display: block;
  overflow: visible;
}

.ring {
  fill: none;
  stroke: var(--border);
  stroke-width: 1;
}

.spoke {
  stroke: var(--border);
  stroke-width: 1;
}

.value-shape {
  fill: color-mix(in srgb, var(--gold) 32%, transparent);
  stroke: var(--gold);
  stroke-width: 2;
  stroke-linejoin: round;
}

.axis-label {
  font-family: var(--body);
  font-size: 11px;
  font-weight: 800;
  fill: var(--text-muted);
  letter-spacing: 0.02em;
}
</style>
