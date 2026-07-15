# GLÓRIAS DA AMÉRICA — Planejamento de Produto e Engenharia
### Jogo web de draft + simulação com os campeões da Copa Libertadores (1960–2025)
**Stack:** Vite + Vue 3 + TypeScript + Supabase (BaaS) · **Plataforma:** Mobile-first (PWA) · **Mercados:** 🇧🇷 🇦🇷 🇲🇽 🇵🇾 🇺🇾 🇨🇴

---

## 1. Visão do produto

O 7a0.com.br provou a fórmula: draft rápido de 11 jogadores + simulação de campanha + zero fricção (sem cadastro, sem download) = viral. Mas o 7a0 simula com um "overall agregado" e entrega só um placar. Nós temos algo que ele não tem: **uma base própria com 66 elencos campeões da Libertadores, ~968 jogadores com 13 atributos individuais (8 de linha + 5 de goleiro), estrelas e técnicos**. Isso permite construir a camada que falta no gênero: **um motor de partida evento-a-evento** — gols narrados minuto a minuto, desarmes, faltas, cartões, pênaltis, tiros livres e impedimentos — onde a escalação importa de verdade (um zagueiro com Desarme 84 muda a partida de um jeito visível, não só somando média).

A fantasia central: **"Monte o time dos sonhos da América e sobreviva à Copa Libertadores mais difícil de todos os tempos."** O nome de trabalho *Glórias da América* conversa com a "Glória Eterna" da CONMEBOL sem usar marca registrada (ver §11, Riscos).

O gancho emocional é continental, não europeu: Pelé do Santos 62, Bochini do Rojo, Francescoli do River 96, Chilavert do Vélez, Zico do Fla 81, Higuita do Atlético Nacional — os ídolos que o nosso público-alvo viu (ou ouviu do pai e do avô).

---

## 2. Mercado-alvo e localização (o coração da estratégia)

O jogo é desenhado **para** a América Latina, não traduzido para ela.

**Idiomas de lançamento:** `pt-BR` e `es-419` (neutro) na base, com *flavor packs* por país que trocam gírias de narração e referências: `es-AR` com voseo e narração estilo rioplatense ("¡La mandó a guardar!"), `es-MX` ("¡Se va, se va… GOOOL!"), `es-CO`, `es-PY` (com pitadas de guarani nas conquistas: *"¡Ha'evete!"*), `es-UY`. A narração da partida é o principal veículo de localização — cada evento do motor tem um pool de frases por locale, e o narrador é parte da diversão.

**Ganchos por país** (conteúdo, não só idioma):

| País | Gancho principal | Conteúdo específico |
|---|---|---|
| 🇧🇷 Brasil | 24 títulos, era recente dominante | Modos "Era dos Milionários" (2019–2025), rivalidades Fla×Flu, Grêmio×Inter, Palmeiras×Corinthians |
| 🇦🇷 Argentina | 25 títulos, maior vencedor | Modo "La Séptima" (Independiente, recordista com 7), Boca de Bianchi, River de Gallardo, superclásico |
| 🇲🇽 México | **Nunca venceu** — 3 finais perdidas | **Modo "La Revancha"**: jogar com Cruz Azul 2001, Chivas 2010 e Tigres 2015 (vices, que já temos no índice) e reescrever a história. É o gancho de marketing mais forte do projeto |
| 🇺🇾 Uruguai | Berço do torneio, Peñarol 1º campeão | Modo "Clásico del Río de la Plata", Peñarol×Nacional, Spencer e Francescoli em destaque |
| 🇵🇾 Paraguai | Olimpia 3x, Chilavert | Modo "Decano de América", cards do Chilavert batendo falta (GK cobrador!) |
| 🇨🇴 Colômbia | Higuita, Once Caldas 2004 (zebra épica) | Modo "El Milagro de Manizales" — vencer a copa com um elenco de underdogs |

**Distribuição pensada para LATAM:** compartilhamento nativo via **WhatsApp** (canal dominante nos 6 países) com card de imagem gerado no client (canvas → PNG); PWA instalável (mercado majoritariamente Android); *low-data mode* (bundle < 300 KB inicial, imagens lazy, funciona em 3G); zero cadastro obrigatório (anônimo primeiro, conta depois — igual à lição do 7a0).

