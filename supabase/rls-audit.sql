-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS AUDIT — Centro Metabólico Pro
-- Run en Supabase SQL Editor para verificar el estado de RLS en producción.
-- Solo SELECT — no modifica nada.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tablas con RLS habilitado ────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'planes_nutricionales',
    'registros_diarios',
    'payments',
    'push_subscriptions',
    'api_rate_limits'
  )
ORDER BY tablename;

-- Resultado esperado: TODAS deben tener rls_enabled = true.
-- Si alguna sale false, es un bug crítico — pueden ver datos sin restricción.


-- ─── 2. Políticas activas por tabla ──────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd                                         AS command,
  permissive,
  CASE
    WHEN qual LIKE '%auth.uid() = user_id%'   THEN '✅ User-owned'
    WHEN qual LIKE '%auth.uid() = id%'        THEN '✅ Self-only'
    WHEN qual LIKE '%professional_id%'        THEN '✅ Professional-linked'
    WHEN qual = 'true'                        THEN '⚠️  using(true) — REVISAR'
    WHEN qual IS NULL                         THEN '🚫 No condition'
    ELSE substring(qual from 1 for 60)
  END                                         AS check_summary
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'planes_nutricionales',
    'registros_diarios',
    'payments',
    'push_subscriptions',
    'api_rate_limits'
  )
ORDER BY tablename, policyname;


-- ─── 3. Buscar políticas peligrosas: using(true) en tablas con datos sensibles
-- (si alguna sale aquí, es un data leak)
SELECT
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true'
  AND tablename NOT IN ('api_rate_limits')   -- esta es false/false (a propósito)
ORDER BY tablename;


-- ─── 4. Tablas sin policies (RLS habilitado bloquea TODO — verificar intencional)
SELECT
  t.tablename,
  COUNT(p.policyname) AS num_policies
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname
  AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;


-- ─── 5. Foreign keys que NO usan CASCADE — podrían dejar registros huérfanos
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL')
  AND ccu.table_name IN ('profiles', 'planes_nutricionales')
ORDER BY tc.table_name;
