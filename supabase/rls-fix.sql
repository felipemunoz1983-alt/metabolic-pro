-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS FIX v2 — Centro Metabólico Pro
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run: DROP IF EXISTS before every CREATE POLICY.
-- NOTE: PostgreSQL does NOT support CREATE POLICY IF NOT EXISTS —
--       the pattern is DROP first, then CREATE.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read professional profiles"    ON profiles;
DROP POLICY IF EXISTS "Users read own profile"               ON profiles;
DROP POLICY IF EXISTS "Users insert own profile"             ON profiles;
DROP POLICY IF EXISTS "Users update own profile"             ON profiles;
DROP POLICY IF EXISTS "Professional reads patient profiles"  ON profiles;
DROP POLICY IF EXISTS "Authenticated users search profiles"  ON profiles;

-- Anon/public: puede leer perfiles de profesionales (landing de invitación)
CREATE POLICY "Public read professional profiles"
  ON profiles FOR SELECT
  USING (role = 'professional');

-- Autenticado: cada usuario puede leer su propio perfil
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Autenticado: puede insertar su propio perfil (creación en primer login)
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Autenticado: puede actualizar su propio perfil (nombre, whatsapp, etc.)
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profesional: puede leer perfiles de sus pacientes vinculados
CREATE POLICY "Professional reads patient profiles"
  ON profiles FOR SELECT
  USING (professional_id = auth.uid());

-- Profesional: puede buscar cualquier paciente/individual por email para vincularlo
-- (ModalVincular hace búsqueda libre antes de vincular)
CREATE POLICY "Authenticated users search profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND role IN ('patient', 'individual')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PLANES_NUTRICIONALES — corrige dos bugs de política
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Professional sees patient plans"    ON planes_nutricionales;
DROP POLICY IF EXISTS "Professional inserts patient plans" ON planes_nutricionales;
DROP POLICY IF EXISTS "Professional manages patient plans" ON planes_nutricionales;
DROP POLICY IF EXISTS "Professional deletes patient plans" ON planes_nutricionales;

-- BUG 1 FIX: usa EXISTS sobre profiles para incluir planes auto-generados
-- por el paciente (professional_id = null en el plan, pero patient vinculado al pro)
CREATE POLICY "Professional sees patient plans"
  ON planes_nutricionales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = planes_nutricionales.user_id
        AND p.professional_id = auth.uid()
    )
  );

-- BUG 2 FIX: política INSERT para profesionales — antes no existía,
-- causando rechazo silencioso cuando el pro guardaba un plan para un paciente
CREATE POLICY "Professional inserts patient plans"
  ON planes_nutricionales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = planes_nutricionales.user_id
        AND p.professional_id = auth.uid()
    )
  );

CREATE POLICY "Professional manages patient plans"
  ON planes_nutricionales FOR UPDATE
  USING (professional_id = auth.uid());

CREATE POLICY "Professional deletes patient plans"
  ON planes_nutricionales FOR DELETE
  USING (professional_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PAYMENTS — elimina data leak
-- ─────────────────────────────────────────────────────────────────────────────

-- BUG: using(true) exponía todos los pagos a cualquier usuario autenticado.
-- El service role bypasea RLS nativamente — no necesita política propia.
DROP POLICY IF EXISTS "Service role manages payments" ON payments;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VERIFICACIÓN
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'planes_nutricionales', 'registros_diarios', 'payments')
ORDER BY tablename;

SELECT
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'planes_nutricionales', 'registros_diarios', 'payments')
ORDER BY tablename, policyname;
