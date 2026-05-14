/**
 * Patient weekly digest CRON — fires every Sunday at 11:00 UTC (≈ 7-8 AM Chile time).
 * Sends a personalised weekly progress email to every active patient
 * who has logged at least once in the past 7 days OR has an active plan.
 *
 * Triggered automatically by Vercel CRON (vercel.json).
 * Protected by CRON_SECRET to prevent unauthorized calls.
 *
 * Eligibility:
 *   - role = 'patient' | 'individual'
 *   - paid plan (premium_until > now) OR active trial (trial_ends_at > now)
 *   - has an email address
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth
  const secret   = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'
  const now      = new Date()

  // 1. Fetch all patients/individuals with email
  const { data: patients, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, nombre, plan, premium_until, trial_ends_at')
    .in('role', ['patient', 'individual'])
    .not('email', 'is', null)

  if (pErr || !patients) {
    console.error('[cron/patient-digest] fetch error:', pErr)
    return NextResponse.json({ error: 'Could not fetch patients' }, { status: 500 })
  }

  // 2. Filter: must have active paid plan OR active trial
  const eligible = patients.filter(p => {
    if (!p.email) return false
    const hasPremium = p.premium_until && new Date(p.premium_until) > now
    const hasTrial   = p.trial_ends_at  && new Date(p.trial_ends_at)  > now
    // Paid plan or active trial
    if (hasPremium) return true
    if (hasTrial)   return true
    // Legacy: non-gratuito plan without premium_until → include
    return p.plan && p.plan !== 'gratuito'
  })

  if (eligible.length === 0) {
    console.log('[cron/patient-digest] no eligible patients')
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: 'No eligible patients' })
  }

  console.log(`[cron/patient-digest] sending to ${eligible.length} patients`)

  let sent    = 0
  let failed  = 0
  let skipped = 0

  for (const patient of eligible) {
    try {
      const res = await fetch(`${appUrl}/api/email/patient-digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: patient.id }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        console.error(`[cron/patient-digest] failed for ${patient.email}:`, data)
        failed++
      } else if (data.skipped) {
        skipped++
      } else {
        sent++
      }
    } catch (err) {
      console.error(`[cron/patient-digest] error for ${patient.email}:`, err)
      failed++
    }
  }

  console.log(`[cron/patient-digest] sent=${sent} failed=${failed} skipped=${skipped}`)

  return NextResponse.json({
    ok:       true,
    eligible: eligible.length,
    sent,
    failed,
    skipped,
  })
}
