/**
 * Helpers de autenticación para API routes server-side.
 *
 * Lee la cookie de sesión de Supabase para resolver el usuario actual.
 * Usar en cualquier `route.ts` que requiera auth.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Devuelve el usuario autenticado desde la cookie de sesión.
 * Retorna `null` si no hay sesión válida.
 */
export async function getAuthUser() {
  const cookieStore = await cookies()
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await sb.auth.getUser()
  return user
}
