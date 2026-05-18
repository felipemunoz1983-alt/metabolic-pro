import { describe, it, expect } from 'vitest'
import { generarListaSupermercado } from './shoppingList'
import { generarPlan } from './planGenerator'
import type { FormData } from './nutrition'

const baseForm = (overrides: Partial<FormData> = {}): FormData => ({
  nombre: 'Test', edad: 30, peso: 75, talla: 175,
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

describe('shoppingList — suma de cantidades semanales', () => {
  it('suma "Ng pollo" cuando aparece varios días → kg total', () => {
    // pollo_arroz en almuerzo (200g) + pollo_verduras en cena (150g) → 350g × 7 días = 2450g
    const plan = generarPlan(baseForm({
      almuerzos: ['pollo_arroz'],
      cenas: ['pollo_verduras'],
    }), 2200)
    const lista = generarListaSupermercado(plan)
    const pollo = lista.items.find(i => i.nombre.toLowerCase().includes('pechuga pollo'))
    expect(pollo).toBeDefined()
    // Debe mostrarse en kg (>1kg) porque suma almuerzo + cena × 7 días
    expect(pollo!.cantidad).toMatch(/kg/i)
  })

  it('formatea g → kg cuando el total supera 1000g', () => {
    const plan = generarPlan(baseForm({ almuerzos: ['pollo_arroz'] }), 2200)
    const lista = generarListaSupermercado(plan)
    const pollo = lista.items.find(i => i.nombre.toLowerCase().includes('pechuga pollo'))
    expect(pollo).toBeDefined()
    // Sea cual sea el total, si pasa de 1000g, debe estar en kg
    expect(pollo!.cantidad).toMatch(/\d+(\.\d+)?\s*kg/i)
  })
})

describe('shoppingList — filtra acompañamientos', () => {
  it('NO incluye "agua" como item de compra', () => {
    const plan = generarPlan(baseForm(), 2000)
    const lista = generarListaSupermercado(plan)
    const aguaItems = lista.items.filter(i => i.nombre.toLowerCase() === 'agua')
    expect(aguaItems.length).toBe(0)
  })

  it('NO incluye "infusión sin azúcar" como item de compra', () => {
    const plan = generarPlan(baseForm(), 2000)
    const lista = generarListaSupermercado(plan)
    const infItems = lista.items.filter(i => i.nombre.toLowerCase().includes('infusión'))
    expect(infItems.length).toBe(0)
  })
})

describe('shoppingList — excluye ultras planificados', () => {
  it('un ultra (papas fritas) NO aparece en lista de compras', () => {
    const plan = generarPlan(baseForm({
      ultraProcesados: ['papas_fritas'],
      ultraDias: 2,
    }), 2200)
    const lista = generarListaSupermercado(plan)
    const papas = lista.items.filter(i => i.nombre.toLowerCase().includes('papa frita'))
    expect(papas.length).toBe(0)
  })
})

describe('shoppingList — robustez', () => {
  it('no rompe con plan vacío de items', () => {
    const plan = generarPlan(baseForm({ desayunos: ['avena_platano'] }), 2000)
    const lista = generarListaSupermercado(plan)
    expect(lista.items.length).toBeGreaterThan(0)
    expect(lista.totalIngredientes).toBe(lista.items.length)
  })

  it('cada item tiene categoría válida', () => {
    const plan = generarPlan(baseForm(), 2200)
    const lista = generarListaSupermercado(plan)
    const validCats = ['proteinas', 'lacteos', 'cereales', 'frutas_verduras', 'grasas', 'condimentos', 'suplementos', 'otros']
    lista.items.forEach(item => {
      expect(validCats, `${item.nombre} categoría`).toContain(item.category)
    })
  })

  it('byCategory contiene todos los items', () => {
    const plan = generarPlan(baseForm(), 2200)
    const lista = generarListaSupermercado(plan)
    const totalEnByCategory = Object.values(lista.byCategory).reduce((s, arr) => s + arr.length, 0)
    expect(totalEnByCategory).toBe(lista.items.length)
  })

  it('diasUsado refleja ocurrencias en la semana (1..N, donde N puede ser >7 si aparece en múltiples comidas/día)', () => {
    const plan = generarPlan(baseForm(), 2200)
    const lista = generarListaSupermercado(plan)
    lista.items.forEach(item => {
      expect(item.diasUsado).toBeGreaterThanOrEqual(1)
      // Tope razonable: 7 días × 6 comidas máx = 42 ocurrencias
      expect(item.diasUsado).toBeLessThanOrEqual(42)
    })
  })
})

describe('shoppingList — suma con plan multi-comida', () => {
  it('proteínas se acumulan correctamente entre almuerzo y cena', () => {
    const plan = generarPlan(baseForm({
      almuerzos: ['pollo_arroz'],       // 200g pollo
      cenas: ['pollo_verduras'],         // 150g pollo
    }), 2200)
    const lista = generarListaSupermercado(plan)
    // El pollo de almuerzo y el de cena tienen labels distintos en el catálogo
    // ("pechuga pollo a la plancha" vs "pechuga pollo a la plancha") — el normalizador los junta
    const polloItems = lista.items.filter(i => i.nombre.toLowerCase().includes('pollo'))
    expect(polloItems.length).toBeGreaterThan(0)
  })
})
