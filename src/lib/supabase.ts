import { createBrowserClient } from '@supabase/ssr'

// Strip BOM (U+FEFF, char-code 65279) and stray whitespace.
// Windows editors and Vercel env-var injection can silently embed a BOM
// which breaks every fetch header with a ByteString TypeError.
function clean(s: string | undefined): string {
  return (s ?? '').replace(new RegExp(String.fromCharCode(0xFEFF), 'g'), '').trim()
}

// Placeholder values used at build time when env vars are not available
// (e.g. Vercel Preview deployments). The client will be created without
// throwing, but any Supabase call will fail gracefully at runtime.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder'

export function createClient() {
  return createBrowserClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL) || PLACEHOLDER_URL,
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || PLACEHOLDER_KEY
  )
}