---

## 3. Conteúdo: a base que já temos

A planilha construída na nossa pesquisa vira o *seed* do banco:

**Já pronto:** 66 elencos campeões (1960–2025) em ordem histórica; ~968 jogadores com Nome, Posição (GK/LD/ZAG/LE/VOL/MC/MEI/MD/ME/PD/PE/SA/CA), Nacionalidade, Nº (oficial em 6 elencos, provisório nos demais), Estrela, Overall calibrado (Pelé 92 no teto, estrelas ≥ 81) e 13 atributos; 66 técnicos com overall.

**A produzir para o jogo:** os 3 vices mexicanos (modo La Revancha) + vices icônicos para rivalidades; *flavor text* de cada elenco (1 frase de contexto histórico); flags de "clutch" para heróis de final (ex.: John Kennedy 2023, Breno Lopes 2020 — bônus em prorrogação, ver motor §5.9).

**Honestidade de dados (mantida no produto):** atributos e overalls são estimativas nossas — no jogo isso é *design*, não problema; mas a tela "Sobre" declara que as notas são autorais, e os elencos antigos com time-base da final indicam a fonte. Isso protege juridicamente e constrói confiança com o público hardcore.

---

## 4. Modos de jogo

**4.1 · Copa Clássica (o loop principal, herdado do 7a0 e melhorado).** O jogador escolhe formação (8 esquemas) e estilo (defensivo/equilibrado/ofensivo). A cada rodada de draft, o sistema sorteia **um elenco campeão** (ex.: "River Plate 1996") e o jogador escolhe **1 jogador** para uma posição compatível; 11 rodadas + 1 sorteio de **técnico** (nosso diferencial — o 12º pick). 3 re-rolls. Depois, simula a Libertadores: **fase de grupos (3 jogos) + oitavas, quartas, semi e final = 7 partidas**. Vencer as 7 sem perder = **"7 de 7 — Glória Eterna"**.

**4.2 · Modo Almanaque.** Atributos ocultos; só nome/clube/ano. Para o público que sabe quem era o 5 do Estudiantes de Zubeldía.

**4.3 · La Revancha (México).** Campanha com elenco fixo (Cruz Azul 01 / Chivas 10 / Tigres 15) refazendo a final perdida e depois a copa inteira.

**4.4 · Clásicos Eternos.** Partida única: você escala um lado de uma rivalidade histórica com o elenco real do título (Boca 2000 × River 1996, Peñarol 1987 × Nacional 1988, Fla 81 × Grêmio 83...), o rival é controlado pela IA de técnico. Ideal para sessões de 3 minutos.

**4.5 · Desafio Diário.** Mesma seed de draft para o mundo inteiro (mesmos sorteios, escolhas diferentes) — ranking diário por país e global. É o motor de retenção nº 1 e de conversa em grupo de WhatsApp ("hoje saiu Santos 62 na 3ª rodada, pegou o Pelé?").

**4.6 · Multiplayer (v2).** Salas privadas: draft alternado com o mesmo pool de sorteios (snake draft) e depois partida direta entre os dois times no motor. Realtime via Supabase Realtime.

---

## 5. Motor de partida (o coração do produto)

Princípios: **determinístico** (PRNG com seed → replays compartilháveis e validação anti-cheat no servidor), **evento-a-evento** (não é sorteio de placar), **atributos com efeito legível** (o jogador percebe *por que* perdeu) e **calibrado com estatísticas reais** de futebol.

### 5.1 · Estrutura geral

A partida é uma sequência de **~110 ticks de posse** (≈ um lance a cada 50s de jogo simulado; média real de posses efetivas por time ≈ 50–55). Cada tick:

```
tick(estado):
  1. disputa de meio-campo  → quem tem a posse
  2. fase de progressão     → a posse vira chance? (ou é desarmada / vira falta)
  3. se chance: tipo de chance (jogada aberta, cruzamento, enfiada, bola parada)
  4. resolução (chute × goleiro | impedimento | bloqueio)
  5. atualização de estado (placar, fadiga, momentum, cartões, minuto)
```

