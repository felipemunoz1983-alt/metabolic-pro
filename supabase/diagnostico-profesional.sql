-- ═══════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO CUENTA PROFESIONAL — Centro Metabólico Pro
-- Corre este script en: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

-- 1. Verificar perfil de Felipe (role, plan, trial)
SELECT
  id,
  email,
  nombre,
  role,
  plan,
  trial_ends_at,
  premium_until,
  created_at
FROM profiles
WHERE email = 'felipe.munoz1983@gmail.com';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Contar pacientes vinculados al profesional Felipe
-- (debe dar > 0 si hay pacientes con su link)
SELECT COUNT(*) AS total_pacientes_vinculados
FROM profiles p
WHERE p.professional_id = (
  SELECT id FROM profiles WHERE email = 'felipe.munoz1983@gmail.com'
);

-- Detalle de pacientes vinculados
SELECT
  p.id,
  p.email,
  p.nombre,
  p.role,
  p.plan,
  p.professional_id,
  p.created_at
FROM profiles p
WHERE p.professional_id = (
  SELECT id FROM profiles WHERE email = 'felipe.munoz1983@gmail.com'
)
ORDER BY p.created_at DESC;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Verificar políticas RLS activas
SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'planes_nutricionales', 'registros_diarios')
ORDER BY tablename, policyname;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Verificar planes guardados de Felipe
SELECT
  id,
  user_id,
  objetivo,
  kcal,
  proteina,
  carbohidrato,
  grasa,
  created_at
FROM planes_nutricionales
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'felipe.munoz1983@gmail.com'
)
ORDER BY created_at DESC
LIMIT 5;

-- ─────────────────────────────────────────────────────────────────────
-- 5. FIX: Si role o plan están mal, correr esto:
-- (descomentar solo si los resultados de arriba muestran datos incorrectos)

-- UPDATE profiles
-- SET
--   role = 'professional',
--   plan = 'professional'    -- cambia 'gratuito' a 'professional' para acceso completo
-- WHERE email = 'felipe.munoz1983@gmail.com';
