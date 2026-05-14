/**
 * POST /api/email/welcome
 * Sends a welcome email right after a new user registers.
 * Called client-side from the register form — not auth-guarded (user just created,
 * session may not be fully propagated), so we only trust the body fields and
 * use them for display only (no sensitive actions).
 *
 * Body: { nombre: string; email: string; trialDays: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'

function buildWelcomeHtml(nombre: string, trialDays: number, appUrl: string): string {
  const trialLabel = trialDays > 0
    ? `${trialDays} días gratis`
    : 'acceso inmediato'

  const features = [
    { icon: '🧮', text: 'Plan nutricional con IA clínica (Harris-Benedict + PAL)' },
    { icon: '🔥', text: 'Registro diario con racha de adherencia' },
    { icon: '📊', text: 'Dashboard de progreso y evolución de peso' },
    { icon: '💬', text: 'Asistente nutricional disponible 24/7' },
  ]

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bienvenido/a a Centro Metabólico Pro</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0"
  style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#0c1f2c 0%,#0c3547 60%,#1a5f8a 100%);padding:32px;text-align:center;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:3px;color:#29abe2;text-transform:uppercase;">
        Centro Metabólico Pro
      </p>
      <h1 style="margin:0;font-size:26px;font-weight:900;color:#fff;line-height:1.2;">
        ¡Bienvenido/a, ${nombre}! 🎉
      </h1>
      <p style="margin:8px 0 0;font-size:13px;color:#4a7a94;">
        Tu cuenta está lista. Tienes <strong style="color:#29abe2;">${trialLabel}</strong> para explorar todo.
      </p>
    </td>
  </tr>

  <!-- Trial badge -->
  ${trialDays > 0 ? `
  <tr>
    <td style="padding:0 32px;">
      <div style="background:#eaf4fb;border:1.5px solid #29abe2;border-radius:12px;padding:14px 18px;margin:24px 0 0;text-align:center;">
        <p style="margin:0;font-size:13px;font-weight:800;color:#0c3547;">
          ✅ Trial activo — <span style="color:#29abe2;">${trialDays} días gratis</span>
        </p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b8fa8;">
          Sin tarjeta de crédito. Cancela cuando quieras.
        </p>
      </div>
    </td>
  </tr>` : ''}

  <!-- Body -->
  <tr>
    <td style="padding:24px 32px 32px;">

      <p style="margin:0 0 20px;font-size:14px;color:#4a6070;line-height:1.7;">
        En Centro Metabólico encontrarás herramientas clínicas reales para mejorar tu nutrición
        y alcanzar tus objetivos. Esto es lo que puedes hacer desde hoy:
      </p>

      <!-- Features list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        ${features.map(f => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f4f8;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:18px;padding-right:12px;vertical-align:middle;">${f.icon}</td>
                <td style="font-size:13px;color:#0c1f2c;line-height:1.5;">${f.text}</td>
              </tr>
            </table>
          </td>
        </tr>`).join('')}
      </table>

      <!-- Primary CTA -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="${appUrl}/paciente"
               style="display:inline-block;background:linear-gradient(135deg,#0c3547,#1a6fa0);color:#fff;
                      font-size:15px;font-weight:900;text-decoration:none;padding:16px 40px;
                      border-radius:12px;letter-spacing:0.3px;">
              Ir a mi dashboard →
            </a>
          </td>
        </tr>
      </table>

      <!-- Quick start tip -->
      <div style="background:#f7fbfe;border-left:4px solid #29abe2;border-radius:0 10px 10px 0;padding:14px 18px;">
        <p style="margin:0;font-size:12px;font-weight:700;color:#29abe2;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
          Primer paso recomendado
        </p>
        <p style="margin:0;font-size:13px;color:#0c1f2c;line-height:1.6;">
          Completa tu perfil básico y genera tu primer plan nutricional.
          Solo toma 2 minutos y tendrás tus calorías y macros exactos.
        </p>
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fbfd;border-top:1px solid #e2ecf4;padding:20px 32px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b8fa8;">
        ¿Tienes alguna pregunta? Responde este email y te ayudamos.
      </p>
      <p style="margin:0;font-size:11px;color:#8ba5be;">
        Centro Metabólico Pro · Santiago, Chile
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { nombre?: string; email?: string; trialDays?: number }
  try {
    body = await req.json()
    if (!body.email || !body.nombre) throw new Error('missing fields')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'
  const nombre   = body.nombre.trim()
  const email    = body.email.trim().toLowerCase()
  const trialDays = body.trialDays ?? 7

  const result = await sendMail({
    to: email,
    subject: `¡Bienvenido/a a Centro Metabólico Pro, ${nombre}! Tu trial está activo 🎉`,
    html: buildWelcomeHtml(nombre, trialDays, appUrl),
  })

  if (!result.ok) {
    // Non-fatal — log but don't block registration
    console.error('[welcome-email] Failed to send:', email)
    return NextResponse.json({ ok: false, skipped: result.skipped }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped })
}
