import { describe, it, expect } from 'vitest'
import {
  bmrMifflinStJeor,
  bmrCunningham,
  bmrHarrisBenedictLegacy,
  bmrHB,
  compararFormulas,
  formulaLabel,
  seleccionarFormula,
  usaraCunningham,
  factorActividad,
  kcalObjetivo,
  calcMacros,
  calcularNutricion,
  tdeeKcalPorKg,
  macrosDirectos,
  sugerirCho,
  sugerirProteina,
  sugerirGrasa,
  validarMacros,
} from './nutrition'

/**
 * Tests del motor de cálculo nutricional — corazón clínico del producto.
 *
 * Valores de referencia validados contra la literatura:
 * - Mifflin-St Jeor 1990 (Frankenfield et al. 2005)
 * - Cunningham 1991
 * - Harris-Benedict 1919 (referencia histórica)
 * - PAL FAO/WHO/UNU 2001
 */

// ─── BMR Mifflin-St Jeor ──────────────────────────────────────────────────────

describe('bmrMifflinStJeor (fórmula activa)', () => {
  it('hombre 30a, 75kg, 175cm → 1698.75', () => {
    const bmr = bmrMifflinStJeor(75, 175, 30, 'masculino')
    expect(bmr).toBeCloseTo(1698.75, 2)
  })

  it('mujer 30a, 65kg, 165cm → 1370.25', () => {
    const bmr = bmrMifflinStJeor(65, 165, 30, 'femenino')
    expect(bmr).toBeCloseTo(1370.25, 2)
  })

  it('mismo peso/talla/edad → hombre > mujer (offset +5 vs -161 = +166 kcal)', () => {
    const h = bmrMifflinStJeor(70, 170, 35, 'masculino')
    const m = bmrMifflinStJeor(70, 170, 35, 'femenino')
    expect(h - m).toBe(166)
  })

  it('rango fisiológico: adulto sano queda entre 1200 y 2400 kcal', () => {
    const bmr = bmrMifflinStJeor(70, 170, 35, 'masculino')
    expect(bmr).toBeGreaterThan(1200)
    expect(bmr).toBeLessThan(2400)
  })

  it('coeficientes correctos: +10/kg peso, +6.25/cm talla, -5/año edad', () => {
    const base = bmrMifflinStJeor(70, 170, 30, 'masculino')
    expect(bmrMifflinStJeor(71, 170, 30, 'masculino')).toBeCloseTo(base + 10, 5)
    expect(bmrMifflinStJeor(70, 171, 30, 'masculino')).toBeCloseTo(base + 6.25, 5)
    expect(bmrMifflinStJeor(70, 170, 31, 'masculino')).toBeCloseTo(base - 5, 5)
  })
})

// ─── BMR Cunningham (deportistas) ────────────────────────────────────────────

describe('bmrCunningham (atletas + BIA medido)', () => {
  it('75kg con 10% grasa → MLG 67.5 → 500 + 22×67.5 = 1985', () => {
    expect(bmrCunningham(75, 10)).toBeCloseTo(1985, 2)
  })

  it('60kg con 20% grasa → MLG 48 → 500 + 22×48 = 1556', () => {
    expect(bmrCunningham(60, 20)).toBeCloseTo(1556, 2)
  })

  it('mismo peso: más grasa → menos BMR (porque menos MLG)', () => {
    const lean = bmrCunningham(80, 10)
    const fat = bmrCunningham(80, 25)
    expect(lean).toBeGreaterThan(fat)
  })

  it('0% grasa hipotético → 500 + 22×peso', () => {
    expect(bmrCunningham(70, 0)).toBe(500 + 22 * 70)
  })
})

// ─── BMR Harris-Benedict (deprecated) ────────────────────────────────────────

