/**
 * Lógica pura para los cron-jobs de digest (resumen semanal profesional)
 * y daily-reminder (recordatorios diarios al paciente).
 *
 * Extraída de los endpoints para hacerla testeable sin mockear Supabase.
 * Los endpoints en /api/cron/* importan estos helpers como functional core.
 */

// ─── Tipos compartidos ────────────────────────────────────────────────────────

export interface PatientLogRowFull {
  user_id: string
  fecha: string                     // YYYY-MM-DD
  kcal_consumida: number
  comidas_completadas: number
  comidas_total: number
  peso?: number | null
}

export interface PatientProfile {
  id: string
  nombre: string | null
  email: string
}

export interface PatientWeeklySummary {
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

/** Perfil mínimo necesario para evaluar si recibe recordatorio diario. */
export interface PatientActivityProfile {
  plan: string
  premium_until?: string | null
  trial_ends_at?: string | null
}

// ─── Resumen semanal por paciente (weekly-digest) ─────────────────────────────

/**
 * Calcula el resumen semanal de un paciente a partir de sus logs de la última semana.
 *
 * Reglas clínicas (skill nutriapp-pro):
 * - sinActividad: cero registros en la ventana
 * - necesitaIntervencion: con datos, adherencia media < 50%
 * - adherenciaMedia: null si no hay logs con `comidas_total > 0`
 * - kcalMedia: null si ningún log tiene `kcal_consumida > 0`
 * - pesoAnterior: solo se reporta si hay ≥ 2 mediciones (para mostrar tendencia)
 *
 * Los logs deben venir ordenados por fecha DESC (más reciente primero) — coincide
 * con el orden retornado por el endpoint que hace .order('fecha', desc).
 */
export function computePatientWeeklySummary(
  patient: PatientProfile,
  logs: PatientLogRowFull[],
): PatientWeeklySummary {
  const sinActividad = logs.length === 0

  // Adherencias por día (descarta días con comidas_total inválido)
  const adherencias = logs
    .filter(l => l.comidas_total > 0)
    .map(l => (l.comidas_completadas / l.comidas_total) * 100)

  const adherenciaMedia = adherencias.length > 0
    ? Math.round(adherencias.reduce((s, v) => s + v, 0) / adherencias.length)
    : null

  // Kcal promedio (solo días registrados)
  const kcals = logs.filter(l => l.kcal_consumida > 0).map(l => l.kcal_consumida)
  const kcalMedia = kcals.length > 0
    ? Math.round(kcals.reduce((s, v) => s + v, 0) / kcals.length)
    : null

  // Peso: ultimoPeso = más reciente; pesoAnterior = el primero registrado (más antiguo)
  // logs vienen en orden DESC, así que: logs[0] = más reciente
  const pesosOrdered = logs.filter(l => l.peso != null).map(l => l.peso!)
  const ultimoPeso = pesosOrdered[0] ?? null
  const pesoAnterior = pesosOrdered.length > 1
    ? pesosOrdered[pesosOrdered.length - 1]
    : null

  const necesitaIntervencion =
    !sinActividad && adherenciaMedia !== null && adherenciaMedia < 50

  return {
    nombre: patient.nombre || 'Sin nombre',
    email: patient.email,
    adherenciaMedia,
    kcalMedia,
    logsCount: logs.length,
    ultimoPeso,
    pesoAnterior,
    necesitaIntervencion,
    sinActividad,
  }
}

// ─── Filtrado de pacientes activos (daily-reminder) ──────────────────────────

/**
 * Decide si un paciente debe recibir notificaciones automáticas.
 *
 * Reglas (matchean exactamente la lógica del endpoint daily-reminder):
 * - Plan ≠ 'gratuito' → activo si no tiene premium_until o si premium_until es futuro
 * - Plan === 'gratuito' → activo si tiene trial_ends_at y es futuro
 */
export function isPatientActive(
  profile: PatientActivityProfile,
  now: Date = new Date(),
): boolean {
  if (profile.plan !== 'gratuito') {
    if (!profile.premium_until) return true
    return new Date(profile.premium_until) > now
  }
  // gratuito: requiere trial vigente
  if (!profile.trial_ends_at) return false
  return new Date(profile.trial_ends_at) > now
}

/**
 * Filtra el batch de pacientes a aquellos activos.
 * Pure function — no lee de Supabase ni de Date global.
 */
export function filterActivePatients<T extends PatientActivityProfile>(
  patients: T[],
  now: Date = new Date(),
): T[] {
  return patients.filter(p => isPatientActive(p, now))
}

// ─── Banner del resumen semanal ──────────────────────────────────────────────

/**
 * Cuenta pacientes que necesitan atención del profesional.
 * Útil para el banner rojo/verde del email weekly-digest.
 */
export function contarPacientesUrgentes(
  summaries: PatientWeeklySummary[],
): { urgentes: number; activos: number; total: number } {
  const urgentes = summaries.filter(p => p.necesitaIntervencion || p.sinActividad).length
  const activos = summaries.length - urgentes
  return { urgentes, activos, total: summaries.length }
}

// ─── Streaks (patient-digest) ─────────────────────────────────────────────────

/** Devuelve fecha ISO YYYY-MM-DD para un Date dado en UTC. */
function isoFromDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Racha actual: cuenta días consecutivos hacia atrás desde HOY mientras
 * cada fecha esté en el set de loggedDates. Se rompe al primer día sin registro.
 *
 * @param loggedDates - Set de fechas ISO YYYY-MM-DD donde el paciente registró
 * @param now - fecha de referencia (default: new Date()). Inyectable para tests.
 */
export function computeCurrentStreak(
  loggedDates: Set<string>,
  now: Date = new Date(),
): number {
  let streak = 0
  const cur = new Date(now.getTime())
  while (true) {
    const iso = isoFromDate(cur)
    if (!loggedDates.has(iso)) break
    streak++
    cur.setUTCDate(cur.getUTCDate() - 1)
  }
  return streak
}

/**
 * Mejor racha dentro de un array de fechas ordenado ascendente.
 * Una racha es una secuencia de fechas consecutivas (diff = 1 día).
 */
export function computeBestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T12:00:00Z')
    const cur = new Date(sortedDates[i] + 'T12:00:00Z')
    const diff = (cur.getTime() - prev.getTime()) / 86400000
    if (diff === 1) { run++; best = Math.max(best, run) }
    else run = 1
  }
  return best
}

