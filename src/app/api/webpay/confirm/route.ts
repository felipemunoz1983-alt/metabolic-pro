import { NextRequest, NextResponse } from 'next/server'
import { tbkTx, PREMIUM_DAYS } from '@/lib/transbank'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * Transbank calls this endpoint via POST with token_ws in the form body
 * after the user completes (or cancels) the payment.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  // Parse the form-encoded body Transbank sends
  let token: string | null = null
  try {
    const text = await req.text()
    const params = new URLSearchParams(text)
    token = params.get('token_ws') ?? params.get('TBK_TOKEN')
  } catch {
    return NextResponse.redirect(`${appUrl}/payment/failed`)
  }

  // No token = user cancelled or session expired
  if (!token) {
    return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
  }

  const supabase = createServiceClient()

  try {
    // Commit the transaction with Transbank
    const result = await tbkTx.commit(token)

    // Find the matching pending payment in our DB
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
      // Payment approved
      await supabase
        .from('payments')
        .update({ token, status: 'approved', transbank_response: result })
        .eq('id', payment.id)

      // Grant premium for PREMIUM_DAYS days
      const premiumUntil = new Date()
      premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DAYS)

      await supabase
        .from('profiles')
        .update({ plan: 'premium', premium_until: premiumUntil.toISOString() })
        .eq('id', payment.user_id)

      return NextResponse.redirect(`${appUrl}/payment/success`)
    } else {
      // Payment rejected or failed
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

/**
 * Transbank also sends GET when the user presses "Volver al comercio" (abort).
 * token_ws is absent in that case — treated as cancellation.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
  return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
}
