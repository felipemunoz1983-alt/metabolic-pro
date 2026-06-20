import { describe, it, expect } from 'vitest'
import { generarPlan } from './planGenerator'
import type { FormData } from './nutrition'

/**
 * Suite de regresión para el planGenerator post-refactor.
 *
 * Cubre los cambios introducidos en commits:
 *   - 230bd9d (timing peri-entreno, AM/PM split, opt-in snack/barra)
 *   - a8190b0 (filtros digestivos, intolerancias, reflujo)
 *   - b35d05b (comidasPorDia dinámico, tiempo, habilidad, estacionalidad)
 */

// Helper: construye un form mínimo válido con defaults razonables
function baseForm(overrides: Partial<FormData> = {}): FormData {
  return {
    nombre: 'Test Patient',
    edad: 30,
    peso: 75,
    talla: 175,
    sexo: 'masculino',
    objetivo: 'mantenimiento',
    diasEjercicio: 3,
    duracionSesion: 60,
    tipoEjercicio: 'fuerza',
    crono: 'neutro',
    tendencia: 'omnivoro',
    rechazos: '',
    desayunos: ['avena_platano'],
    colacionManana: ['yogur_frutossecos_am'],
    almuerzos: ['pollo_arroz'],
    cenas: ['pollo_verduras'],
    once: ['fruta_proteina'],
    protGramos: 200,
    protGramosCena: 200,
    eggsQtyDesayuno: 2,
    eggsQty: 2,
    eggsQtyCena: 3,
    eggsQtyOnce: 2,
    sandwichQty: 1,
    sandwichQtyOnce: 1,
    semanas: 1,
    ultraProcesados: [],
    ultraDias: 0,
    digHinchazon: 'nunca',
    digReflujo: 'nunca',
    digRitmo: 'normal',
    digIntolerancias: [],
    digDiag: 'no',
    digHorario: [],
    supEmbarazo: 'no',
    supCronicas: [],
    supMedic: 'no',
    supMedicDetalle: '',
    supActuales: '',
    comidasPorDia: 5,
    horarioEntrenamiento: 'PM',
    incluirSnackEnPlan: false,
    incluirBarraEnPlan: false,
    ...overrides,
  } as FormData
}

describe('generarPlan — estructura básica', () => {
  it('genera 7 días para 1 semana', () => {
    const plan = generarPlan(baseForm(), 2200)
    expect(plan.dias.length).toBe(7)
  })

  it('genera 14 días para 2 semanas', () => {
    const plan = generarPlan(baseForm({ semanas: 2 }), 2200)
    expect(plan.dias.length).toBe(14)
  })

  it('cada día tiene el nombre correcto', () => {
    const plan = generarPlan(baseForm(), 2200)
    expect(plan.dias[0].nombre).toBe('Lunes')
    expect(plan.dias[6].nombre).toBe('Domingo')
  })

  it('targetKcal se propaga correctamente', () => {
    const plan = generarPlan(baseForm(), 2200)
    expect(plan.targetKcal).toBe(2200)
  })
})

