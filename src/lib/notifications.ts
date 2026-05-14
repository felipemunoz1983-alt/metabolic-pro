import type { SupabaseClient } from '@supabase/supabase-js'

export type NotifLevel = 'ok' | 'info' | 'warning' | 'alert'

export interface AppNotification {
  id: string
  level: NotifLevel
  title: string
  body: string
  time: string          // ISO string
  read: boolean
  patientId?: string    // for professional notifications
  patientName?: string
}

// ─── Generate notifications for a PATIENT ────────────────────────────────────
export async function getPatientNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<AppNotification[]> {
  const notifs: AppNotification[] = []
  const today = new Date().toISOString().split('T')[0]
  const nowHour = new Date().getHours()

  // ── 1. Has today's log? ──────────────────────────────────────────────────
  const { data: todayLog } = await supabase
    .from('registros_diarios')
    .select('comidas_completadas, comidas_total, kcal_consumida')
    .eq('user_id', userId)
    .eq('fecha', today)
    .single()

  if (!todayLog && nowHour >= 13) {
    notifs.push({
      id: 'no-log-today',
      level: 'warning',
      title: 'Sin registro hoy',
      body: 'Aún no has marcado tus comidas del día. ¡Recuerda registrarlas para mantener tu seguimiento!',
      time: new Date().toISOString(),
      read: false,
    })
  } else if (todayLog) {
    const adh = todayLog.comidas_total > 0
      ? Math.round((todayLog.comidas_completadas / todayLog.comidas_total) * 100)
      : 0
    if (adh === 100) {
      notifs.push({
        id: `adh-perfect-${today}`,
        level: 'ok',
        title: '¡Adherencia perfecta hoy! 🎉',
        body: `Completaste todas tus comidas del día (${todayLog.kcal_consumida} kcal). ¡Excelente trabajo!`,
        time: new Date().toISOString(),
        read: false,
      })
    }
  }

  // ── 2. Last 7 days adherence ─────────────────────────────────────────────
  const since = new Date()
  since.setDate(since.getDate() - 6)
  const { data: weekLogs } = await supabase
    .from('registros_diarios')
    .select('fecha, comidas_completadas, comidas_total')
    .eq('user_id', userId)
    .gte('fecha', since.toISOString().split('T')[0])

  if (weekLogs && weekLogs.length >= 3) {
    const avgAdh = Math.round(
      weekLogs.reduce((s, l) =>
        s + (l.comidas_total > 0 ? (l.comidas_completadas / l.comidas_total) * 100 : 0), 0
      ) / weekLogs.length
    )

    if (avgAdh < 50) {
      notifs.push({
        id: 'low-adh-week',
        level: 'alert',
        title: 'Adherencia crítica esta semana',
        body: `Tu promedio de adherencia de los últimos 7 días es ${avgAdh}%. Tu profesional ha sido notificado.`,
        time: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      })
    } else if (avgAdh < 70) {
      notifs.push({
        id: 'med-adh-week',
        level: 'warning',
        title: 'Adherencia baja esta semana',
        body: `Tu promedio semanal es ${avgAdh}%. Intenta registrar todas tus comidas para mejorar tu seguimiento.`,
        time: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      })
    } else if (avgAdh >= 85 && weekLogs.length >= 5) {
      notifs.push({
        id: 'high-adh-week',
        level: 'ok',
        title: '¡Excelente semana! 💪',
        body: `Adherencia promedio de ${avgAdh}% en los últimos ${weekLogs.length} días. ¡Sigue así!`,
        time: new Date(Date.now() - 7200000).toISOString(),
        read: false,
      })
    }
  } else if (!weekLogs || weekLogs.length === 0) {
    notifs.push({
      id: 'no-logs-week',
      level: 'info',
      title: 'Comienza tu seguimiento',
      body: 'Aún no tienes registros esta semana. Ve al Dashboard y marca tus comidas diariamente.',
      time: new Date(Date.now() - 86400000).toISOString(),
      read: false,
    })
  }

  return notifs
}

