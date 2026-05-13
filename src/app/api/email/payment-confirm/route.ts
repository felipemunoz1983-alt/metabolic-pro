import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/mailer'
import type { PlanType } from '@/types'

interface PaymentConfirmEmailBody {
  userEmail: string
  userName: string
  planType: PlanType
  premiumUntil: string  // ISO date string
  appUrl: string
}

const PLAN_LABELS: Record<PlanType, string> = {
  professional: 'Plan Profesional',
  patient:      'Plan Paciente',
  individual:   'Plan Individual',
}

const PLAN_PRICES: Record<PlanType, string> = {
  professional: '$14.990',
  patient:      '$7.000',
  individual:   '$12.990',
}

const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  professional: 'Acceso completo al panel profesional, gestion de pacientes ilimitados y todas las funciones clinicas.',
  patient:      'Acceso a tu plan nutricional personalizado, asistente IA 24/7 y registro diario de alimentacion.',
  individual:   'Plan nutricional personalizado, asistente IA nutricional y escaner de alimentos por camara.',
}

const PLAN_FEATURES: Record<PlanType, string[]> = {
  professional: [
    'Panel de gestion de pacientes ilimitados',
    'Generacion de planes nutricionales clinicos',
    'Alertas automaticas de adherencia',
    'Asistente IA nutricional 24/7',
    'Links de invitacion personalizados',
  ],
  patient: [
    'Plan nutricional personalizado por tu profesional',
    'Registro diario de calorias y macros',
    'Asistente IA nutricional 24/7',
    'Escaner de alimentos con camara',
    'Historial de planes y seguimiento',
  ],
  individual: [
    'Generador de plan nutricional personalizado',
    'Registro diario de calorias y macros',
    'Asistente IA nutricional 24/7',
    'Escaner de alimentos con camara',
    'Productos Nutrevo recomendados segun objetivo',
  ],
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function buildHtml(body: PaymentConfirmEmailBody): string {
  const { userName, planType, premiumUntil, appUrl } = body
  const firstName = userName.split(' ')[0]
  const planLabel = PLAN_LABELS[planType]
  const planPrice = PLAN_PRICES[planType]
  const planDesc = PLAN_DESCRIPTIONS[planType]
  const features = PLAN_FEATURES[planType]
  const untilFormatted = formatDate(premiumUntil)

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pago confirmado - Centro Metabolico Pro</title></head>
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

        <!-- Success banner -->
        <tr>
          <td style="background-color:#0f7e4a;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">&#10003; Pago confirmado exitosamente</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <h2 style="margin:0 0 6px;font-size:20px;font-weight:900;color:#0C1F2C;">Bienvenido, ${firstName}!</h2>
            <p style="margin:0 0 24px;font-size:14px;color:#4a6b80;line-height:1.6;">
              Tu pago fue procesado correctamente. Tienes acceso completo a <strong style="color:#0C3547;">${planLabel}</strong> de Centro Metabolico Pro.
            </p>

            <!-- Plan summary card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#8ba5be;text-transform:uppercase;">Resumen de tu plan</p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2ecf4;">
                        <span style="font-size:12px;color:#8ba5be;">Plan contratado</span>
                      </td>
                      <td style="padding:8px 0;border-bottom:1px solid #e2ecf4;text-align:right;">
                        <span style="font-size:13px;font-weight:800;color:#0C1F2C;">${planLabel}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #e2ecf4;">
                        <span style="font-size:12px;color:#8ba5be;">Monto pagado</span>
                      </td>
                      <td style="padding:8px 0;border-bottom:1px solid #e2ecf4;text-align:right;">
                        <span style="font-size:13px;font-weight:800;color:#29ABE2;">${planPrice} CLP</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="font-size:12px;color:#8ba5be;">Acceso activo hasta</span>
                      </td>
                      <td style="padding:8px 0;text-align:right;">
                        <span style="font-size:13px;font-weight:800;color:#0f7e4a;">${untilFormatted}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Plan description -->
            <p style="margin:0 0 16px;font-size:13px;color:#4a6b80;line-height:1.6;">${planDesc}</p>

            <!-- Features -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf4fb;border:1px solid #c0dff2;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;color:#1a6fa0;text-transform:uppercase;">Lo que tienes disponible ahora</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${features.map(f => `
                    <tr>
                      <td style="padding:6px 0;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="padding-right:10px;vertical-align:top;padding-top:1px;">
                            <span style="display:inline-block;width:16px;height:16px;background-color:#29ABE2;border-radius:50%;text-align:center;line-height:16px;font-size:9px;color:#ffffff;font-weight:900;">&#10003;</span>
                          </td>
                          <td>
                            <span style="font-size:13px;color:#0C1F2C;">${f}</span>
                          </td>
                        </tr></table>
                      </td>
                    </tr>`).join('')}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${appUrl}/paciente"
                     style="display:inline-block;background-color:#29ABE2;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 40px;border-radius:10px;letter-spacing:0.5px;">
                    Ingresar a la app
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top:16px;">
                  <p style="margin:0;font-size:11px;color:#8ba5be;">
                    Tu plan se renueva cada 30 dias.<br>
                    Puedes contactarnos en cualquier momento respondiendo este email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fbfd;border-top:1px solid #e2ecf4;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8ba5be;">Centro Metabolico Pro — Sistema clinico nutricional</p>
            <p style="margin:4px 0 0;font-size:10px;color:#c8d8e4;">Si tienes preguntas, responde este email o contacta a tu profesional.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: PaymentConfirmEmailBody
  try {
    body = (await req.json()) as PaymentConfirmEmailBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await sendMail({
    to: body.userEmail,
    subject: `Tu ${PLAN_LABELS[body.planType]} esta activo — Centro Metabolico Pro`,
    html: buildHtml(body),
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped })
}
