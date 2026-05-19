/**
 * Helpers de fecha para Centro Metabólico Pro.
 *
 * Todos los pacientes están en Chile (TZ: America/Santiago, UTC-3 / UTC-4 en DST).
 * Usar `new Date().toISOString().split('T')[0]` es BUG porque devuelve UTC:
 * un registro hecho a las 22h hora Chile se guarda como del día siguiente.
 *
 * Estos helpers normalizan a la zona horaria de Chile para que las fechas
 * coincidan con la percepción del usuario.
 */

const CHILE_TZ = 'America/Santiago'

/**
 * Devuelve la fecha de HOY en zona horaria Chile, formato `YYYY-MM-DD`.
 *
 * Usar SIEMPRE esto en vez de `new Date().toISOString().split('T')[0]`
 * cuando se quiera identificar "el día" del usuario (registros diarios,
 * adherencia, recordatorios).
 *
 * @example
 *   // Lunes 18 may, 22:00 hora Chile → UTC ya es martes 19
 *   getTodayCL()                          // "2026-05-18" ✅
 *   new Date().toISOString().split('T')[0]  // "2026-05-19" ❌ BUG
 */
export function getTodayCL(now: Date = new Date()): string {
  return formatDateCL(now)
}

/**
 * Devuelve una fecha N días atrás respecto a hoy en Chile, formato `YYYY-MM-DD`.
 *
 * @example
 *   // Hoy es lunes 18 may en Chile
 *   getDateCLDaysAgo(6)  // "2026-05-12"
 */
export function getDateCLDaysAgo(days: number, now: Date = new Date()): string {
  // Tomamos la fecha-CL de hoy, y le restamos días con aritmética UTC al mediodía.
  // CRÍTICO: mediodía UTC = 9 AM en Chile (UTC-3) — ambos en el mismo día CL,
  // sin drift. Si usáramos 00:00 UTC, en Chile sería 21h del día anterior.
  const todayStr = formatDateCL(now)
  const [y, m, d] = todayStr.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d, 12) - days * 86400000  // 12:00 UTC ancla
  const past = new Date(ms)
  return formatDateCL(past)
}

/**
 * Formatea un Date a YYYY-MM-DD en zona horaria Chile.
 * Útil cuando se tiene un Date arbitrario que se quiere convertir a fecha-CL.
 */
export function formatDateCL(d: Date): string {
  // Intl.DateTimeFormat con TZ Chile y formato ISO-ish
  // Usamos en-CA porque devuelve YYYY-MM-DD nativo (es-CL devuelve DD-MM-YYYY)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