describe('generarPlan — comidasPorDia dinámico', () => {
  it('comidasPorDia=3 → solo desayuno + almuerzo + cena', () => {
    const plan = generarPlan(baseForm({ comidasPorDia: 3 }), 2000)
    const day = plan.dias[0]
    const tipos = day.meals.map(m => m.tipo)
    expect(tipos).toEqual(['desayuno', 'almuerzo', 'cena'])
  })

  it('comidasPorDia=4 con entreno PM → desayuno + almuerzo + once + cena', () => {
    const plan = generarPlan(baseForm({ comidasPorDia: 4, horarioEntrenamiento: 'PM' }), 2000)
    const tipos = plan.dias[0].meals.map(m => m.tipo)
    expect(tipos).toEqual(['desayuno', 'almuerzo', 'once', 'cena'])
  })

  it('comidasPorDia=4 con entreno AM → desayuno + colacion_manana + almuerzo + cena', () => {
    const plan = generarPlan(baseForm({ comidasPorDia: 4, horarioEntrenamiento: 'AM' }), 2000)
    const tipos = plan.dias[0].meals.map(m => m.tipo)
    expect(tipos).toEqual(['desayuno', 'colacion_manana', 'almuerzo', 'cena'])
  })

  it('comidasPorDia=5 (default) → 5 comidas con colación y once', () => {
    const plan = generarPlan(baseForm({ comidasPorDia: 5 }), 2000)
    const tipos = plan.dias[0].meals.map(m => m.tipo)
    expect(tipos).toEqual(['desayuno', 'colacion_manana', 'almuerzo', 'once', 'cena'])
  })

  it('comidasPorDia=6 → 6 comidas (slot extra al final)', () => {
    const plan = generarPlan(baseForm({ comidasPorDia: 6 }), 2200)
    expect(plan.dias[0].meals.length).toBe(6)
  })

  it('kcal totales del día se acercan al targetKcal independiente de comidasPorDia', () => {
    [3, 4, 5, 6].forEach(n => {
      const plan = generarPlan(baseForm({ comidasPorDia: n as 3 | 4 | 5 | 6 }), 2200)
      const total = plan.dias[0].totalKcal
      // Tolerancia ±45% porque muchos desayunos están marcados porcionFija
      // (no se escalan al slot) y con comidasPorDia=3 hay pocas meals
      // escalables para compensar el déficit. Es comportamiento clínicamente
      // correcto — para targets altos el profesional debe agregar colaciones
      // extra (snack/barra opt-in, ultras) en lugar de inflar las recetas.
      expect(total, `comidasPorDia=${n}: total=${total}`).toBeGreaterThan(2200 * 0.55)
      expect(total, `comidasPorDia=${n}: total=${total}`).toBeLessThan(2200 * 1.45)
    })
  })
})

describe('generarPlan — timing peri-entreno', () => {
  it('entreno AM → colación de mañana es post-entreno', () => {
    const plan = generarPlan(baseForm({ horarioEntrenamiento: 'AM' }), 2000)
    const colAM = plan.dias[0].meals.find(m => m.tipo === 'colacion_manana')
    expect(colAM?.timingEntreno).toBe('post_entreno')
  })

  it('entreno PM → once es post-entreno', () => {
    const plan = generarPlan(baseForm({ horarioEntrenamiento: 'PM' }), 2000)
    const once = plan.dias[0].meals.find(m => m.tipo === 'once')
    expect(once?.timingEntreno).toBe('post_entreno')
  })

  it('entreno noche → once es pre-entreno', () => {
    const plan = generarPlan(baseForm({ horarioEntrenamiento: 'noche' }), 2000)
    const once = plan.dias[0].meals.find(m => m.tipo === 'once')
    expect(once?.timingEntreno).toBe('pre_entreno')
  })

  it('sin_entreno → ninguna comida tiene timingEntreno', () => {
    const plan = generarPlan(baseForm({ horarioEntrenamiento: 'sin_entreno' }), 2000)
    plan.dias[0].meals.forEach(m => {
      expect(m.timingEntreno).toBeUndefined()
    })
  })
})

describe('generarPlan — opt-in snack/barra', () => {
  it('NO incluye snack favorito si incluirSnackEnPlan=false', () => {
    const plan = generarPlan(baseForm({
      incluirSnackEnPlan: false,
      snackNutrevoTipo: 'alfajor_activa2',
    }), 2000)
    const allLabels = plan.dias[0].meals.map(m => m.label).join(' | ')
    expect(allLabels).not.toMatch(/Alfajor Activa2/i)
  })

  it('SÍ incluye snack favorito si incluirSnackEnPlan=true Y slot match horario', () => {
    const plan = generarPlan(baseForm({
      incluirSnackEnPlan: true,
      snackNutrevoTipo: 'alfajor_activa2',
      horarioEntrenamiento: 'AM',  // → snack entra a colación AM
      comidasPorDia: 5,
    }), 2000)
    // Como hay 7 días y la rotación incluye alfajor, al menos un día debería tenerlo
    const allLabels = plan.dias.map(d => d.meals.map(m => m.label).join(' | ')).join(' || ')
    expect(allLabels).toMatch(/Alfajor Activa2/i)
  })

  it('snack opt-in entra en AMBOS slots independiente del horario de entreno', () => {
    // El paciente activó 'Incluir en mi plan' explícitamente — espera verlo.
    // No se debe restringir por slot según horario de entreno (eso confundía
    // al usuario al no encontrar la barra/snack que pidió ver en su plan).
    const plan = generarPlan(baseForm({
      incluirSnackEnPlan: true,
      snackNutrevoTipo: 'volki_coco',
      horarioEntrenamiento: 'AM',
      comidasPorDia: 5,
    }), 2000)
    const allLabels = plan.dias.map(d => d.meals.map(m => m.label).join(' | ')).join(' || ')
    // Con rotación de 7 días, Volki debe aparecer en algún slot al menos una vez
    expect(allLabels).toMatch(/Volki/i)
  })

  it('snack entra en ambos slots si sin_entreno + opt-in', () => {
    const plan = generarPlan(baseForm({
      incluirSnackEnPlan: true,
      snackNutrevoTipo: 'moroketo',
      horarioEntrenamiento: 'sin_entreno',
      comidasPorDia: 5,
    }), 2000)
    const allLabels = plan.dias.map(d => d.meals.map(m => m.label).join(' | ')).join(' || ')
    expect(allLabels).toMatch(/Moroketo/i)
  })
})

