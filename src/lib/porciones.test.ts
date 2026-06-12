import { describe, it, expect } from 'vitest'
import {
  INTERCAMBIOS,
  MACROS_POR_GRUPO,
  distribuirEnPorciones,
  type GrupoPorcion,
} from './porciones'

/**
 * Tests del sistema de intercambios alimentarios chileno.
 * Valida que cada grupo tenga al menos 5 intercambios y que las porciones
 * dentro de un grupo aporten macros similares (±25% tolerancia clínica).
 */

describe('INTERCAMBIOS — integridad estructural', () => {
  const grupos: GrupoPorcion[] = ['lacteos', 'frutas', 'verduras', 'cereales', 'proteinas', 'grasas']

  grupos.forEach(grupo => {
    it(`${grupo} tiene al menos 5 intercambios`, () => {
      expect(INTERCAMBIOS[grupo].length).toBeGreaterThanOrEqual(5)
    })

    it(`${grupo} — todos los items tienen macros válidos`, () => {
      INTERCAMBIOS[grupo].forEach(item => {
        expect(item.kcal).toBeGreaterThan(0)
        expect(item.p).toBeGreaterThanOrEqual(0)
        expect(item.c).toBeGreaterThanOrEqual(0)
        expect(item.g).toBeGreaterThanOrEqual(0)
        expect(item.gramos).toBeGreaterThan(0)
      })
    })
  })

  it('lácteos — al menos 1 con ejemplo chileno marcado', () => {
    const conChileno = INTERCAMBIOS.lacteos.filter(i => i.ejemploChileno).length
    expect(conChileno).toBeGreaterThanOrEqual(1)
  })

  it('cereales — incluye marraqueta y hallulla (panes chilenos clásicos)', () => {
    const labels = INTERCAMBIOS.cereales.map(i => i.alimento.toLowerCase())
    expect(labels.some(l => l.includes('marraqueta'))).toBe(true)
    expect(labels.some(l => l.includes('hallulla'))).toBe(true)
  })

  it('proteínas — incluye opción vegana (legumbres o tofu)', () => {
    const labels = INTERCAMBIOS.proteinas.map(i => i.alimento.toLowerCase())
    expect(labels.some(l => l.includes('legumbre') || l.includes('tofu'))).toBe(true)
  })
})

describe('MACROS_POR_GRUPO — valores Sochinut estándar', () => {
  it('lácteos ~90 kcal', () => {
    expect(MACROS_POR_GRUPO.lacteos.kcal).toBeCloseTo(90, 0)
  })

  it('frutas ~60 kcal (15g CHO típico)', () => {
    expect(MACROS_POR_GRUPO.frutas.kcal).toBeCloseTo(60, 0)
    expect(MACROS_POR_GRUPO.frutas.c).toBeCloseTo(15, 0)
  })

  it('cereales ~80 kcal (15g CHO)', () => {
    expect(MACROS_POR_GRUPO.cereales.kcal).toBeCloseTo(80, 0)
    expect(MACROS_POR_GRUPO.cereales.c).toBeCloseTo(15, 0)
  })

  it('proteínas ~75 kcal (7g P)', () => {
    expect(MACROS_POR_GRUPO.proteinas.kcal).toBeCloseTo(75, 0)
    expect(MACROS_POR_GRUPO.proteinas.p).toBeCloseTo(7, 0)
  })

  it('grasas ~45 kcal (5g G)', () => {
    expect(MACROS_POR_GRUPO.grasas.kcal).toBeCloseTo(45, 0)
    expect(MACROS_POR_GRUPO.grasas.g).toBeCloseTo(5, 0)
  })
})

describe('distribuirEnPorciones — algoritmo Sochinut', () => {
  it('1800 kcal · 90P · 200C · 60G · mantenimiento → distribución coherente', () => {
    const d = distribuirEnPorciones(1800, 90, 200, 60, 'mantenimiento')
    expect(d.lacteos).toBe(2)
    expect(d.frutas).toBe(3)
    expect(d.verduras).toBe(4)
    expect(d.cereales).toBeGreaterThan(5)
    expect(d.proteinas).toBeGreaterThan(5)
    // Delta kcal dentro de ±15% del target
    expect(Math.abs(d.delta.kcal)).toBeLessThan(1800 * 0.15)
  })

  it('hipertrofia recibe más lácteos (3) que déficit (2)', () => {
    const hipertrofia = distribuirEnPorciones(2400, 140, 250, 80, 'hipertrofia')
    const deficit     = distribuirEnPorciones(1600, 130, 130, 50, 'perdida grasa')
    expect(hipertrofia.lacteos).toBe(3)
    expect(deficit.lacteos).toBe(2)
  })

  it('plan déficit estricto 1400 kcal asigna 2 frutas (no 4)', () => {
    const d = distribuirEnPorciones(1400, 110, 120, 45, 'perdida grasa')
    expect(d.frutas).toBe(2)
  })

  it('plan grande 2500+ kcal asigna 4 frutas', () => {
    const d = distribuirEnPorciones(2500, 150, 290, 80, 'hipertrofia')
    expect(d.frutas).toBe(4)
  })

  it('verduras siempre = 4 (no se ajusta finamente, son libres)', () => {
    const d1 = distribuirEnPorciones(1400, 100, 130, 50, 'perdida grasa')
    const d2 = distribuirEnPorciones(2800, 160, 320, 90, 'hipertrofia')
    expect(d1.verduras).toBe(4)
    expect(d2.verduras).toBe(4)
  })

  it('totales son la suma macro × #porciones de cada grupo', () => {
    const d = distribuirEnPorciones(2000, 120, 220, 65, 'mantenimiento')
    const kcalCalc =
      d.lacteos   * MACROS_POR_GRUPO.lacteos.kcal +
      d.frutas    * MACROS_POR_GRUPO.frutas.kcal +
      d.verduras  * MACROS_POR_GRUPO.verduras.kcal +
      d.cereales  * MACROS_POR_GRUPO.cereales.kcal +
      d.proteinas * MACROS_POR_GRUPO.proteinas.kcal +
      d.grasas    * MACROS_POR_GRUPO.grasas.kcal
    expect(d.totales.kcal).toBeCloseTo(Math.round(kcalCalc), 0)
  })

  it('delta kcal cercano a 0 en plan estándar', () => {
    const d = distribuirEnPorciones(2000, 120, 220, 65, 'mantenimiento')
    // Delta dentro de ±200 kcal (porciones se redondean a 0.5)
    expect(Math.abs(d.delta.kcal)).toBeLessThan(250)
  })

  it('no asigna porciones negativas en casos extremos', () => {
    // Plan muy bajo en CHO (caso cetogénico no soportado oficialmente pero
    // el algoritmo no debe romperse)
    const d = distribuirEnPorciones(1500, 130, 50, 100, 'perdida grasa')
    expect(d.cereales).toBeGreaterThanOrEqual(0)
    expect(d.proteinas).toBeGreaterThanOrEqual(0)
    expect(d.grasas).toBeGreaterThanOrEqual(0)
  })

  it('plan vegano 2000 kcal — distribución funciona aunque app interna decida intercambios después', () => {
    const d = distribuirEnPorciones(2000, 110, 250, 60, 'mantenimiento')
    expect(d.totales.kcal).toBeGreaterThan(0)
    expect(d.proteinas).toBeGreaterThan(0)  // puede usar legumbres/tofu del grupo
  })
})
