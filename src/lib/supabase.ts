import { createBrowserClient } from '@supabase/ssr'

// Strip BOM (U+FEFF, char-code 65279) and stray whitespace.
// Windows editors and Vercel env-var injection can silently embed a BOM
// which breaks every fetch header with a ByteString TypeError.
function clean(s: string | undefined): string {
  return (s ?? '').replace(new RegExp(String.fromCharCode(0xFEFF), 'g'), '').trim()
}

export function createClient() {
  return createBrowserClient(
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
