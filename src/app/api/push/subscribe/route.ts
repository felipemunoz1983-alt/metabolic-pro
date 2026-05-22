/**
 * POST   /api/push/subscribe — store / refresh a push subscription for the auth'd user.
 * DELETE /api/push/subscribe — remove a push subscription by endpoint.
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
  let body: { endpoint: string; keys: { p256dh: string; auth: string } }
  try {
    body = await req.json()
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) throw new Error('missing')
  } catch {
    return NextResponse.json({ error: 'Invalid body — expected {endpoint, keys:{p256dh, auth}}' }, { status: 400 })
  }

  const sb = await getAuthenticatedSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await sb.from('push_subscriptions').upsert(
    {
      user_id:    user.id,
      endpoint:   body.endpoint,
      p256dh:     body.keys.p256dh,
      auth:       body.keys.auth,
      user_agent: req.headers.get('user-agent') ?? undefined,
    },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) {
    console.error('[push/subscribe POST] upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  let body: { endpoint: string }
  try {
    body = await req.json()
    if (!body.endpoint) throw new Error('missing endpoint')
  } catch {
    return NextResponse.json({ error: 'Invalid body — expected {endpoint}' }, { status: 400 })
  }

  const sb = await getAuthenticatedSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await sb.from('push_subscriptions').delete()
    .eq('user_id', user.id)
    .eq('endpoint', body.endpoint)

  return NextResponse.json({ ok: true })
}
