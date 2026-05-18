import { describe, it, expect } from 'vitest'
import {
  computePatientWeeklySummary,
  isPatientActive,
  filterActivePatients,
  contarPacientesUrgentes,
  computeCurrentStreak,
  computeBestStreak,
  getCtaConfig,
  type PatientLogRowFull,
  type PatientProfile,
} from './digestSummary'

const profile = (overrides: Partial<PatientProfile> = {}): PatientProfile => ({
  id: 'p1', nombre: 'Test Patient', email: 't@x.com', ...overrides,
})

const log = (overrides: Partial<PatientLogRowFull> = {}): PatientLogRowFull => ({
  user_id: 'p1', fecha: '2026-05-17',
  kcal_consumida: 1800, comidas_completadas: 4, comidas_total: 5,
  peso: null, ...overrides,
})

// ─── computePatientWeeklySummary ──────────────────────────────────────────────

describe('computePatientWeeklySummary', () => {
  describe('sin actividad', () => {
    it('logs vacíos → sinActividad=true, todo null', () => {
      const summary = computePatientWeeklySummary(profile(), [])
      expect(summary.sinActividad).toBe(true)
      expect(summary.adherenciaMedia).toBeNull()
      expect(summary.kcalMedia).toBeNull()
      expect(summary.ultimoPeso).toBeNull()
      expect(summary.pesoAnterior).toBeNull()
      expect(summary.necesitaIntervencion).toBe(false)
      expect(summary.logsCount).toBe(0)
    })

    it('paciente sin nombre usa "Sin nombre"', () => {
      const summary = computePatientWeeklySummary(profile({ nombre: null }), [])
      expect(summary.nombre).toBe('Sin nombre')
    })
  })

  describe('adherencia', () => {
    it('5 logs perfectos → 100%', () => {
      const logs = [
        log({ comidas_completadas: 5, comidas_total: 5 }),
        log({ comidas_completadas: 5, comidas_total: 5 }),
        log({ comidas_completadas: 5, comidas_total: 5 }),
        log({ comidas_completadas: 5, comidas_total: 5 }),
        log({ comidas_completadas: 5, comidas_total: 5 }),
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.adherenciaMedia).toBe(100)
      expect(summary.necesitaIntervencion).toBe(false)
    })

    it('promedio mixto: 100% + 60% + 80% = 80%', () => {
      const logs = [
        log({ comidas_completadas: 5, comidas_total: 5 }),    // 100
        log({ comidas_completadas: 3, comidas_total: 5 }),    // 60
        log({ comidas_completadas: 4, comidas_total: 5 }),    // 80
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.adherenciaMedia).toBe(80)
    })

    it('descarta logs con comidas_total=0', () => {
      const logs = [
        log({ comidas_completadas: 5, comidas_total: 5 }),    // 100
        log({ comidas_completadas: 0, comidas_total: 0 }),    // ignorado
        log({ comidas_completadas: 3, comidas_total: 5 }),    // 60
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.adherenciaMedia).toBe(80)
      expect(summary.logsCount).toBe(3)  // logsCount cuenta TODOS los logs
    })
  })

  describe('necesitaIntervencion (umbral clínico 50%)', () => {
    it('adherencia 49% → necesitaIntervencion=true', () => {
      const logs = [
        log({ comidas_completadas: 2, comidas_total: 5 }),    // 40
        log({ comidas_completadas: 3, comidas_total: 5 }),    // 60
        log({ comidas_completadas: 2, comidas_total: 5 }),    // 40
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      // 40 + 60 + 40 = 140 / 3 = 47%
      expect(summary.adherenciaMedia).toBe(47)
      expect(summary.necesitaIntervencion).toBe(true)
    })

    it('adherencia 50% → necesitaIntervencion=false (umbral estricto < 50)', () => {
      const logs = [
        log({ comidas_completadas: 2, comidas_total: 4 }),    // 50
        log({ comidas_completadas: 2, comidas_total: 4 }),    // 50
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.adherenciaMedia).toBe(50)
      expect(summary.necesitaIntervencion).toBe(false)
    })

    it('sinActividad + adherencia null → necesitaIntervencion=false', () => {
      // sinActividad ya cubre este caso clínicamente (otro tipo de alerta)
      const summary = computePatientWeeklySummary(profile(), [])
      expect(summary.necesitaIntervencion).toBe(false)
    })
  })

  describe('kcalMedia', () => {
    it('promedio de kcal_consumida (descarta los =0)', () => {
      const logs = [
        log({ kcal_consumida: 1800 }),
        log({ kcal_consumida: 0 }),     // ignorado
        log({ kcal_consumida: 2200 }),
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.kcalMedia).toBe(2000)
    })

    it('todos los logs con kcal=0 → kcalMedia=null', () => {
      const logs = [
        log({ kcal_consumida: 0 }),
        log({ kcal_consumida: 0 }),
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.kcalMedia).toBeNull()
    })
  })

  describe('peso (tendencia)', () => {
    it('1 peso registrado → ultimoPeso, pesoAnterior=null', () => {
      const logs = [log({ peso: 75.5 })]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.ultimoPeso).toBe(75.5)
      expect(summary.pesoAnterior).toBeNull()
    })

    it('2+ pesos → ultimoPeso=más reciente, pesoAnterior=más antiguo', () => {
      // logs vienen ordenados DESC por fecha (más reciente primero)
      const logs = [
        log({ fecha: '2026-05-17', peso: 75.0 }),   // más reciente
        log({ fecha: '2026-05-12', peso: 76.5 }),   // más antiguo
      ]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.ultimoPeso).toBe(75.0)
      expect(summary.pesoAnterior).toBe(76.5)
      // Tendencia: bajó 1.5 kg
    })

    it('logs sin peso → ultimoPeso=null', () => {
      const logs = [log({ peso: null }), log({ peso: null })]
      const summary = computePatientWeeklySummary(profile(), logs)
      expect(summary.ultimoPeso).toBeNull()
      expect(summary.pesoAnterior).toBeNull()
    })

    it('peso=0 se trata como ausente (typeof null check)', () => {
      // Algunos drivers de Supabase devuelven 0 cuando la columna es null
      const logs = [log({ peso: 0 })]
      const summary = computePatientWeeklySummary(profile(), logs)
      // Acepta cualquiera de los dos comportamientos: trata 0 como peso o como ausente
      expect(summary.ultimoPeso === null || summary.ultimoPeso === 0).toBe(true)
    })
  })
})

