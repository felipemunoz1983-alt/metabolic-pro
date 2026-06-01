// ── Generador de plan semanal · Centro Metabólico Pro ──

import type { FormData } from './nutrition'
import type { MealOption, UltraOption, YogurTipo, SnackNutrevoTipo, BarraProteinaTipo, PanTipo } from './foods'
import {
  desayunosOpts,
  colacionesOpts,
  almuerzosOpts,
  cenasOpts,
  ultraProcOpts,
  getMealOption,
  YOGUR_TIPOS,
  PAN_TIPOS,
  SNACK_NUTREVO_TIPOS,
  BARRA_PROTEINA_TIPOS,
  getCurrentSeason,
  parseTiempoMin,
  tiempoCocinarMax,
  CARNE_MACROS_POR_GRAMO,
  CARBO_MACROS_POR_GRAMO,
} from './foods'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface DayMeal {
  tipo: 'desayuno' | 'colacion_manana' | 'almuerzo' | 'once' | 'cena' | 'ultra'
  label: string
  icon: string
  items: string[]
  kcal: number
  p: number
  c: number
  g: number
  foto?: string
  tiempo?: string
  pasos?: string[]
  alergenosNota?: string     // nota completa de ingredientes/alérgenos (comidas regulares)
  porcion?: string           // solo ultra
  sellos?: string[]          // sellos chilenos (ultra y comidas regulares con advertencia)
  alergenos?: string[]       // solo ultra
  esUltra?: boolean
  /** Etiqueta de timing peri-entreno aplicada al meal según horario de entrenamiento del paciente */
  timingEntreno?: 'pre_entreno' | 'post_entreno'
}

export interface DayPlan {
  dia: number       // 1–7
  semana: number    // 1–N
  nombre: string    // "Lunes"
  meals: DayMeal[]
  totalKcal: number
  totalP: number
  totalC: number
  totalG: number
}

export interface WeekPlan {
  semanas: number
  targetKcal: number
  dias: DayPlan[]
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const DIAS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

// Nota: PCT (% fijo por slot) fue reemplazado por slotPct dinámico que se recalcula
// según `comidasPorDia` en cada llamada a generarPlan(). Ver buildMealSlots() y slotPct
// dentro de generarPlan() para la nueva lógica.

const MEAL_ICONS: Record<DayMeal['tipo'], string> = {
  desayuno:        '🌅',
  colacion_manana: '☕',
  almuerzo:        '🍽️',
  once:            '🫖',
  cena:            '🌙',
  ultra:           '🚨',
}

// ─── Filtrar pool por indicación profesional de whey ─────────────────────────
// Tres reglas combinadas:
//   1. wheyIndicado=false  -> SIEMPRE excluir opciones con requiereWhey.
//   2. wheyIndicado=true Y momentoIncluido=true  -> incluir TODAS las opciones.
//   3. wheyIndicado=true Y momentoIncluido=false -> excluir opciones con requiereWhey
//      (paciente tiene whey pero NO en este slot).
// Si tras filtrar quedan 0 opciones, devolvemos el pool original para no romper la rotacion.
function filtrarPorWhey<T extends { requiereWhey?: boolean }>(
  pool: Record<string, T>,
  wheyIndicado?: boolean,
  momentoIncluido: boolean = true,
): Record<string, T> {
  if (wheyIndicado && momentoIncluido) return pool
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) => !opt.requiereWhey)
  )
  return Object.keys(filtered).length > 0 ? filtered : pool
}

/** Default backward-compatible: si wheyIndicado=true pero wheyMomentos vacio,
 *  asumimos los 3 momentos legacy (desayuno + ambas colaciones). */
function wheyMomentosResolved(form: { wheyIndicado?: boolean; wheyMomentos?: import('./nutrition').WheyMomento[] }): Set<import('./nutrition').WheyMomento> {
  if (!form.wheyIndicado) return new Set()
  if (!form.wheyMomentos || form.wheyMomentos.length === 0) {
    return new Set(['desayuno', 'colacion_am', 'colacion_pm'])
  }
  return new Set(form.wheyMomentos)
}

