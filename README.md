# Glórias da América

Draft + simulação com elencos campeões continentais da América do Sul (1960–2025). Vite + Vue 3 + TypeScript.

## Setup

```sh
npm install
cp .env.example .env   # preencher VITE_SUPABASE_URL / VITE_SUPABASE_KEY (chave publishable, não a service role)
npm run seed            # gera public/data/dataset.json a partir de Libertadores_Campeoes.xlsx
npm run dev
```

O app funciona sem `.env` (draft/partida/almanaque são 100% locais); ele só é necessário para
persistir campanhas no Supabase. Ver `supabase/README.md` para aplicar o schema e habilitar
login anônimo no projeto.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck + build de produção
- `npm test` — testes (vitest)
- `npm run seed` — regenera `public/data/dataset.json` a partir da planilha-fonte
- `npm run calibrate [n]` — roda `n` partidas simuladas (padrão 2000) e compara as métricas agregadas às metas do §5.10

## Estrutura

- `src/engine/` — motor de simulação puro (RNG, ratings, tipos), sem dependência de Vue
- `src/i18n/` — mensagens pt-BR e es-419
- `src/stores/`, `src/views/`, `src/components/` — camada Vue/Pinia
- `scripts/seed-from-xlsx.ts` — importa a planilha-fonte e gera o dataset do jogo

Ver `Planejamento Glorias de America.md` para o documento de produto/engenharia completo.
