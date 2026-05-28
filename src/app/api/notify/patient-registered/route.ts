/**
 * POST /api/notify/patient-registered
 *
 * Notifica al profesional (email + push) que un paciente se acaba de
 * vincular a su panel mediante el link de invitación.
 *
 * Body: { patientId, patientName, patientEmail, professionalId }
 *
 * Auth: el caller debe SER el paciente que se registra. Verificamos que
 * auth.uid coincida con patientId vía Bearer token o cookie. Esto evita
 * que cualquiera pueda spamear al profesional con "registros" falsos.
 *
 * Ambos canales (email + push) son best-effort y se ejecutan en paralelo —
 * si push falla porque el profesional no tiene suscripción, el email igual sale.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-server'
import { sendMail } from '@/lib/mailer'
import { sendPushToUser } from '@/lib/push'
import { createServiceClient } from '@/lib/supabase-server'

interface Body {
  patientId: string
  patientName: string
  patientEmail: string
  professionalId: string
}

function buildEmailHtml(args: {
  professionalName: string
  patientName: string
  patientEmail: string
  patientId: string
  appUrl: string
}): string {
  const { professionalName, patientName, patientEmail, patientId, appUrl } = args
  // Deep link directo a la ficha del paciente (no solo al panel general)
  const deepLink = `${appUrl}/paciente?tab=pacientes&patient=${encodeURIComponent(patientId)}`
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuevo paciente vinculado</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:#0C1F2C;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#29ABE2;text-transform:uppercase;">Centro Metabolico</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:1px;">CENTRO METABOLICO PRO</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0C1F2C;">Hola, ${professionalName}</h2>
            <p style="margin:0 0 16px;font-size:14px;color:#4a6b80;line-height:1.6;">
              <strong style="color:#0C3547;">${patientName}</strong> acaba de registrarse en Centro Metabolico Pro usando tu link de invitacion.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;margin-bottom:24px;">
              <tr><td style="padding:18px 22px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8ba5be;text-transform:uppercase;">Nuevo paciente</p>
                <p style="margin:0;font-size:15px;color:#0C1F2C;font-weight:700;">${patientName}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#4a6b80;">${patientEmail}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 20px;font-size:13px;color:#4a6b80;line-height:1.5;">
              Haz clic para abrir su ficha directamente y generar su plan nutricional.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center">
                <a href="${deepLink}"
                   style="display:inline-block;background-color:#29ABE2;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 32px;border-radius:10px;letter-spacing:0.5px;">
                  Abrir ficha de ${patientName}
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 28px;text-align:center;border-top:1px solid #e2ecf4;">
            <p style="margin:0;font-size:10px;color:#8ba5be;">Centro Metabolico Pro · ${new Date().getFullYear()}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth — caller debe estar logueado
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let body: Body
  try {
    body = (await req.json()) as Body
    if (!body.patientId || !body.professionalId || !body.patientName || !body.patientEmail) {
      throw new Error('missing fields')
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // 3. Caller debe SER el paciente que se acaba de registrar — evita spam
  if (user.id !== body.patientId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Resolver email/nombre del profesional vía service role (bypasa RLS)
  const sb = createServiceClient()
  const { data: pro } = await sb
    .from('profiles')
    .select('id, nombre, email, role')
    .eq('id', body.professionalId)
    .maybeSingle()

  if (!pro || pro.role !== 'professional') {
    // Profesional no existe o id incorrecto — registro válido pero sin notificación
    return NextResponse.json({ ok: true, skipped: 'pro_not_found' })
  }

  const origin = req.nextUrl.origin

  // 5. Enviar email + push en paralelo (best-effort)
  const [emailResult, pushResult] = await Promise.all([
    pro.email
      ? sendMail({
          to: pro.email,
          subject: `${body.patientName} se acaba de vincular a tu panel`,
          html: buildEmailHtml({
            professionalName: pro.nombre ?? 'Profesional',
            patientName: body.patientName,
            patientEmail: body.patientEmail,
            patientId: body.patientId,
            appUrl: origin,
          }),
        })
      : Promise.resolve({ ok: true as const, skipped: 'no_email' as const }),
    (async () => {
      try {
        const res = await sendPushToUser(sb, body.professionalId, {
          title: '👤 Nuevo paciente vinculado',
          body:  `${body.patientName} se registró con tu link y está esperando su plan.`,
          url:   `/paciente?tab=pacientes&patient=${encodeURIComponent(body.patientId)}`,
          tag:   'patient-registered',
        })
        return res
      } catch (err) {
        console.error('[notify/patient-registered] push failed:', err)
        return { sent: 0, removed: 0, error: String(err) }
      }
    })(),
  ])

  return NextResponse.json({
    ok: true,
    email: emailResult,
    push:  pushResult,
  })
}