// ─── Filtrar pool por tiempo disponible para cocinar ─────────────────────────
function filtrarPorTiempo(
  pool: Record<string, MealOption>,
  tiempoCocinar: string | undefined
): Record<string, MealOption> {
  const max = tiempoCocinarMax(tiempoCocinar)
  if (max === Infinity) return pool
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) => parseTiempoMin(opt) <= max)
  )
  // Fallback: si el filtro deja vacío, devuelvo todo (no romper el plan)
  return Object.keys(filtered).length > 0 ? filtered : pool
}

// ─── Filtrar pool por habilidad culinaria ────────────────────────────────────
function filtrarPorHabilidad(
  pool: Record<string, MealOption>,
  habilidad: string | undefined
): Record<string, MealOption> {
  if (habilidad !== 'principiante') return pool
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) => opt.dificultad !== 'avanzado')
  )
  return Object.keys(filtered).length > 0 ? filtered : pool
}

// ─── Ordenar pool con prioridad estacional ───────────────────────────────────
function priorizarPorEstacion(
  pool: Record<string, MealOption>,
): Record<string, MealOption> {
  const season = getCurrentSeason()
  const entries = Object.entries(pool)
  // Sort: items que matchean la estación van primero, off-season van al final
  entries.sort(([, a], [, b]) => {
    const aMatch = a.estacional === season ? -1 : a.estacional && a.estacional !== season ? 1 : 0
    const bMatch = b.estacional === season ? -1 : b.estacional && b.estacional !== season ? 1 : 0
    return aMatch - bMatch
  })
  return Object.fromEntries(entries)
}

/** Construye lista de slots de comida según comidasPorDia + horario de entrenamiento.
 *  - 3 comidas: solo desayuno + almuerzo + cena
 *  - 4 comidas: + 1 colación (AM si entrena AM, once si entrena PM/noche o no entrena)
 *  - 5 comidas: + colación mañana + once (default)
 *  - 6 comidas: + colación mañana + once + ultra (snack adicional vespertino) */
function buildMealSlots(
  comidasPorDia: number,
  horarioEntrenamiento: string | undefined,
): Array<'desayuno' | 'colacion_manana' | 'almuerzo' | 'once' | 'cena' | 'ultra_extra'> {
  const n = comidasPorDia || 5
  const slots: Array<'desayuno' | 'colacion_manana' | 'almuerzo' | 'once' | 'cena' | 'ultra_extra'> = []
  slots.push('desayuno')
  if (n >= 5) slots.push('colacion_manana')
  else if (n === 4 && horarioEntrenamiento === 'AM') slots.push('colacion_manana')
  slots.push('almuerzo')
  if (n >= 5) slots.push('once')
  else if (n === 4 && horarioEntrenamiento !== 'AM') slots.push('once')
  slots.push('cena')
  if (n === 6) slots.push('ultra_extra')   // 6ta comida (snack o ultra controlado)
  return slots
}

// ─── Filtrar pool por intolerancias / FODMAP / reflujo (defense-in-depth) ────
// La UI ya filtra estas opciones en MealChips, pero replicamos aquí para que
// el motor sea seguro independientemente del cliente (test, API directa, etc.)
function filtrarClinico(
  pool: Record<string, MealOption>,
  intolerancias: string[],
  bloquearSIBO: boolean,
  bloquearAltaGrasa: boolean,
): Record<string, MealOption> {
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) => {
      if (intolerancias.length > 0 && opt.contiene) {
        if (opt.contiene.some(c => intolerancias.includes(c))) return false
      }
      if (bloquearSIBO && opt.altoFODMAP) return false
      if (bloquearAltaGrasa && opt.altaGrasa) return false
      return true
    })
  )
  return Object.keys(filtered).length > 0 ? filtered : pool
}

