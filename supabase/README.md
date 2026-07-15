# Supabase

Schema em `migrations/0001_init.sql` (§8.2 do planejamento).

## Setup no seu projeto

1. **Aplicar o schema** — precisa da CLI logada (não disponível neste ambiente) ou colar o SQL
   direto no SQL editor do painel:
   ```sh
   supabase link --project-ref <ref>
   supabase db push
   ```
2. **Habilitar login anônimo** — testado com a chave publishable em `.env` e está **desligado**
   por padrão no projeto atual. Painel → Authentication → Sign In / Providers → habilitar
   "Allow anonymous sign-ins". Sem isso, `userStore.ensureSession()` falha silenciosamente e
   `matchStore` simplesmente não persiste runs (o jogo continua funcionando 100% local).

Depois de aplicar, popule `editions`/`players`/`coaches` a partir de `public/data/dataset.json`
(gerado por `npm run seed`) — ainda não há script de import para o Postgres, só o de geração do
JSON estático usado pelo client.

Falta implementar: edge functions `daily-seed`, `submit-daily` (anti-cheat por re-simulação) e
`share-og`, além do client Supabase no front-end (`src/stores/` ainda não fala com o Supabase).
