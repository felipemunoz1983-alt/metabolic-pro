-- ============================================================
-- Notas clinicas del profesional (feedback Maria Jose Serrano, Sprint 1-C)
-- Run in: Supabase Dashboard -> SQL Editor (proyecto Centro Metabolico Pro)
-- URL: https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/sql/new
-- ============================================================

-- 4 campos de texto libre por paciente, editables por su profesional asignado.
-- Visibles para el paciente: indicaciones, suplementacion, rutina.
-- NO visible para el paciente: examenes_solicitados (uso interno del pro).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS indicaciones_pro        TEXT NULL,
  ADD COLUMN IF NOT EXISTS suplementacion_pro      TEXT NULL,
  ADD COLUMN IF NOT EXISTS rutina_entrenamiento_pro TEXT NULL,
  ADD COLUMN IF NOT EXISTS examenes_solicitados_pro TEXT NULL,
  ADD COLUMN IF NOT EXISTS notas_clinicas_updated_at TIMESTAMPTZ NULL;

-- (Opcional) Inspeccion rapida despues de poblar datos:
--   SELECT email, nombre,
--     LEFT(indicaciones_pro, 80) AS ind,
--     LEFT(suplementacion_pro, 80) AS supl,
--     notas_clinicas_updated_at
--   FROM profiles
--   WHERE professional_id IS NOT NULL
--     AND (indicaciones_pro IS NOT NULL OR suplementacion_pro IS NOT NULL);
