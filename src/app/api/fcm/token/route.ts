/**
 * POST   /api/fcm/token — guarda / refresca el token FCM del usuario autenticado.
 * DELETE /api/fcm/token — elimina un token FCM.
 *
 * Espejo de /api/push/subscribe pero para Firebase Cloud Messaging.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cleanEnv } from '@/lib/clean-env'

async function getAuthenticatedSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { token: string }
  try {
    body = await req.json()
    if (!body.token || typeof body.token !== 'string') throw new Error('missing token')
  } catch {
    return NextResponse.json({ error: 'Invalid body — expected {token}' }, { status: 400 })
  }

  const sb = await getAuthenticatedSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await sb.from('fcm_tokens').upsert(
    {
      user_id:    user.id,
      token:      body.token,
      user_agent: req.headers.get('user-agent') ?? undefined,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  )

  if (error) {
    console.error('[fcm/token POST] upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: { token: string }
  try {
    body = await req.json()
    if (!body.token) throw new Error('missing token')
  } catch {
    return NextResponse.json({ error: 'Invalid body — expected {token}' }, { status: 400 })
  }

  const sb = await getAuthenticatedSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sb.from('fcm_tokens').delete()
    .eq('user_id', user.id)
    .eq('token', body.token)

  return NextResponse.json({ ok: true })
}
