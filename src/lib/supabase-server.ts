import { createClient } from '@supabase/supabase-js'

function clean(s: string | undefined): string {
  return (s ?? '').replace(new RegExp(String.fromCharCode(0xfeff), 'g'), '').trim()
}

/**
 * Service-role client for server-side operations (API routes).
 * Bypasses RLS — use only in trusted server contexts, never expose to client.
 */
export function createServiceClient() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}
