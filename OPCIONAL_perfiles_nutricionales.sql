-- 001_perfiles_nutricionales.sql  (OPCIONAL — opción "b")
--
-- Tu esquema actual NO almacena las preferencias/restricciones alimentarias que
-- el generador necesita para filtrar recetas (alergias, alimentos rechazados,
-- preferencias, presupuesto, tiempo de cocina, habilidad culinaria). Solo tienes
-- perfiles_digestivos (intolerancias) y perfiles_suplementacion (médico).
--
-- Esta tabla cierra ese hueco. Es OPCIONAL: el banco ya funciona sin ella
-- (opción "a", con contexto digestivo/médico). Ejecútala cuando quieras que el
-- generador respete también alergias y preferencias.
--
-- Después de crearla, mapéala en lib/repositorioPlanes.ts → obtenerContextoPaciente
-- (reemplaza los arrays vacíos y los defaults por estos campos).

create table if not exists public.perfiles_nutricionales (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null,
  alergias             text[] not null default '{}',
  alimentos_rechazados text[] not null default '{}',
  alimentos_preferidos text[] not null default '{}',
  presupuesto          text not null default 'medio',   -- bajo | medio | alto
  tiempo_cocinar_min   integer not null default 30,
  habilidad_culinaria  text not null default 'intermedia', -- basica | intermedia | avanzada
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_perfiles_nutricionales_user
  on public.perfiles_nutricionales (user_id);

-- RLS: alinéalo con tus otras tablas de perfiles (cada paciente ve lo suyo;
-- el profesional ve a sus pacientes). El job de generación usa service role,
-- que bypassa RLS — por eso esa ruta valida el rol del llamador en el servidor.
alter table public.perfiles_nutricionales enable row level security;
