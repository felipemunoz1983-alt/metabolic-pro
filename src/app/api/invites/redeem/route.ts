/**
 * POST /api/invites/redeem
 *
 * Operación atómica: el paciente autenticado redime un token de invitación
 * y queda vinculado al profesional firmante. Combina verify + link + notify.
 *
 * Body: { token: string }
 * Auth: el caller debe estar logueado (es el paciente que se vincula).
 *
 * Flujo:
 *   1. Auth → paciente logueado (caller = patientId)
 *   2. verifyInviteToken(token) → extrae pid del profesional + valida exp
 *   3. Verifica que el profesional exista y tenga role='professional'
 *   4. UPDATE profiles SET professional_id, role='patient', trial_ends_at
 *      (sólo otorga trial 21d si NO tenía acceso activo previo)
 *   5. Dispara email + push al profesional ("nuevo paciente vinculado")
 *
 * Errores claros para que el cliente muestre mensajes útiles:
 *   400 → token mal formado
 *   401 → no autenticado
 *   410 → token expirado o firma inválida (Gone)
 *   404 → profesional ya no existe
 *   409 → paciente ya estaba vinculado a OTRO profesional (no sobreescribimos)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { verifyInviteToken } from '@/lib/invite-token'
import { sendMail } from '@/lib/mailer'
import { sendPushToUser } from '@/lib/push'
import { createServiceClient } from '@/lib/supabase-server'

interface Body { token: string }

function buildProfessionalEmail(args: {
  professionalName: string
  patientName: string
  patientEmail: string
  patientId: string
  appUrl: string
}): string {
  const { professionalName, patientName, patientEmail, patientId, appUrl } = args
  // Deep link directo al detalle del paciente (no solo al panel general)
  const deepLink = `${appUrl}/paciente?tab=pacientes&patient=${encodeURIComponent(patientId)}`
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#0C1F2C;padding:28px 32px;text-align:center;">
  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#29ABE2;text-transform:uppercase;">Centro Metabolico</p>
  <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:#fff;letter-spacing:1px;">CENTRO METABOLICO PRO</h1>
</td></tr>
<tr><td style="padding:36px 32px 24px;">
  <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0C1F2C;">Hola, ${professionalName}</h2>
  <p style="margin:0 0 16px;font-size:14px;color:#4a6b80;line-height:1.6;">
    <strong style="color:#0C3547;">${patientName}</strong> acaba de vincularse a tu panel usando tu link de invitacion.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;margin-bottom:24px;">
    <tr><td style="padding:18px 22px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8ba5be;text-transform:uppercase;">Nuevo paciente</p>
      <p style="margin:0;font-size:15px;color:#0C1F2C;font-weight:700;">${patientName}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#4a6b80;">${patientEmail}</p>
    </td></tr>
  </table>
  <p style="margin:0 0 20px;font-size:13px;color:#4a6b80;line-height:1.5;">Haz clic para abrir su ficha directamente y generar su plan nutricional.</p>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${deepLink}" style="display:inline-block;background:#29ABE2;color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:0.5px;">Abrir ficha de ${patientName}</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 28px;text-align:center;border-top:1px solid #e2ecf4;">
  <p style="margin:0;font-size:10px;color:#8ba5be;">Centro Metabolico Pro · ${new Date().getFullYear()}</p>
</td></tr>
</table></td></tr></table></body></html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth — el paciente debe estar logueado
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Body
  let body: Body
  try {
    body = (await req.json()) as Body
    if (!body.token || typeof body.token !== 'string') throw new Error('missing token')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // 3. Verificar token (firma + exp)
  const payload = verifyInviteToken(body.token)
  if (!payload) {
    return NextResponse.json(
      { error: 'invite_invalid_or_expired', message: 'Este link de invitación es inválido o ya expiró. Pide uno nuevo a tu profesional.' },
      { status: 410 },
    )
  }

  const professionalId = payload.pid
  const sb = createServiceClient()

  // 4. Verificar que el profesional exista y tenga role correcto
  const { data: pro } = await sb
    .from('profiles')
    .select('id, nombre, email, role')
    .eq('id', professionalId)
    .maybeSingle()

  if (!pro || pro.role !== 'professional') {
    return NextResponse.json(
      { error: 'professional_not_found', message: 'El profesional ya no está disponible.' },
      { status: 404 },
    )
  }

  // 5. Verificar estado actual del paciente — no sobreescribir vínculos previos
  //    a OTRO profesional sin avisar (UX/legal: el paciente debe saber)
  const { data: currentPatient } = await sb
    .from('profiles')
    .select('id, nombre, email, professional_id, premium_until, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle()

  if (
    currentPatient?.professional_id &&
    currentPatient.professional_id !== professionalId
  ) {
    return NextResponse.json(
      {
        error: 'already_linked_to_other_professional',
        message: 'Ya estás vinculado a otro profesional. Contacta a soporte si necesitas cambiar.',
      },
      { status: 409 },
    )
  }

  // 6. Otorgar trial 21d solo si no hay acceso activo
  const hasActivePremium = currentPatient?.premium_until && new Date(currentPatient.premium_until) > new Date()
  const hasActiveTrial   = currentPatient?.trial_ends_at  && new Date(currentPatient.trial_ends_at)  > new Date()
  const grantTrial       = !hasActivePremium && !hasActiveTrial

  const updatePayload: Record<string, unknown> = {
    professional_id: professionalId,
    role: 'patient',
    ...(grantTrial && {
      trial_ends_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  }

  const { error: updateErr } = await sb
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 7. Notificar al profesional (email + push) en paralelo, best-effort
  const patientName  = currentPatient?.nombre ?? user.email ?? 'Paciente'
  const patientEmail = currentPatient?.email ?? user.email ?? ''
  const origin = req.nextUrl.origin

  Promise.all([
    pro.email
      ? sendMail({
          to: pro.email,
          subject: `${patientName} se acaba de vincular a tu panel`,
          html: buildProfessionalEmail({
            professionalName: pro.nombre ?? 'Profesional',
            patientName,
            patientEmail,
            patientId: user.id,
            appUrl: origin,
          }),
        }).catch(err => console.error('[invites/redeem] email failed:', err))
      : Promise.resolve(),
    sendPushToUser(sb, professionalId, {
      title: '👤 Nuevo paciente vinculado',
      body:  `${patientName} se registró con tu link y está esperando su plan.`,
      url:   `/paciente?tab=pacientes&patient=${encodeURIComponent(user.id)}`,
      tag:   'patient-registered',
    }).catch(err => console.error('[invites/redeem] push failed:', err)),
  ])

  return NextResponse.json({
    ok: true,
    grantedTrial: grantTrial,
    professional: { id: pro.id, nombre: pro.nombre },
  })
}
