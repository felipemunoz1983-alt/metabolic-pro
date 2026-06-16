-- ============================================================
-- Safety check para suplementacion (feedback Maria Jose Serrano, Sprint 3-F)
-- Aplica los guardrails clinicos de la skill NutriApp Pro:
-- "No indicar suplementacion sin las 4 preguntas obligatorias."
-- Run in: https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/sql/new
-- ============================================================

-- 4 campos de texto libre por paciente. El profesional debe completarlos
-- antes de poder escribir en el campo suplementacion_pro de notas clinicas.
-- updated_at marca cuando se completaron por ultima vez — si tienen >180 dias
-- la app sugiere revisarlas (no bloquea, solo advierte).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS supl_objetivo_actual         TEXT NULL,
  ADD COLUMN IF NOT EXISTS supl_entrenamiento_actual    TEXT NULL,
  ADD COLUMN IF NOT EXISTS supl_condiciones_medicas     TEXT NULL,
  ADD COLUMN IF NOT EXISTS supl_suplementos_actuales    TEXT NULL,
  ADD COLUMN IF NOT EXISTS supl_check_updated_at        TIMESTAMPTZ NULL;

-- Inspeccion rapida:
--   SELECT email,
--     CASE WHEN supl_objetivo_actual IS NOT NULL
--               AND supl_entrenamiento_actual IS NOT NULL
--               AND supl_condiciones_medicas IS NOT NULL
--               AND supl_suplementos_actuales IS NOT NULL
--          THEN 'completo' ELSE 'incompleto' END AS estado_safety_check,
--     supl_check_updated_at
--   FROM profiles
--   WHERE professional_id IS NOT NULL;
