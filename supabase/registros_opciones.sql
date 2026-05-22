-- ============================================================================
-- registros_opciones — Tracking granular de qué opción específica del banco
-- consumió el paciente en cada tiempo de comida del día.
--
-- A diferencia de `registros_diarios` (que mide "completaste tu desayuno SI/NO"),
-- esto guarda CUÁL preparación elegiste — clave para:
--   • Rotación inteligente (no repetir lo mismo todos los días)
--   • Detectar opciones favoritas/desechadas
--   • Alertar al profesional cuando una opción se repite mucho
--   • Métrica de "diversidad culinaria" semanal
--
-- Ejecutar UNA VEZ en el SQL editor de Supabase.
-- ============================================================================

create table if not exists registros_opciones (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references profiles(id) on delete cascade not null,
  plan_id           uuid references planes_nutricionales(id) on delete cascade not null,
  fecha             date not null,                  -- fecha del consumo (no created_at)
  tiempo_comida     text not null,                  -- "Desayuno" | "Almuerzo" | "Once" | "Cena" | "Colación AM"
  opcion_nombre     text not null,                  -- snapshot del nombre — sobrevive si el banco cambia
  opcion_cocina     text,                           -- "chilena" | "mediterranea" | "asiatica" | "mexicana" | "libre"
  kcal              integer,                        -- aporte de la opción (snapshot)
  proteina_g        numeric(5,1),
  carbohidrato_g    numeric(5,1),
  grasa_g           numeric(5,1),
  created_at        timestamptz default now() not null
);

-- Index para queries frecuentes
create index if not exists registros_opciones_user_fecha_idx
  on registros_opciones(user_id, fecha desc);

-- Index para detectar repeticiones (rotación / alerta de variantes)
create index if not exists registros_opciones_user_tiempo_idx
  on registros_opciones(user_id, tiempo_comida, fecha desc);

-- Index para que el profesional vea registros de sus pacientes
create index if not exists registros_opciones_plan_idx
  on registros_opciones(plan_id, fecha desc);

-- ============================================================================
-- RLS — paciente CRUD su propio, profesional READ de sus vinculados
-- ============================================================================
alter table registros_opciones enable row level security;

-- Paciente lee sus propios registros
create policy "Paciente lee sus registros de opciones"
  on registros_opciones for select
  using (auth.uid() = user_id);

-- Paciente inserta sus propios registros
create policy "Paciente inserta sus registros de opciones"
  on registros_opciones for insert
  with check (auth.uid() = user_id);

-- Paciente borra sus propios registros (si se equivocó al elegir)
create policy "Paciente borra sus registros de opciones"
  on registros_opciones for delete
  using (auth.uid() = user_id);

-- Profesional lee registros de sus pacientes vinculados
create policy "Profesional lee registros de sus pacientes"
  on registros_opciones for select
  using (
    exists (
      select 1 from profiles p
      where p.id = registros_opciones.user_id
        and p.professional_id = auth.uid()
    )
  );