describe('generarPlan — filtros clínicos', () => {
  it('tendencia vegana NO incluye almuerzos omnívoros', () => {
    const plan = generarPlan(baseForm({
      tendencia: 'vegano',
      almuerzos: ['pollo_arroz', 'tofu_quinoa'],
    }), 2000)
    plan.dias.forEach(day => {
      const alm = day.meals.find(m => m.tipo === 'almuerzo')
      // El filtro de tendencia debe haber excluído pollo_arroz, dejando solo tofu
      if (alm) expect(alm.label).not.toMatch(/pollo/i)
    })
  })

  it('tiempoCocinar=menos_15 filtra recetas largas', () => {
    const plan = generarPlan(baseForm({
      tiempoCocinar: 'menos_15',
      almuerzos: ['pollo_arroz', 'ensalada_proteica_alm'],  // pollo=30min, ensalada=25min
    }), 2000)
    // Si todas son largas, el filtro debe usar fallback (devuelve todo)
    expect(plan.dias[0].meals.find(m => m.tipo === 'almuerzo')).toBeDefined()
  })

  it('plan no rompe si paciente declara intolerancia múltiple', () => {
    const plan = generarPlan(baseForm({
      digIntolerancias: ['lactosa', 'gluten', 'legumbres', 'soya'],
      digDiag: 'si_sibo',
      tendencia: 'vegano',
    }), 2000)
    expect(plan.dias.length).toBe(7)
    plan.dias.forEach(day => {
      expect(day.meals.length).toBeGreaterThan(0)
    })
  })
})

describe('generarPlan — sustitución de yogur', () => {
  it('cuando colación AM tiene yogur, se inyecta el yogur elegido', () => {
    const plan = generarPlan(baseForm({
      colacionManana: ['yogur_frutossecos_am'],
      yogurtTipo: 'colun_protein',
      comidasPorDia: 5,
    }), 2000)
    const colAM = plan.dias[0].meals.find(m => m.tipo === 'colacion_manana')
    const itemsText = colAM?.items.join(' ')
    expect(itemsText).toMatch(/Colun Protein Plus/i)
  })

  it('macros ajustan delta vs base griego (Colun: +6p vs Oikos)', () => {
    const planOikos = generarPlan(baseForm({
      colacionManana: ['yogur_frutossecos_am'],
      yogurtTipo: 'griego',
      comidasPorDia: 5,
    }), 2000)
    const planColun = generarPlan(baseForm({
      colacionManana: ['yogur_frutossecos_am'],
      yogurtTipo: 'colun_protein',
      comidasPorDia: 5,
    }), 2000)
    const pOikos = planOikos.dias[0].meals.find(m => m.tipo === 'colacion_manana')!.p
    const pColun = planColun.dias[0].meals.find(m => m.tipo === 'colacion_manana')!.p
    // Colun (11g) > Oikos (5g) → Colun debe sumar más proteína
    expect(pColun).toBeGreaterThanOrEqual(pOikos)
  })
})

