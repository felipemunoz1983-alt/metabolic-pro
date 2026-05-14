import { NextRequest, NextResponse } from 'next/server'
import { tbkTx, PREMIUM_DAYS } from '@/lib/transbank'
import { createServiceClient } from '@/lib/supabase-server'
import type { PlanType } from '@/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  let token: string | null = null
  let rawBody = ''  // kept for error logging
  try {
    rawBody = await req.text()
    const params = new URLSearchParams(rawBody)
    token = params.get('token_ws') ?? params.get('TBK_TOKEN')
    console.log('[webpay/confirm POST] token prefix:', token?.slice(0, 8) ?? 'null')
  } catch {
    console.error('[webpay/confirm POST] body parse error')
    return NextResponse.redirect(`${appUrl}/payment/failed`)
  }

  if (!token) {
    console.warn('[webpay/confirm POST] no token found — redirecting to cancelled')
    return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
  }

  const supabase = createServiceClient()

  try {
    const result = await tbkTx.commit(token)

    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('buy_order', result.buy_order)
      .maybeSingle()

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

      // Fire confirmation email (best-effort — don't block redirect on failure)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, nombre')
          .eq('id', payment.user_id)
          .maybeSingle()

        if (profile?.email) {
          await fetch(`${appUrl}/api/email/payment-confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail:    profile.email,
              userName:     profile.nombre ?? 'Usuario',
              planType,
              premiumUntil: premiumUntil.toISOString(),
              appUrl,
            }),
          })
        }
      } catch (emailErr) {
        console.error('[webpay/confirm] email send failed (non-fatal):', emailErr)
      }

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  console.log('[webpay/confirm GET] cancel — order:', req.nextUrl.searchParams.get('TBK_ORDER_ID'))
  return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
}