### 5.2 · Ratings de zona (derivados dos nossos 13 atributos)

Para cada time, calculados na escalação e recalculados a cada substituição/expulsão:

```
MEIO   = média ponderada de (Passe·0.4 + Drible·0.2 + Marcação·0.2 + Desarme·0.2)
         dos VOL/MC/MEI/MD/ME  (+ Jogo com os Pés do GK · 0.05 como bônus de saída)
DEFESA = média de (Marcação·0.35 + Desarme·0.35 + Velocidade·0.15 + Cabeceio·0.15)
         dos ZAG/LD/LE (+ linha: Velocidade média dos ZAG define a "altura da linha")
ATAQUE = média de (Finalização·0.35 + Drible·0.2 + Velocidade·0.2 + Passe·0.1 + Cabeceio·0.15)
         dos PD/PE/SA/CA/MEI
GK     = (Posicionamento·0.3 + Reflexo·0.3 + Saída·0.15 + Pés·0.1 + Pênalti·0.15)
```

Modificadores multiplicativos por cima das zonas: **estilo do técnico** (defensivo: DEF +6%, ATQ −6%; ofensivo: inverso), **overall do técnico** (cada ponto acima de 78 dá +0,4% em todas as zonas — teto +3%), **química de era** (3+ jogadores do mesmo elenco campeão: +2% por trinca, teto +6% — recompensa quem conhece história), **fadiga** (a partir do minuto 60, times de estilo ofensivo decaem 0,15%/min; substituição zera a fadiga do que entra), **momentum** (gol sofrido nos últimos 10 min: −3% temporário; gol marcado: +3% por 8 min).

### 5.3 · Disputa de posse

```
pPosseA = MEIO_A^1.6 / (MEIO_A^1.6 + MEIO_B^1.6)
```
O expoente 1.6 acentua diferenças sem tornar impossível a zebra (Once Caldas 2004 tem que poder acontecer).

### 5.4 · Progressão: desarme, falta ou chance

Com a posse definida, o time atacante tenta progredir. O defensor tenta o desarme:

```
qualidadeAtaque  = 0.6·Drible(portador) + 0.4·Passe(apoio)      // portador sorteado por peso de posição
qualidadeDesarme = 0.6·Desarme(marcador) + 0.4·Marcação(marcador)
pDesarmeLimpo    = σ((qualidadeDesarme − qualidadeAtaque)/12) · 0.42
pFalta           = pTentativa · (1 − taxaSucesso) · agressividade   // agressividade sobe com estilo defensivo e com placar adverso
```

Resultados possíveis do tick: **desarme limpo** (posse inverte — evento "roubada de bola de Fulano!"), **falta** (→ §5.6), **progressão** (→ chance) ou **posse estéril** (nada acontece — a maioria dos ticks, como no futebol real).

### 5.5 · Chances e impedimento

Tipo de chance sorteado conforme o perfil do ataque (time com pontas de Cruzamento alto gera mais cruzamentos; time com MEI de Passe alto gera mais enfiadas):

| Tipo | Gatilho de atributo | Risco de impedimento | Resolução |
|---|---|---|---|
| Jogada trabalhada | Passe+Drible | baixo (4%) | chute normal |
| Enfiada nas costas | Passe do MEI × Velocidade do CA **vs** linha da defesa | **alto: 18–30%** | 1×1 com goleiro (Saída do Gol pesa) |
| Cruzamento | Cruzamento do ala × Cabeceio do alvo | médio (8%) | cabeçada (GK Posicionamento) |
| Chute de fora | Finalização do MC/MEI | zero | chute de longe (xG baixo) |
| Contra-ataque | Velocidade média do ataque, após desarme | médio (10%) | 1×1 ou 2×1 |

`pImpedimento = base(tipo) · (VelocidadeAtacante < VelocidadeLinha ? 1.3 : 0.8) · disciplina(técnico)`. Impedimento gera o evento narrado ("Bandeira em pé! Fulano partiu adiantado") e devolve a posse. Times com defesa **rápida** jogam com linha alta e *provocam* mais impedimentos — atributo virando tática visível.

