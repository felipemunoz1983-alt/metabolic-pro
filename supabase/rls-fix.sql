-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS FIX — Centro Metabólico Pro
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run: all CREATE POLICY use IF NOT EXISTS, all DROP use IF EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
-- No SQL file existed — table probably has no RLS. Enable it now.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anon/public: can read professional profiles (needed for invite link preview
-- before the new patient is authenticated — register/page.tsx fetches nombre)
CREATE POLICY IF NOT EXISTS "Public read professional profiles"
  ON profiles FOR SELECT
  USING (role = 'professional');

-- Authenticated: users can always read their own profile
CREATE POLICY IF NOT EXISTS "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Authenticated: users can insert their own profile (first-login creation)
CREATE POLICY IF NOT EXISTS "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Authenticated: users can update their own profile (nombre, whatsapp, etc.)
CREATE POLICY IF NOT EXISTS "Users update own profile"
  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Professionals: can read profiles of their linked patients
-- (needed for the patient list, patient detail header, ModalVincular linked check)
CREATE POLICY IF NOT EXISTS "Professional reads patient profiles"
  ON profiles FOR SELECT
  USING (professional_id = auth.uid());

-- Professionals: can search ALL patient/individual profiles by email to link them
-- (ModalVincular does a full email search before a patient is linked)
-- This is intentionally permissive for authenticated users only.
CREATE POLICY IF NOT EXISTS "Authenticated users search profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND role IN ('patient', 'individual')
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PLANES_NUTRICIONALES — fix two policy bugs
-- ─────────────────────────────────────────────────────────────────────────────

-- BUG 1 FIX: "Professional sees patient plans" was checking professional_id = auth.uid()
-- which MISSES plans the patient self-generated (professional_id = null).
-- Correct policy: any plan whose user is a linked patient of this professional.
DROP POLICY IF EXISTS "Professional sees patient plans" ON planes_nutricionales;

CREATE POLICY IF NOT EXISTS "Professional sees patient plans"
  ON planes_nutricionales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = planes_nutricionales.user_id
        AND p.professional_id = auth.uid()
    )
  );

-- BUG 2 FIX: no INSERT policy existed for professionals.
-- The only INSERT policy checked auth.uid() = user_id, which blocks professionals
-- inserting plans for patients (user_id = patient.id, auth.uid() = professional.id).
CREATE POLICY IF NOT EXISTS "Professional inserts patient plans"
  ON planes_nutricionales FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = planes_nutricionales.user_id
        AND p.professional_id = auth.uid()
    )
  );

-- Also allow professionals to update/delete plans they created for patients
CREATE POLICY IF NOT EXISTS "Professional manages patient plans"
  ON planes_nutricionales FOR UPDATE
  USING (professional_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Professional deletes patient plans"
  ON planes_nutricionales FOR DELETE
  USING (professional_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PAYMENTS — fix data leak
-- ─────────────────────────────────────────────────────────────────────────────

-- BUG: "Service role manages payments" had using(true) which allowed ANY
-- authenticated user to SELECT all other users' payment records.
-- Service role bypasses RLS entirely — no policy needed for it.
-- Dropping this policy means only "Users see own payments" applies.
DROP POLICY IF EXISTS "Service role manages payments" ON payments;

-- "Users see own payments" already exists (auth.uid() = user_id) — keep it.
-- Service role (used by webpay/confirm and webpay/create) bypasses RLS natively.


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. VERIFY — quick sanity check (inspect in SQL results tab)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
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
