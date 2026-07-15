// Copa Clássica (§4.1), mecânica no estilo 7a0: a cada rodada sorteia-se um elenco campeão
// INTEIRO (todas as posições, não uma só) e o jogador escolhe qualquer jogador desse elenco
// cuja posição ainda tenha vaga aberta na formação — não uma posição pré-determinada pela
// rodada. 11 jogadores + 1 técnico, 3 re-rolls.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useDatasetStore } from './datasetStore';
import { getFormation, type Formation } from '../engine/formations';
import type { Coach, Edition, Player, Position, TacticalStyle } from '../engine/types';

export interface DraftPick {
  slot: Position; // posição real do jogador escolhido
  player: Player;
}

type Phase = 'setup' | 'drafting' | 'coach' | 'done';

const TOTAL_REROLLS = 3;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export const useDraftStore = defineStore('draft', () => {
  const dataset = useDatasetStore();

  const formation = ref<Formation | null>(null);
  const style = ref<TacticalStyle>('equilibrado');
  const rerollsRemaining = ref(TOTAL_REROLLS);
  const phase = ref<Phase>('setup');

  const candidateEdition = ref<Edition | null>(null);
  const candidateRoster = ref<Player[]>([]);
  const candidateCoaches = ref<Coach[]>([]);
  const usedEditionIds = ref<Set<string>>(new Set());

  const picks = ref<DraftPick[]>([]);
  const coach = ref<Coach | null>(null);

  const totalRounds = computed(() => (formation.value ? formation.value.slots.length : 0));
  const isPlayerPhase = computed(() => phase.value === 'drafting');
  const isCoachPhase = computed(() => phase.value === 'coach');
  const isDone = computed(() => phase.value === 'done');

  /** Vagas restantes por posição, na formação escolhida. */
  const remainingNeeds = computed<Map<Position, number>>(() => {
    const needs = new Map<Position, number>();
    if (!formation.value) return needs;
    for (const pos of formation.value.slots) needs.set(pos, (needs.get(pos) ?? 0) + 1);
    for (const pick of picks.value) needs.set(pick.slot, (needs.get(pick.slot) ?? 0) - 1);
    return needs;
  });

  function isPositionOpen(position: Position): boolean {
    return (remainingNeeds.value.get(position) ?? 0) > 0;
  }

  function eligibleEditions(): Edition[] {
    return dataset.editions.filter((e) => !usedEditionIds.value.has(e.id));
  }

  function rollTeam() {
    const pool = eligibleEditions().length > 0 ? eligibleEditions() : dataset.editions;
    // Filtra direto pelas edições que têm alguém pra pelo menos uma posição em aberto — algumas
    // posições (ex. MC) só existem em um punhado de elencos, então sortear-e-testar às cegas
    // desperdiçava tentativas (ou falhava de vez, se a posição não existisse em lugar nenhum).
    const candidates = pool.filter((e) => {
      const roster = dataset.playersByEdition.get(e.id) ?? [];
      return roster.some((p) => isPositionOpen(p.position));
    });
    if (candidates.length === 0) {
      candidateEdition.value = null;
      candidateRoster.value = [];
      return;
    }
    const edition = pickRandom(candidates);
    candidateEdition.value = edition;
    candidateRoster.value = dataset.playersByEdition.get(edition.id) ?? [];
  }

  function rollCoachCandidates() {
    const pool = [...dataset.editions].sort(() => Math.random() - 0.5).slice(0, 4);
    candidateCoaches.value = pool
      .map((e) => dataset.coachByEditionId.get(e.id))
      .filter((c): c is Coach => c != null);
  }

  function startDraft(formationId: string, chosenStyle: TacticalStyle) {
    formation.value = getFormation(formationId);
    style.value = chosenStyle;
    rerollsRemaining.value = TOTAL_REROLLS;
    picks.value = [];
    coach.value = null;
    usedEditionIds.value = new Set();
    phase.value = 'drafting';
    rollTeam();
  }

  function reroll() {
    if (rerollsRemaining.value <= 0) return;
    rerollsRemaining.value--;
    if (phase.value === 'drafting') rollTeam();
    else if (phase.value === 'coach') rollCoachCandidates();
  }

  function pickPlayer(player: Player) {
    if (phase.value !== 'drafting') return;
    if (!candidateRoster.value.includes(player)) return;
    if (!isPositionOpen(player.position)) return;

    picks.value.push({ slot: player.position, player });
    usedEditionIds.value.add(player.editionId);

    if (picks.value.length >= totalRounds.value) {
      phase.value = 'coach';
      rollCoachCandidates();
    } else {
      rollTeam();
    }
  }

  function pickCoach(chosen: Coach) {
    if (phase.value !== 'coach' || !candidateCoaches.value.includes(chosen)) return;
    coach.value = chosen;
    phase.value = 'done';
  }

  function reset() {
    formation.value = null;
    picks.value = [];
    coach.value = null;
    candidateEdition.value = null;
    candidateRoster.value = [];
    candidateCoaches.value = [];
    usedEditionIds.value = new Set();
    rerollsRemaining.value = TOTAL_REROLLS;
    phase.value = 'setup';
  }

  return {
    formation,
    style,
    rerollsRemaining,
    totalRounds,
    isPlayerPhase,
    isCoachPhase,
    isDone,
    candidateEdition,
    candidateRoster,
    candidateCoaches,
    picks,
    coach,
    remainingNeeds,
    isPositionOpen,
    startDraft,
    reroll,
    pickPlayer,
    pickCoach,
    reset,
  };
});