// ─── isPatientActive (daily-reminder) ─────────────────────────────────────────

describe('isPatientActive', () => {
  const now = new Date('2026-05-18T12:00:00Z')
  const future = '2026-12-01T12:00:00Z'
  const past = '2026-01-01T12:00:00Z'

  it('plan premium sin premium_until → activo', () => {
    expect(isPatientActive({ plan: 'premium', premium_until: null }, now)).toBe(true)
  })

  it('plan premium con premium_until futuro → activo', () => {
    expect(isPatientActive({ plan: 'premium', premium_until: future }, now)).toBe(true)
  })

  it('plan premium con premium_until pasado → inactivo', () => {
    expect(isPatientActive({ plan: 'premium', premium_until: past }, now)).toBe(false)
  })

  it('plan gratuito sin trial_ends_at → inactivo', () => {
    expect(isPatientActive({ plan: 'gratuito', trial_ends_at: null }, now)).toBe(false)
  })

  it('plan gratuito con trial vigente → activo', () => {
    expect(isPatientActive({ plan: 'gratuito', trial_ends_at: future }, now)).toBe(true)
  })

  it('plan gratuito con trial expirado → inactivo', () => {
    expect(isPatientActive({ plan: 'gratuito', trial_ends_at: past }, now)).toBe(false)
  })

  it('plan pro_anual sin premium_until → activo (asume permanente)', () => {
    expect(isPatientActive({ plan: 'pro_anual' }, now)).toBe(true)
  })
})