// ─── CTA del email patient-digest según banda de adherencia ──────────────────

export interface CtaConfig {
  headline: string
  sub: string
  btnText: string
  btnColor: string
  tip?: string
}

/**
 * Banda de adherencia para el CTA del email patient-digest:
 * - null (sin actividad) → CTA neutro gris
 * - ≥70%                → ¡Excelente! verde
 * - 40-69%              → Casi ahí amber, con tip de meal prep
 * - <40%                → Retomamos juntos rojo, con tip mínimo viable
 */
export function getCtaConfig(adherencia: number | null, nombre: string): CtaConfig {
  const firstName = nombre.split(' ')[0]
  if (adherencia === null) {
    return {
      headline: `¡Empieza tu semana con fuerza, ${firstName}!`,
      sub: 'No registraste actividad esta semana. Esta semana es una nueva oportunidad.',
      btnText: 'Ir a mi plan →',
      btnColor: '#6b7280',
    }
  }
  if (adherencia >= 70) {
    return {
      headline: `¡Excelente semana, ${firstName}! 🔥`,
      sub: `${adherencia}% de adherencia. Estás en la zona de máximo progreso. Mantén el ritmo.`,
      btnText: 'Ver mi progreso →',
      btnColor: '#16a34a',
    }
  }
  if (adherencia >= 40) {
    return {
      headline: `Casi ahí, ${firstName} — esta semana lo logramos`,
      sub: `${adherencia}% de adherencia. Pequeños ajustes pueden marcar una gran diferencia.`,
      btnText: 'Ajustar mi plan →',
      btnColor: '#d97706',
      tip: '💡 Tip: Prepara tus comidas el domingo para tener todo listo durante la semana.',
    }
  }
  return {
    headline: `Retomamos juntos, ${firstName}`,
    sub: `${adherencia}% de adherencia. No pasa nada — cada día es una nueva oportunidad.`,
    btnText: 'Retomar el ritmo →',
    btnColor: '#dc2626',
    tip: '💡 Tip: Empieza solo por registrar el desayuno esta semana. Un hábito a la vez.',
  }
}
