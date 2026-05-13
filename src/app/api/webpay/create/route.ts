import { NextRequest, NextResponse } from 'next/server'
import { tbkTx, PLAN_PRICE_CLP } from '@/lib/transbank'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  let userId: string
  try {
    const body = await req.json()
    userId = body.userId
    if (!userId) throw new Error('missing userId')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  const buyOrder = `CM-${userId.slice(0, 8)}-${Date.now()}`
  const sessionId = `sess-${Date.now()}`
  const returnUrl = `${appUrl}/api/webpay/confirm`

  // Save pending payment to DB
  const supabase = createServiceClient()
  const { error: dbError } = await supabase.from('payments').insert({
    user_id: userId,
    buy_order: buyOrder,
    session_id: sessionId,
    amount: PLAN_PRICE_CLP,
    status: 'pending',
  })
  if (dbError) {
    console.error('[webpay/create] DB error:', dbError)
    return NextResponse.json({ error: 'Could not save payment record' }, { status: 500 })
  }

  // Create Transbank transaction
  let response: { url: string; token: string }
  try {
    response = await tbkTx.create(buyOrder, sessionId, PLAN_PRICE_CLP, returnUrl)
  } catch (err) {
    console.error('[webpay/create] Transbank error:', err)
    return NextResponse.json({ error: 'Transbank error' }, { status: 502 })
  }

  return NextResponse.json({ url: response.url, token: response.token })
}