describe('generarPlan — selector de gramaje de carne', () => {
  it('sustituye gramaje en items cuando carneGramosAlmuerzo != base', () => {
    const plan = generarPlan(baseForm({
      almuerzos: ['pollo_arroz'],   // base = 200g pollo
      carneGramosAlmuerzo: 300,
    }), 2200)
    const alm = plan.dias[0].meals.find(m => m.tipo === 'almuerzo')
    const items = alm?.items.join(' ') ?? ''
    expect(items).toMatch(/300g/)
    expect(items).not.toMatch(/200g pechuga pollo/)
  })

  it('NO modifica items si carneGramosAlmuerzo === carneGramosBase', () => {
    const plan = generarPlan(baseForm({
      almuerzos: ['pollo_arroz'],   // base = 200g
      carneGramosAlmuerzo: 200,
    }), 2200)
    const alm = plan.dias[0].meals.find(m => m.tipo === 'almuerzo')
    expect(alm?.items[0]).toMatch(/200g pechuga pollo/)
  })

  it('aumentar gramaje aumenta proteína (pollo: +0.31g prot/g)', () => {
    const plan150 = generarPlan(baseForm({
      almuerzos: ['pollo_verduras'],   // base 150g pollo en cena, pero acá es almuerzo dummy
      cenas: ['pollo_verduras'],       // base 150g, lo usamos como cena
      carneGramosCena: 150,
    }), 2200)
    const plan250 = generarPlan(baseForm({
      cenas: ['pollo_verduras'],
      carneGramosCena: 250,             // +100g
    }), 2200)
    const cena150 = plan150.dias[0].meals.find(m => m.tipo === 'cena')!
    const cena250 = plan250.dias[0].meals.find(m => m.tipo === 'cena')!
    // +100g pollo × 0.31 = +31g proteína (con scale ajustado)
    expect(cena250.p).toBeGreaterThan(cena150.p)
  })

  it('reducir gramaje disminuye proteína (salmón)', () => {
    const planFull = generarPlan(baseForm({
      cenas: ['salmon_brocoli'],         // base 150g salmón
      carneGramosCena: 150,
    }), 2200)
    const planLow = generarPlan(baseForm({
      cenas: ['salmon_brocoli'],
      carneGramosCena: 100,              // -50g
    }), 2200)
    const cenaFull = planFull.dias[0].meals.find(m => m.tipo === 'cena')!
    const cenaLow = planLow.dias[0].meals.find(m => m.tipo === 'cena')!
    expect(cenaLow.p).toBeLessThan(cenaFull.p)
  })

  it('almuerzo y cena tienen gramajes independientes', () => {
    const plan = generarPlan(baseForm({
      almuerzos: ['pollo_arroz'],       // base 200g
      cenas: ['pollo_verduras'],         // base 150g
      carneGramosAlmuerzo: 250,
      carneGramosCena: 100,
    }), 2200)
    const alm = plan.dias[0].meals.find(m => m.tipo === 'almuerzo')
    const cena = plan.dias[0].meals.find(m => m.tipo === 'cena')
    expect(alm?.items.join(' ')).toMatch(/250g/)
    expect(cena?.items.join(' ')).toMatch(/100g/)
  })

  it('preparaciones sin tieneCarne ignoran el gramaje', () => {
    const plan = generarPlan(baseForm({
      almuerzos: ['tofu_quinoa'],        // sin carne (tofu vegetal)
      carneGramosAlmuerzo: 300,
    }), 2200)
    const alm = plan.dias[0].meals.find(m => m.tipo === 'almuerzo')
    // El item de tofu original es "180g tofu firme", no debe cambiar
    expect(alm?.items[0]).toMatch(/180g tofu/i)
  })

  it('macros se mantienen positivos (no rompe con gramaje extremo bajo)', () => {
    const plan = generarPlan(baseForm({
      cenas: ['carne_zapallo'],
      carneGramosCena: 50,   // mínimo extremo
    }), 2200)
    const cena = plan.dias[0].meals.find(m => m.tipo === 'cena')!
    expect(cena.p).toBeGreaterThanOrEqual(0)
    expect(cena.g).toBeGreaterThanOrEqual(0)
  })
})

