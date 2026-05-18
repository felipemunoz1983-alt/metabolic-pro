import { describe, it, expect } from 'vitest'
import {
  adherenciaPct,
  adherenciaMedia,
  diasDesde,
  bandaAdherencia,
  pacientesConBajaAdherencia,
  pacientesInactivos,
  type PatientLogRow,
} from './notifications'

describe('adherenciaPct', () => {
  it('5/5 = 100%', () => {
    expect(adherenciaPct(5, 5)).toBe(100)
  })

  it('3/5 = 60%', () => {
    expect(adherenciaPct(3, 5)).toBe(60)
  })

  it('0/5 = 0%', () => {
    expect(adherenciaPct(0, 5)).toBe(0)
  })

  it('división segura: 0/0 = 0% (no NaN)', () => {
    expect(adherenciaPct(0, 0)).toBe(0)
  })

  it('división segura: total negativo = 0% (no rompe)', () => {
    expect(adherenciaPct(5, -1)).toBe(0)
  })

  it('redondea correctamente: 2/3 = 67%', () => {
    expect(adherenciaPct(2, 3)).toBe(67)
  })
})

describe('adherenciaMedia', () => {
  it('null cuando logs vacío', () => {
    expect(adherenciaMedia([])).toBeNull()
  })

  it('promedio simple: 100% + 50% = 75%', () => {
    expect(adherenciaMedia([
      { comidas_completadas: 5, comidas_total: 5 },
      { comidas_completadas: 2, comidas_total: 4 },
    ])).toBe(75)
  })

  it('ignora división por cero en logs individuales', () => {
    expect(adherenciaMedia([
      { comidas_completadas: 5, comidas_total: 5 },     // 100
      { comidas_completadas: 0, comidas_total: 0 },     // 0
    ])).toBe(50)
  })

  it('single log: 80%', () => {
    expect(adherenciaMedia([
      { comidas_completadas: 4, comidas_total: 5 },
    ])).toBe(80)
  })
})

describe('diasDesde', () => {
  it('hoy mismo día (now T15:00 vs fecha T12:00 UTC) → 0', () => {
    const fixedNow = new Date('2026-05-18T15:00:00Z')
    expect(diasDesde('2026-05-18', fixedNow)).toBe(0)
  })

  it('mismo día pero antes de mediodía → -1 (raro pero matemáticamente válido)', () => {
    const fixedNow = new Date('2026-05-18T06:00:00Z')
    expect(diasDesde('2026-05-18', fixedNow)).toBeLessThan(0)
  })

  it('ayer T12 → al menos 0 (puede ser 0 o 1 según hora exacta de now)', () => {
    const fixedNow = new Date('2026-05-18T15:00:00Z')   // 27h después de ayer T12
    expect(diasDesde('2026-05-17', fixedNow)).toBe(1)
  })

  it('hace 7 días T12 vs hoy T15 → 7 (24h × 7 + 3h)', () => {
    const fixedNow = new Date('2026-05-18T15:00:00Z')
    expect(diasDesde('2026-05-11', fixedNow)).toBe(7)
  })

  it('hace 3 días → ≥3 (siempre detecta umbral 3 días)', () => {
    const fixedNow = new Date('2026-05-18T15:00:00Z')
    expect(diasDesde('2026-05-15', fixedNow)).toBeGreaterThanOrEqual(3)
  })
})

describe('bandaAdherencia (skill nutriapp-pro)', () => {
  it('90-100% = excelente', () => {
    expect(bandaAdherencia(95)).toBe('excelente')
    expect(bandaAdherencia(100)).toBe('excelente')
  })

  it('70-89% = buena', () => {
    expect(bandaAdherencia(70)).toBe('buena')
    expect(bandaAdherencia(85)).toBe('buena')
  })

  it('50-69% = irregular', () => {
    expect(bandaAdherencia(50)).toBe('irregular')
    expect(bandaAdherencia(60)).toBe('irregular')
  })

  it('<50% = critica', () => {
    expect(bandaAdherencia(0)).toBe('critica')
    expect(bandaAdherencia(49)).toBe('critica')
  })

  it('umbrales exactos no se solapan', () => {
    expect(bandaAdherencia(89)).toBe('buena')
    expect(bandaAdherencia(90)).toBe('excelente')
    expect(bandaAdherencia(69)).toBe('irregular')
    expect(bandaAdherencia(70)).toBe('buena')
  })
})

