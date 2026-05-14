-- ─── registros_diarios ───────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor.
-- Safe to re-run — uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.

create table if not exists registros_diarios (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references profiles(id) on delete cascade not null,
  fecha               date not null,
  -- Caloric & adherence tracking
  kcal_consumida      integer default 0,
  comidas_completadas integer default 0,
  comidas_total       integer default 0,
  meals_json          text,           -- JSON map of meal-id → boolean
  -- Body metrics
  peso                numeric(5,1),
  -- Subjective wellbeing (1-5 scale)
  hambre              integer,
  energia             integer,
  -- Qualitative fields
  digestivo           text,           -- 'sin_molestias' | 'leve' | 'moderado' | 'severo'
  animo               text,           -- 'excelente' | 'bueno' | 'regular' | 'malo'
  nota                text,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null,
  -- One row per user per day
  constraint registros_diarios_user_fecha_key unique (user_id, fecha)
);

-- Indexes
create index if not exists registros_diarios_user_id_idx
  on registros_diarios(user_id, fecha desc);

-- RLS
alter table registros_diarios enable row level security;

-- Users manage their own logs
create policy "Users manage own logs"
  on registros_diarios for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Professionals can read their patients' logs
create policy "Professional reads patient logs"
  on registros_diarios for select
  using (
    exists (
      select 1 from profiles p
      where p.id = registros_diarios.user_id
        and p.professional_id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger registros_diarios_updated_at
  before update on registros_diarios
  for each row execute procedure update_updated_at();

-- ─── If table already existed with old column names, add missing columns ──────
-- (safe to run even if columns already exist)
alter table registros_diarios
  add column if not exists kcal_consumida      integer default 0,
  add column if not exists comidas_completadas integer default 0,
  add column if not exists comidas_total        integer default 0,
  add column if not exists meals_json           text,
  add column if not exists hambre               integer,
  add column if not exists energia              integer,
  add column if not exists digestivo            text,
  add column if not exists animo                text,
  add column if not exists nota                 text;

-- Add unique constraint if missing (needed for upsert onConflict)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'registros_diarios_user_fecha_key'
  ) then
    alter table registros_diarios
      add constraint registros_diarios_user_fecha_key unique (user_id, fecha);
  end if;
end $$;
