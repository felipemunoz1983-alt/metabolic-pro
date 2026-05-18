// ── Generador de plan semanal · Centro Metabólico Pro ──

import type { FormData } from './nutrition'
import type { MealOption, UltraOption, YogurTipo, SnackNutrevoTipo, BarraProteinaTipo } from './foods'
import {
  desayunosOpts,
  colacionesOpts,
  almuerzosOpts,
  cenasOpts,
  ultraProcOpts,
  getMealOption,
  YOGUR_TIPOS,
  SNACK_NUTREVO_TIPOS,
  BARRA_PROTEINA_TIPOS,
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

/** % de las kcal diarias por comida (ultra = 0 porque su kcal ya viene fija) */
const PCT: Record<DayMeal['tipo'], number> = {
  desayuno:        0.25,
  colacion_manana: 0.10,
  almuerzo:        0.35,
  once:            0.15,
  cena:            0.15,
  ultra:           0,
}

const MEAL_ICONS: Record<DayMeal['tipo'], string> = {
  desayuno:        '🌅',
  colacion_manana: '☕',
  almuerzo:        '🍽️',
  once:            '🫖',
  cena:            '🌙',
  ultra:           '🚨',
}

// ─── Filtrar pool por indicación profesional de whey ─────────────────────────
function filtrarPorWhey<T extends { requiereWhey?: boolean }>(
  pool: Record<string, T>,
  wheyIndicado?: boolean
): Record<string, T> {
  if (wheyIndicado) return pool
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) => !opt.requiereWhey)
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
  const desayunosPool = filtrarPorWhey(desayunosOpts, form.wheyIndicado)
  const almuerzosPool = filtrarPorTendencia(almuerzosOpts, tendencia)
  const cenasPool     = filtrarPorTendencia(cenasOpts,     tendencia)
  const dias: DayPlan[] = []

  for (let d = 0; d < totalDias; d++) {
    const semana = Math.floor(d / 7) + 1
    const diaSemana = d % 7          // 0–6
    const diaNombre = DIAS_ES[diaSemana]

    const meals: DayMeal[] = []

    // Desayuno
    const desayuno = getMealOption(desayunosPool, form.desayunos, d)
    meals.push(buildMeal('desayuno', desayuno, targetKcal, form.eggsQtyDesayuno, form.yogurtTipo))

    // Colación mañana — slot AM; snack/barra se inyectan solo si el paciente entrena AM
    const colMananaPool = buildColacionPool(form.colacionManana, form, 'AM')
    const colManana = colMananaPool[d % colMananaPool.length]
    const colMananaMeal = buildMeal('colacion_manana', colManana, targetKcal, undefined, form.yogurtTipo)
    // Marcar timing peri-entreno: si entrena AM, esta colación es post-entreno
    if (form.horarioEntrenamiento === 'AM') colMananaMeal.timingEntreno = 'post_entreno'
    meals.push(colMananaMeal)

    // Almuerzo
    const almuerzo = getMealOption(almuerzosPool, form.almuerzos, d)
    meals.push(buildMeal('almuerzo', almuerzo, targetKcal, form.eggsQty))

    // Once — slot PM; snack/barra se inyectan solo si el paciente entrena PM o noche
    const oncePool = buildColacionPool(form.once, form, 'PM')
    const once = oncePool[(d + 1) % oncePool.length] // offset para variedad vs. colación mañana
    const onceMeal = buildMeal('once', once, targetKcal, form.eggsQtyOnce, form.yogurtTipo)
    // Marcar timing peri-entreno: si entrena PM, once es post-entreno; si entrena noche, once es pre-entreno
    if (form.horarioEntrenamiento === 'PM') onceMeal.timingEntreno = 'post_entreno'
    else if (form.horarioEntrenamiento === 'noche') onceMeal.timingEntreno = 'pre_entreno'
    meals.push(onceMeal)

    // Cena
    const cena = getMealOption(cenasPool, form.cenas, d)
    meals.push(buildMeal('cena', cena, targetKcal, form.eggsQtyCena))

    // Ultra procesado (solo en los N primeros días de cada semana)
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
  targetKcal: number,
  eggsQty?: number,
  yogurTipo?: YogurTipo,
): DayMeal {
  const pct = PCT[tipo]
  const kcal = Math.round(targetKcal * pct)

  // Escalar macros proporcionalmente al kcal real vs base
  const scale = kcal / (option.baseKcal || kcal)
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

  // Sustituir yogur si la opción tiene yogur (siempre — incluye griego).
  // El paciente eligió un yogur específico en el selector; el plan lo incorpora explícitamente.
  let alergenosNota = option.alergenosNota
  let foto = option.foto
  let label = option.label
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
  const naturalOpts = (userKeys ?? [])
    .map(k => colacionesOpts[k])
    .filter((o): o is MealOption => Boolean(o))

  const extras: MealOption[] = []
  const horario = form.horarioEntrenamiento ?? 'PM'
  const slotMatchesHorario =
    horario === 'sin_entreno' ||
    (slot === 'AM' && horario === 'AM') ||
    (slot === 'PM' && (horario === 'PM' || horario === 'noche'))

  if (slotMatchesHorario) {
    if (form.incluirSnackEnPlan && form.snackNutrevoTipo) {
      extras.push(snackToMealOption(form.snackNutrevoTipo))
    }
    if (form.incluirBarraEnPlan && form.barraProteinaTipo) {
      extras.push(barraToMealOption(form.barraProteinaTipo))
    }
  }

  const pool = [...naturalOpts, ...extras]
  return pool.length > 0 ? pool : [Object.values(colacionesOpts)[0]]
}