// ─── Filtrar pool por tendencia alimentaria ───────────────────────────────────
function filtrarPorTendencia<T extends { tendencia?: string[] }>(
  pool: Record<string, T>,
  tendencia: string
): Record<string, T> {
  if (tendencia !== 'vegetariano' && tendencia !== 'vegano') return pool
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) => {
      if (!opt.tendencia) return true           // sin etiqueta = universal
      if (tendencia === 'vegano')
        return opt.tendencia.includes('vegano') // vegano solo acepta opciones marcadas 'vegano'
      return opt.tendencia.includes('vegetariano') // vegetariano acepta vegetariano o vegano
    })
  )
  return Object.keys(filtered).length > 0 ? filtered : pool
}

// ─── Función principal ────────────────────────────────────────────────────────
export function generarPlan(form: FormData, targetKcal: number): WeekPlan {
  const semanas = form.semanas ?? 1
  const totalDias = semanas * 7
  const ultraDias = form.ultraDias ?? 2
  const tendencia = form.tendencia ?? 'omnivoro'

  // Pipeline de filtrado: tendencia → whey → clínico → tiempo → habilidad → estacional
  const tiempo = form.tiempoCocinar
  const habilidad = form.habilidadCulinaria
  const intol = form.digIntolerancias ?? []
  const bloquearSIBO = form.digDiag === 'si_sibo' || form.digDiag === 'si_sii' || form.digHinchazon === 'diaria'
  const bloquearAltaGrasaCena = form.digReflujo === 'frecuente'
  // Resolver momentos donde el paciente incorpora whey. Si esta indicado pero no
  // selecciono momentos -> default ['desayuno', 'colacion_am', 'colacion_pm'].
  const wheyMomentos = wheyMomentosResolved(form)

  const desayunosPool = priorizarPorEstacion(
    filtrarPorHabilidad(
      filtrarPorTiempo(
        filtrarClinico(
          filtrarPorWhey(desayunosOpts, form.wheyIndicado, wheyMomentos.has('desayuno')),
          intol, bloquearSIBO, false
        ),
        tiempo
      ),
      habilidad
    )
  )
  const almuerzosPool = priorizarPorEstacion(
    filtrarPorHabilidad(
      filtrarPorTiempo(
        filtrarClinico(filtrarPorTendencia(almuerzosOpts, tendencia), intol, bloquearSIBO, false),
        tiempo
      ),
      habilidad
    )
  )
  const cenasPool = priorizarPorEstacion(
    filtrarPorHabilidad(
      filtrarPorTiempo(
        // Solo cenas filtran altaGrasa con reflujo frecuente (consistente con MealChips)
        filtrarClinico(filtrarPorTendencia(cenasOpts, tendencia), intol, bloquearSIBO, bloquearAltaGrasaCena),
        tiempo
      ),
      habilidad
    )
  )

  // Slots dinámicos según comidasPorDia (3/4/5/6)
  const slots = buildMealSlots(form.comidasPorDia ?? 5, form.horarioEntrenamiento)

  // Recalcular % kcal por comida para que sume ~100% según slots presentes
  // Pesos base: desayuno 25, colacion 10, almuerzo 35, once 15, cena 15, ultra_extra 5
  const baseWeights: Record<string, number> = {
    desayuno: 25, colacion_manana: 10, almuerzo: 35, once: 15, cena: 15, ultra_extra: 5,
  }
  const totalWeight = slots.reduce((sum, s) => sum + (baseWeights[s] ?? 0), 0)
  const slotPct: Record<string, number> = {}
  slots.forEach(s => { slotPct[s] = (baseWeights[s] ?? 0) / totalWeight })

  const dias: DayPlan[] = []

  for (let d = 0; d < totalDias; d++) {
    const semana = Math.floor(d / 7) + 1
    const diaSemana = d % 7          // 0–6
    const diaNombre = DIAS_ES[diaSemana]

    const meals: DayMeal[] = []

    // Recorrer los slots planificados según comidasPorDia
    for (const slot of slots) {
      // kcal proporcional al peso recalculado del slot
      const pct = slotPct[slot] ?? 0
      const slotKcal = Math.round(targetKcal * pct)

      if (slot === 'desayuno') {
        const desayuno = getMealOption(desayunosPool, form.desayunos, d)
        meals.push(buildMeal('desayuno', desayuno, slotKcal, form.eggsQtyDesayuno, form.yogurtTipo, undefined, undefined, form.panTipo))
      } else if (slot === 'colacion_manana') {
        const pool = buildColacionPool(form.colacionManana, form, 'AM')
        const opt = pool[d % pool.length]
        const m = buildMeal('colacion_manana', opt, slotKcal, undefined, form.yogurtTipo, undefined, undefined, form.panTipo)
        if (form.horarioEntrenamiento === 'AM') m.timingEntreno = 'post_entreno'
        meals.push(m)
      } else if (slot === 'almuerzo') {
        const almuerzo = getMealOption(almuerzosPool, form.almuerzos, d)
        meals.push(buildMeal('almuerzo', almuerzo, slotKcal, form.eggsQty, undefined, form.carneGramosAlmuerzo, form.carboGramosAlmuerzo, form.panTipo))
      } else if (slot === 'once') {
        const pool = buildColacionPool(form.once, form, 'PM')
        const opt = pool[(d + 1) % pool.length]
        const m = buildMeal('once', opt, slotKcal, form.eggsQtyOnce, form.yogurtTipo, undefined, undefined, form.panTipo)
        if (form.horarioEntrenamiento === 'PM') m.timingEntreno = 'post_entreno'
        else if (form.horarioEntrenamiento === 'noche') m.timingEntreno = 'pre_entreno'
        meals.push(m)
      } else if (slot === 'cena') {
        const cena = getMealOption(cenasPool, form.cenas, d)
        // Default clinico: carbo cena = 150g si el paciente no especifico (paridad con almuerzo).
        // Politica Centro Metabolico: NO reducir carbos en cena por objetivo — el carbo nocturno
        // favorece sintesis de glucogeno post-entreno, precursor de serotonina y calidad de sueno
        // sin impactar el deficit total del dia si la ingesta diaria esta calculada. Sin este
        // fallback explicito, el motor usaba carboGramosBase de cada plato (variable: 100/180/250)
        // generando inconsistencia con la UI que muestra "150g" como default.
        const carboCenaFinal = form.carboGramosCena ?? (cena.tieneCarboPrincipal ? 150 : undefined)
        meals.push(buildMeal('cena', cena, slotKcal, form.eggsQtyCena, undefined, form.carneGramosCena, carboCenaFinal, form.panTipo))
      } else if (slot === 'ultra_extra') {
        // 6ta comida: colación adicional vespertina con snack/barra si opt-in
        const extraPool = buildColacionPool(form.colacionManana, form, 'PM')
        const opt = extraPool[(d + 2) % extraPool.length]
        meals.push(buildMeal('once', opt, slotKcal, undefined, form.yogurtTipo, undefined, undefined, form.panTipo))
      }
    }

    // Ultra procesado planificado (solo en los N primeros días de cada semana — independiente de slots)
    const diaEnSemana = diaSemana + 1  // 1–7
    const ultraKeys = form.ultraProcesados ?? []
    if (ultraKeys.length > 0 && diaEnSemana <= ultraDias) {
      const uKey = ultraKeys[(d) % ultraKeys.length]
      const uOpt = ultraProcOpts[uKey]
      if (uOpt) meals.push(buildUltraMeal(uOpt))
    }

    const totalKcal = meals.reduce((s, m) => s + m.kcal, 0)
    const totalP    = meals.reduce((s, m) => s + m.p, 0)
    const totalC    = meals.reduce((s, m) => s + m.c, 0)
    const totalG    = meals.reduce((s, m) => s + m.g, 0)

    dias.push({
      dia: diaSemana + 1,
      semana,
      nombre: diaNombre,
      meals,
      totalKcal,
      totalP,
      totalC,
      totalG,
    })
  }

  return { semanas, targetKcal, dias }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildUltraMeal(opt: UltraOption): DayMeal {
  return {
    tipo: 'ultra',
    label: opt.label,
    icon: '🚨',
    items: [`${opt.porcion}`],
    kcal: opt.kcal,
    p: opt.p,
    c: opt.c,
    g: opt.g,
    foto: opt.foto,
    porcion: opt.porcion,
    sellos: opt.sellos,
    alergenos: opt.alergenos,
    esUltra: true,
  }
}

function buildMeal(
  tipo: DayMeal['tipo'],
  option: MealOption,
  finalKcal: number,
  eggsQty?: number,
  yogurTipo?: YogurTipo,
  carneGramos?: number,
  carboGramos?: number,
  panTipo?: PanTipo,
): DayMeal {
  // Productos en porción fija (barras, snacks envasados, postres individuales)
  // NO se escalan al kcal del slot — vienen en envase con macros definidos por etiqueta.
  // El kcal mostrado refleja el producto real, no la cuota teórica del slot.
  const isPorcionFija = option.porcionFija === true
  const kcal = isPorcionFija ? Math.round(option.baseKcal) : Math.round(finalKcal)

  // Escalar macros proporcionalmente al kcal real vs base — excepto si es porción fija
  const scale = isPorcionFija ? 1 : kcal / (option.baseKcal || kcal)
  let p = Math.round(option.p * scale)
  let c = Math.round(option.c * scale)
  let g = Math.round(option.g * scale)

  // Sustituir cantidad de huevos si el usuario eligió una cantidad distinta
  let items = [...option.items]
  if (eggsQty !== undefined && option.tieneHuevo) {
    const huevoSingular = eggsQty === 1 ? 'huevo' : 'huevos'
    items = items.map(item =>
      item.replace(/^\d+(-\d+)?\s+(huevo(s)?)/i, `${eggsQty} ${huevoSingular}`)
    )
  }

  // Sustituir gramaje de carne/pescado si el paciente eligió un gramaje distinto al base.
  // Ajusta macros usando CARNE_MACROS_POR_GRAMO[carneTipo] como delta vs el base de la receta.
  if (
    option.tieneCarne &&
    option.carneTipo &&
    option.carneGramosBase &&
    carneGramos !== undefined &&
    carneGramos !== option.carneGramosBase
  ) {
    const baseG = option.carneGramosBase
    const newG = carneGramos
    // Reemplazar "Ng <fuente proteica>" en items (primer match con el peso base)
    const reBase = new RegExp(`\\b${baseG}\\s*g\\b`)
    let replaced = false
    items = items.map(item => {
      if (!replaced && reBase.test(item)) {
        replaced = true
        return item.replace(reBase, `${newG}g`)
      }
      return item
    })
    // Ajuste de macros: delta = (newG - baseG) × macros por gramo de la carne
    const macros = CARNE_MACROS_POR_GRAMO[option.carneTipo]
    const deltaG_carne = newG - baseG
    // Aplicar scale para mantener proporcionalidad con la porción servida
    p = Math.max(0, Math.round(p + deltaG_carne * macros.p * scale))
    g = Math.max(0, Math.round(g + deltaG_carne * macros.g * scale))
    // kcal/c no se recalculan: el kcal del slot ya está fijo por el targetKcal;
    // si el paciente sube la carne sube proteína pero el kcal del plan no cambia
    // (es decisión clínica: el plan apunta al total, las porciones se ajustan)
  }

  // Sustituir gramaje del carbohidrato principal (arroz/papas/quinoa/fideos/pan)
  // si el paciente eligió un gramaje distinto al base. Ajusta C (y secundariamente p/g)
  // usando CARBO_MACROS_POR_GRAMO[carboTipo] como delta vs el base de la receta.
  if (
    option.tieneCarboPrincipal &&
    option.carboTipo &&
    option.carboGramosBase &&
    carboGramos !== undefined &&
    carboGramos !== option.carboGramosBase
  ) {
    const baseG = option.carboGramosBase
    const newG = carboGramos
    // Reemplazar "Ng <carbo>" en items (primer match con el peso base que aún no fue tocado)
    const reBase = new RegExp(`\\b${baseG}\\s*g\\b`)
    let replaced = false
    items = items.map(item => {
      if (!replaced && reBase.test(item)) {
        replaced = true
        return item.replace(reBase, `${newG}g`)
      }
      return item
    })
    const macros = CARBO_MACROS_POR_GRAMO[option.carboTipo]
    const deltaG_carbo = newG - baseG
    // El carbohidrato aporta principalmente C; p/g se ajustan suavemente
    c = Math.max(0, Math.round(c + deltaG_carbo * macros.c * scale))
    p = Math.max(0, Math.round(p + deltaG_carbo * macros.p * scale))
    g = Math.max(0, Math.round(g + deltaG_carbo * macros.g * scale))
    // kcal del slot ya está fijado por targetKcal — la decisión clínica es que el
    // gramaje sirve para acomodar requerimientos individuales sin alterar el total.
  }

  // Sustituir yogur si la opción tiene yogur (siempre — incluye griego).
  // El paciente eligió un yogur específico en el selector; el plan lo incorpora explícitamente.
  let alergenosNota = option.alergenosNota
  let foto = option.foto
  const label = option.label
  if (option.tieneYogur && yogurTipo) {
    const yogurInfo = YOGUR_TIPOS[yogurTipo]
    // Reemplazar el item genérico "150g yogur natural / sin azúcar / alto en proteínas" por la línea oficial del yogur elegido
    items = items.map(item =>
      item
        .replace(/\b\d+\s*g\s+yogur(?:\s+natural)?(?:\s+sin azúcar)?\b/i, yogurInfo.item)
        .replace(/\b\d+\s*g\s+yogur\s+alto en proteínas\b/i, yogurInfo.item)
    )
    // Reemplazar pasos: "el yogur" / "del yogur" → mantener genérico, no inyectar nombre largo en cada paso
    // Ajustar macros: delta del yogur elegido vs base Danone Oikos (5p/11c/4g por 110g — referencia clásico griego)
    const gBaseMacros = YOGUR_TIPOS['griego']
    const deltaP = yogurInfo.p - gBaseMacros.p
    const deltaC = yogurInfo.c - gBaseMacros.c
    const deltaG = yogurInfo.g - gBaseMacros.g
    p = Math.max(0, p + Math.round(deltaP * scale))
    c = Math.max(0, c + Math.round(deltaC * scale))
    g = Math.max(0, g + Math.round(deltaG * scale))
    // Sustituir foto por la foto oficial del yogur elegido (si existe)
    if ('foto' in yogurInfo && yogurInfo.foto) {
      foto = yogurInfo.foto as string
    }
    // Agregar nota de alérgenos del yogur elegido
    if (yogurInfo.alergenosNota) {
      alergenosNota = alergenosNota
        ? `${alergenosNota}\n${yogurInfo.alergenosNota}`
        : yogurInfo.alergenosNota
    }
  }

  // Sustituir tipo de pan si la opción usa pan y el paciente eligió uno distinto al default.
  // Detecta el numero de unidades en el item ("2 tostadas pan integral" → 2 rebanadas)
  // para escalar el delta de macros correctamente.
  if (option.tienePan && option.panTipoDefault && panTipo && panTipo !== option.panTipoDefault) {
    const oldPan = PAN_TIPOS[option.panTipoDefault]
    const newPan = PAN_TIPOS[panTipo]

    // Detectar cantidad de unidades de pan en items: busca patrones tipo "2 tostadas", "1 rebanada", "1 marraqueta", etc.
    // Default: 1 unidad si no se detecta.
    const panRegex = /\b(\d+)\s*(tostadas?|rebanadas?|marraquetas?|hallullas?|pitas?|panes?)\b/i
    let unidades = 1
    for (const item of items) {
      const m = item.match(panRegex)
      if (m) { unidades = parseInt(m[1], 10); break }
    }

    // Reemplazar el texto del pan en items:
    // 1) Buscar la primera línea que contenga "pan", "tostada", "marraqueta" o "hallulla"
    //    y reescribirla con el nuevo tipo respetando la cantidad detectada.
    const lineRegex = /\b(pan integral|pan blanco|pan multicereal|pan de molde integral|pan de molde|pan integral|pan pita integral|pan pita|pan de masa madre|pan sin gluten|pan proteico|marraqueta|hallulla|tostada de pan integral|tostadas de pan integral|tostadas pan integral|tostada pan integral)\b/i
    let replaced = false
    items = items.map(item => {
      if (replaced) return item
      if (lineRegex.test(item) || /\btostadas?\b/i.test(item)) {
        replaced = true
        // Construir nueva linea: "{unidades} {label-corta} ({gramos}g)"
        const unidadesLabel = unidades === 1
          ? newPan.item                                                  // "pan multicereal (40g)"
          : `${unidades} unidades de ${newPan.label.toLowerCase()} (${unidades * newPan.gramos}g)`
        return unidades === 1
          ? `1 ${unidadesLabel}`                                         // "1 pan multicereal (40g)"
          : unidadesLabel
      }
      return item
    })

    // Ajustar macros con delta. Cada unidad cambia por (newPan - oldPan).
    const deltaKcal = (newPan.kcal - oldPan.kcal) * unidades
    const deltaP    = (newPan.p    - oldPan.p)    * unidades
    const deltaC    = (newPan.c    - oldPan.c)    * unidades
    const deltaG    = (newPan.g    - oldPan.g)    * unidades

    // kcal del slot ya está fijo por targetKcal — el delta queda absorbido en macros.
    // Si el cambio es a un pan más calórico, sube p/c/g; si es más ligero, baja.
    p = Math.max(0, Math.round(p + deltaP * scale))
    c = Math.max(0, Math.round(c + deltaC * scale))
    g = Math.max(0, Math.round(g + deltaG * scale))
    // Nota: deltaKcal no se aplica al kcal mostrado porque el plan apunta al total
    // del slot — el paciente decide su pan dentro de ese presupuesto calórico.
    void deltaKcal

    // Agregar nota de alérgenos del pan elegido si tiene info nueva relevante.
    if (newPan.alergenosNota && !alergenosNota?.includes(newPan.label)) {
      alergenosNota = alergenosNota
        ? `${alergenosNota}\n${newPan.alergenosNota}`
        : newPan.alergenosNota
    }
  }

  return {
    tipo,
    label,
    icon: MEAL_ICONS[tipo],
    items,
    kcal,
    p,
    c,
    g,
    foto,
    tiempo: option.tiempo,
    pasos: option.pasos,
    sellos: option.sellos,
    alergenosNota,
  }
}

// ─── Inyección dinámica de snack/barra favoritos en pool de colaciones ────────
// Cuando el paciente elige un snack Nutrevo o una barra de proteína en los
// selectores dedicados de Alimentación, ese producto se inyecta automáticamente
// en la rotación de colaciones (mañana + once) como un MealOption virtual.

function snackToMealOption(snackTipo: SnackNutrevoTipo): MealOption {
  const s = SNACK_NUTREVO_TIPOS[snackTipo]
  return {
    label: `${s.emoji} ${s.label}`,
    items: [s.item, '200ml agua o infusión sin azúcar'],
    baseKcal: s.kcal,
    p: s.p,
    c: s.c,
    g: s.g,
    porcionFija: true, // snack envasado en porción única — macros reales, no escalar al slot
    foto: s.foto,
    tiempo: '0 min',
    alergenosNota: s.alergenosNota,
    pasos: [
      `${s.label} — tu snack saludable favorito de Nutrevo.`,
      'Consumir como colación portátil entre comidas.',
      'Acompaña con 200ml de agua o infusión sin azúcar para mayor saciedad.',
    ],
  }
}

function barraToMealOption(barraTipo: BarraProteinaTipo): MealOption {
  const b = BARRA_PROTEINA_TIPOS[barraTipo]
  return {
    label: `${b.emoji} ${b.label}`,
    items: [b.item, '200ml agua o infusión sin azúcar'],
    baseKcal: b.kcal,
    p: b.p,
    c: b.c,
    g: b.g,
    porcionFija: true, // barra envasada en porción única — macros reales, no escalar al slot
    foto: b.foto,
    tiempo: '0 min',
    alergenosNota: b.alergenosNota,
    pasos: [
      `${b.label} — tu barra de proteína favorita.`,
      'Consumir directa como colación portátil — ideal post-entreno o media mañana/tarde.',
      'Acompañar con 200ml de agua o infusión sin azúcar.',
    ],
  }
}

/**
 * Construye el pool rotativo de colaciones para un slot (AM o PM).
 *
 * Reglas clínicas:
 *  - Las colaciones naturales que el paciente eligió siempre entran.
 *  - El snack/barra favorito se inyecta SOLO si:
 *      (a) el paciente activó el toggle "Incluir en mi plan" (opt-in), Y
 *      (b) el slot coincide con el horario de entrenamiento (pre/post-entreno):
 *          - entreno AM   → snack/barra disponible en colación AM
 *          - entreno PM   → snack/barra disponible en once (PM)
 *          - entreno noche → snack/barra disponible en once (PM)
 *          - sin entreno  → snack/barra disponible en ambos slots si opt-in
 */
function buildColacionPool(
  userKeys: string[] | undefined,
  form: Partial<FormData>,
  slot: 'AM' | 'PM',
): MealOption[] {
  // Filtro de whey aplicado al slot correspondiente. Si el paciente NO indico
  // whey, o lo indico pero NO marco este slot ('colacion_am' / 'colacion_pm') ni
  // 'post_entreno' coincidente, las opciones requiereWhey se excluyen.
  const wheySet = wheyMomentosResolved(form)
  const incluirWheyAqui =
    (slot === 'AM' && (wheySet.has('colacion_am') || (form.horarioEntrenamiento === 'AM' && wheySet.has('post_entreno')))) ||
    (slot === 'PM' && (wheySet.has('colacion_pm') || ((form.horarioEntrenamiento === 'PM' || form.horarioEntrenamiento === 'noche') && wheySet.has('post_entreno'))))

  const naturalOpts = (userKeys ?? [])
    .map(k => colacionesOpts[k])
    .filter((o): o is MealOption => Boolean(o))
    .filter(opt => incluirWheyAqui ? true : !opt.requiereWhey)

  const extras: MealOption[] = []

  // Cuando el paciente activa 'Incluir snack/barra en mi plan', respetamos
  // el slot que eligió: 'am' (colación mañana), 'pm' (once), o 'ambas'.
  // Default: 'ambas' (compat con planes anteriores).
  //
  // El planGenerator rotará entre las naturales + estas extras según los días.
  const snackSlot = form.snackSlot ?? 'ambas'
  const barraSlot = form.barraSlot ?? 'ambas'

  const snackMatchesSlot =
    snackSlot === 'ambas' ||
    (slot === 'AM' && snackSlot === 'am') ||
    (slot === 'PM' && snackSlot === 'pm')

  const barraMatchesSlot =
    barraSlot === 'ambas' ||
    (slot === 'AM' && barraSlot === 'am') ||
    (slot === 'PM' && barraSlot === 'pm')

  if (form.incluirSnackEnPlan && form.snackNutrevoTipo && snackMatchesSlot) {
    extras.push(snackToMealOption(form.snackNutrevoTipo))
  }
  if (form.incluirBarraEnPlan && form.barraProteinaTipo && barraMatchesSlot) {
    extras.push(barraToMealOption(form.barraProteinaTipo))
  }

  const pool = [...naturalOpts, ...extras]
  return pool.length > 0 ? pool : [Object.values(colacionesOpts)[0]]
}
