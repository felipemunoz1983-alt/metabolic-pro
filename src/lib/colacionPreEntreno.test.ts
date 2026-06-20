import { describe, it, expect } from 'vitest'
import { sugerirColacionPreEntreno, DEFAULT_ANTICIPACION_MIN } from './colacionPreEntreno'

describe('sugerirColacionPreEntreno · cálculo de hora', () => {
  it('resta correctamente 60 minutos al horario de entreno', () => {
    const r = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 60 })
    expect(r?.horaColacion).toBe('07:00')
    expect(r?.horaEntreno).toBe('08:00')
  })

  it('resta correctamente 90 minutos', () => {
    const r = sugerirColacionPreEntreno('19:00', 'hipertrofia', { anticipacionMin: 90 })
    expect(r?.horaColacion).toBe('17:30')
  })

  it('maneja cruce de día (entreno 00:30 con anticipación 60 min → 23:30)', () => {
    const r = sugerirColacionPreEntreno('00:30', 'mantenimiento', { anticipacionMin: 60 })
    expect(r?.horaColacion).toBe('23:30')
  })

  it('default de anticipación = 60 minutos', () => {
    const r = sugerirColacionPreEntreno('10:00', 'mantenimiento')
    expect(r?.anticipacionMin).toBe(DEFAULT_ANTICIPACION_MIN)
    expect(r?.horaColacion).toBe('09:00')
  })

  it('retorna null con formato inválido', () => {
    expect(sugerirColacionPreEntreno('25:00', 'mantenimiento')).toBeNull()
    expect(sugerirColacionPreEntreno('8:60', 'mantenimiento')).toBeNull()
    expect(sugerirColacionPreEntreno('hola', 'mantenimiento')).toBeNull()
    expect(sugerirColacionPreEntreno('', 'mantenimiento')).toBeNull()
  })

  it('acepta formatos HH:MM y H:MM', () => {
    expect(sugerirColacionPreEntreno('07:30', 'mantenimiento')).not.toBeNull()
    expect(sugerirColacionPreEntreno('7:30', 'mantenimiento')).not.toBeNull()
  })
})

describe('sugerirColacionPreEntreno · categorización por anticipación', () => {
  it('< 30 min → inmediata', () => {
    const r = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 20 })
    expect(r?.categoria).toBe('inmediata')
  })

  it('30-59 min → corta', () => {
    const r = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 45 })
    expect(r?.categoria).toBe('corta')
  })

  it('60-90 min → optima', () => {
    const r = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 60 })
    expect(r?.categoria).toBe('optima')
    const r2 = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 90 })
    expect(r2?.categoria).toBe('optima')
  })

  it('> 90 min → larga', () => {
    const r = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 120 })
    expect(r?.categoria).toBe('larga')
  })
})

describe('sugerirColacionPreEntreno · opciones por escenario', () => {
  it('inmediata: opciones sin proteína sólida', () => {
    const r = sugerirColacionPreEntreno('08:00', 'mantenimiento', { anticipacionMin: 15 })
    expect(r?.opciones.length).toBeGreaterThan(0)
    // Todas las opciones inmediatas deben tener proteína baja (≤2g) excepto la de whey
    const sinWhey = r!.opciones.filter(o => !o.label.toLowerCase().includes('whey'))
    sinWhey.forEach(o => expect(o.p, `${o.label} proteína`).toBeLessThanOrEqual(2))
  })

  it('óptima + hipertrofia: incluye opción robusta con CHO+proteína sólida', () => {
    const r = sugerirColacionPreEntreno('19:00', 'hipertrofia', { anticipacionMin: 75 })
    const sandwich = r!.opciones.find(o => o.label.toLowerCase().includes('sándwich'))
    expect(sandwich).toBeDefined()
    expect(sandwich!.p).toBeGreaterThanOrEqual(15)
  })

  it('corta + pérdida grasa: incluye opción baja en kcal', () => {
    const r = sugerirColacionPreEntreno('07:00', 'perdida grasa', { anticipacionMin: 45 })
    const baja = r!.opciones.find(o => o.kcal < 100)
    expect(baja).toBeDefined()
  })

  it('larga + hipertrofia: prepend con comida tipo almuerzo chica', () => {
    const r = sugerirColacionPreEntreno('20:00', 'hipertrofia', { anticipacionMin: 120 })
    // La primera opción debe ser la robusta (arroz + pollo)
    expect(r!.opciones[0].kcal).toBeGreaterThan(300)
    expect(r!.opciones[0].p).toBeGreaterThan(20)
  })

  it('todas las categorías entregan al menos 3 opciones', () => {
    ;['inmediata', 'corta', 'optima', 'larga'].forEach((_, i) => {
      const anticipacion = [15, 45, 75, 120][i]
      const r = sugerirColacionPreEntreno('10:00', 'mantenimiento', { anticipacionMin: anticipacion })
      expect(r!.opciones.length, `categoria con ${anticipacion} min`).toBeGreaterThanOrEqual(3)
    })
  })
})

describe('sugerirColacionPreEntreno · racional clínico', () => {
  it('incluye nota de CHO extra si duración entreno > 75 min', () => {
    const r = sugerirColacionPreEntreno('07:00', 'mantenimiento', {
      anticipacionMin: 60,
      duracionEntrenoMin: 90,
    })
    expect(r?.racional).toMatch(/30g de CHO líquido/i)
  })

  it('NO incluye nota de CHO extra si duración ≤ 75 min', () => {
    const r = sugerirColacionPreEntreno('07:00', 'mantenimiento', {
      anticipacionMin: 60,
      duracionEntrenoMin: 60,
    })
    expect(r?.racional).not.toMatch(/30g de CHO líquido/i)
  })

  it('hipertrofia incluye mención a síntesis proteica', () => {
    const r = sugerirColacionPreEntreno('19:00', 'hipertrofia')
    expect(r?.racional).toMatch(/síntesis proteica/i)
  })

  it('pérdida grasa incluye nota sobre déficit en el día (no en pre-entreno)', () => {
    const r = sugerirColacionPreEntreno('19:00', 'perdida grasa')
    expect(r?.racional).toMatch(/déficit/i)
  })
})
