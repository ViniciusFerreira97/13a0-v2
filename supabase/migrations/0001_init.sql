-- Schema inicial (§8.2 do planejamento). Não aplicado automaticamente — requer um projeto
-- Supabase configurado (`supabase link` + `supabase db push`, ou colar no SQL editor).
-- Nomenclatura evita qualquer referência à competição por motivos de direitos (§11): as
-- tabelas de conteúdo usam "editions" (elenco campeão de uma edição/ano), não o nome da copa.

-- ============================================================================
-- Conteúdo (seed a partir de scripts/seed-from-xlsx.ts → public/data/dataset.json).
-- Somente leitura para o cliente; nunca escrito via API pública.
-- ============================================================================

create table editions (
  id text primary key,               -- slug: "<clube>-<ano>", ex. "flamengo-2025"
  year int not null,
  club text not null,
  country text not null,
  coach_id text not null,
  title_number int not null,
  flavor_text text,
  provisional boolean not null default false,
  created_at timestamptz not null default now()
);

create table coaches (
  id text primary key,               -- slug: "<edition_id>-coach"
  name text not null,
  nationality text not null,
  star boolean not null default false,
  overall int not null check (overall between 1 and 99),
  natural_style text not null default 'equilibrado'
    check (natural_style in ('defensivo', 'equilibrado', 'ofensivo'))
);

alter table editions
  add constraint editions_coach_fk foreign key (coach_id) references coaches (id);

create table players (
  id text primary key,               -- slug: "<edition_id>-<nome>-<índice>"
  edition_id text not null references editions (id) on delete cascade,
  name text not null,
  shirt_number int,
  number_official boolean not null default true,
  position text not null check (
    position in ('GK','LD','ZAG','LE','VOL','MC','MEI','MD','ME','PD','PE','SA','CA')
  ),
  nationality text not null,
  star boolean not null default false,
  clutch boolean not null default false,
  overall int not null check (overall between 1 and 99),
  -- {mar,pas,vel,cru,dri,cab,fin,des} para linha OU {pos,ref,sai,pes,pen} para goleiro.
  att jsonb not null
);

create index players_edition_id_idx on players (edition_id);
create index editions_year_idx on editions (year);

alter table editions enable row level security;
alter table coaches enable row level security;
alter table players enable row level security;

create policy "conteúdo é público para leitura" on editions for select using (true);
create policy "conteúdo é público para leitura" on coaches for select using (true);
create policy "conteúdo é público para leitura" on players for select using (true);
-- Sem policies de insert/update/delete: só o service role (seed/admin) escreve aqui.

-- ============================================================================
-- Perfis e execuções de campanha (runs). RLS: cada usuário só vê/edita o próprio.
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique,
  country text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "usuário lê o próprio perfil" on profiles for select using (auth.uid() = id);
create policy "usuário cria o próprio perfil" on profiles for insert with check (auth.uid() = id);
create policy "usuário atualiza o próprio perfil" on profiles for update using (auth.uid() = id);

create table runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  mode text not null check (mode in ('copa_classica', 'almanaque', 'la_revancha', 'classicos_eternos', 'desafio_diario')),
  seed text not null,
  formation text not null,
  style text not null check (style in ('defensivo', 'equilibrado', 'ofensivo')),
  picks jsonb not null,               -- [{slot, playerId}, ...] + coachId
  result jsonb,                       -- rounds jogadas + placares (preenchido incrementalmente)
  glory boolean not null default false,
  created_at timestamptz not null default now()
);

create index runs_user_id_idx on runs (user_id);

alter table runs enable row level security;

create policy "usuário lê as próprias runs" on runs for select using (auth.uid() = user_id);
create policy "usuário cria runs para si" on runs for insert with check (auth.uid() = user_id);
create policy "usuário atualiza as próprias runs" on runs for update using (auth.uid() = user_id);

-- ============================================================================
-- Desafio Diário. Seed gerada por cron (edge function `daily-seed`); pontuação validada
-- por `submit-daily` via re-simulação determinística (§8.2 — anti-cheat).
-- ============================================================================

create table daily_challenges (
  date date primary key,
  seed text not null
);

alter table daily_challenges enable row level security;
create policy "desafio do dia é público" on daily_challenges for select using (true);

create table daily_scores (
  date date not null references daily_challenges (date) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  score int not null,
  country text,
  created_at timestamptz not null default now(),
  primary key (date, user_id)
);

alter table daily_scores enable row level security;

create policy "placares diários são públicos" on daily_scores for select using (true);
create policy "usuário grava o próprio placar" on daily_scores for insert with check (auth.uid() = user_id);
-- Sem policy de update: pontuação é gravada uma vez pela edge function `submit-daily`
-- (com service role, após re-simular e validar), não editável pelo cliente depois.

-- Leaderboard como view materializada (§8.2 — evita query ao vivo em pico viral).
-- Atualizada por cron (`refresh materialized view concurrently daily_leaderboard`).
create materialized view daily_leaderboard as
select
  ds.date,
  ds.user_id,
  p.handle,
  ds.country,
  ds.score,
  rank() over (partition by ds.date order by ds.score desc) as rank
from daily_scores ds
join profiles p on p.id = ds.user_id;

create unique index daily_leaderboard_pk on daily_leaderboard (date, user_id);

-- ============================================================================
-- Conquistas.
-- ============================================================================

create table achievements (
  code text primary key,
  title text not null,
  description text not null
);

alter table achievements enable row level security;
create policy "conquistas são públicas" on achievements for select using (true);

create table user_achievements (
  user_id uuid not null references profiles (id) on delete cascade,
  code text not null references achievements (code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, code)
);

alter table user_achievements enable row level security;

create policy "usuário lê as próprias conquistas" on user_achievements for select using (auth.uid() = user_id);
create policy "usuário desbloqueia para si" on user_achievements for insert with check (auth.uid() = user_id);
