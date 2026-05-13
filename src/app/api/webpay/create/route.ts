import { NextRequest, NextResponse } from 'next/server'
import { tbkTx, PLAN_PRICES } from '@/lib/transbank'
import { createServiceClient } from '@/lib/supabase-server'
import type { PlanType } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string
  try {
    const body = await req.json()
    userId = body.userId
    if (!userId) throw new Error('missing userId')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Determine plan type from profile role + professional_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, professional_id')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  let planType: PlanType
  if (profile.role === 'professional') {
    planType = 'professional'
  } else if (profile.role === 'patient' && profile.professional_id) {
    planType = 'patient'
  } else {
    planType = 'individual'
  }

  const amount = PLAN_PRICES[planType]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const buyOrder = `CM-${userId.slice(0, 8)}-${Date.now()}`
  const sessionId = `sess-${Date.now()}`
  const returnUrl = `${appUrl}/api/webpay/confirm`

  // Save pending payment to DB
  const { error: dbError } = await supabase.from('payments').insert({
    user_id: userId,
    buy_order: buyOrder,
    session_id: sessionId,
    amount,
    plan_type: planType,
    status: 'pending',
  })
  if (dbError) {
    console.error('[webpay/create] DB error:', dbError)
    return NextResponse.json({ error: 'Could not save payment record' }, { status: 500 })
  }

  // Create Transbank transaction
  let response: { url: string; token: string }
  try {
    response = await tbkTx.create(buyOrder, sessionId, amount, returnUrl)
  } catch (err) {
    console.error('[webpay/create] Transbank error:', err)
    return NextResponse.json({ error: 'Transbank error' }, { status: 502 })
  }

  return NextResponse.json({ url: response.url, token: response.token })
}