### 5.6 · Faltas, tiros livres e pênaltis

Cada falta recebe uma **zona** (defesa 55% / meio 30% / entrada da área 12% / **dentro da área 3%** → pênalti).

**Tiro livre direto** (entrada da área): cobrador = melhor `0.7·Finalização + 0.3·Cruzamento` em campo (Chilavert, sendo GK, entra na disputa — easter egg real). `pGol = σ((cob − 0.5·(GK_Posicionamento+GK_Reflexo))/15) · 0.11` (≈ 6–9% real). **Tiro livre indireto/lateral**: vira cruzamento (§5.5) com bônus.

**Pênalti**: cobrador = maior Finalização (com flag de "cobrador oficial" quando soubermos historicamente). `pGol = 0.76 + (Finalização−75)·0.004 − (GK_DefPênalti−75)·0.005`, clamp [0.60, 0.90]. Narração dedicada com suspense em 3 atos (é o momento de maior tensão — merece UI própria, ver §7).

### 5.7 · Cartões, expulsão e suspensão

Severidade sorteada por falta: 72% sem cartão, **24% amarelo**, 2.5% vermelho direto, 1.5% amarelo em quem já tem (→ vermelho). Modificadores: `agressividade` do time, minuto (finais de jogo tenso ↑), e Marcação alta com Desarme **baixo** ↑ (o "zagueiro faltoso" emerge dos dados sozinho). **Expulsão** remove o jogador das zonas (recálculo imediato, −1 no tick de posse) e o técnico reage (IA: sacrifica um atacante para repor a zona). **No modo campanha, 2 amarelos acumulados = suspensão na próxima partida** — de repente o banco (picks 12–15, ver §4.1 evolução) importa, e o jogador sente a Libertadores de verdade.

### 5.8 · Resolução do chute

```
xG_base(tipo)  ∈ {0.09 fora da área, 0.15 cabeçada, 0.18 jogada, 0.33 1×1, 0.76 pênalti}
ataque         = Finalização(chutador) (ou Cabeceio, se cruzamento)
defesaGK       = 0.5·Posicionamento + 0.5·Reflexo   (Saída, no 1×1)
pGol           = xG_base · (1 + (ataque − defesaGK)/60)   → clamp [0.02, 0.55] (exceto pênalti)
senão          → defesa do goleiro (evento!) 55% | bloqueio/trave 20% | pra fora 25%
```

Defesas difíceis geram evento narrado com nome do goleiro — goleiros viram protagonistas (mercado uruguaio e paraguaio agradece).

### 5.9 · Estrelas e "clutch"

Jogadores ★ ganham `+4%` nos seus atributos-chave em mata-mata e `+8%` do minuto 80 em diante e na prorrogação. Heróis históricos de final (flag `clutch`) ganham `+12%` na prorrogação: o motor recria, sem script, o arquétipo do John Kennedy. Prorrogação (30 ticks) e **disputa de pênaltis** (5 + alternadas, usando §5.6 com pressão crescente: −1.5% por cobrança a partir da 4ª) fecham o mata-mata empatado.

### 5.10 · Calibração (metas por partida simulada, validadas por 100k sims em CI)

| Métrica | Meta (média real) | Tolerância |
|---|---|---|
| Gols/partida (soma) | 2.6 | ±0.3 |
| Finalizações/time | 12 | ±3 |
| Faltas/partida | 24 | ±5 |
| Amarelos/partida | 4.2 | ±1 |
| Vermelhos/partida | 0.20 | ±0.08 |
| Impedimentos/partida | 3.5 | ±1.5 |
| Pênaltis/partida | 0.28 | ±0.1 |
| Zebra (time 5 pts de overall abaixo vence) | ~26% | ±4% |

A última linha é a mais importante do jogo inteiro: **zebra calibrada = viciante**. 0% de zebra é planilha; 50% é cara-ou-coroa. ~26% é futebol.

---

## 6. Técnicos e táticas (o 12º pick)

