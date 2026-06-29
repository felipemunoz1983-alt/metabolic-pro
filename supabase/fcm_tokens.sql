-- ═══════════════════════════════════════════════════════════════════════════════
-- Firebase Cloud Messaging tokens — Centro Metabólico Pro
-- Run this in the Supabase SQL Editor.
--
-- Convive con `push_subscriptions` (Web Push / VAPID). FCM es un segundo
-- transporte: cada dispositivo guarda su registration token de FCM acá, y el
-- servidor (src/lib/fcm.ts) envía vía firebase-admin además del Web Push clásico.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token       text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  -- Un token de FCM es único globalmente (identifica un dispositivo/instalación).
  -- Si el mismo token reaparece para otro usuario (dispositivo compartido),
  -- el upsert por `token` lo reasigna al usuario actual.
  UNIQUE (token)
);

-- Lookup rápido al enviar todas las notificaciones de un usuario.
CREATE INDEX IF NOT EXISTS fcm_tokens_user_id_idx ON fcm_tokens(user_id);

-- RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own fcm tokens" ON fcm_tokens;
CREATE POLICY "Users manage own fcm tokens"
  ON fcm_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