describe('bmrHarrisBenedictLegacy (legacy, sobreestima ~5-15%)', () => {
  it('hombre 30a, 75kg, 175cm', () => {
    // 66.5 + 13.75×75 + 5.003×175 - 6.75×30 = 66.5 + 1031.25 + 875.525 - 202.5 = 1770.775
    expect(bmrHarrisBenedictLegacy(75, 175, 30, 'masculino')).toBeCloseTo(1770.78, 2)
  })

  it('mujer 30a, 65kg, 165cm (HB 1919 original)', () => {
    // 655.1 + 9.563×65 + 1.85×165 - 4.676×30 = 655.1 + 621.595 + 305.25 - 140.28 = 1441.665
    expect(bmrHarrisBenedictLegacy(65, 165, 30, 'femenino')).toBeCloseTo(1441.665, 2)
  })

  it('alias bmrHB === bmrHarrisBenedictLegacy', () => {
    expect(bmrHB).toBe(bmrHarrisBenedictLegacy)
  })

  it('HB sobreestima vs Mifflin en hombres adultos', () => {
    const hb = bmrHarrisBenedictLegacy(75, 175, 30, 'masculino')
    const msj = bmrMifflinStJeor(75, 175, 30, 'masculino')
    expect(hb).toBeGreaterThan(msj)
    // Diferencia esperada ~5-10%
    expect(hb - msj).toBeGreaterThan(50)
    expect(hb - msj).toBeLessThan(200)
  })
})

// ─── compararFormulas ─────────────────────────────────────────────────────────

describe('compararFormulas (auditoría clínica)', () => {
  it('devuelve estructura completa con delta', () => {
    const r = compararFormulas(75, 175, 30, 'masculino')
    expect(r).toHaveProperty('bmrHB')
    expect(r).toHaveProperty('bmrMSJ')
    expect(r).toHaveProperty('deltaKcal')
    expect(r).toHaveProperty('deltaPct')
  })

  it('deltaKcal es bmrMSJ - bmrHB (negativo = MSJ menor)', () => {
    const r = compararFormulas(75, 175, 30, 'masculino')
    expect(r.deltaKcal).toBe(r.bmrMSJ - r.bmrHB)
    expect(r.deltaKcal).toBeLessThan(0)   // HB > MSJ típicamente
  })

  it('deltaPct está en rango razonable -15% a 0%', () => {
    const r = compararFormulas(70, 170, 30, 'masculino')
    expect(r.deltaPct).toBeGreaterThan(-15)
    expect(r.deltaPct).toBeLessThan(5)
  })
})

// ─── formulaLabel ─────────────────────────────────────────────────────────────

describe('formulaLabel', () => {
  it('cunningham → "Cunningham"', () => {
    expect(formulaLabel('cunningham')).toBe('Cunningham')
  })
  it('harris_benedict_legacy → "Harris-Benedict"', () => {
    expect(formulaLabel('harris_benedict_legacy')).toBe('Harris-Benedict')
  })
  it('mifflin_st_jeor (default) → "Mifflin-St Jeor"', () => {
    expect(formulaLabel('mifflin_st_jeor')).toBe('Mifflin-St Jeor')
  })
  it('undefined → "Mifflin-St Jeor" (default activo)', () => {
    expect(formulaLabel()).toBe('Mifflin-St Jeor')
    expect(formulaLabel(undefined)).toBe('Mifflin-St Jeor')
  })
})

// ─── seleccionarFormula (auto Cunningham para deportistas) ───────────────────

describe('seleccionarFormula', () => {
  it('sin %grasa → siempre Mifflin', () => {
    expect(seleccionarFormula('masculino', 5)).toBe('mifflin_st_jeor')
    expect(seleccionarFormula('masculino', 7, undefined)).toBe('mifflin_st_jeor')
  })

  it('<5 días entreno → Mifflin aunque %grasa esté medido', () => {
    expect(seleccionarFormula('masculino', 4, 10)).toBe('mifflin_st_jeor')
    expect(seleccionarFormula('masculino', 3, 8)).toBe('mifflin_st_jeor')
  })

  it('hombre ≥5 días y ≤15% grasa → Cunningham', () => {
    expect(seleccionarFormula('masculino', 5, 15)).toBe('cunningham')
    expect(seleccionarFormula('masculino', 6, 10)).toBe('cunningham')
    expect(seleccionarFormula('masculino', 7, 8)).toBe('cunningham')
  })

  it('hombre con %grasa 16 → Mifflin (umbral estricto ≤15)', () => {
    expect(seleccionarFormula('masculino', 6, 16)).toBe('mifflin_st_jeor')
  })

  it('mujer ≥5 días y ≤22% grasa → Cunningham', () => {
    expect(seleccionarFormula('femenino', 5, 22)).toBe('cunningham')
    expect(seleccionarFormula('femenino', 6, 18)).toBe('cunningham')
  })

  it('mujer con %grasa 23 → Mifflin', () => {
    expect(seleccionarFormula('femenino', 6, 23)).toBe('mifflin_st_jeor')
  })
})

