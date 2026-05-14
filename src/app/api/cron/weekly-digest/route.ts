/**
 * Weekly digest CRON — fires every Monday at 12:00 UTC (≈ 8-9 AM Chile time).
 * Sends a patient summary email to every professional who has at least one patient.
 *
 * Triggered automatically by Vercel CRON (vercel.json).
 * Protected by CRON_SECRET to prevent unauthorized calls.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify CRON secret
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'

  // 1. Fetch all professionals with at least one patient
  const { data: professionals, error: proErr } = await supabase
    .from('profiles')
    .select('id, email, nombre')
    .eq('role', 'professional')
    .not('email', 'is', null)

  if (proErr || !professionals) {
    console.error('[cron/weekly-digest] fetch pros error:', proErr)
    return NextResponse.json({ error: 'Could not fetch professionals' }, { status: 500 })
  }

  if (professionals.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No professionals found' })
  }

  // 2. For each professional, call the weekly-digest email endpoint
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const pro of professionals) {
    if (!pro.email) { skipped++; continue }

    try {
      const res = await fetch(`${appUrl}/api/email/weekly-digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId:    pro.id,
          professionalEmail: pro.email,
          professionalName:  pro.nombre ?? 'Profesional',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error(`[cron/weekly-digest] failed for ${pro.email}:`, data)
        failed++
      } else if (data.skipped) {
        skipped++  // professional has no patients yet
      } else {
        sent++
      }
    } catch (err) {
      console.error(`[cron/weekly-digest] error for ${pro.email}:`, err)
      failed++
    }
  }

  console.log(`[cron/weekly-digest] sent=${sent} failed=${failed} skipped=${skipped}`)

  return NextResponse.json({
    ok: true,
    professionals: professionals.length,
    sent,
    failed,
    skipped,
  })
}
