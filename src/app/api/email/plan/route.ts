import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'

interface PlanEmailBody {
  patientEmail: string
  patientName: string
  professionalName: string
  planKcal: number
  planObjetivo: string
  macros: { p: number; c: number; g: number }
  appUrl: string
}

function buildHtml(body: PlanEmailBody): string {
  const { patientName, professionalName, planKcal, planObjetivo, macros, appUrl } = body
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuevo plan nutricional</title></head>
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
            <h2 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#0C1F2C;">Hola, ${patientName}</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#4a6b80;line-height:1.6;">
              Tu profesional <strong style="color:#0C3547;">${professionalName}</strong> ha generado un nuevo plan nutricional personalizado para ti.
            </p>

            <!-- Plan summary card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8ba5be;text-transform:uppercase;">Resumen de tu plan</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${[
                      ['Objetivo', planObjetivo],
                      ['Kcal/dia', `${planKcal} kcal`],
                      ['Proteina', `${macros.p}g`],
                      ['Carbohidratos', `${macros.c}g`],
                      ['Grasas', `${macros.g}g`],
                    ].map(([label, value], i, arr) => `
                    <tr>
                      <td style="padding:8px 0;${i < arr.length - 1 ? 'border-bottom:1px solid #e2ecf4;' : ''}">
                        <span style="font-size:13px;color:#4a6b80;font-weight:600;">${label}</span>
                      </td>
                      <td style="padding:8px 0;${i < arr.length - 1 ? 'border-bottom:1px solid #e2ecf4;' : ''}text-align:right;">
                        <span style="font-size:13px;color:#0C1F2C;font-weight:800;">${value}</span>
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
                  <a href="${appUrl}/paciente"
                     style="display:inline-block;background-color:#29ABE2;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.5px;">
                    Ver mi plan
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fbfd;border-top:1px solid #e2ecf4;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8ba5be;">Centro Metabolico Pro — Sistema clinico nutricional</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: PlanEmailBody
  try {
    body = (await req.json()) as PlanEmailBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await sendMail({
    to: body.patientEmail,
    subject: 'Tu profesional ha preparado un nuevo plan nutricional',
    html: buildHtml(body),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped })
}
