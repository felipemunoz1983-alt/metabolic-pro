/**
 * POST /api/notify/professional/ping
 *
 * El paciente avisa a su nutricionista que está esperando su plan / quiere
 * conversar. Dispara push notif + email al profesional vinculado.
 *
 * Auth: caller debe estar autenticado y tener un professional_id en su profile.
 *
 * Rate limit: anti-spam suave. El cliente debe evitar llamar más de 1 vez
 * cada 24h (UI lo enforza con localStorage). Si igual lo intenta, el endpoint
 * sigue funcionando — confiamos en que el profesional puede silenciar al
 * paciente si se vuelve abusivo (poco probable en práctica clínica).
 *
 * Respuestas:
 *   200 { ok: true, email, push }   — notificaciones disparadas
 *   401 — no autenticado
 *   404 — paciente sin profesional vinculado
 *   500 — error inesperado
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'
import { sendPushToUser } from '@/lib/push'

function buildEmailHtml(args: {
  professionalName: string
  patientName: string
  patientEmail: string
  message: string
  appUrl: string
  patientId: string
}): string {
  const { professionalName, patientName, patientEmail, message, appUrl, patientId } = args
  const deepLink = `${appUrl}/paciente?tab=pacientes&patient=${encodeURIComponent(patientId)}`
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${patientName} te está esperando</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <tr>
    <td style="background:#0C1F2C;padding:24px 32px;text-align:center;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#29ABE2;text-transform:uppercase;">Centro Metabolico Pro</p>
      <p style="margin:6px 0 0;font-size:18px;font-weight:900;color:#fff;">👋 ${patientName} te está esperando</p>
    </td>
  </tr>
  <tr>
    <td style="padding:32px;">
      <h2 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#0C1F2C;">Hola, ${professionalName}</h2>
      <p style="margin:0 0 18px;font-size:14px;color:#4A6B80;line-height:1.6;">
        Tu paciente <strong style="color:#0C3547;">${patientName}</strong> está esperando su plan nutricional en la app.
      </p>
      <div style="background:#F0F6FA;border-left:4px solid #29ABE2;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#0C1F2C;line-height:1.6;font-style:italic;">"${message}"</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="${deepLink}"
             style="display:inline-block;background:#29ABE2;color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:0.5px;">
            Abrir ficha de ${patientName}
          </a>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:#8BA5BE;text-align:center;">
        Email del paciente: ${patientEmail}
      </p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Resolver paciente + profesional vinculado
  const sb = createServiceClient()
  const { data: patient } = await sb
    .from('profiles')
    .select('id, nombre, email, professional_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!patient || !patient.professional_id) {
    return NextResponse.json({ error: 'no_professional_linked' }, { status: 404 })
  }

  const { data: pro } = await sb
    .from('profiles')
    .select('id, nombre, email, role')
    .eq('id', patient.professional_id)
    .maybeSingle()

  if (!pro || pro.role !== 'professional') {
    return NextResponse.json({ error: 'professional_not_found' }, { status: 404 })
  }

  // 3. Mensaje por defecto (si el paciente no envió uno custom).
  let customMessage = 'Quiero saber cuándo estará listo mi plan nutricional.'
  try {
    const body = await req.json().catch(() => null) as { message?: string } | null
    if (body?.message && typeof body.message === 'string' && body.message.trim().length > 0) {
      customMessage = body.message.trim().slice(0, 500) // hard cap 500 chars
    }
  } catch { /* sin body es válido */ }

  const origin = req.nextUrl.origin

  // 4. Disparar email + push en paralelo (best-effort)
  const [emailResult, pushResult] = await Promise.all([
    pro.email
      ? sendMail({
          to: pro.email,
          subject: `👋 ${patient.nombre ?? 'Tu paciente'} te está esperando`,
          html: buildEmailHtml({
            professionalName: pro.nombre ?? 'Profesional',
            patientName: patient.nombre ?? 'Paciente',
            patientEmail: patient.email ?? '',
            message: customMessage,
            appUrl: origin,
            patientId: patient.id,
          }),
        })
      : Promise.resolve({ ok: true as const, skipped: 'no_email' as const }),
    (async () => {
      try {
        return await sendPushToUser(sb, patient.professional_id!, {
          title: `👋 ${patient.nombre ?? 'Tu paciente'} te espera`,
          body: customMessage.length > 100 ? customMessage.slice(0, 97) + '...' : customMessage,
          url: `/paciente?tab=pacientes&patient=${encodeURIComponent(patient.id)}`,
          tag: `patient-ping-${patient.id}`,
        })
      } catch (err) {
        return { sent: 0, removed: 0, error: String(err) }
      }
    })(),
  ])

  return NextResponse.json({ ok: true, email: emailResult, push: pushResult })
}
