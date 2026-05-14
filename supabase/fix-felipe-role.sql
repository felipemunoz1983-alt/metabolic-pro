-- ============================================================
-- Fix Felipe's profile role → professional
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

UPDATE profiles
SET
  role = 'professional',
  plan = 'gratuito'  -- keeps trial/plan logic intact; upgrade via /upgrade
WHERE email = 'felipe.munoz1983@gmail.com';

-- Verify the result
SELECT id, email, role, plan, trial_ends_at, premium_until
FROM profiles
WHERE email = 'felipe.munoz1983@gmail.com';
