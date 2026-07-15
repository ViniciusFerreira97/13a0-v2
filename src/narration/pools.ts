// Pools de frases por evento e locale (§8.1 narration/). Placeholder {player} é interpolado
// em narrate(). Flavor packs por país (es-AR, es-MX...) entram depois — hoje só pt-BR/es-419.

import type { MatchEventType } from '../engine/events';

export type NarrationLocale = 'pt-BR' | 'es-419';

type Pool = Partial<Record<MatchEventType, string[]>>;

export const NARRATION_POOLS: Record<NarrationLocale, Pool> = {
  'pt-BR': {
    kickoff: ['Bola rolando!'],
    goal: ['GOOOL! {player} balança as redes!', 'Que golaço de {player}!', '{player} não perdoa!'],
    yellow_card: ['Cartão amarelo para {player}.'],
    red_card: ['Vermelho direto! {player} está fora da partida.'],
    second_yellow: ['Segundo amarelo — {player} vai para o chuveiro mais cedo.'],
    penalty_awarded: ['Pênalti! A arbitragem aponta para a marca da cal.'],
    penalty_scored: ['{player} cobra e não desperdiça — é gol!'],
    penalty_missed: ['{player} bate mal e perde a chance!'],
    free_kick_goal: ['Falta cobrada por {player}... GOL direto!'],
    shot_saved: ['Defesaça do goleiro no chute de {player}!', 'Que defesa! {player} não teve a mesma sorte dessa vez.'],
    shot_blocked: ['{player} chuta e a zaga bloqueia.'],
    shot_wide: ['{player} chuta para fora.'],
    offside: ['Impedimento! {player} saiu adiantado.'],
    clean_tackle: ['Roubada de bola de {player}!'],
    foul: ['Falta de {player}.'],
    full_time: ['Fim de jogo!'],
    extra_time_start: ['Vamos para a prorrogação!'],
  },
  'es-419': {
    kickoff: ['¡Rueda la pelota!'],
    goal: ['¡GOOOL! ¡{player} sacude las redes!', '¡Golazo de {player}!', '¡{player} no perdona!'],
    yellow_card: ['Tarjeta amarilla para {player}.'],
    red_card: ['¡Roja directa! {player} se va expulsado.'],
    second_yellow: ['Segunda amarilla — {player} se va antes de tiempo.'],
    penalty_awarded: ['¡Penal! El árbitro señala el punto blanco.'],
    penalty_scored: ['{player} cobra y no falla — ¡es gol!'],
    penalty_missed: ['¡{player} cobra mal y desperdicia la chance!'],
    free_kick_goal: ['Tiro libre de {player}... ¡GOL directo!'],
    shot_saved: ['¡Gran atajada del arquero al remate de {player}!'],
    shot_blocked: ['{player} dispara y la defensa bloquea.'],
    shot_wide: ['{player} dispara desviado.'],
    offside: ['¡Fuera de lugar! {player} salió adelantado.'],
    clean_tackle: ['¡Robo de pelota de {player}!'],
    foul: ['Falta de {player}.'],
    full_time: ['¡Final del partido!'],
    extra_time_start: ['¡Vamos al alargue!'],
  },
};
