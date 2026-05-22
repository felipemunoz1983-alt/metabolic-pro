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
/**
 * Helper para crear el cliente Supabase server-side con cookie store que
 * SOPORTA write-back (setAll). Sin setAll, Supabase no puede refrescar
 * tokens expirados y getUser() devuelve null aunque haya refresh_token válido.
 *
 * En route handlers de Next.js 15, cookies().set() lanza si estamos en un
 * contexto read-only; lo envolvemos en try/catch silencioso.
 */
type CookieToSet = { name: string; value: string; options?: Parameters<Awaited<ReturnType<typeof cookies>>['set']>[2] }

async function makeServerClient(supabaseUrl: string, supabaseAnon: string) {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Read-only context (server component) — Supabase no puede refrescar
          // pero el getUser anterior puede haber funcionado con el token actual.
        }
      },
    },
  })
}

export async function getAuthUser(req?: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // ── 1. Bearer token (Authorization: Bearer <jwt>) ──────────────────────────
  if (req) {
    const authHeader = req.headers.get('authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const sb = await makeServerClient(supabaseUrl, supabaseAnon)
        const { data: { user }, error } = await sb.auth.getUser(token)
        if (!error && user) return user
      }
    }
  }

  // ── 2. Fallback: cookie de sesión (SSR tradicional) ────────────────────────
  try {
    const sb = await makeServerClient(supabaseUrl, supabaseAnon)
    const { data: { user } } = await sb.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}

/**
 * Versión diagnóstica de getAuthUser — devuelve también el motivo del fallo.
 * Útil para debug en producción sin acceso a logs de Vercel.
 */
export async function getAuthUserDebug(req?: NextRequest): Promise<{
  user: { id: string; email?: string } | null
  reason: string
}> {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseAnon) {
    return { user: null, reason: 'env_missing' }
  }

  // ── 1. Bearer token ──
  if (req) {
    const authHeader = req.headers.get('authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      if (!token) return { user: null, reason: 'bearer_empty' }

      const sb = await makeServerClient(supabaseUrl, supabaseAnon)
      const { data, error } = await sb.auth.getUser(token)
      if (data?.user) {
        return { user: { id: data.user.id, email: data.user.email }, reason: 'bearer_ok' }
      }
      // Si el bearer falló, continuamos con cookie
      const reasonBearer = error?.message ?? 'bearer_unknown'

      // ── 2. Cookie fallback ──
      try {
        const sb2 = await makeServerClient(supabaseUrl, supabaseAnon)
        const cookieStore2 = await cookies()
        const allCookies = cookieStore2.getAll()
        const { data: data2 } = await sb2.auth.getUser()
        if (data2?.user) {
          return { user: { id: data2.user.id, email: data2.user.email }, reason: 'cookie_ok' }
        }
        return {
          user: null,
          reason: `bearer_failed:${reasonBearer.slice(0, 40)};cookies:${allCookies.length}`,
        }
      } catch {
        return { user: null, reason: `bearer_failed:${reasonBearer.slice(0, 40)};cookie_err` }
      }
    }
    // No Bearer header
  }

  // ── Sin req o sin Bearer: solo cookie ──
  try {
    const sb = await makeServerClient(supabaseUrl, supabaseAnon)
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const { data } = await sb.auth.getUser()
    if (data?.user) {
      return { user: { id: data.user.id, email: data.user.email }, reason: 'cookie_only_ok' }
    }
    return { user: null, reason: `no_bearer;cookies:${allCookies.length}` }
  } catch {
    return { user: null, reason: 'no_bearer;cookie_err' }
  }
}
