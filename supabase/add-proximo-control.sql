-- ============================================================
-- Proximo control programado (feedback Maria Jose Serrano, Sprint 2-D)
-- Run in: Supabase Dashboard -> SQL Editor (proyecto Centro Metabolico Pro)
-- URL: https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/sql/new
-- ============================================================

-- Cada paciente puede tener UN proximo control programado por su profesional.
-- El motivo es opcional (ej: "revisar adherencia + medir circunferencias").
-- El listado de pacientes muestra badge segun proximidad:
--   < 24h     -> rojo "MANANA / HOY"
--   < 7 dias  -> ambar "en X dias"
--   >= 7 dias -> azul  "en X dias"
--   NULL      -> sin badge

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS proximo_control_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS proximo_control_motivo  TEXT NULL,
  ADD COLUMN IF NOT EXISTS proximo_control_updated_at TIMESTAMPTZ NULL;

-- Indice util para query del dashboard del profesional ("controles esta semana")
CREATE INDEX IF NOT EXISTS idx_profiles_proximo_control
  ON profiles (professional_id, proximo_control_at)
  WHERE proximo_control_at IS NOT NULL AND deleted_at IS NULL;

-- Inspeccion rapida despues de poblar:
--   SELECT email, nombre, proximo_control_at, proximo_control_motivo
--   FROM profiles
--   WHERE professional_id IS NOT NULL AND proximo_control_at IS NOT NULL
--   ORDER BY proximo_control_at;
