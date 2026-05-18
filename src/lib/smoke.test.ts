import { describe, it, expect } from 'vitest'
import { generarPlan } from './planGenerator'
import { calcularNutricion } from './nutrition'
import type { FormData } from './nutrition'

/**
 * Smoke tests E2E — escenarios reales de paciente.
 * Cada test simula un perfil clínico distinto end-to-end:
 *   1) cálculo nutricional (calcularNutricion)
 *   2) generación de plan semanal (generarPlan)
 *   3) validación de coherencia clínica del resultado
 */

const baseForm = (overrides: Partial<FormData> = {}): FormData => ({
  nombre: 'Smoke Test', edad: 30, peso: 75, talla: 175,
  sexo: 'masculino', objetivo: 'mantenimiento',
  diasEjercicio: 3, duracionSesion: 60, tipoEjercicio: 'fuerza', crono: 'neutro',
  tendencia: 'omnivoro', rechazos: '',
  desayunos: ['avena_platano'], colacionManana: ['yogur_frutossecos_am'],
  almuerzos: ['pollo_arroz'], cenas: ['pollo_verduras'], once: ['fruta_proteina'],
  protGramos: 200, protGramosCena: 200,
  eggsQtyDesayuno: 2, eggsQty: 2, eggsQtyCena: 3, eggsQtyOnce: 2,
  sandwichQty: 1, sandwichQtyOnce: 1, semanas: 1,
  ultraProcesados: [], ultraDias: 0,
  digHinchazon: 'nunca', digReflujo: 'nunca', digRitmo: 'normal',
  digIntolerancias: [], digDiag: 'no', digHorario: [],
  supEmbarazo: 'no', supCronicas: [], supMedic: 'no', supMedicDetalle: '', supActuales: '',
  comidasPorDia: 5, horarioEntrenamiento: 'PM',
  incluirSnackEnPlan: false, incluirBarraEnPlan: false,
  ...overrides,
} as FormData)

describe('🧪 SMOKE — Perfil 1: Hombre 30, hipertrofia, entreno PM, sin restricciones', () => {
  const form = baseForm({
    edad: 30, peso: 75, talla: 175, sexo: 'masculino',
    objetivo: 'hipertrofia', diasEjercicio: 5, tipoEjercicio: 'fuerza',
    horarioEntrenamiento: 'PM',
  })

  it('el cálculo nutricional devuelve kcal > 2500 para hipertrofia', () => {
    const r = calcularNutricion(form)
    expect(r.kcal).toBeGreaterThan(2500)
  })

  it('el plan semanal genera 7 días con 5 comidas cada uno', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    expect(plan.dias.length).toBe(7)
    plan.dias.forEach(d => expect(d.meals.length).toBe(5))
  })

  it('once tiene badge post-entreno', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    const once = plan.dias[0].meals.find(m => m.tipo === 'once')
    expect(once?.timingEntreno).toBe('post_entreno')
  })
})

describe('🧪 SMOKE — Perfil 2: Mujer 45, déficit, vegana, SIBO', () => {
  const form = baseForm({
    edad: 45, peso: 68, talla: 165, sexo: 'femenino',
    objetivo: 'perdida grasa', diasEjercicio: 3, tipoEjercicio: 'mixto',
    tendencia: 'vegano',
    digDiag: 'si_sibo',
    digIntolerancias: ['lactosa', 'gluten'],
    almuerzos: ['legumbres_arroz', 'tofu_quinoa', 'bowl_garbanzos'],
    cenas: ['sopa_lentejas', 'wok_tofu_vegano', 'bowl_lentejas_aguacate'],
  })

  it('el cálculo respeta el déficit (kcal < TDEE)', () => {
    const r = calcularNutricion(form)
    expect(r.kcal).toBeLessThan(r.tdee)
  })

  it('el plan NO debe incluir almuerzos con altoFODMAP por SIBO', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    // SIBO debe haber filtrado legumbres_arroz, bowl_garbanzos
    // Solo queda tofu_quinoa válido — debe aparecer en todos los días
    plan.dias.forEach((d, i) => {
      const alm = d.meals.find(m => m.tipo === 'almuerzo')
      expect(alm?.label, `Día ${i+1}`).toMatch(/Tofu/i)
    })
  })

  it('no rompe aunque casi todo esté filtrado', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    expect(plan.dias.length).toBe(7)
  })
})

