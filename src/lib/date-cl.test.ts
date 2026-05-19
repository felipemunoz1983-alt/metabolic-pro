import { describe, it, expect } from 'vitest'
import { getTodayCL, getDateCLDaysAgo, formatDateCL } from './date-cl'

/**
 * Tests de regresión para el bug detectado en Francisca Carrión:
 * un registro hecho a las 21h hora Chile se guardaba como del día siguiente
 * porque `new Date().toISOString()` devuelve UTC.
 *
 * Estos tests SIMULAN distintas horas y verifican que la fecha
 * en zona horaria Chile sea siempre la correcta.
 */

describe('getTodayCL — regresión bug Francisca (21h UTC drift)', () => {
  // Chile en mayo está en horario de invierno: UTC-4 (CLT).
  // Para construir tests deterministas usamos UTC explícito y derivamos
  // la hora local Chile = UTC - 4.

  it('lunes 22:00 hora Chile (UTC-4) → lunes, no martes UTC', () => {
    // Lun 18 may 22:00 CLT = Mar 19 may 02:00 UTC
    const lunes22Chile = new Date('2026-05-19T02:00:00Z')
    expect(getTodayCL(lunes22Chile)).toBe('2026-05-18')
    // El bug viejo daría '2026-05-19' — eso era lo incorrecto que vimos en Francisca
  })

  it('lunes 23:59 hora Chile → todavía lunes 18, no martes 19', () => {
    // Lun 18 may 23:59 CLT = Mar 19 may 03:59 UTC
    const lunes2359Chile = new Date('2026-05-19T03:59:00Z')
    expect(getTodayCL(lunes2359Chile)).toBe('2026-05-18')
  })

  it('martes 00:01 hora Chile → ya es martes 19', () => {
    // Mar 19 may 00:01 CLT = Mar 19 may 04:01 UTC
    const martes0001Chile = new Date('2026-05-19T04:01:00Z')
    expect(getTodayCL(martes0001Chile)).toBe('2026-05-19')
  })

  it('mediodía Chile = mismo día en cualquier interpretación', () => {
    // Lunes 18 may 12:00 CLST = Lunes 18 may 15:00 UTC
    const lunesMediodiaChile = new Date('2026-05-18T15:00:00Z')
    expect(getTodayCL(lunesMediodiaChile)).toBe('2026-05-18')
  })

  it('horario verano Chile (oct-mar = UTC-3): mismo bug detectado', () => {
    // Diciembre = verano Chile = UTC-3
    // Sab 20 dic 22:00 CLST = Dom 21, 01:00 UTC
    const sabado22Verano = new Date('2025-12-21T01:00:00Z')
    expect(getTodayCL(sabado22Verano)).toBe('2025-12-20')
  })

  it('formato siempre YYYY-MM-DD (10 chars)', () => {
    const r = getTodayCL(new Date())
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(r.length).toBe(10)
  })
})

describe('getDateCLDaysAgo', () => {
  const now = new Date('2026-05-18T15:00:00Z')  // lunes 18 may mediodía Chile

  it('0 días = hoy', () => {
    expect(getDateCLDaysAgo(0, now)).toBe('2026-05-18')
  })

  it('1 día atrás = ayer', () => {
    expect(getDateCLDaysAgo(1, now)).toBe('2026-05-17')
  })

  it('6 días atrás (ventana semanal típica)', () => {
    expect(getDateCLDaysAgo(6, now)).toBe('2026-05-12')
  })

  it('29 días atrás (ventana mensual típica)', () => {
    expect(getDateCLDaysAgo(29, now)).toBe('2026-04-19')
  })

  it('cruza límite de mes correctamente', () => {
    const may1 = new Date('2026-05-01T15:00:00Z')
    expect(getDateCLDaysAgo(1, may1)).toBe('2026-04-30')
    expect(getDateCLDaysAgo(7, may1)).toBe('2026-04-24')
  })

  it('cruza límite de año correctamente', () => {
    const enero3 = new Date('2026-01-03T15:00:00Z')
    expect(getDateCLDaysAgo(5, enero3)).toBe('2025-12-29')
  })

  it('respeta TZ Chile en cálculo (no UTC)', () => {
    // Mayo Chile = UTC-4. Lun 18, 22h Chile = Mar 19, 02h UTC
    // "1 día atrás desde el lunes 18 en Chile" = domingo 17
    const lunes22Chile = new Date('2026-05-19T02:00:00Z')
    expect(getDateCLDaysAgo(1, lunes22Chile)).toBe('2026-05-17')
  })
})

describe('formatDateCL', () => {
  it('mediodía UTC arbitrario formatea correctamente', () => {
    expect(formatDateCL(new Date('2026-05-18T15:00:00Z'))).toBe('2026-05-18')
  })

  it('medianoche UTC = noche anterior en Chile', () => {
    // 2026-05-18 00:00 UTC = 2026-05-17 20:00 CLT (mayo, UTC-4)
    expect(formatDateCL(new Date('2026-05-18T00:00:00Z'))).toBe('2026-05-17')
  })
})