describe('pacientesInactivos', () => {
  const fixedNow = new Date('2026-05-18T15:00:00Z')

  it('detecta paciente sin ningún log', () => {
    const patients = [{ id: 'p1', nombre: 'Juan' }]
    const logs = new Map<string, PatientLogRow[]>()
    expect(pacientesInactivos(patients, logs, 3, fixedNow)).toEqual(['Juan'])
  })

  it('detecta paciente con log de hace 5 días (≥3)', () => {
    const patients = [{ id: 'p1', nombre: 'Maria' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [{ user_id: 'p1', fecha: '2026-05-13', comidas_completadas: 3, comidas_total: 5 }]],
    ])
    expect(pacientesInactivos(patients, logs, 3, fixedNow)).toEqual(['Maria'])
  })

  it('NO detecta paciente con log de ayer', () => {
    const patients = [{ id: 'p1', nombre: 'Carlos' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [{ user_id: 'p1', fecha: '2026-05-17', comidas_completadas: 5, comidas_total: 5 }]],
    ])
    expect(pacientesInactivos(patients, logs, 3, fixedNow)).toEqual([])
  })

  it('umbral configurable: diasMin=7 ignora 5 días', () => {
    const patients = [{ id: 'p1', nombre: 'Ana' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [{ user_id: 'p1', fecha: '2026-05-13', comidas_completadas: 3, comidas_total: 5 }]],
    ])
    expect(pacientesInactivos(patients, logs, 7, fixedNow)).toEqual([])
  })
})

describe('pacientesConBajaAdherencia', () => {
  it('detecta paciente con adherencia 30% (3 logs)', () => {
    const patients = [{ id: 'p1', nombre: 'Felipe' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [
        { user_id: 'p1', fecha: '2026-05-17', comidas_completadas: 1, comidas_total: 5 },
        { user_id: 'p1', fecha: '2026-05-16', comidas_completadas: 2, comidas_total: 5 },
        { user_id: 'p1', fecha: '2026-05-15', comidas_completadas: 1, comidas_total: 5 },
      ]],
    ])
    const result = pacientesConBajaAdherencia(patients, logs)
    expect(result).toEqual([{ name: 'Felipe', pct: 27 }])
  })

  it('NO detecta paciente con adherencia 80%', () => {
    const patients = [{ id: 'p1', nombre: 'Sofia' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [
        { user_id: 'p1', fecha: '2026-05-17', comidas_completadas: 4, comidas_total: 5 },
        { user_id: 'p1', fecha: '2026-05-16', comidas_completadas: 4, comidas_total: 5 },
        { user_id: 'p1', fecha: '2026-05-15', comidas_completadas: 4, comidas_total: 5 },
      ]],
    ])
    expect(pacientesConBajaAdherencia(patients, logs)).toEqual([])
  })

  it('NO detecta paciente con <3 logs (data insuficiente)', () => {
    const patients = [{ id: 'p1', nombre: 'Diego' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [
        { user_id: 'p1', fecha: '2026-05-17', comidas_completadas: 0, comidas_total: 5 },
      ]],
    ])
    expect(pacientesConBajaAdherencia(patients, logs)).toEqual([])
  })

  it('umbral configurable: 80% deja pasar adherencia 70%', () => {
    const patients = [{ id: 'p1', nombre: 'Test' }]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [
        { user_id: 'p1', fecha: '2026-05-17', comidas_completadas: 7, comidas_total: 10 },
        { user_id: 'p1', fecha: '2026-05-16', comidas_completadas: 7, comidas_total: 10 },
        { user_id: 'p1', fecha: '2026-05-15', comidas_completadas: 7, comidas_total: 10 },
      ]],
    ])
    const result = pacientesConBajaAdherencia(patients, logs, 80)
    expect(result).toEqual([{ name: 'Test', pct: 70 }])
  })

  it('múltiples pacientes: solo retorna los críticos', () => {
    const patients = [
      { id: 'p1', nombre: 'Bueno' },
      { id: 'p2', nombre: 'Critico' },
      { id: 'p3', nombre: 'Mediano' },
    ]
    const logs = new Map<string, PatientLogRow[]>([
      ['p1', [
        { user_id: 'p1', fecha: '2026-05-17', comidas_completadas: 5, comidas_total: 5 },
        { user_id: 'p1', fecha: '2026-05-16', comidas_completadas: 5, comidas_total: 5 },
        { user_id: 'p1', fecha: '2026-05-15', comidas_completadas: 4, comidas_total: 5 },
      ]],
      ['p2', [
        { user_id: 'p2', fecha: '2026-05-17', comidas_completadas: 1, comidas_total: 5 },
        { user_id: 'p2', fecha: '2026-05-16', comidas_completadas: 1, comidas_total: 5 },
        { user_id: 'p2', fecha: '2026-05-15', comidas_completadas: 2, comidas_total: 5 },
      ]],
      ['p3', [
        { user_id: 'p3', fecha: '2026-05-17', comidas_completadas: 3, comidas_total: 5 },
        { user_id: 'p3', fecha: '2026-05-16', comidas_completadas: 3, comidas_total: 5 },
        { user_id: 'p3', fecha: '2026-05-15', comidas_completadas: 4, comidas_total: 5 },
      ]],
    ])
    const result = pacientesConBajaAdherencia(patients, logs, 60)
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Critico')
  })
})

