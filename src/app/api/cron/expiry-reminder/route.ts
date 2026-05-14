/**
 * Pre-expiry renewal CRON — fires at 14:00 UTC (≈ 10 AM Chile time).
 * Sends a renewal reminder to patients whose premium plan expires in 3 days.
 *
 * Also runs a second pass for plans expiring tomorrow (D-1 final notice).
 *
 * Triggered automatically by Vercel CRON (vercel.json).
 * Protected by CRON_SECRET to prevent unauthorized calls.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'

/** ISO date string N days from now */
function dateInNDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function buildExpiryHtml(
  nombre: string,
  daysLeft: number,
  appUrl: string,
): string {
  const isFinal = daysLeft <= 1
  const urgencyColor = isFinal ? '#E05A2B' : '#F59E0B'
  const urgencyBg    = isFinal ? '#FFF5F1' : '#FFFBEB'
  const urgencyBorder= isFinal ? '#FCCBB1' : '#FDE68A'
  const urgencyLabel = isFinal
    ? '⚠️ Tu plan vence mañana'
    : `Tu plan vence en ${daysLeft} días`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Renueva tu plan</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:#0c1f2c;padding:24px 32px;text-align:center;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#29abe2;text-transform:uppercase;">Centro Metabólico Pro</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#fff;">🔄 Renueva tu plan</p>
    </td>
  </tr>

  <!-- Urgency banner -->
  <tr>
    <td style="padding:0 32px;padding-top:24px;">
      <div style="background:${urgencyBg};border:1px solid ${urgencyBorder};border-radius:12px;padding:14px 16px;text-align:center;">
        <p style="margin:0;font-size:14px;font-weight:800;color:${urgencyColor};">${urgencyLabel}</p>
      </div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:24px 32px;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:800;color:#0c1f2c;">Hola, ${nombre} 👋</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#4a6b80;line-height:1.6;">
        ${isFinal
          ? 'Mañana se vence tu acceso a Centro Metabólico Pro. Renueva hoy para no perder tu historial de seguimiento, tu plan nutricional y el contacto con tu profesional.'
          : `En ${daysLeft} días se vence tu plan en Centro Metabólico Pro. Renueva ahora para mantener el acceso sin interrupciones.`
        }
      </p>

      <!-- What they keep -->
      <div style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;color:#8ba5be;text-transform:uppercase;">Al renovar conservas</p>
        ${[
          '📊 Todo tu historial de registros diarios',
          '🥗 Tu plan nutricional personalizado',
          '💬 Chat con tu nutricionista',
          '📱 Acceso completo en todos tus dispositivos',
        ].map(t => `<p style="margin:6px 0;font-size:13px;color:#0c1f2c;">${t}</p>`).join('')}
      </div>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${appUrl}/upgrade"
               style="display:inline-block;background:#29abe2;color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:10px;">
              Renovar mi plan →
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:12px;color:#8ba5be;text-align:center;">
        Si ya renovaste, ignora este mensaje.
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fbfd;border-top:1px solid #e2ecf4;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#8ba5be;">
        Centro Metabólico Pro · centrometabolico.cl
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Verify CRON secret
  const secret   = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'

  // ── Two notice windows: D-3 (first notice) and D-1 (final notice) ──────────
  const d1 = dateInNDays(1)
  const d2 = dateInNDays(2)
  const d3 = dateInNDays(3)
  const d4 = dateInNDays(4)

  // Fetch patients whose premium_until falls in either window
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, email, nombre, premium_until')
    .eq('role', 'patient')
    .neq('plan', 'gratuito')
    .not('email', 'is', null)
    .or(
      // D-1: expires tomorrow
      `and(premium_until.gte.${d1},premium_until.lt.${d2}),` +
      // D-3: expires in 3 days
      `and(premium_until.gte.${d3},premium_until.lt.${d4})`
    )

  if (error || !candidates) {
    console.error('[cron/expiry-reminder] fetch error:', error)
    return NextResponse.json({ error: 'Could not fetch candidates' }, { status: 500 })
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No expiring plans today' })
  }

  let sent   = 0
  let failed = 0

  for (const patient of candidates) {
    const expiryDate   = new Date(patient.premium_until)
    const today        = new Date()
    const msLeft       = expiryDate.getTime() - today.getTime()
    const daysLeft     = Math.max(1, Math.ceil(msLeft / 86_400_000))

    const subject = daysLeft <= 1
      ? '⚠️ Tu plan vence mañana — Renueva hoy'
      : `🔄 Tu plan vence en ${daysLeft} días — Centro Metabólico Pro`

    const result = await sendMail({
      to:      patient.email,
      subject,
      html:    buildExpiryHtml(patient.nombre || 'Hola', daysLeft, appUrl),
    })

    if (result.ok && !result.skipped) sent++
    else if (!result.ok) failed++
  }

  console.log(`[cron/expiry-reminder] candidates=${candidates.length} sent=${sent} failed=${failed}`)

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    sent,
    failed,
  })
}
