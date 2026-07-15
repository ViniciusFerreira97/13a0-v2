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

/** Jogo entre dois adversários do grupo (nenhum dos dois é o time do jogador) — simulado
 *  inteiro em segundo plano, sem lance a lance, só para alimentar a classificação. */
export interface OtherGroupMatch {
  homeEditionId: string;
  awayEditionId: string;
  result: MatchResult;
}

export interface StandingRow {
  /** 'player' para o time do usuário, ou o id da edição adversária. */
  id: string;
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

const ROUND_IDS: CampaignRound['id'][] = ['grupo1', 'grupo2', 'grupo3', 'oitavas', 'quartas', 'semi', 'final'];
const KNOCKOUT_FROM_INDEX = 3;

/**
 * Classificação do grupo: 4 times (jogador + 3 adversários), turno único — cada um enfrenta os
 * outros 3 uma vez. Função pura (sem depender do store) para que a view possa recalcular a
 * mesma tabela substituindo, na rodada em revelação, o resultado final pelo placar ao vivo
 * (§ pedido do usuário: a classificação deve acompanhar o placar ao vivo, não só o resultado
 * já fechado) — em empate de critérios, o time do jogador fica na frente (ordenação estável,
 * jogador é o primeiro da lista).
 */
export function computeGroupStandings(groupRounds: CampaignRound[], otherMatches: OtherGroupMatch[]): StandingRow[] {
  if (!groupRounds.length) return [];

  const rows = new Map<string, StandingRow>();
  const rowFor = (id: string): StandingRow => {
    let row = rows.get(id);
    if (!row) {
      row = { id, played: 0, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
      rows.set(id, row);
    }
    return row;
  };
  rowFor('player');
  for (const r of groupRounds) rowFor(r.opponentEditionId);

  function apply(homeId: string, awayId: string, result: MatchResult) {
    const home = rowFor(homeId);
    const away = rowFor(awayId);
    home.played++;
    away.played++;
    home.goalsFor += result.homeScore;
    home.goalsAgainst += result.awayScore;
    away.goalsFor += result.awayScore;
    away.goalsAgainst += result.homeScore;
    if (result.homeScore > result.awayScore) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (result.homeScore < result.awayScore) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    }
  }

  for (const r of groupRounds) {
    if (r.result) apply('player', r.opponentEditionId, r.result);
  }
  for (const m of otherMatches) {
    apply(m.homeEditionId, m.awayEditionId, m.result);
  }

  return [...rows.values()].sort(
    (a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor,
  );
}

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
  const otherGroupMatches = ref<OtherGroupMatch[]>([]);
  const currentIndex = ref(0);
  const eliminated = ref(false);
  const runId = ref<string | null>(null);
  const syncError = ref<string | null>(null);

  const currentRound = computed<CampaignRound | null>(() => rounds.value[currentIndex.value] ?? null);
  const isCampaignOver = computed(() => eliminated.value || currentIndex.value >= rounds.value.length);
  const glory = computed(
    () => currentIndex.value === rounds.value.length && rounds.value.every((r) => r.result && wonRound(r)),
  );

  const groupStandings = computed<StandingRow[]>(() =>
    computeGroupStandings(
      rounds.value.filter((r) => !r.knockout),
      otherGroupMatches.value,
    ),
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
    otherGroupMatches.value = [];
    void persistRunStart();
  }

  /**
   * Grupo de 4 (jogador + 3 adversários), turno único. As rodadas são simultâneas de verdade:
   * cada vez que o jogador joga sua partida da rodada N, o outro confronto da MESMA rodada
   * (entre os dois adversários que não jogam contra o jogador) é simulado junto, na hora — nunca
   * antes. Assim a classificação nunca aparece com pontos de rodadas que ainda não aconteceram.
   */
  function otherGroupFixtureFor(roundId: CampaignRound['id'], campaignRounds: CampaignRound[]): [string, string] | null {
    const groupRounds = campaignRounds.filter((r) => !r.knockout);
    if (groupRounds.length !== 3) return null;
    const [a, b, c] = groupRounds.map((r) => r.opponentEditionId);
    const fixtureByRound: Partial<Record<CampaignRound['id'], [string, string]>> = {
      grupo1: [b, c],
      grupo2: [c, a],
      grupo3: [a, b],
    };
    return fixtureByRound[roundId] ?? null;
  }

  function simulateOtherGroupMatch(homeId: string, awayId: string): OtherGroupMatch {
    const homeEdition = dataset.editions.find((e) => e.id === homeId)!;
    const awayEdition = dataset.editions.find((e) => e.id === awayId)!;
    const result = simulateMatch(
      opponentTeamSetup(homeEdition, 'home'),
      opponentTeamSetup(awayEdition, 'away'),
      { seed: `${campaignSeed.value}-group-${homeId}-${awayId}`, knockout: false },
    );
    return { homeEditionId: homeId, awayEditionId: awayId, result };
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

    if (!round.knockout) {
      // Rodada simultânea de verdade: o confronto entre os outros dois times do grupo nesta
      // mesma rodada só é simulado agora — nunca antes — para a classificação nunca "vazar"
      // pontos de rodadas futuras.
      const fixture = otherGroupFixtureFor(round.id, rounds.value);
      if (fixture) otherGroupMatches.value.push(simulateOtherGroupMatch(fixture[0], fixture[1]));
    }

    if (round.knockout) {
      if (!wonRound(round)) eliminated.value = true;
    } else if (round.id === 'grupo3' && groupStandings.value[0]?.id !== 'player') {
      // fase de grupos terminou e o jogador não ficou em 1º — só o líder avança às oitavas.
      eliminated.value = true;
    }
    currentIndex.value++;
    void persistRunUpdate();
    return round;
  }

  function reset() {
    campaignSeed.value = '';
    rounds.value = [];
    otherGroupMatches.value = [];
    currentIndex.value = 0;
    eliminated.value = false;
    runId.value = null;
    syncError.value = null;
  }

  return {
    rounds,
    otherGroupMatches,
    currentIndex,
    currentRound,
    isCampaignOver,
    eliminated,
    glory,
    groupStandings,
    runId,
    syncError,
    startCampaign,
    playCurrentRound,
    wonRound,
    reset,
  };
});
