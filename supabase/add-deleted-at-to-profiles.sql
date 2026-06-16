-- ============================================================
-- Soft delete para perfiles de pacientes (feedback Maria Jose Serrano)
-- Run in: Supabase Dashboard -> SQL Editor (proyecto Centro Metabolico Pro)
-- URL: https://supabase.com/dashboard/project/ikydfxgdugubenkzdbsd/sql/new
-- ============================================================

-- 1) Agregar columna deleted_at (NULL = activo, timestamp = borrado)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2) Indice parcial para queries activas (no incluye filas borradas - mas rapido)
CREATE INDEX IF NOT EXISTS idx_profiles_active_patients
  ON profiles (professional_id, role)
  WHERE deleted_at IS NULL;

-- 3) (Opcional) Limpieza: si quieres ver pacientes borrados despues
--    SELECT id, email, nombre, deleted_at FROM profiles WHERE deleted_at IS NOT NULL;

-- 4) (Opcional emergencia) Restaurar un paciente borrado por error
--    UPDATE profiles SET deleted_at = NULL WHERE email = 'paciente@ejemplo.com';