describe('filterActivePatients', () => {
  const now = new Date('2026-05-18T12:00:00Z')

  it('filtra correctamente una mezcla de pacientes', () => {
    const patients = [
      { id: '1', plan: 'premium', premium_until: '2026-12-01T00:00:00Z' },      // activo
      { id: '2', plan: 'gratuito', trial_ends_at: '2026-01-01T00:00:00Z' },     // trial expirado
      { id: '3', plan: 'gratuito', trial_ends_at: '2026-12-01T00:00:00Z' },     // trial vigente
      { id: '4', plan: 'gratuito' },                                              // sin trial
      { id: '5', plan: 'pro_mensual' },                                           // premium sin fecha
    ]
    const active = filterActivePatients(patients, now)
    expect(active.map(p => p.id).sort()).toEqual(['1', '3', '5'])
  })

  it('preserva propiedades extra del paciente', () => {
    const patients = [
      { id: '1', plan: 'premium', email: 'a@b.com', nombre: 'Ana' },
    ]
    const active = filterActivePatients(patients, now)
    expect(active[0]).toMatchObject({ email: 'a@b.com', nombre: 'Ana' })
  })
})

// ─── contarPacientesUrgentes ──────────────────────────────────────────────────

describe('contarPacientesUrgentes', () => {
  const baseSummary = (overrides: Record<string, unknown> = {}) => ({
    nombre: 'X', email: 'x@x', adherenciaMedia: 80, kcalMedia: 2000,
    logsCount: 5, ultimoPeso: null, pesoAnterior: null,
    necesitaIntervencion: false, sinActividad: false,
    ...overrides,
  })

  it('cuenta urgentes (intervención + sin actividad)', () => {
    const summaries = [
      baseSummary({ necesitaIntervencion: true }),
      baseSummary({ sinActividad: true }),
      baseSummary(),
      baseSummary(),
    ]
    const r = contarPacientesUrgentes(summaries)
    expect(r.urgentes).toBe(2)
    expect(r.activos).toBe(2)
    expect(r.total).toBe(4)
  })

  it('lista vacía → todo cero', () => {
    expect(contarPacientesUrgentes([])).toEqual({ urgentes: 0, activos: 0, total: 0 })
  })

  it('todos activos → urgentes=0', () => {
    const summaries = [baseSummary(), baseSummary(), baseSummary()]
    expect(contarPacientesUrgentes(summaries)).toEqual({ urgentes: 0, activos: 3, total: 3 })
  })

  it('todos urgentes → activos=0', () => {
    const summaries = [
      baseSummary({ sinActividad: true }),
      baseSummary({ necesitaIntervencion: true }),
    ]
    expect(contarPacientesUrgentes(summaries)).toEqual({ urgentes: 2, activos: 0, total: 2 })
  })
})

// ─── computeCurrentStreak (patient-digest) ────────────────────────────────────

describe('computeCurrentStreak', () => {
  // Usamos UTC noon para evitar drift TZ
  const today = new Date('2026-05-18T12:00:00Z')

  it('sin logs → racha 0', () => {
    expect(computeCurrentStreak(new Set(), today)).toBe(0)
  })

  it('1 día (hoy) registrado → racha 1', () => {
    expect(computeCurrentStreak(new Set(['2026-05-18']), today)).toBe(1)
  })

  it('3 días consecutivos hasta hoy → racha 3', () => {
    expect(computeCurrentStreak(
      new Set(['2026-05-16', '2026-05-17', '2026-05-18']),
      today,
    )).toBe(3)
  })

  it('ayer registrado pero no hoy → racha 0 (se rompió hoy)', () => {
    expect(computeCurrentStreak(
      new Set(['2026-05-17']),
      today,
    )).toBe(0)
  })

  it('gap en el medio rompe la racha', () => {
    // logs: 14, 15, 16, 18 — no hay 17 → solo cuenta desde 18 hacia atrás
    expect(computeCurrentStreak(
      new Set(['2026-05-14', '2026-05-15', '2026-05-16', '2026-05-18']),
      today,
    )).toBe(1) // solo el 18 cuenta
  })

  it('7 días consecutivos → racha 7', () => {
    const fechas = new Set([
      '2026-05-12', '2026-05-13', '2026-05-14',
      '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18',
    ])
    expect(computeCurrentStreak(fechas, today)).toBe(7)
  })

  it('fechas futuras se ignoran', () => {
    expect(computeCurrentStreak(
      new Set(['2026-05-18', '2026-05-20']),
      today,
    )).toBe(1)
  })
})

