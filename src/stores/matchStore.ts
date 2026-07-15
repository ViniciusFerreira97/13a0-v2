// Campanha da Copa Clássica (§4.1): fase de grupos (3 jogos) + oitavas/quartas/semi/final = 7
// partidas. Times perdidos na fase de grupos não eliminam (simplificação de MVP: não há tabela
// de outros times simulada); perder no mata-mata encerra a campanha. 7 vitórias = Glória Eterna.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useDatasetStore } from './datasetStore';
import { useDraftStore } from './draftStore';
import { useUserStore } from './userStore';
import { supabase } from '../lib/supabase';
import { simulateMatch, type MatchResult, type TeamSetup } from '../engine/match';
import type { Edition, Player } from '../engine/types';

export interface CampaignRound {
  id: 'grupo1' | 'grupo2' | 'grupo3' | 'oitavas' | 'quartas' | 'semi' | 'final';
  knockout: boolean;
  opponentEditionId: string;
  result?: MatchResult;
  /** Escalações usadas nesta partida — para estatísticas pós-jogo (gols/cartões/notas). */
  homeLineup?: Player[];
  awayLineup?: Player[];
}

const ROUND_IDS: CampaignRound['id'][] = ['grupo1', 'grupo2', 'grupo3', 'oitavas', 'quartas', 'semi', 'final'];
const KNOCKOUT_FROM_INDEX = 3;

function bestEleven(editionId: string, playersByEdition: Map<string, Player[]>): Player[] {
  const players = playersByEdition.get(editionId) ?? [];
  const gk = [...players.filter((p) => p.position === 'GK')].sort((a, b) => b.overall - a.overall)[0];
  const outfield = [...players.filter((p) => p.position !== 'GK')]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10);
  return gk ? [gk, ...outfield] : outfield.slice(0, 11);
}

export const useMatchStore = defineStore('match', () => {
  const dataset = useDatasetStore();
  const draft = useDraftStore();
  const user = useUserStore();

  const campaignSeed = ref<string>('');
  const rounds = ref<CampaignRound[]>([]);
  const currentIndex = ref(0);
  const eliminated = ref(false);
  const runId = ref<string | null>(null);
  const syncError = ref<string | null>(null);

  const currentRound = computed<CampaignRound | null>(() => rounds.value[currentIndex.value] ?? null);
  const isCampaignOver = computed(() => eliminated.value || currentIndex.value >= rounds.value.length);
  const glory = computed(
    () => currentIndex.value === rounds.value.length && rounds.value.every((r) => r.result && wonRound(r)),
  );

  function wonRound(r: CampaignRound): boolean {
    if (!r.result) return false;
    if (r.knockout) return r.result.wentToPenalties ? (r.result.penaltyScore!.home > r.result.penaltyScore!.away) : r.result.homeScore > r.result.awayScore;
    return r.result.homeScore > r.result.awayScore;
  }

  function startCampaign() {
    const draftedEditionIds = new Set(draft.picks.map((p) => p.player.editionId));
    const pool = dataset.editions.filter((e) => !draftedEditionIds.has(e.id));
    const source = pool.length >= 7 ? pool : dataset.editions;
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    const opponents = shuffled.slice(0, 7);

    campaignSeed.value = `campaign-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    rounds.value = ROUND_IDS.map((id, i) => ({
      id,
      knockout: i >= KNOCKOUT_FROM_INDEX,
      opponentEditionId: opponents[i]?.id ?? source[0].id,
    }));
    currentIndex.value = 0;
    eliminated.value = false;
    runId.value = null;
    void persistRunStart();
  }

  /**
   * Sincronização com o Supabase é best-effort: falha de rede/sessão não deve travar o jogo
   * (§7 "anti-frustração"). Erros ficam em `syncError` para a UI exibir um aviso discreto,
   * se quiser — hoje nenhuma view lê esse campo.
   */
  async function persistRunStart() {
    syncError.value = null;
    if (!draft.formation) return;
    try {
      const uid = await user.ensureSession();
      if (!uid) return;
      const { data, error } = await supabase
        .from('runs')
        .insert({
          user_id: uid,
          mode: 'copa_classica',
          seed: campaignSeed.value,
          formation: draft.formation.id,
          style: draft.style,
          picks: draft.picks.map((p) => ({ slot: p.slot, playerId: p.player.id })),
          glory: false,
        })
        .select('id')
        .single();
      if (error) throw error;
      runId.value = data.id;
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : String(err);
    }
  }

  async function persistRunUpdate() {
    if (!runId.value) return;
    try {
      const { error } = await supabase
        .from('runs')
        .update({
          result: rounds.value
            .filter((r) => r.result)
            .map((r) => ({
              id: r.id,
              homeScore: r.result!.homeScore,
              awayScore: r.result!.awayScore,
              wentToPenalties: r.result!.wentToPenalties,
              penaltyScore: r.result!.penaltyScore ?? null,
            })),
          glory: glory.value,
        })
        .eq('id', runId.value);
      if (error) throw error;
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : String(err);
    }
  }

  function playerTeamSetup(side: 'home' | 'away'): TeamSetup {
    if (!draft.formation || !draft.coach || draft.picks.length !== draft.formation.slots.length) {
      throw new Error('draft incompleto');
    }
    // draft.picks já está na ordem dos slots (um push por rodada, na sequência de formation.slots).
    const lineup = draft.picks.map((p) => p.player);
    return { side, lineup, coach: draft.coach, style: draft.style };
  }

  function opponentTeamSetup(edition: Edition, side: 'home' | 'away'): TeamSetup {
    const lineup = bestEleven(edition.id, dataset.playersByEdition);
    const coach = dataset.coachByEditionId.get(edition.id);
    if (!coach || lineup.length < 11) throw new Error(`adversário incompleto: ${edition.id}`);
    return { side, lineup, coach, style: 'equilibrado' };
  }

  function playCurrentRound(): CampaignRound {
    const round = currentRound.value;
    if (!round) throw new Error('campanha já terminou');
    const edition = dataset.editions.find((e) => e.id === round.opponentEditionId);
    if (!edition) throw new Error(`edição do adversário não encontrada: ${round.opponentEditionId}`);

    const home = playerTeamSetup('home');
    const away = opponentTeamSetup(edition, 'away');
    const result = simulateMatch(home, away, { seed: `${campaignSeed.value}-${round.id}`, knockout: round.knockout });

    round.result = result;
    round.homeLineup = home.lineup;
    round.awayLineup = away.lineup;
    if (round.knockout && !wonRound(round)) eliminated.value = true;
    currentIndex.value++;
    void persistRunUpdate();
    return round;
  }

  function reset() {
    campaignSeed.value = '';
    rounds.value = [];
    currentIndex.value = 0;
    eliminated.value = false;
    runId.value = null;
    syncError.value = null;
  }

  return {
    rounds,
    currentIndex,
    currentRound,
    isCampaignOver,
    eliminated,
    glory,
    runId,
    syncError,
    startCampaign,
    playCurrentRound,
    wonRound,
    reset,
  };
});