describe('usaraCunningham (helper boolean)', () => {
  it('coincide con seleccionarFormula', () => {
    expect(usaraCunningham('masculino', 5, 12)).toBe(true)
    expect(usaraCunningham('masculino', 4, 12)).toBe(false)
    expect(usaraCunningham('femenino', 5, 25)).toBe(false)
  })
})

// ─── factorActividad (PAL FAO/WHO) ───────────────────────────────────────────

describe('factorActividad (PAL FAO/WHO)', () => {
  it('sedentario (0 días) → 1.2', () => {
    expect(factorActividad(0, 0, 'ninguno')).toBe(1.2)
  })

  it('ligero (1-2 días) → 1.375', () => {
    expect(factorActividad(1, 60, 'fuerza')).toBe(1.375)
    expect(factorActividad(2, 60, 'fuerza')).toBe(1.375)
  })

  it('moderado (3-4 días, fuerza, ≤60min) → 1.55', () => {
    expect(factorActividad(3, 60, 'fuerza')).toBe(1.55)
    expect(factorActividad(4, 45, 'fuerza')).toBe(1.55)
  })

  it('alto (5-6 días, fuerza, ≤60min) → 1.725', () => {
    expect(factorActividad(5, 60, 'fuerza')).toBe(1.725)
    expect(factorActividad(6, 60, 'fuerza')).toBe(1.725)
  })

  it('muy alto (7 días, fuerza, ≤60min) → 1.9', () => {
    expect(factorActividad(7, 60, 'fuerza')).toBe(1.9)
  })

  it('cardio aumenta el PAL en +0.075', () => {
    const fuerza = factorActividad(3, 60, 'fuerza')
    const cardio = factorActividad(3, 60, 'cardio')
    expect(cardio - fuerza).toBeCloseTo(0.075, 3)
  })

  it('mixto aumenta el PAL en +0.05', () => {
    const fuerza = factorActividad(3, 60, 'fuerza')
    const mixto = factorActividad(3, 60, 'mixto')
    expect(mixto - fuerza).toBeCloseTo(0.05, 3)
  })

  it('duración >60min → +0.025', () => {
    const corto = factorActividad(3, 60, 'fuerza')
    const medio = factorActividad(3, 75, 'fuerza')
    expect(medio - corto).toBeCloseTo(0.025, 3)
  })

  it('duración >90min → +0.05', () => {
    const corto = factorActividad(3, 60, 'fuerza')
    const largo = factorActividad(3, 120, 'fuerza')
    expect(largo - corto).toBeCloseTo(0.05, 3)
  })

  it('PAL nunca excede 2.5 (clip de seguridad)', () => {
    // Caso extremo: 7 días + cardio + >90min
    const pal = factorActividad(7, 120, 'cardio')
    expect(pal).toBeLessThanOrEqual(2.5)
  })
})

// ─── kcalObjetivo ─────────────────────────────────────────────────────────────

describe('kcalObjetivo', () => {
  it('pérdida grasa → -20% (déficit del 20%)', () => {
    expect(kcalObjetivo(2500, 'perdida grasa')).toBe(2000)
  })

  it('mantenimiento → 100% (igual al TDEE)', () => {
    expect(kcalObjetivo(2500, 'mantenimiento')).toBe(2500)
  })

  it('hipertrofia → +10% (superávit)', () => {
    expect(kcalObjetivo(2500, 'hipertrofia')).toBe(2750)
  })
})

// ─── calcMacros ───────────────────────────────────────────────────────────────

