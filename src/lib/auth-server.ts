/**
 * Helpers de autenticación para API routes server-side.
 *
 * Estrategia dual (en orden de prioridad):
 *  1. Bearer token en header Authorization  → funciona en PWA/mobile/standalone
 *  2. Cookie de sesión Supabase             → funciona en SSR tradicional
 *
 * Sin middleware.ts, createBrowserClient no sincroniza la sesión a cookies
 * en todas las situaciones. Enviar el JWT desde el cliente es lo más fiable.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

/**
 * Devuelve el usuario autenticado.
 * Pasa `req` para habilitar la verificación por Bearer token (recomendado).
 * Sin `req` sólo usa cookies (puede fallar en mobile sin middleware).
 */
export async function getAuthUser(req?: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // ── 1. Bearer token (Authorization: Bearer <jwt>) ──────────────────────────
  if (req) {
    const authHeader = req.headers.get('authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const cookieStore = await cookies()
        const sb = createServerClient(supabaseUrl, supabaseAnon, {
          cookies: { getAll: () => cookieStore.getAll() },
        })
        const { data: { user }, error } = await sb.auth.getUser(token)
        if (!error && user) return user
      }
    }
  }

  // ── 2. Fallback: cookie de sesión (SSR tradicional) ────────────────────────
  try {
    const cookieStore = await cookies()
    const sb = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: { getAll: () => cookieStore.getAll() },
    })
    const { data: { user } } = await sb.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}