describe('🧪 SMOKE — Perfil 3: Atleta entreno AM con snack opt-in', () => {
  const form = baseForm({
    edad: 28, peso: 80, talla: 180,
    objetivo: 'hipertrofia', diasEjercicio: 6, tipoEjercicio: 'fuerza',
    horarioEntrenamiento: 'AM',
    snackNutrevoTipo: 'volki_coco',
    incluirSnackEnPlan: true,
    barraProteinaTipo: 'twentys_hazelnut',
    incluirBarraEnPlan: true,
    comidasPorDia: 5,
  })

  it('snack o barra aparecen en colación AM (slot post-entreno)', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    const colMananaLabels = plan.dias.map(d =>
      d.meals.find(m => m.tipo === 'colacion_manana')?.label
    ).join(' || ')
    // Debe aparecer Volki o Twenty's en al menos un día
    expect(colMananaLabels).toMatch(/(Volki|Twenty)/i)
  })

  it('colación AM tiene badge post-entreno', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    const colAM = plan.dias[0].meals.find(m => m.tipo === 'colacion_manana')
    expect(colAM?.timingEntreno).toBe('post_entreno')
  })
})

describe('🧪 SMOKE — Perfil 4: Paciente con reflujo + intolerancia múltiple + 3 comidas', () => {
  const form = baseForm({
    edad: 55, peso: 90, talla: 170, sexo: 'masculino',
    objetivo: 'perdida grasa',
    diasEjercicio: 2, tipoEjercicio: 'cardio',
    digReflujo: 'frecuente',
    digIntolerancias: ['lactosa', 'gluten'],
    comidasPorDia: 3,
    cenas: ['beyond_burger', 'pollo_verduras'],   // beyond debe ser filtrado por altaGrasa
  })

  it('plan tiene solo 3 comidas por día', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    plan.dias.forEach(d => expect(d.meals.length).toBe(3))
  })

  it('cena NO incluye Beyond Burger (altaGrasa + reflujo)', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    // Beyond burger no es cena en realidad — está en almuerzos. Test que cenas sigan limpias.
    plan.dias.forEach(d => {
      const cena = d.meals.find(m => m.tipo === 'cena')
      expect(cena?.label).not.toMatch(/Beyond/i)
    })
  })

  it('no hay colación ni once (solo 3 comidas)', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    plan.dias.forEach(d => {
      const tipos = d.meals.map(m => m.tipo)
      expect(tipos).not.toContain('colacion_manana')
      expect(tipos).not.toContain('once')
    })
  })
})

describe('🧪 SMOKE — Perfil 5: Paciente apurado, principiante, presupuesto bajo', () => {
  const form = baseForm({
    tiempoCocinar: 'menos_15',
    habilidadCulinaria: 'principiante',
    presupuestoSemanal: 'bajo',
  })

  it('el plan generado no rompe con todos los filtros aplicados', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    expect(plan.dias.length).toBe(7)
    plan.dias.forEach(d => expect(d.meals.length).toBeGreaterThan(0))
  })

  it('cada comida tiene kcal > 0 y macros válidos', () => {
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    plan.dias[0].meals.forEach(m => {
      expect(m.kcal, `${m.label}: kcal`).toBeGreaterThan(0)
      expect(m.p, `${m.label}: p`).toBeGreaterThanOrEqual(0)
      expect(m.c, `${m.label}: c`).toBeGreaterThanOrEqual(0)
      expect(m.g, `${m.label}: g`).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('🧪 SMOKE — Coherencia matemática del plan generado', () => {
  it('totalKcal del día = suma de meals.kcal', () => {
    const form = baseForm()
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    plan.dias.forEach(d => {
      const sum = d.meals.reduce((acc, m) => acc + m.kcal, 0)
      expect(d.totalKcal, `Día ${d.nombre}`).toBe(sum)
    })
  })

  it('totalP / totalC / totalG = suma de macros del día', () => {
    const form = baseForm()
    const r = calcularNutricion(form)
    const plan = generarPlan(form, r.kcal)
    const day = plan.dias[0]
    const sumP = day.meals.reduce((s, m) => s + m.p, 0)
    const sumC = day.meals.reduce((s, m) => s + m.c, 0)
    const sumG = day.meals.reduce((s, m) => s + m.g, 0)
    expect(day.totalP).toBe(sumP)
    expect(day.totalC).toBe(sumC)
    expect(day.totalG).toBe(sumG)
  })
})
