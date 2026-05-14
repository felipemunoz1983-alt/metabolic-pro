-- ═══════════════════════════════════════════════════════════════════════════════
-- Push Subscriptions — Centro Metabólico Pro
-- Run this in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  -- One subscription entry per (user, endpoint) pair
  UNIQUE (user_id, endpoint)
);

-- Index for fast user lookups (send all subscriptions for a user)
CREATE INDEX IF NOT EXISTS push_subs_user_id_idx ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