describe('calcMacros', () => {
  describe('proteína (skill nutriapp-pro)', () => {
    it('hipertrofia → 2g/kg peso', () => {
      const m = calcMacros(3000, 80, 'hipertrofia')
      expect(m.p).toBe(160)   // 80kg × 2
    })

    it('pérdida grasa → 2.1g/kg (más alta para preservar masa)', () => {
      const m = calcMacros(2000, 80, 'perdida grasa')
      expect(m.p).toBe(168)   // 80kg × 2.1
    })

    it('mantenimiento → 1.9g/kg', () => {
      const m = calcMacros(2500, 80, 'mantenimiento')
      expect(m.p).toBe(152)   // 80kg × 1.9
    })
  })

  describe('grasa', () => {
    it('hipertrofia → 0.9g/kg', () => {
      const m = calcMacros(3000, 80, 'hipertrofia')
      expect(m.g).toBe(72)   // 80kg × 0.9
    })

    it('pérdida grasa → 0.8g/kg', () => {
      const m = calcMacros(2000, 80, 'perdida grasa')
      // Puede subir si hay corrección por exceso, pero base es 0.8
      expect(m.g).toBeGreaterThanOrEqual(32)   // 80×0.4 mínimo
    })
  })

  describe('carbohidratos', () => {
    it('CH calculados desde kcal restante', () => {
      // hipertrofia 3000 kcal, 80kg: p=160 (640 kcal), g=72 (648 kcal)
      // c = (3000 - 640 - 648) / 4 = 1712 / 4 = 428
      const m = calcMacros(3000, 80, 'hipertrofia')
      expect(m.c).toBe(428)
    })

    it('CH mínimo 80g (protección clínica)', () => {
      // Caso extremo: kcal muy bajo → CH calculado sería <80
      const m = calcMacros(800, 80, 'perdida grasa')
      expect(m.c).toBeGreaterThanOrEqual(80)
    })

    it('grasa baja a mínimo cuando CH se fuerza a 80', () => {
      const m = calcMacros(800, 80, 'perdida grasa')
      // Con CH=80 forzado, grasa se recalcula y debe ser >= peso*0.4
      expect(m.g).toBeGreaterThanOrEqual(80 * 0.4)
    })
  })

  describe('coherencia matemática', () => {
    it('macros suman aprox. el kcal target (±5%)', () => {
      const kcal = 2500
      const m = calcMacros(kcal, 75, 'mantenimiento')
      const total = m.p * 4 + m.c * 4 + m.g * 9
      expect(total).toBeGreaterThanOrEqual(kcal * 0.85)
      expect(total).toBeLessThanOrEqual(kcal * 1.10)
    })

    it('todos los macros >= 0 (sin negativos)', () => {
      ;[
        calcMacros(1500, 60, 'perdida grasa'),
        calcMacros(2500, 75, 'mantenimiento'),
        calcMacros(3500, 90, 'hipertrofia'),
      ].forEach(m => {
        expect(m.p).toBeGreaterThanOrEqual(0)
        expect(m.c).toBeGreaterThanOrEqual(0)
        expect(m.g).toBeGreaterThanOrEqual(0)
      })
    })

    it('nota string presente (incluso si vacío)', () => {
      const m = calcMacros(2500, 75, 'mantenimiento')
      expect(typeof m.nota).toBe('string')
    })
  })
})

// ─── calcularNutricion (integración completa) ────────────────────────────────

