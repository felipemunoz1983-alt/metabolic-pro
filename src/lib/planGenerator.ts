// ── Generador de plan semanal · Centro Metabólico Pro ──

import type { FormData } from './nutrition'
import type { MealOption, UltraOption, YogurTipo } from './foods'
import {
  desayunosOpts,
  colacionesOpts,
  almuerzosOpts,
  cenasOpts,
  ultraProcOpts,
  getMealOption,
  YOGUR_TIPOS,
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

    // Colación mañana
    const colManana = getMealOption(colacionesOpts, form.colacionManana, d)
    meals.push(buildMeal('colacion_manana', colManana, targetKcal, undefined, form.yogurtTipo))

    // Almuerzo
    const almuerzo = getMealOption(almuerzosPool, form.almuerzos, d)
    meals.push(buildMeal('almuerzo', almuerzo, targetKcal, form.eggsQty))

    // Once
    const once = getMealOption(colacionesOpts, form.once, d + 1) // offset for variety
    meals.push(buildMeal('once', once, targetKcal, form.eggsQtyOnce, form.yogurtTipo))

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
    label: option.label,
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