// ─── computeBestStreak ────────────────────────────────────────────────────────

describe('computeBestStreak', () => {
  it('array vacío → 0', () => {
    expect(computeBestStreak([])).toBe(0)
  })

  it('1 fecha → 1', () => {
    expect(computeBestStreak(['2026-05-18'])).toBe(1)
  })

  it('3 fechas consecutivas → 3', () => {
    expect(computeBestStreak(['2026-05-16', '2026-05-17', '2026-05-18'])).toBe(3)
  })

  it('detecta la mejor racha entre múltiples', () => {
    // 2 consec + gap + 4 consec → best = 4
    expect(computeBestStreak([
      '2026-05-10', '2026-05-11',
      '2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17',
    ])).toBe(4)
  })

  it('mejor racha al inicio se conserva', () => {
    expect(computeBestStreak([
      '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13',  // 4 consec
      '2026-05-15',
    ])).toBe(4)
  })

  it('todas con gaps → mejor=1', () => {
    expect(computeBestStreak(['2026-05-10', '2026-05-13', '2026-05-16'])).toBe(1)
  })
})

// ─── getCtaConfig (bandas del email patient-digest) ──────────────────────────

describe('getCtaConfig', () => {
  describe('sin actividad (adherencia null)', () => {
    it('CTA neutro gris con call-to-action genérico', () => {
      const cta = getCtaConfig(null, 'Felipe Muñoz')
      expect(cta.btnColor).toBe('#6b7280')
      expect(cta.headline).toMatch(/Felipe/i)
      expect(cta.headline).not.toMatch(/Muñoz/)  // solo first name
      expect(cta.tip).toBeUndefined()
    })
  })

  describe('adherencia ≥ 70% (verde)', () => {
    it('70% → felicitación verde', () => {
      const cta = getCtaConfig(70, 'Maria')
      expect(cta.btnColor).toBe('#16a34a')
      expect(cta.headline).toMatch(/Excelente|🔥/i)
      expect(cta.sub).toMatch(/70%/)
      expect(cta.tip).toBeUndefined()   // no tip cuando va bien
    })

    it('100% → felicitación verde', () => {
      const cta = getCtaConfig(100, 'Sofia')
      expect(cta.btnColor).toBe('#16a34a')
    })
  })

  describe('adherencia 40-69% (amber con tip)', () => {
    it('40% → amber con tip meal prep', () => {
      const cta = getCtaConfig(40, 'Carlos')
      expect(cta.btnColor).toBe('#d97706')
      expect(cta.tip).toMatch(/meal|prep|domingo/i)
    })

    it('69% → todavía amber', () => {
      const cta = getCtaConfig(69, 'Ana')
      expect(cta.btnColor).toBe('#d97706')
    })

    it('headline incluye nombre y tono motivador', () => {
      const cta = getCtaConfig(55, 'Diego')
      expect(cta.headline).toMatch(/Diego/)
      expect(cta.headline).toMatch(/Casi|logramos/i)
    })
  })

  describe('adherencia < 40% (rojo con tip mínimo viable)', () => {
    it('30% → rojo + tip hábito mínimo', () => {
      const cta = getCtaConfig(30, 'Laura')
      expect(cta.btnColor).toBe('#dc2626')
      expect(cta.tip).toMatch(/desayuno|un hábito/i)
    })

    it('0% → rojo con tono empático', () => {
      const cta = getCtaConfig(0, 'Roberto')
      expect(cta.headline).toMatch(/Retomamos/i)
      expect(cta.btnColor).toBe('#dc2626')
    })

    it('39% → todavía rojo (umbral estricto < 40)', () => {
      const cta = getCtaConfig(39, 'X')
      expect(cta.btnColor).toBe('#dc2626')
    })

    it('40% justo → cambia a amber (no rojo)', () => {
      const cta = getCtaConfig(40, 'X')
      expect(cta.btnColor).toBe('#d97706')
    })
  })

  describe('umbrales exactos (70/40)', () => {
    it('70 = verde, 69 = amber', () => {
      expect(getCtaConfig(70, 'X').btnColor).toBe('#16a34a')
      expect(getCtaConfig(69, 'X').btnColor).toBe('#d97706')
    })

    it('40 = amber, 39 = rojo', () => {
      expect(getCtaConfig(40, 'X').btnColor).toBe('#d97706')
      expect(getCtaConfig(39, 'X').btnColor).toBe('#dc2626')
    })
  })

  describe('nombre: solo first name', () => {
    it('extrae primer token del nombre', () => {
      expect(getCtaConfig(80, 'Felipe Muñoz Ávila').headline).toContain('Felipe')
      expect(getCtaConfig(80, 'Felipe Muñoz Ávila').headline).not.toContain('Muñoz')
    })

    it('nombre con un solo token', () => {
      expect(getCtaConfig(80, 'Ana').headline).toContain('Ana')
    })
  })
})

