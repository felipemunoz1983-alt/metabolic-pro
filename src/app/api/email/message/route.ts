/**
 * POST /api/email/message
 * Sends a custom message from a professional to a patient.
 * Auth: must be authenticated and have role=professional.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'

const TIPO_LABEL: Record<string, string> = {
  motivacional:  '💪 Mensaje de apoyo',
  ajuste:        '🔧 Ajuste de plan',
  recordatorio:  '📋 Recordatorio',
  general:       '📩 Mensaje de tu nutricionista',
}

function buildMessageHtml(
  nombre: string,
  professionalName: string,
  tipo: string,
  mensaje: string,
  appUrl: string,
): string {
  const label = TIPO_LABEL[tipo] ?? '📩 Mensaje de tu nutricionista'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:#0c1f2c;padding:24px 32px;text-align:center;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#29abe2;text-transform:uppercase;">Centro Metabólico Pro</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:900;color:#fff;">${label}</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:800;color:#0c1f2c;">Hola, ${nombre} 👋</h2>

      <!-- Message bubble -->
      <div style="background:#f0f6fa;border-left:4px solid #29abe2;border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#8ba5be;letter-spacing:1px;text-transform:uppercase;">${professionalName}</p>
        <p style="margin:0;font-size:14px;color:#0c1f2c;line-height:1.7;white-space:pre-wrap;">${mensaje}</p>
      </div>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${appUrl}/paciente?tab=dashboard"
               style="display:inline-block;background:#29abe2;color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:10px;">
              Ir a mi panel →
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
        Centro Metabólico Pro · Este mensaje fue enviado por tu profesional de salud.
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
  // Auth
  const cookieStore = await cookies()
  const sbAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await sbAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify role
  const supabase = createServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nombre')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'professional') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse body
  let body: { patientId: string; tipo: string; mensaje: string }
  try {
    body = await req.json()
    if (!body.patientId || !body.mensaje?.trim()) throw new Error('missing fields')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Fetch patient
  const { data: patient } = await supabase
    .from('profiles')
    .select('nombre, email, professional_id')
    .eq('id', body.patientId)
    .maybeSingle()

  if (!patient?.email) {
    return NextResponse.json({ error: 'Patient not found or no email' }, { status: 404 })
  }

  // Security: patient must belong to this professional
  if (patient.professional_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'
  const professionalName = profile.nombre ?? 'Tu nutricionista'

  const label = TIPO_LABEL[body.tipo] ?? '📩 Mensaje de tu nutricionista'
  const result = await sendMail({
    to: patient.email,
    subject: `${label} — Centro Metabólico Pro`,
    html: buildMessageHtml(
      patient.nombre ?? 'Paciente',
      professionalName,
      body.tipo,
      body.mensaje.trim(),
      appUrl,
    ),
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped })
}
