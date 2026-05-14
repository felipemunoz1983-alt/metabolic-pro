import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'

interface InviteEmailBody {
  patientEmail: string
  professionalName: string
  inviteLink: string
  appUrl: string
}

function buildHtml(body: InviteEmailBody): string {
  const { professionalName, inviteLink } = body
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitacion a Centro Metabolico Pro</title></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#0C1F2C;padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;color:#29ABE2;text-transform:uppercase;">Centro Metabolico</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:1px;">CENTRO METABOLICO PRO</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0C1F2C;">Te invitan a unirte</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#4a6b80;line-height:1.6;">
              Tu profesional <strong style="color:#0C3547;">${professionalName}</strong> te invita a registrarte en
              Centro Metabolico Pro para hacer seguimiento personalizado de tu alimentacion y adherencia nutricional.
            </p>

            <!-- Feature list -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8ba5be;text-transform:uppercase;">Lo que tendras disponible</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${[
                      ['Plan nutricional personalizado', 'Generado clinicamente por tu profesional'],
                      ['Registro diario de calorias', 'Seguimiento de adherencia y macros'],
                      ['Asistente IA nutricional', 'Consultas clinicas disponibles 24/7'],
                      ['Historial de planes', 'Todo tu seguimiento en un solo lugar'],
                    ].map(([title, desc]) => `
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2ecf4;">
                        <span style="font-size:13px;color:#0C1F2C;font-weight:700;">${title}</span><br>
                        <span style="font-size:11px;color:#8ba5be;">${desc}</span>
                      </td>
                    </tr>`).join('')}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:8px;">
                  <a href="${inviteLink}"
                     style="display:inline-block;background-color:#29ABE2;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.5px;">
                    Crear mi cuenta gratis
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:12px;">
                  <p style="margin:0;font-size:11px;color:#8ba5be;">O copia este link en tu navegador:</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#29ABE2;word-break:break-all;">${inviteLink}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fbfd;border-top:1px solid #e2ecf4;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8ba5be;">Centro Metabolico Pro — Sistema clinico nutricional</p>
            <p style="margin:4px 0 0;font-size:10px;color:#c8d8e4;">Si no esperabas esta invitacion, puedes ignorar este email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: InviteEmailBody
  try {
    body = (await req.json()) as InviteEmailBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await sendMail({
    to: body.patientEmail,
    subject: `${body.professionalName} te invita a Centro Metabolico Pro`,
    html: buildHtml(body),
  })

  if (!result.ok) {
    console.error('[/api/email/invite] send failed:', result.error)
    return NextResponse.json({ error: result.error, detail: 'Email send failed — check RESEND_FROM_EMAIL domain verification' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped })
}
