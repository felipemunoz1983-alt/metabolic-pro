/**
 * POST /api/push/send — internal endpoint to send push notifications.
 * Called by CRONs and server-side logic. Protected by CRON_SECRET.
 *
 * Body: { userId: string, title: string, body: string, url?: string, tag?: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendPushToUser } from '@/lib/push'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Protect with CRON_SECRET (same as CRONs)
  const secret   = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId: string; title: string; body: string; url?: string; tag?: string }
  try {
    body = await req.json()
    if (!body.userId || !body.title || !body.body) throw new Error('missing fields')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { sent, removed } = await sendPushToUser(supabase, body.userId, {
    title: body.title,
    body:  body.body,
    url:   body.url,
    tag:   body.tag,
  })

  return NextResponse.json({ ok: true, sent, removed })
}
