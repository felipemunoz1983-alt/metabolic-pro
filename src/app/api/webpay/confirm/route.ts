import { NextRequest, NextResponse } from 'next/server'
import { tbkTx, PREMIUM_DAYS } from '@/lib/transbank'
import { createServiceClient } from '@/lib/supabase-server'
import type { PlanType } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  let token: string | null = null
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)
    token = params.get('token_ws') ?? params.get('TBK_TOKEN')
  } catch {
    return NextResponse.redirect(`${appUrl}/payment/failed`)
  }

  if (!token) {
    return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
  }

  const supabase = createServiceClient()

  try {
    const result = await tbkTx.commit(token)

    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('buy_order', result.buy_order)
      .single()

    if (findError || !payment) {
      console.error('[webpay/confirm] payment not found for buy_order:', result.buy_order)
      return NextResponse.redirect(`${appUrl}/payment/failed?reason=not_found`)
    }

    if (result.status === 'AUTHORIZED' && result.response_code === 0) {
      await supabase
        .from('payments')
        .update({ token, status: 'approved', transbank_response: result })
        .eq('id', payment.id)

      const premiumUntil = new Date()
      premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DAYS)

      // Set plan to the specific plan type (professional / patient / individual)
      const planType: PlanType = payment.plan_type ?? 'individual'

      await supabase
        .from('profiles')
        .update({ plan: planType, premium_until: premiumUntil.toISOString() })
        .eq('id', payment.user_id)

      return NextResponse.redirect(`${appUrl}/payment/success`)
    } else {
      await supabase
        .from('payments')
        .update({ token, status: 'rejected', transbank_response: result })
        .eq('id', payment.id)

      return NextResponse.redirect(`${appUrl}/payment/failed?reason=rejected`)
    }
  } catch (err) {
    console.error('[webpay/confirm] error:', err)
    return NextResponse.redirect(`${appUrl}/payment/failed?reason=error`)
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
}
