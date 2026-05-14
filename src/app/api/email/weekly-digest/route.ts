import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mailer'

interface PatientSummary {
  nombre: string
  email: string
  adherenciaMedia: number | null
  kcalMedia: number | null
  logsCount: number
  ultimoPeso: number | null
  pesoAnterior: number | null
  necesitaIntervencion: boolean
  sinActividad: boolean
}

function buildHtml(professionalName: string, patients: PatientSummary[], weekLabel: string): string {
  const urgent = patients.filter(p => p.necesitaIntervencion || p.sinActividad)
  const active = patients.filter(p => !p.sinActividad && !p.necesitaIntervencion)

  function patientRow(p: PatientSummary, highlight: string): string {
    const adh = p.adherenciaMedia !== null ? `${p.adherenciaMedia}%` : '—'
    const kcal = p.kcalMedia !== null ? `${p.kcalMedia.toLocaleString('es-CL')} kcal` : '—'
    const pesoTrend = p.ultimoPeso && p.pesoAnterior
      ? (p.ultimoPeso - p.pesoAnterior).toFixed(1)
      : null
    const pesoBadge = pesoTrend !== null
      ? `<span style="font-size:11px;color:${Number(pesoTrend) < 0 ? '#16a34a' : Number(pesoTrend) > 0 ? '#dc2626' : '#6b7280'}">${Number(pesoTrend) > 0 ? '+' : ''}${pesoTrend} kg</span>`
      : '<span style="font-size:11px;color:#9ca3af">—</span>'

    const status = p.sinActividad
      ? '<span style="background:#f3f4f6;color:#6b7280;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;">Sin actividad</span>'
      : p.necesitaIntervencion
        ? '<span style="background:#fef2f2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;">🚨 Intervención</span>'
        : '<span style="background:#f0fdf4;color:#16a34a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;">✅ Activo</span>'

    return `
    <tr style="border-bottom:1px solid #f0f6fa;">
      <td style="padding:10px 16px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#0c1f2c;">${p.nombre}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#8ba5be;">${p.email}</p>
      </td>
      <td style="padding:10px 8px;text-align:center;">
        <span style="font-size:14px;font-weight:900;color:${p.adherenciaMedia !== null && p.adherenciaMedia >= 70 ? '#16a34a' : p.adherenciaMedia !== null ? '#d97706' : '#9ca3af'}">${adh}</span>
        <p style="margin:2px 0 0;font-size:10px;color:#8ba5be;">${p.logsCount} registros</p>
      </td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;font-weight:700;color:#0c3547;">${kcal}</td>
      <td style="padding:10px 8px;text-align:center;">${pesoBadge}</td>
      <td style="padding:10px 16px;text-align:right;">${status}</td>
    </tr>`
  }

  const urgentRows = urgent.map(p => patientRow(p, '#fef2f2')).join('')
  const activeRows = active.map(p => patientRow(p, '#fff')).join('')

  const allRows = urgentRows + activeRows

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Resumen semanal de pacientes</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr>
    <td style="background:#0c1f2c;padding:28px 32px;">
      <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#29abe2;text-transform:uppercase;">Centro Metabólico Pro</p>
      <h1 style="margin:6px 0 4px;font-size:20px;font-weight:900;color:#fff;">Resumen semanal de pacientes</h1>
      <p style="margin:0;font-size:12px;color:#4a7a94;">${weekLabel} · ${patients.length} paciente${patients.length !== 1 ? 's' : ''}</p>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:28px 32px 8px;">
      <p style="margin:0;font-size:15px;color:#0c1f2c;">Hola <strong>${professionalName}</strong>, aquí está el resumen de la semana:</p>
    </td>
  </tr>

  ${urgent.length > 0 ? `
  <!-- Alert banner -->
  <tr>
    <td style="padding:12px 32px;">
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:10px;">
        <p style="margin:0;font-size:13px;color:#dc2626;font-weight:700;">
          🚨 ${urgent.length} paciente${urgent.length !== 1 ? 's' : ''} requiere${urgent.length === 1 ? '' : 'n'} atención — adherencia baja o sin actividad esta semana.
        </p>
      </div>
    </td>
  </tr>` : `
  <!-- All good banner -->
  <tr>
    <td style="padding:12px 32px;">
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:#16a34a;font-weight:700;">✅ Todos tus pacientes están activos esta semana. ¡Excelente trabajo!</p>
      </div>
    </td>
  </tr>`}

  <!-- Stats summary -->
  <tr>
    <td style="padding:8px 32px 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${[
            { label: 'Total pacientes', value: `${patients.length}`, color: '#29abe2' },
            { label: 'Activos (7d)', value: `${active.length}`, color: '#16a34a' },
            { label: 'Requieren atención', value: `${urgent.length}`, color: urgent.length > 0 ? '#dc2626' : '#9ca3af' },
          ].map(s => `
          <td style="width:33%;padding:4px;">
            <div style="background:#f8fbfd;border:1px solid #e2ecf4;border-radius:12px;padding:14px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:900;color:${s.color};">${s.value}</p>
              <p style="margin:4px 0 0;font-size:10px;color:#8ba5be;font-weight:600;">${s.label}</p>
            </div>
          </td>`).join('')}
        </tr>
      </table>
    </td>
  </tr>

  <!-- Patients table -->
  <tr>
    <td style="padding:0 32px 8px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;color:#8ba5be;text-transform:uppercase;">Detalle por paciente — últimos 7 días</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2ecf4;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fbfd;">
            <th style="padding:8px 16px;text-align:left;font-size:10px;color:#8ba5be;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Paciente</th>
            <th style="padding:8px 8px;text-align:center;font-size:10px;color:#8ba5be;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Adherencia</th>
            <th style="padding:8px 8px;text-align:center;font-size:10px;color:#8ba5be;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Kcal/día</th>
            <th style="padding:8px 8px;text-align:center;font-size:10px;color:#8ba5be;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Peso</th>
            <th style="padding:8px 16px;text-align:right;font-size:10px;color:#8ba5be;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Estado</th>
          </tr>
        </thead>
        <tbody>${allRows || '<tr><td colspan="5" style="padding:24px;text-align:center;color:#8ba5be;font-size:13px;">Sin pacientes registrados</td></tr>'}</tbody>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:20px 32px 32px;text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrometabolico.cl'}/paciente"
         style="display:inline-block;background:#29abe2;color:#fff;font-size:13px;font-weight:800;text-decoration:none;padding:12px 28px;border-radius:10px;">
        Ver panel de pacientes
      </a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fbfd;border-top:1px solid #e2ecf4;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#8ba5be;">Centro Metabólico Pro · Sistema clínico nutricional</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { professionalId: string; professionalEmail: string; professionalName: string }
  try {
    body = await req.json()
    if (!body.professionalId || !body.professionalEmail) throw new Error('missing fields')
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  const since = sevenDaysAgo.toISOString().split('T')[0]

  // Fetch all patients
  const { data: patients, error: pErr } = await supabase
    .from('profiles')
    .select('id, nombre, email')
    .eq('professional_id', body.professionalId)
    .eq('role', 'patient')
    .order('nombre', { ascending: true })

  if (pErr || !patients) {
    return NextResponse.json({ error: 'Could not fetch patients' }, { status: 500 })
  }

  if (patients.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, message: 'No patients yet' })
  }

  const patientIds = patients.map(p => p.id)

  // Batch-fetch 7-day logs for all patients
  const { data: allLogs } = await supabase
    .from('registros_diarios')
    .select('user_id, fecha, kcal_consumida, comidas_completadas, comidas_total, peso')
    .in('user_id', patientIds)
    .gte('fecha', since)
    .order('fecha', { ascending: false })

  // Group logs by patient
  const logsByPatient: Record<string, typeof allLogs> = {}
  allLogs?.forEach(log => {
    if (!logsByPatient[log.user_id]) logsByPatient[log.user_id] = []
    logsByPatient[log.user_id]!.push(log)
  })

  // Compute summaries
  const summaries: PatientSummary[] = patients.map(p => {
    const logs = logsByPatient[p.id] || []
    const sinActividad = logs.length === 0

    const adherencias = logs
      .filter(l => l.comidas_total > 0)
      .map(l => (l.comidas_completadas / l.comidas_total) * 100)

    const adherenciaMedia = adherencias.length > 0
      ? Math.round(adherencias.reduce((s, v) => s + v, 0) / adherencias.length)
      : null

    const kcals = logs.filter(l => l.kcal_consumida > 0).map(l => l.kcal_consumida)
    const kcalMedia = kcals.length > 0
      ? Math.round(kcals.reduce((s, v) => s + v, 0) / kcals.length)
      : null

    const pesosOrdered = logs.filter(l => l.peso).map(l => l.peso!)
    const ultimoPeso = pesosOrdered[0] ?? null
    const pesoAnterior = pesosOrdered[pesosOrdered.length - 1] ?? null

    const necesitaIntervencion = !sinActividad && adherenciaMedia !== null && adherenciaMedia < 50

    return {
      nombre: p.nombre || 'Sin nombre',
      email: p.email,
      adherenciaMedia,
      kcalMedia,
      logsCount: logs.length,
      ultimoPeso,
      pesoAnterior: pesosOrdered.length > 1 ? pesoAnterior : null,
      necesitaIntervencion,
      sinActividad,
    }
  })

  // Build week label
  const now = new Date()
  const weekStart = new Date(sevenDaysAgo)
  const weekLabel = `${weekStart.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const html = buildHtml(body.professionalName || 'Profesional', summaries, weekLabel)

  const result = await sendMail({
    to: body.professionalEmail,
    subject: `📊 Resumen semanal de tus pacientes — ${weekLabel}`,
    html,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, skipped: result.skipped, patientCount: patients.length })
}
