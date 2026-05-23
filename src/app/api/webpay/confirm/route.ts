import { NextRequest, NextResponse } from 'next/server'
import { tbkTx, PREMIUM_DAYS } from '@/lib/transbank'
import { createServiceClient } from '@/lib/supabase-server'
import type { PlanType } from '@/types'

/**
 * Procesa el commit/confirm de un pago Transbank.
 * Acepta el token desde POST body (forma estandar de Transbank) o desde
 * GET querystring (fallback cuando el navegador degrada el form auto-submit
 * de Transbank a GET — pasa con Firefox en modo estricto, cookies cross-site
 * bloqueadas, o algunos ad-blockers).
 *
 * Compartido entre los handlers GET y POST para evitar duplicacion.
 */
async function processCommit(
  token: string | null,
  appUrl: string,
  method: 'GET' | 'POST',
): Promise<NextResponse> {
  if (!token) {
    console.warn(`[webpay/confirm ${method}] no token — cancelled`)
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  let token: string | null = null
  try {
    const rawBody = await req.text()
    const params = new URLSearchParams(rawBody)
    token = params.get('token_ws') ?? params.get('TBK_TOKEN')
    console.log('[webpay/confirm POST] token prefix:', token?.slice(0, 8) ?? 'null')
  } catch {
    console.error('[webpay/confirm POST] body parse error')
    return NextResponse.redirect(`${appUrl}/payment/failed?reason=error`)
  }
  return processCommit(token, appUrl, 'POST')
}

/**
 * Algunos browsers (Firefox strict, modos privados con cookies cross-site
 * bloqueadas) degradan el form auto-submit de Transbank de POST a GET.
 * Antes asumiamos que cualquier GET era cancelacion — pero si llega token_ws
 * via querystring, es un pago real que hay que procesar.
 *
 * Reglas:
 *  - GET con token_ws  → tratar como confirm (procesar commit)
 *  - GET con TBK_TOKEN → cancelacion explicita del usuario (anular compra)
 *  - GET sin token     → cancelacion implicita (cierra ventana, timeout)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const tokenWs   = req.nextUrl.searchParams.get('token_ws')
  const tbkToken  = req.nextUrl.searchParams.get('TBK_TOKEN')
  const tbkOrder  = req.nextUrl.searchParams.get('TBK_ORDER_ID')

  if (tokenWs) {
    console.log('[webpay/confirm GET] token_ws via GET (browser degraded POST→GET), procesando commit')
    return processCommit(tokenWs, appUrl, 'GET')
  }

  console.log('[webpay/confirm GET] cancelacion explicita — TBK_TOKEN:', tbkToken?.slice(0, 8) ?? 'null', '| TBK_ORDER_ID:', tbkOrder)
  return NextResponse.redirect(`${appUrl}/payment/failed?reason=cancelled`)
}
