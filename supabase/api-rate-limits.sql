-- ─── api_rate_limits ─────────────────────────────────────────────────────────
-- Tracking de rate limits para endpoints expensivos (Anthropic, Vision).
-- Cada bucket cuenta llamadas dentro de una ventana fija.
-- Run en Supabase SQL Editor.

create table if not exists api_rate_limits (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade not null,
  endpoint      text not null,                  -- ej. 'chat' | 'food-scan'
  window_start  timestamptz not null,           -- inicio de la ventana del bucket
  count         integer default 1 not null,
  created_at    timestamptz default now() not null,
  -- Un solo bucket activo por (user, endpoint, ventana) — clave para upsert
  constraint api_rate_limits_user_endpoint_window_key
    unique (user_id, endpoint, window_start)
);

-- Lookup principal: ¿cuántas llamadas hizo este usuario a este endpoint en
-- las últimas N horas? Indexa por user_id + endpoint + window_start DESC.
create index if not exists api_rate_limits_user_endpoint_idx
  on api_rate_limits (user_id, endpoint, window_start desc);

-- Limpieza: borrar buckets viejos (>7 días) periódicamente
-- (correr esto en un cron o como tarea de mantenimiento)
-- delete from api_rate_limits where window_start < now() - interval '7 days';

-- RLS — usuarios NO ven estos buckets directamente, solo el service role los maneja
alter table api_rate_limits enable row level security;

create policy "Service role manages rate limits"
  on api_rate_limits for all
  using (false)
  with check (false);
