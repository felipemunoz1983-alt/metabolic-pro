/**
 * Daily reminder CRON — fires at 11 PM UTC (≈ 7-8 PM Chile time).
 * Sends an email to patients who have an active plan AND haven't logged today.
 *
 * Triggered automatically by Vercel CRON (vercel.json).
 * Protected by CRON_SECRET to prevent unauthorized calls.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'

const today = () => new Date().toISOString().split('T')[0]

function buildReminderHtml(nombre: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recordatorio diario</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:#0c1f2c;padding:24px 32px;text-align:center;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#29abe2;text-transform:uppercase;">Centro Metabólico Pro</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#fff;">📋 Recordatorio diario</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:18px;font-weight:800;color:#0c1f2c;">Hola, ${nombre} 👋</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#4a6b80;line-height:1.6;">
        Aún no has registrado tus comidas de hoy. Llevar un registro diario es clave para alcanzar tus objetivos nutricionales.
      </p>

      <!-- Quick tips -->
      <div style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;color:#8ba5be;text-transform:uppercase;">Solo tarda 30 segundos</p>
        ${[
          '✅ Marca las comidas que completaste',
          '⚡ Registra tu nivel de energía',
          '⚖️ Anota tu peso si te mediste hoy',
        ].map(t => `<p style="margin:6px 0;font-size:13px;color:#0c1f2c;">${t}</p>`).join('')}
      </div>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${appUrl}/paciente"
               style="display:inline-block;background:#29abe2;color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:10px;">
              Registrar mi día →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fbfd;border-top:1px solid #e2ecf4;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#8ba5be;">
        Centro Metabólico Pro · Si no deseas recibir recordatorios, actualiza tus preferencias en tu perfil.
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
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const fechaHoy = today()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'

  // 1. Fetch all patients with active (non-gratuito) plans who have email
  const { data: activePacientes, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, nombre, premium_until')
    .eq('role', 'patient')
    .neq('plan', 'gratuito')
    .not('email', 'is', null)

  if (pErr || !activePacientes) {
    console.error('[cron/daily-reminder] fetch patients error:', pErr)
    return NextResponse.json({ error: 'Could not fetch patients' }, { status: 500 })
  }

  // Filter to only patients whose premium_until is still in the future
  const validPatients = activePacientes.filter(p =>
    !p.premium_until || new Date(p.premium_until) > new Date()
  )

  if (validPatients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: 'No active patients' })
  }

  // 2. Fetch today's registros for these patients
  const patientIds = validPatients.map(p => p.id)
  const { data: todayLogs } = await supabase
    .from('registros_diarios')
    .select('user_id')
    .in('user_id', patientIds)
    .eq('fecha', fechaHoy)

  const loggedToday = new Set(todayLogs?.map(l => l.user_id) ?? [])

  // 3. Send reminders to those who haven't logged today
  const toRemind = validPatients.filter(p => !loggedToday.has(p.id))

  let sent = 0
  let failed = 0

  for (const patient of toRemind) {
    const result = await sendMail({
      to: patient.email,
      subject: '📋 Registra tu día — Centro Metabólico Pro',
      html: buildReminderHtml(patient.nombre || 'Hola', appUrl),
    })
    if (result.ok && !result.skipped) sent++
    else if (!result.ok) failed++
  }

  console.log(`[cron/daily-reminder] sent=${sent} failed=${failed} skipped=${toRemind.length - sent - failed}`)

  return NextResponse.json({
    ok: true,
    date: fechaHoy,
    activePatients: validPatients.length,
    alreadyLogged: loggedToday.size,
    toRemind: toRemind.length,
    sent,
    failed,
  })
}