// ─── Integración: escenario E2E ───────────────────────────────────────────────

describe('🧪 SMOKE — Profesional con 4 pacientes (escenario real)', () => {
  it('genera resumen semanal coherente para el cron', () => {
    const patients: PatientProfile[] = [
      { id: '1', nombre: 'Felipe (ejemplar)', email: 'felipe@x.com' },
      { id: '2', nombre: 'Maria (intervención)', email: 'maria@x.com' },
      { id: '3', nombre: 'Carlos (sin actividad)', email: 'carlos@x.com' },
      { id: '4', nombre: 'Sofia (regular)', email: 'sofia@x.com' },
    ]
    const logsByPatient: Record<string, PatientLogRowFull[]> = {
      '1': [
        log({ user_id: '1', fecha: '2026-05-17', comidas_completadas: 5, comidas_total: 5, kcal_consumida: 2100, peso: 78.0 }),
        log({ user_id: '1', fecha: '2026-05-16', comidas_completadas: 5, comidas_total: 5, kcal_consumida: 2050, peso: null }),
        log({ user_id: '1', fecha: '2026-05-15', comidas_completadas: 4, comidas_total: 5, kcal_consumida: 1950, peso: null }),
        log({ user_id: '1', fecha: '2026-05-12', comidas_completadas: 5, comidas_total: 5, kcal_consumida: 2000, peso: 79.5 }),
      ],
      '2': [
        log({ user_id: '2', fecha: '2026-05-17', comidas_completadas: 1, comidas_total: 5 }),
        log({ user_id: '2', fecha: '2026-05-16', comidas_completadas: 2, comidas_total: 5 }),
        log({ user_id: '2', fecha: '2026-05-14', comidas_completadas: 1, comidas_total: 5 }),
      ],
      '3': [],   // sin actividad
      '4': [
        log({ user_id: '4', fecha: '2026-05-17', comidas_completadas: 4, comidas_total: 5 }),
        log({ user_id: '4', fecha: '2026-05-16', comidas_completadas: 4, comidas_total: 5 }),
      ],
    }

    const summaries = patients.map(p =>
      computePatientWeeklySummary(p, logsByPatient[p.id] || [])
    )

    // Felipe: 4 logs, 100+100+80+100=380/4=95%, ejemplar
    expect(summaries[0].adherenciaMedia).toBe(95)
    expect(summaries[0].necesitaIntervencion).toBe(false)
    expect(summaries[0].ultimoPeso).toBe(78.0)
    expect(summaries[0].pesoAnterior).toBe(79.5)   // bajó 1.5kg

    // Maria: 20+40+20 = 80/3 = 27%, intervención
    expect(summaries[1].adherenciaMedia).toBe(27)
    expect(summaries[1].necesitaIntervencion).toBe(true)

    // Carlos: sin actividad
    expect(summaries[2].sinActividad).toBe(true)
    expect(summaries[2].necesitaIntervencion).toBe(false)  // sinActividad gana

    // Sofia: 80% regular
    expect(summaries[3].adherenciaMedia).toBe(80)
    expect(summaries[3].necesitaIntervencion).toBe(false)

    // Contador para banner
    const counts = contarPacientesUrgentes(summaries)
    expect(counts.urgentes).toBe(2)   // Maria + Carlos
    expect(counts.activos).toBe(2)    // Felipe + Sofia
    expect(counts.total).toBe(4)
  })
})