O técnico sorteado define: **estilo base** (pode ser trocado pelo jogador, mas com o estilo "natural" do técnico ganha +2% — Bianchi defensivo, Telê ofensivo), **bônus de zona** pelo overall (§5.2), **IA de substituições** na simulação (perdendo aos 70': entra atacante; vencendo: entra volante; jogador amarelado e caçado: sai), e **disciplina** (menos faltas bobas e impedimentos com técnicos 82+). Sinergia técnico+jogadores do mesmo título (Abel + cria de 2020/21, Gallardo + River 2018) dá +3% de química. Isso cria um metagame de colecionador que o 7a0 não tem.

---

## 7. UX mobile-first e o "viciante"

**Fluxo de 1 sessão (meta: < 4 min do toque ao resultado):** Home → "Jogar" (1 toque, sem login) → formação (default 4-3-3) → 11 rodadas de draft com cards grandes e toque único → **partida simulada como "timeline ao vivo"**: eventos pingando em feed vertical (estilo minuto a minuto de app de placar, linguagem que todo latino-americano já conhece), com aceleração ×1/×8/pular, e **momentos de pausa dramática** (pênalti tem tela própria com botão "VER COBRANÇA"). Resultado → **card de compartilhamento** (escudo fictício do seu time, XI, placar dos 7 jogos, selo "GLÓRIA ETERNA" se 7/7) → botão WhatsApp gigante.

**Loops de retenção:** Desafio Diário com streak (fogo 🔥 por dias seguidos — mecânica Wordle/Duolingo); conquistas temáticas (73+ como o 7a0: "Maracanazo" = vencer final fora de casa, "Muralla" = 7 jogos sem sofrer gol, "Ha'evete" = título com 6+ paraguaios); coleção de títulos por país ("vença com um campeão de cada país-sede"); ranking semanal por país (bandeira no leaderboard — rivalidade BR×AR é marketing grátis); *near-miss design* — perder na final dói e mostra na hora o botão "REVANCHE" com a mesma seed.

**Anti-frustração:** partida completa em ~35s no modo rápido; nunca mais de 2 toques até "jogar de novo"; sem energia/vidas/paywall no loop principal.

---

## 8. Arquitetura técnica

### 8.1 · Front-end (Vite + Vue 3 + TS)

```
src/
├─ engine/          # motor PURO (zero dependência de Vue) — pacote TS isolado
│  ├─ rng.ts        # PRNG determinístico (mulberry32 + seed string)
│  ├─ ratings.ts    # zonas a partir dos atributos
│  ├─ match.ts      # loop de ticks (§5)
│  ├─ events.ts     # tipos de evento (gol, desarme, falta, cartão…)
│  └─ calibrate.ts  # harness de 100k sims (roda em CI, valida §5.10)
├─ narration/       # pools de frases por locale e por evento
├─ stores/          # Pinia: draftStore, matchStore, userStore, dailyStore
├─ views/           # Home, Draft, Match, Result, Rankings, Almanaque
├─ components/      # PlayerCard, PitchFormation, EventFeed, ShareCard
├─ composables/     # useShareImage (canvas→PNG), useHaptics, useLocale
└─ i18n/            # pt-BR, es-419 + flavor packs
```

Decisões-chave: motor roda **no cliente** (Web Worker para não travar UI) — latência zero, custo de servidor zero no modo casual; **seed determinística** = replay por URL (`/replay/:seed`) e share sem backend; Pinia com persistência em `localStorage` para anônimos; PWA (vite-plugin-pwa) com cache das tabelas de jogadores → **funciona offline no metrô** (LATAM real-life); bundle inicial < 300 KB (dados dos elencos em JSON comprimido, ~150 KB gzip, carregado sob demanda).

### 8.2 · Supabase (BaaS)

```sql
-- núcleo de conteúdo (seed a partir da nossa planilha)
editions(id, year, club, country, coach_id, title_number, flavor_text)
players(id, edition_id, name, nickname, shirt_number, number_official bool,
        position, nationality, star bool, overall,
        att jsonb)            -- {mar,pas,vel,cru,dri,cab,fin,des} ou {pos,ref,sai,pes,pen}
coaches(id, name, nationality, overall, natural_style)

-- jogo
profiles(id → auth.users, handle, country, created_at)      -- anônimo via signInAnonymously
runs(id, user_id, mode, seed, formation, style, picks jsonb,
     result jsonb, glory bool, created_at)                   -- 1 linha por campanha
daily_challenges(date pk, seed)                              -- edge function cron gera à 00:00 BRT
daily_scores(date, user_id, score, country, pk(date,user_id))
achievements(code pk, …) / user_achievements(user_id, code, unlocked_at)
```

RLS em tudo (`user_id = auth.uid()`); leaderboards via **views materializadas** atualizadas por cron (não query ao vivo — segura custo em viral); **Edge Functions**: `daily-seed` (cron), `submit-daily` (**anti-cheat**: recebe seed + picks + resultado, re-simula com o mesmo motor compilado para Deno — determinismo garante bit-a-bit — e só grava se bater), `share-og` (gera OG image do card para link preview no WhatsApp). Realtime channels só no multiplayer (v2). Auth: anônimo por padrão, upgrade para OAuth Google/Apple preservando o histórico.

### 8.3 · Performance e custo em pico viral

Conteúdo estático (elencos) servido por CDN como JSON versionado, **não** consultado no Postgres por request — o banco só vê escritas de resultado e leituras de ranking. Estimativa: 100k jogadores/dia ≈ 300k writes leves/dia → confortável no tier Pro do Supabase. Se o daily viralizar, o gargalo é a edge function de validação: re-simulação custa ~10 ms, aguenta.

---

## 9. Roadmap

**MVP (6–8 semanas):** Copa Clássica + Almanaque, motor completo §5 com calibração automatizada, narração pt-BR + es-419, share card WhatsApp, PWA, anônimo, Desafio Diário com ranking por país. *Corte consciente:* sem multiplayer, sem La Revancha, 20 elencos (2000–2025) no ar — o resto entra semanalmente como evento ("chegou o Santos de Pelé!" = pico de retorno programado).

**v1 (semanas 9–14):** todos os 66 elencos + técnicos completos, La Revancha (lançar casado com jogo do México na Copa 2026 — timing!), Clásicos Eternos, conquistas, flavor packs es-AR/es-MX, contas persistentes.

**v2:** multiplayer (salas, snake draft, Realtime), replays por URL com "assistir de novo", modo temporada (16 times, mata-mata completo entre usuários assíncrono), editor de escudo.

---

## 10. Métricas de sucesso

D1 retention ≥ 35%, D7 ≥ 15% (benchmark casual puzzle); sessões/dia por usuário ativo ≥ 2.5; taxa de share ≥ 8% dos resultados; % de campanhas "Glória Eterna" entre 4–7% (se >10%, dificuldade sobe — a raridade É o produto); K-factor via WhatsApp ≥ 0.4 no lançamento.

## 11. Riscos e mitigação

**Direitos de imagem/nome (o risco nº 1 do gênero, já apontado na cobertura do 7a0):** não usamos fotos nem rostos; nomes de jogadores históricos em contexto de banco de dados factual têm precedentes, mas a recomendação é lançar com **consultoria jurídica prévia** (LGPD + direito de imagem BR/AR), escudos **fictícios estilizados** (cores + ano, nunca o escudo real) e nome do jogo sem marcas CONMEBOL. Plano B preparado: modo com apelidos históricos ("O Rei", "El Bocha") destravável. **Balanceamento:** CI roda 100k sims por PR e trava merge fora das metas §5.10. **Custo Supabase em viral:** arquitetura já desenhada para conteúdo em CDN e writes mínimos (§8.3). **Dados provisórios (números com `*`):** invisível para o jogador casual; tela Almanaque marca fontes, e a comunidade pode reportar correções (formulário → nós validamos na fonte oficial, como fizemos com a Galo Digital).

---

*Documento vivo — versão 1.0. Próximos anexos possíveis: wireframes das 6 telas, schema SQL completo com seeds, e protótipo do motor em TS puro com harness de calibração.*