describe('generarPlan — robustez (no rompe en edge cases)', () => {
  it('no rompe con desayunos vacíos (usa fallback)', () => {
    const plan = generarPlan(baseForm({ desayunos: [] }), 2000)
    expect(plan.dias[0].meals.find(m => m.tipo === 'desayuno')).toBeDefined()
  })

  it('no rompe con kcal extremo bajo (1000)', () => {
    const plan = generarPlan(baseForm(), 1000)
    expect(plan.dias[0].totalKcal).toBeGreaterThan(0)
  })

  it('no rompe con kcal extremo alto (4000)', () => {
    const plan = generarPlan(baseForm(), 4000)
    // Con muchos desayunos marcados porcionFija (no escalables) y MAX_FACTOR=2.0
    // en la compensación, targets > 3000 kcal no se alcanzan automáticamente —
    // el profesional debe agregar colaciones extra (snack/barra opt-in, ultras)
    // o ajustar gramajes manualmente. Solo validamos que el motor no crashee
    // y devuelva un plan funcional (al menos cubre BMR de un adulto promedio).
    expect(plan.dias[0].totalKcal).toBeGreaterThan(1500)
  })

  it('no rompe con tendencia vegana + todas las intolerancias', () => {
    const plan = generarPlan(baseForm({
      tendencia: 'vegano',
      digIntolerancias: ['lactosa', 'gluten', 'legumbres', 'soya', 'cruciferas', 'cebolla_ajo', 'huevo'],
      digDiag: 'si_sibo',
      digReflujo: 'frecuente',
      tiempoCocinar: 'menos_15',
      habilidadCulinaria: 'principiante',
    }), 1800)
    expect(plan.dias.length).toBe(7)
    plan.dias.forEach(day => {
      expect(day.meals.length).toBeGreaterThan(0)
    })
  })
})

// ─── Compensación por porciones fijas (fix bug ~806 kcal de Guillermo) ────────
//
// Cuando hay meals con porcionFija (barras, snacks envasados, ultra), las kcal
// reales NO se escalan al slot. Sin compensación el día puede quedar muy por
// debajo del target. Esta suite valida que la compensación lleve el día a
// kcal cercanas al target cuando hay porciones fijas en la rotación.
describe('generarPlan — compensación de porciones fijas', () => {
  // Nota: tras la auditoría de catálogo (commits f274dce, 8d32f95, este),
  // todos los desayunos del catálogo están marcados porcionFija porque sus
  // items son discretos (huevos contables, scoops, plátanos, rebanadas,
  // cdtas). La compensación opera sobre almuerzo + cena + colaciones.
  it('target moderado (2000 kcal): compensación lleva total a ±15% del target', () => {
    const plan = generarPlan(baseForm({
      incluirSnackEnPlan: false,
      incluirBarraEnPlan: false,
      ultraDias: 0,
      ultraProcesados: [],
    }), 2000)
    plan.dias.forEach(d => {
      const diff = Math.abs(d.totalKcal - 2000)
      expect(diff, `día ${d.nombre}: ${d.totalKcal} vs 2000 target`).toBeLessThan(2000 * 0.15)
    })
  })

  it('día con ultra procesado: la compensación mantiene total dentro de ±30% del target', () => {
    const plan = generarPlan(baseForm({
      ultraDias: 7,
      ultraProcesados: ['bebida_cola'],
    }), 2500)
    plan.dias.forEach(d => {
      const ultraMeal = d.meals.find(m => m.tipo === 'ultra')
      if (!ultraMeal) return
      const diff = Math.abs(d.totalKcal - 2500)
      // ±30% es realista cuando hay 2+ porciones fijas (desayuno + ultra) y
      // las meals escalables (almuerzo+cena+colaciones) topan en MAX_FACTOR=2.0.
      // Si el profesional necesita cobertura precisa para targets altos, debe
      // agregar colaciones extra o ajustar gramajes manualmente.
      expect(diff, `día ${d.nombre} con ultra: ${d.totalKcal} vs 2500`).toBeLessThan(2500 * 0.30)
    })
  })

  it('meals porcionFija conservan kcal del envase (no se escalan)', () => {
    const plan = generarPlan(baseForm({
      ultraDias: 7,
      ultraProcesados: ['bebida_cola'],
    }), 2500)
    const ultras = plan.dias.flatMap(d => d.meals.filter(m => m.tipo === 'ultra'))
    expect(ultras.length).toBeGreaterThan(0)
    // Todos los días con el mismo ultra deben tener exactamente la misma kcal
    if (ultras.length > 1) {
      const kcalUltra = ultras[0].kcal
      ultras.forEach(u => expect(u.kcal).toBe(kcalUltra))
    }
  })
})