describe('🧪 SMOKE — Integración de helpers con flujo profesional', () => {
  it('escenario: 5 pacientes, profesional ve resumen correcto', () => {
    const patients = [
      { id: '1', nombre: 'Activo OK' },
      { id: '2', nombre: 'Activo Critico' },
      { id: '3', nombre: 'Inactivo' },
      { id: '4', nombre: 'Sin registros' },
      { id: '5', nombre: 'Pocos datos' },
    ]
    const fixedNow = new Date('2026-05-18T12:00:00Z')
    const logs = new Map<string, PatientLogRow[]>([
      ['1', [
        { user_id: '1', fecha: '2026-05-17', comidas_completadas: 5, comidas_total: 5 },
        { user_id: '1', fecha: '2026-05-16', comidas_completadas: 5, comidas_total: 5 },
        { user_id: '1', fecha: '2026-05-15', comidas_completadas: 4, comidas_total: 5 },
      ]],
      ['2', [
        { user_id: '2', fecha: '2026-05-17', comidas_completadas: 1, comidas_total: 5 },
        { user_id: '2', fecha: '2026-05-16', comidas_completadas: 1, comidas_total: 5 },
        { user_id: '2', fecha: '2026-05-15', comidas_completadas: 0, comidas_total: 5 },
      ]],
      ['3', [
        { user_id: '3', fecha: '2026-05-10', comidas_completadas: 3, comidas_total: 5 },   // 8 días atrás
      ]],
      // '4' (sin registros) — no aparece en logs
      ['5', [
        { user_id: '5', fecha: '2026-05-17', comidas_completadas: 2, comidas_total: 5 },   // solo 1 log
      ]],
    ])

    const inactivos = pacientesInactivos(patients, logs, 3, fixedNow)
    const bajaAdh = pacientesConBajaAdherencia(patients, logs)

    // Inactivos: 'Inactivo' (8 días), 'Sin registros' (nunca), 'Pocos datos' (1 log de ayer NO es inactivo)
    expect(inactivos).toContain('Inactivo')
    expect(inactivos).toContain('Sin registros')
    expect(inactivos).not.toContain('Activo OK')

    // Baja adherencia: solo 'Activo Critico' (3+ logs, promedio ~13%)
    expect(bajaAdh.length).toBe(1)
    expect(bajaAdh[0].name).toBe('Activo Critico')
  })
})