// ─── Generate notifications for a PROFESSIONAL ────────────────────────────────
export async function getProfessionalNotifications(
  supabase: SupabaseClient,
  professionalId: string
): Promise<AppNotification[]> {
  const notifs: AppNotification[] = []

  // 1. Load all patients
  const { data: patients } = await supabase
    .from('profiles')
    .select('id, nombre')
    .eq('professional_id', professionalId)
    .eq('role', 'patient')

  if (!patients || patients.length === 0) return notifs

  const since7 = new Date()
  since7.setDate(since7.getDate() - 6)
  const since3 = new Date()
  since3.setDate(since3.getDate() - 2)

  // 2. Load last 7 days logs for all patients in one query
  const { data: allLogs } = await supabase
    .from('registros_diarios')
    .select('user_id, fecha, comidas_completadas, comidas_total')
    .in('user_id', patients.map(p => p.id))
    .gte('fecha', since7.toISOString().split('T')[0])
    .order('fecha', { ascending: false })

  const logsByPatient = new Map<string, typeof allLogs>()
  if (allLogs) {
    for (const log of allLogs) {
      if (!logsByPatient.has(log.user_id)) logsByPatient.set(log.user_id, [])
      logsByPatient.get(log.user_id)!.push(log)
    }
  }

  const inactive: string[] = []
  const lowAdh: { name: string; pct: number }[] = []

  for (const patient of patients) {
    const logs = logsByPatient.get(patient.id) ?? []

    // No activity in last 3 days
    const recentLog = logs[0]
    if (!recentLog) {
      inactive.push(patient.nombre)
    } else {
      const daysSince = Math.floor(
        (Date.now() - new Date(recentLog.fecha + 'T12:00:00').getTime()) / 86400000
      )
      if (daysSince >= 3) inactive.push(patient.nombre)
    }

    // Low adherence (<60%) with enough data
    if (logs.length >= 3) {
      const avg = Math.round(
        logs.reduce((s, l) => s + (l.comidas_total > 0 ? (l.comidas_completadas / l.comidas_total) * 100 : 0), 0) / logs.length
      )
      if (avg < 60) lowAdh.push({ name: patient.nombre, pct: avg })
    }
  }

  // Batch inactive into one notification
  if (inactive.length > 0) {
    const names = inactive.length <= 2
      ? inactive.join(' y ')
      : `${inactive[0]}, ${inactive[1]} y ${inactive.length - 2} más`
    notifs.push({
      id: 'inactive-patients',
      level: 'warning',
      title: `${inactive.length} paciente${inactive.length > 1 ? 's' : ''} sin actividad`,
      body: `${names} lleva${inactive.length > 1 ? 'n' : ''} 3 o más días sin registrar comidas.`,
      time: new Date(Date.now() - 3600000).toISOString(),
      read: false,
    })
  }

  // One notification per patient with low adherence
  for (const p of lowAdh) {
    notifs.push({
      id: `low-adh-${p.name.replace(/\s/g, '-').toLowerCase()}`,
      level: 'alert',
      title: `Baja adherencia: ${p.name}`,
      body: `Adherencia semanal del ${p.pct}%. Se recomienda revisar el plan o contactar al paciente.`,
      time: new Date(Date.now() - 7200000).toISOString(),
      read: false,
    })
  }

  // All good
  if (notifs.length === 0 && patients.length > 0) {
    notifs.push({
      id: 'all-ok',
      level: 'ok',
      title: 'Todo en orden ✅',
      body: `Todos tus ${patients.length} pacientes están activos y con buena adherencia esta semana.`,
      time: new Date(Date.now() - 10800000).toISOString(),
      read: false,
    })
  }

  return notifs
}

// ─── localStorage read state ──────────────────────────────────────────────────
export function getReadIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`notif_read_${userId}`)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

export function markAllRead(userId: string, ids: string[]) {
  try {
    localStorage.setItem(`notif_read_${userId}`, JSON.stringify(ids))
  } catch { /* noop */ }
}
