/**
 * POST /api/email/patient-digest
 * Sends a personalised weekly progress email to a single patient.
 * Called by the patient-digest CRON route for each eligible patient.
 *
 * Body: { userId: string }
 *
 * Computes from the last 7 days:
 *   - currentStreak  (consecutive days logged up to today)
 *   - bestStreak     (max run in the 7-day window)
 *   - adherenciaMedia (% meals completed)
 *   - kcalMedia      (avg daily kcal consumed)
 *   - kcalObjetivo   (target kcal from most recent plan)
 *   - pesoUltimo / pesoAnterior (trend)
 *
 * CTA personalised by adherence band:
 *   ≥ 70% → "¡Sigue así! →" (green)
 *   40–69% → "Ajusta tu semana →" (amber)
 *   < 40%  → "Retoma el ritmo →" (red) + tip
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'
import {
  computeCurrentStreak,
  computeBestStreak,
  getCtaConfig,
  type CtaConfig,
} from '@/lib/digestSummary'

// ─── Helpers locales (manejo de fechas para query Supabase) ──────────────────

function isoToday(): string {
  return new Date().toISOString().split('T')[0]
}

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildPatientDigestHtml(params: {
  nombre: string
  weekLabel: string
  currentStreak: number
  bestStreak: number
  adherenciaMedia: number | null
  kcalMedia: number | null
  kcalObjetivo: number | null
  pesoUltimo: number | null
  pesoAnterior: number | null
  logsCount: number
  appUrl: string
}): string {
  const {
    nombre, weekLabel, currentStreak, bestStreak,
    adherenciaMedia, kcalMedia, kcalObjetivo, pesoUltimo, pesoAnterior,
    logsCount, appUrl,
  } = params

  const cta = getCtaConfig(adherenciaMedia, nombre)

  const pesoTrend = pesoUltimo && pesoAnterior && pesoUltimo !== pesoAnterior
    ? (pesoUltimo - pesoAnterior).toFixed(1)
    : null

  const adhColor = adherenciaMedia === null
    ? '#9ca3af'
    : adherenciaMedia >= 70 ? '#16a34a'
    : adherenciaMedia >= 40 ? '#d97706'
    : '#dc2626'

  const adhBar = adherenciaMedia !== null
    ? `<div style="background:#e2ecf4;border-radius:8px;height:8px;margin:8px 0 0;overflow:hidden;">
         <div style="background:${adhColor};height:8px;width:${adherenciaMedia}%;border-radius:8px;transition:width 0.3s;"></div>
       </div>`
    : ''

  const streakFlame = currentStreak >= 7 ? '🔥🔥' : currentStreak >= 3 ? '🔥' : '⚡'

  const stats = [
    {
      icon: streakFlame,
      label: 'Racha actual',
      value: `${currentStreak} días`,
      sub: bestStreak > 1 ? `Mejor racha: ${bestStreak}d` : 'Sigue construyendo',
      color: currentStreak >= 7 ? '#ea580c' : currentStreak >= 3 ? '#f59e0b' : '#6b7280',
    },
    {
      icon: '📊',
      label: 'Adherencia',
      value: adherenciaMedia !== null ? `${adherenciaMedia}%` : '—',
      sub: `${logsCount} de 7 días`,
      color: adhColor,
    },
    {
      icon: '🧮',
      label: 'Kcal promedio',
      value: kcalMedia !== null ? `${kcalMedia.toLocaleString('es-CL')}` : '—',
      sub: kcalObjetivo ? `Meta: ${kcalObjetivo.toLocaleString('es-CL')} kcal` : 'Sin plan activo',
      color: '#29abe2',
    },
    {
      icon: '⚖️',
      label: 'Peso',
      value: pesoUltimo ? `${pesoUltimo} kg` : '—',
      sub: pesoTrend !== null
        ? `${Number(pesoTrend) > 0 ? '+' : ''}${pesoTrend} kg esta semana`
        : 'Sin registros',
      color: pesoTrend !== null
        ? (Number(pesoTrend) < 0 ? '#16a34a' : Number(pesoTrend) > 0 ? '#dc2626' : '#6b7280')
        : '#9ca3af',
    },
  ]

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Tu progreso de la semana</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0"
  style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#0c1f2c 0%,#0c3547 60%,#1a5f8a 100%);padding:28px 32px;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#29abe2;text-transform:uppercase;">
        Centro Metabólico Pro
      </p>
      <h1 style="margin:6px 0 4px;font-size:20px;font-weight:900;color:#fff;">
        Tu progreso semanal 📈
      </h1>
      <p style="margin:0;font-size:12px;color:#4a7a94;">${weekLabel}</p>
    </td>
  </tr>

  <!-- Greeting + CTA headline -->
  <tr>
    <td style="padding:28px 32px 8px;">
      <h2 style="margin:0 0 6px;font-size:18px;font-weight:900;color:#0c1f2c;">${cta.headline}</h2>
      <p style="margin:0;font-size:14px;color:#4a6070;line-height:1.6;">${cta.sub}</p>
      ${adhBar}
    </td>
  </tr>

  <!-- Stats grid (2x2) -->
  <tr>
    <td style="padding:20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${stats.slice(0, 2).map(s => `
          <td style="width:50%;padding:4px;">
            <div style="background:#f7fbfe;border:1px solid #e2ecf4;border-radius:14px;padding:16px;">
              <p style="margin:0;font-size:20px;">${s.icon}</p>
              <p style="margin:6px 0 2px;font-size:10px;font-weight:700;color:#8ba5be;text-transform:uppercase;letter-spacing:1px;">${s.label}</p>
              <p style="margin:0;font-size:22px;font-weight:900;color:${s.color};">${s.value}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${s.sub}</p>
            </div>
          </td>`).join('')}
        </tr>
        <tr>
          ${stats.slice(2, 4).map(s => `
          <td style="width:50%;padding:4px;">
            <div style="background:#f7fbfe;border:1px solid #e2ecf4;border-radius:14px;padding:16px;">
              <p style="margin:0;font-size:20px;">${s.icon}</p>
              <p style="margin:6px 0 2px;font-size:10px;font-weight:700;color:#8ba5be;text-transform:uppercase;letter-spacing:1px;">${s.label}</p>
              <p style="margin:0;font-size:22px;font-weight:900;color:${s.color};">${s.value}</p>
              <p style="margin:2px 0 0;font-size:11px;color:#9ca3af;">${s.sub}</p>
            </div>
          </td>`).join('')}
        </tr>
      </table>
    </td>
  </tr>

  ${cta.tip ? `
  <!-- Weekly tip -->
  <tr>
    <td style="padding:0 32px 20px;">
      <div style="background:#f0f9ff;border-left:4px solid #29abe2;border-radius:0 12px 12px 0;padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#0c3547;line-height:1.6;">${cta.tip}</p>
      </div>
    </td>
  </tr>` : ''}

  <!-- CTA button -->
  <tr>
    <td style="padding:0 32px 32px;text-align:center;">
      <a href="${appUrl}/paciente?tab=dashboard"
         style="display:inline-block;background:${cta.btnColor};color:#fff;font-size:14px;font-weight:900;
                text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.3px;">
        ${cta.btnText}
      </a>
      <p style="margin:16px 0 0;font-size:11px;color:#8ba5be;">
        ¿Quieres ajustar tu plan?
        <a href="${appUrl}/paciente?tab=plan" style="color:#29abe2;font-weight:700;text-decoration:none;">
          Genera uno nuevo →
        </a>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fbfd;border-top:1px solid #e2ecf4;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#8ba5be;">
        Centro Metabólico Pro · Tu resumen llega cada domingo.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { userId: string }
  try {
    body = await req.json()
    if (!body.userId) throw new Error('missing userId')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase  = createServiceClient()
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'
  const today     = isoToday()
  const since     = isoDaysAgo(6) // 7-day window: today and 6 days back

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre, email, plan, premium_until, trial_ends_at')
    .eq('id', body.userId)
    .maybeSingle()

  if (!profile?.email) {
    return NextResponse.json({ ok: false, skipped: true, reason: 'no profile or email' })
  }

  // Fetch 7-day logs
  const { data: logs } = await supabase
    .from('registros_diarios')
    .select('fecha, kcal_consumida, comidas_completadas, comidas_total, peso')
    .eq('user_id', body.userId)
    .gte('fecha', since)
    .lte('fecha', today)
    .order('fecha', { ascending: true })

  const safelogs = logs ?? []

  // Streak
  const loggedDates = new Set(safelogs.map(l => l.fecha))
  const currentStreak = computeCurrentStreak(loggedDates)
  const sortedDates   = Array.from(loggedDates).sort()
  const bestStreak    = computeBestStreak(sortedDates)

  // Adherencia
  const adherencias = safelogs
    .filter(l => (l.comidas_total ?? 0) > 0)
    .map(l => (l.comidas_completadas / l.comidas_total) * 100)
  const adherenciaMedia = adherencias.length > 0
    ? Math.round(adherencias.reduce((s, v) => s + v, 0) / adherencias.length)
    : null

  // Kcal
  const kcals = safelogs.filter(l => (l.kcal_consumida ?? 0) > 0).map(l => l.kcal_consumida)
  const kcalMedia = kcals.length > 0
    ? Math.round(kcals.reduce((s, v) => s + v, 0) / kcals.length)
    : null

  // Latest plan kcal target
  const { data: latestPlan } = await supabase
    .from('planes_nutricionales')
    .select('kcal')
    .eq('user_id', body.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const kcalObjetivo = latestPlan?.kcal ?? null

  // Weight trend
  const pesoLogs = safelogs.filter(l => l.peso).map(l => l.peso!)
  const pesoUltimo   = pesoLogs.length > 0 ? pesoLogs[pesoLogs.length - 1] : null
  const pesoAnterior = pesoLogs.length > 1 ? pesoLogs[0] : null

  // Week label
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6)
  const weekLabel = `${weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} – ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const html = buildPatientDigestHtml({
    nombre: profile.nombre ?? 'Usuario',
    weekLabel,
    currentStreak,
    bestStreak,
    adherenciaMedia,
    kcalMedia,
    kcalObjetivo,
    pesoUltimo,
    pesoAnterior,
    logsCount: safelogs.length,
    appUrl,
  })

  const subject = adherenciaMedia !== null && adherenciaMedia >= 70
    ? `🔥 ¡Qué semana tan buena! Tu resumen de progreso está listo`
    : adherenciaMedia !== null && adherenciaMedia >= 40
    ? `📊 Tu resumen semanal — sigues avanzando`
    : `📊 Tu resumen semanal — esta semana lo retomamos`

  const result = await sendMail({
    to: profile.email,
    subject,
    html,
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped })
}
