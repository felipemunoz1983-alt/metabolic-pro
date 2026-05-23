import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'

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

/**
 * Llama supabase.auth.getUser() de forma defensiva.
 *
 * Si el refresh token guardado en cookies/localStorage está corrupto o vencido,
 * Supabase tira `AuthApiError: Invalid Refresh Token` (o "Refresh Token Not Found").
 * Sin tratamiento, ese error deja al cliente en estado "limbo" donde getUser()
 * sigue fallando indefinidamente y la UI se queda colgada en skeleton infinito.
 *
 * Este helper detecta ese caso específico y hace signOut() automático para
 * limpiar el estado, retornando null como si nunca hubiera habido sesión.
 * El caller entonces puede redirigir a /login normalmente.
 *
 * @returns el User si hay sesión válida, null si no hay sesión o si la sesión
 *          estaba corrupta y se limpió.
 */
export async function getUserSafe(
  supabase: SupabaseClient,
): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      const msg = (error.message ?? '').toLowerCase()
      const isRefreshTokenError =
        msg.includes('refresh token') ||
        msg.includes('invalid token') ||
        msg.includes('jwt expired') ||
        (error.status === 400 && msg.includes('token'))
      if (isRefreshTokenError) {
        // Limpia cookies + localStorage de Supabase y deja al caller redirigir.
        try { await supabase.auth.signOut() } catch { /* best-effort cleanup */ }
        return null
      }
      // Otro tipo de error — lo propago para que el caller decida
      throw error
    }
    return data.user
  } catch (err) {
    // Si lanzó por refresh token también lo tratamos como sin-sesión
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    if (msg.includes('refresh token') || msg.includes('invalid token')) {
      try { await supabase.auth.signOut() } catch { /* best-effort */ }
      return null
    }
    throw err
  }
}
