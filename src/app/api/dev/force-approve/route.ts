/**
 * DEV ONLY — Simulates a successful WebPay payment without going through Transbank UI.
 * Protected by a secret token. DELETE before going to production.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { PREMIUM_DAYS } from '@/lib/transbank'
import type { PlanType } from '@/types'

const DEV_SECRET = 'cm-dev-force-2026'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Guard: secret must match
  const { secret, email } = await req.json().catch(() => ({}))
  if (secret !== DEV_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Look up the profile by email
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role, professional_id, plan, email, nombre')
    .eq('email', email)
    .maybeSingle()

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found', detail: profileErr?.message }, { status: 404 })
  }

  // Determine plan type
  let planType: PlanType
  if (profile.role === 'professional') {
    planType = 'professional'
  } else if (profile.role === 'patient' && profile.professional_id) {
    planType = 'patient'
  } else {
    planType = 'individual'
  }

  const buyOrder = `DEV-${profile.id.slice(0, 8)}-${Date.now()}`
  const sessionId = `dev-sess-${Date.now()}`
  const amount = planType === 'professional' ? 14990 : planType === 'patient' ? 7000 : 12990
  const premiumUntil = new Date()
  premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DAYS)

  // Insert approved payment record
  await supabase.from('payments').insert({
    user_id: profile.id,
    buy_order: buyOrder,
    session_id: sessionId,
    amount,
    plan_type: planType,
    status: 'approved',
    token: 'DEV_SIMULATED',
    transbank_response: { status: 'AUTHORIZED', response_code: 0, simulated: true },
  })

  // Update profile plan
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ plan: planType, premium_until: premiumUntil.toISOString() })
    .eq('id', profile.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to update profile', detail: updateErr.message }, { status: 500 })
  }

  // Fire confirmation email (best-effort)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://centro-metabolico-pro.vercel.app'
  try {
    await fetch(`${appUrl}/api/email/payment-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: profile.email,
        userName: profile.nombre ?? 'Usuario',
        planType,
        premiumUntil: premiumUntil.toISOString(),
        appUrl,
      }),
    })
  } catch (e) {
    console.error('[dev/force-approve] email failed (non-fatal):', e)
  }

  return NextResponse.json({
    ok: true,
    userId: profile.id,
    planType,
    premiumUntil: premiumUntil.toISOString(),
    message: `Plan ${planType} activated for ${email}`,
  })
}