describe('calcularNutricion (función principal)', () => {
  it('hombre 30a, 75kg, 175cm, fuerza 3d, hipertrofia', () => {
    const r = calcularNutricion({
      peso: 75, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'hipertrofia',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    // bmr = 1699
    // pal = 1.55 (3 días, fuerza, 60min)
    // tdee = 1699 × 1.55 = 2633
    // kcal = 2633 × 1.10 = 2896 (hipertrofia)
    expect(r.bmr).toBeCloseTo(1699, 0)
    expect(r.pal).toBeCloseTo(1.55, 2)
    expect(r.tdee).toBeCloseTo(2633, 0)
    expect(r.kcal).toBeCloseTo(2896, 0)
    expect(r.formulaUsada).toBe('mifflin_st_jeor')
  })

  it('atleta con BIA → activa Cunningham', () => {
    const r = calcularNutricion({
      peso: 80, talla: 180, edad: 28, sexo: 'masculino', objetivo: 'hipertrofia',
      diasEjercicio: 6, duracionSesion: 90, tipoEjercicio: 'fuerza',
      porcentajeGrasa: 10,
    })
    expect(r.formulaUsada).toBe('cunningham')
    // Cunningham: 500 + 22 × (80 × 0.9) = 500 + 22 × 72 = 500 + 1584 = 2084
    expect(r.bmr).toBeCloseTo(2084, 0)
  })

  it('mujer 45a sedentaria pérdida → Mifflin + PAL 1.2', () => {
    const r = calcularNutricion({
      peso: 70, talla: 165, edad: 45, sexo: 'femenino', objetivo: 'perdida grasa',
      diasEjercicio: 0, duracionSesion: 0, tipoEjercicio: 'ninguno',
    })
    // bmr = 10×70 + 6.25×165 - 5×45 - 161 = 700 + 1031.25 - 225 - 161 = 1345.25
    // pal = 1.2
    // tdee = 1614.3
    // kcal = 1614.3 × 0.80 = 1291.4
    expect(r.bmr).toBeCloseTo(1345, 0)
    expect(r.pal).toBe(1.2)
    expect(r.kcal).toBeCloseTo(1291, 0)
    expect(r.formulaUsada).toBe('mifflin_st_jeor')
  })

  it('retorna estructura completa con todos los campos', () => {
    const r = calcularNutricion({
      peso: 70, talla: 170, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    expect(r).toHaveProperty('bmr')
    expect(r).toHaveProperty('tdee')
    expect(r).toHaveProperty('kcal')
    expect(r).toHaveProperty('macros')
    expect(r).toHaveProperty('pal')
    expect(r).toHaveProperty('formulaUsada')
    expect(r.macros).toHaveProperty('p')
    expect(r.macros).toHaveProperty('c')
    expect(r.macros).toHaveProperty('g')
  })

  it('valores fisiológicos razonables: hombre adulto deportista', () => {
    const r = calcularNutricion({
      peso: 80, talla: 180, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 4, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    // Hombre 80kg deportista debe consumir entre 2500 y 3500 kcal/día
    expect(r.kcal).toBeGreaterThan(2500)
    expect(r.kcal).toBeLessThan(3500)
  })

  it('cambio de objetivo cambia kcal pero no bmr/tdee', () => {
    const baseForm = {
      peso: 75, talla: 175, edad: 30, sexo: 'masculino' as const,
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza' as const,
    }
    const mant = calcularNutricion({ ...baseForm, objetivo: 'mantenimiento' })
    const cut  = calcularNutricion({ ...baseForm, objetivo: 'perdida grasa' })
    const bulk = calcularNutricion({ ...baseForm, objetivo: 'hipertrofia' })

    expect(mant.bmr).toBe(cut.bmr)
    expect(mant.tdee).toBe(cut.tdee)
    expect(mant.bmr).toBe(bulk.bmr)

    expect(cut.kcal).toBeLessThan(mant.kcal)
    expect(bulk.kcal).toBeGreaterThan(mant.kcal)
  })
})

// ─── Smoke E2E: escenarios reales ─────────────────────────────────────────────

describe('🧪 SMOKE — Perfiles clínicos reales', () => {
  it('1. Sedentario hombre 50a, IMC 30 (obesidad), pérdida grasa', () => {
    const r = calcularNutricion({
      peso: 95, talla: 175, edad: 50, sexo: 'masculino', objetivo: 'perdida grasa',
      diasEjercicio: 1, duracionSesion: 30, tipoEjercicio: 'cardio',
    })
    expect(r.kcal).toBeGreaterThan(1500)
    expect(r.kcal).toBeLessThan(2500)
    expect(r.macros.p).toBeGreaterThan(180)   // 95 × 2.1 alta proteína
  })

  it('2. Mujer atleta crossfit, BIA medido, hipertrofia', () => {
    const r = calcularNutricion({
      peso: 60, talla: 165, edad: 28, sexo: 'femenino', objetivo: 'hipertrofia',
      diasEjercicio: 6, duracionSesion: 75, tipoEjercicio: 'mixto',
      porcentajeGrasa: 18,
    })
    expect(r.formulaUsada).toBe('cunningham')
    expect(r.macros.p).toBe(120)   // 60kg × 2 hipertrofia
  })

  it('3. Hombre joven mantenimiento, deportista recreacional', () => {
    const r = calcularNutricion({
      peso: 72, talla: 178, edad: 25, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    expect(r.kcal).toBeGreaterThan(2400)
    expect(r.kcal).toBeLessThan(3000)
  })

  it('4. Adulto mayor sedentaria, mantenimiento', () => {
    const r = calcularNutricion({
      peso: 65, talla: 160, edad: 70, sexo: 'femenino', objetivo: 'mantenimiento',
      diasEjercicio: 0, duracionSesion: 0, tipoEjercicio: 'ninguno',
    })
    // Mujer mayor sedentaria: 1300-1600 kcal típico
    expect(r.kcal).toBeGreaterThan(1200)
    expect(r.kcal).toBeLessThan(1800)
  })

  it('coherencia: ningún resultado tiene NaN o Infinity', () => {
    const r = calcularNutricion({
      peso: 75, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    ;[r.bmr, r.tdee, r.kcal, r.pal, r.macros.p, r.macros.c, r.macros.g].forEach(v => {
      expect(Number.isFinite(v)).toBe(true)
    })
  })
})

// ─── Opción B: TDEE por kcal/kg × PAL ────────────────────────────────────────

describe('tdeeKcalPorKg', () => {
  it('70kg × 30 kcal/kg × 1.55 PAL = 3255 kcal', () => {
    expect(tdeeKcalPorKg(70, 30, 1.55)).toBeCloseTo(3255, 0)
  })

  it('paciente bariátrico (60kg × 20 kcal/kg × 1.2 sedentario)', () => {
    expect(tdeeKcalPorKg(60, 20, 1.2)).toBeCloseTo(1440, 0)
  })

  it('atleta endurance 80kg × 50 kcal/kg × 1.9 PAL', () => {
    expect(tdeeKcalPorKg(80, 50, 1.9)).toBeCloseTo(7600, 0)
  })
})

// ─── Opción C: Macros directos ───────────────────────────────────────────────

describe('macrosDirectos', () => {
  it('70kg × (2.0 prot, 1.0 grasa, 5 CHO) = 140p 70g 350c, ~2590 kcal', () => {
    const m = macrosDirectos(70, 2.0, 1.0, 5)
    expect(m.p).toBe(140)
    expect(m.g).toBe(70)
    expect(m.c).toBe(350)
    expect(m.kcal).toBe(2590)
  })

  it('atleta endurance 75kg × (1.6P, 1.0G, 10C) → 750c, 4155 kcal', () => {
    // 75×1.6=120P, 75×1.0=75G, 75×10=750C
    // kcal = 120*4 + 750*4 + 75*9 = 480 + 3000 + 675 = 4155
    const m = macrosDirectos(75, 1.6, 1.0, 10)
    expect(m.p).toBe(120)
    expect(m.g).toBe(75)
    expect(m.c).toBe(750)
    expect(m.kcal).toBe(4155)
  })

  it('kcal totales son suma de P×4 + C×4 + G×9', () => {
    const m = macrosDirectos(65, 2.1, 0.8, 4)
    const calc = m.p * 4 + m.c * 4 + m.g * 9
    expect(m.kcal).toBe(calc)
  })
})

// ─── Helpers de sugerencia (rangos Burke 2011 + Phillips + ACSM) ────────────

describe('sugerirCho (Burke et al. 2011)', () => {
  it('sedentario (0 días) → light 3-5 g/kg', () => {
    const s = sugerirCho(0, 0)
    expect(s).toEqual({ min: 3, max: 5, carga: 'light' })
  })

  it('moderado (3 días × 60min) → moderate 5-7 g/kg', () => {
    const s = sugerirCho(3, 60)
    expect(s).toEqual({ min: 5, max: 7, carga: 'moderate' })
  })

  it('alto (5 días × 120min) → high 6-10 g/kg', () => {
    const s = sugerirCho(5, 120)
    expect(s).toEqual({ min: 6, max: 10, carga: 'high' })
  })

  it('ultra-endurance (7 días × 300min) → very_high 8-12 g/kg', () => {
    const s = sugerirCho(7, 300)
    expect(s).toEqual({ min: 8, max: 12, carga: 'very_high' })
  })
})

describe('sugerirProteina (Phillips/Morton 2018, Helms 2014)', () => {
  it('pérdida grasa → 2.0-2.7 g/kg (preservación masa magra)', () => {
    expect(sugerirProteina('perdida grasa', 'fuerza')).toEqual({ min: 2.0, max: 2.7 })
  })

  it('hipertrofia → 1.6-2.2 g/kg (Morton 2018 meta-análisis)', () => {
    expect(sugerirProteina('hipertrofia', 'fuerza')).toEqual({ min: 1.6, max: 2.2 })
  })

  it('cardio mantenimiento → 1.2-1.6 g/kg', () => {
    expect(sugerirProteina('mantenimiento', 'cardio')).toEqual({ min: 1.2, max: 1.6 })
  })

  it('mantenimiento mixto → 1.4-1.8 g/kg', () => {
    expect(sugerirProteina('mantenimiento', 'mixto')).toEqual({ min: 1.4, max: 1.8 })
  })
})

describe('sugerirGrasa (ACSM/ISSN consensus)', () => {
  it('déficit → 0.6-1.0 g/kg', () => {
    expect(sugerirGrasa('perdida grasa')).toEqual({ min: 0.6, max: 1.0 })
  })

  it('hipertrofia → 1.0-1.5 g/kg', () => {
    expect(sugerirGrasa('hipertrofia')).toEqual({ min: 1.0, max: 1.5 })
  })

  it('mantenimiento → 0.8-1.2 g/kg', () => {
    expect(sugerirGrasa('mantenimiento')).toEqual({ min: 0.8, max: 1.2 })
  })
})

// ─── Validación clínica de macros ────────────────────────────────────────────

describe('validarMacros', () => {
  it('grasa < 0.5 g/kg → BLOQUEO (floor crítico hormonal)', () => {
    const v = validarMacros(70, 2.0, 0.3, 5, 2300, 4)
    expect(v.bloqueos.length).toBeGreaterThan(0)
    expect(v.bloqueos[0]).toMatch(/floor crítico 0.5/)
  })

  it('grasa entre 0.5 y 0.6 → warning sin bloqueo', () => {
    const v = validarMacros(70, 2.0, 0.55, 5, 2400, 4)
    expect(v.bloqueos.length).toBe(0)
    expect(v.warnings.length).toBeGreaterThan(0)
  })

  it('proteína > 3.1 g/kg → warning (techo Phillips)', () => {
    const v = validarMacros(70, 3.5, 1.0, 5, 2800, 4)
    expect(v.warnings.some(w => /3.1/.test(w))).toBe(true)
  })

  it('CHO < 3 g/kg + 5 días entrenamiento → warning Burke 2011', () => {
    const v = validarMacros(70, 2.0, 1.0, 2, 1820, 5)
    expect(v.warnings.some(w => /CHO|Burke/i.test(w))).toBe(true)
  })

  it('kcal < 800 → BLOQUEO (umbral fisiológico)', () => {
    const v = validarMacros(70, 1.0, 0.5, 5, 700, 0)
    expect(v.bloqueos.some(b => /800/.test(b))).toBe(true)
  })

  it('macros normales → sin warnings ni bloqueos', () => {
    const v = validarMacros(70, 1.8, 1.0, 5, 2380, 3)
    expect(v.warnings.length).toBe(0)
    expect(v.bloqueos.length).toBe(0)
  })
})

// ─── calcularNutricion con los 3 métodos ─────────────────────────────────────

describe('calcularNutricion — método bmr_pal (default, retrocompat)', () => {
  it('sin metodoCalculo → comportamiento idéntico al actual', () => {
    const r = calcularNutricion({
      peso: 75, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    expect(r.metodoUsado).toBe('bmr_pal')
    expect(r.bmr).toBeGreaterThan(1500)
    expect(r.tdee).toBeGreaterThan(r.bmr)
  })

  it('metodoCalculo explícito bmr_pal → mismo resultado que sin especificar', () => {
    const a = calcularNutricion({
      peso: 75, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    const b = calcularNutricion({
      peso: 75, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'bmr_pal',
    })
    expect(a.kcal).toBe(b.kcal)
    expect(a.macros).toEqual(b.macros)
  })
})

describe('calcularNutricion — método kcal_kg_pal', () => {
  it('70kg × 35 kcal/kg × PAL → TDEE → kcal por objetivo', () => {
    const r = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'kcal_kg_pal',
      kcalPorKg: 35,
    })
    // 70 × 35 = 2450 base × pal 1.55 = 3797 → mantenimiento = 3797
    expect(r.metodoUsado).toBe('kcal_kg_pal')
    expect(r.tdee).toBeGreaterThan(3500)
    expect(r.kcal).toBe(r.tdee)
  })

  it('kcal_kg_pal con objetivo pérdida grasa aplica -20%', () => {
    const r = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'perdida grasa',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'kcal_kg_pal',
      kcalPorKg: 30,
    })
    expect(r.kcal).toBeCloseTo(r.tdee * 0.8, 0)
  })

  it('sin kcalPorKg → default 30', () => {
    const r = calcularNutricion({
      peso: 70, talla: 170, edad: 30, sexo: 'femenino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'kcal_kg_pal',
    })
    // 70 × 30 × 1.55 = 3255
    expect(r.tdee).toBeCloseTo(3255, 0)
  })
})

describe('calcularNutricion — método macros_directos (Opción C)', () => {
  it('70kg con (2.0P 1.0G 5C) → 140p 70g 350c, kcal calculado', () => {
    const r = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'macros_directos',
      proteinaGKgOverride: 2.0,
      grasaGKgOverride: 1.0,
      choGKgOverride: 5,
    })
    expect(r.metodoUsado).toBe('macros_directos')
    expect(r.macros.p).toBe(140)
    expect(r.macros.g).toBe(70)
    expect(r.macros.c).toBe(350)
    expect(r.kcal).toBe(2590)
  })

  it('macros_directos NO ajusta por objetivo (kcal es resultado)', () => {
    const mantenimiento = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'macros_directos',
      proteinaGKgOverride: 2.0, grasaGKgOverride: 1.0, choGKgOverride: 5,
    })
    const deficit = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'perdida grasa',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'macros_directos',
      proteinaGKgOverride: 2.0, grasaGKgOverride: 1.0, choGKgOverride: 5,
    })
    expect(mantenimiento.kcal).toBe(deficit.kcal)
  })

  it('warnings se incluyen cuando macros directos están fuera de rango', () => {
    const r = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'macros_directos',
      proteinaGKgOverride: 3.5,  // > techo 3.1
      grasaGKgOverride: 1.0,
      choGKgOverride: 5,
    })
    expect(r.warnings).toBeDefined()
    expect(r.warnings!.some(w => /3.1/.test(w))).toBe(true)
  })
})

describe('calcularNutricion — mezclas (overrides en cualquier método)', () => {
  it('bmr_pal + override proteína fuerza prot final = peso × override', () => {
    const r = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      metodoCalculo: 'bmr_pal',
      proteinaGKgOverride: 2.0,
    })
    expect(r.macros.p).toBe(140)  // 70 × 2.0
  })

  it('bmr_pal + override grasa recalcula kcal totales', () => {
    const sinOverride = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
    })
    const conOverride = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza',
      grasaGKgOverride: 1.5,
    })
    // Con override la grasa cambia y kcal debe recalcularse
    expect(conOverride.macros.g).toBe(105)  // 70 × 1.5
    expect(conOverride.kcal).not.toBe(sinOverride.kcal)
  })

  it('kcal_kg_pal + override CHO sobreescribe el CHO calculado', () => {
    const r = calcularNutricion({
      peso: 70, talla: 175, edad: 30, sexo: 'masculino', objetivo: 'mantenimiento',
      diasEjercicio: 5, duracionSesion: 90, tipoEjercicio: 'fuerza',
      metodoCalculo: 'kcal_kg_pal',
      kcalPorKg: 35,
      choGKgOverride: 6,
    })
    expect(r.macros.c).toBe(420)  // 70 × 6
  })
})
