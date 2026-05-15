// ── Generador de plan semanal · Centro Metabólico Pro ──

import type { FormData } from './nutrition'
import type { MealOption, UltraOption } from './foods'
import {
  desayunosOpts,
  colacionesOpts,
  almuerzosOpts,
  cenasOpts,
  ultraProcOpts,
  getMealOption,
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
  porcion?: string           // solo ultra
  sellos?: string[]          // solo ultra
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

// ─── Filtrar pool por tendencia alimentaria ───────────────────────────────────
function filtrarPorTendencia<T extends { tendencia?: string[] }>(
  pool: Record<string, T>,
  tendencia: string
): Record<string, T> {
  if (tendencia !== 'vegetariano') return pool
  const filtered = Object.fromEntries(
    Object.entries(pool).filter(([, opt]) =>
      !opt.tendencia || opt.tendencia.includes('vegetariano')
    )
  )
  return Object.keys(filtered).length > 0 ? filtered : pool // fallback si no hay opciones
}

// ─── Función principal ────────────────────────────────────────────────────────
export function generarPlan(form: FormData, targetKcal: number): WeekPlan {
  const semanas = form.semanas ?? 1
  const totalDias = semanas * 7
  const ultraDias = form.ultraDias ?? 2
  const tendencia = form.tendencia ?? 'omnivoro'
  const almuerzosPool = filtrarPorTendencia(almuerzosOpts, tendencia)
  const cenasPool     = filtrarPorTendencia(cenasOpts,     tendencia)
  const dias: DayPlan[] = []

  for (let d = 0; d < totalDias; d++) {
    const semana = Math.floor(d / 7) + 1
    const diaSemana = d % 7          // 0–6
    const diaNombre = DIAS_ES[diaSemana]

    const meals: DayMeal[] = []

    // Desayuno
    const desayuno = getMealOption(desayunosOpts, form.desayunos, d)
    meals.push(buildMeal('desayuno', desayuno, targetKcal))

    // Colación mañana
    const colManana = getMealOption(colacionesOpts, form.colacionManana, d)
    meals.push(buildMeal('colacion_manana', colManana, targetKcal))

    // Almuerzo
    const almuerzo = getMealOption(almuerzosPool, form.almuerzos, d)
    meals.push(buildMeal('almuerzo', almuerzo, targetKcal))

    // Once
    const once = getMealOption(colacionesOpts, form.once, d + 1) // offset for variety
    meals.push(buildMeal('once', once, targetKcal))

    // Cena
    const cena = getMealOption(cenasPool, form.cenas, d)
    meals.push(buildMeal('cena', cena, targetKcal))

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

function buildMeal(tipo: DayMeal['tipo'], option: MealOption, targetKcal: number): DayMeal {
  const pct = PCT[tipo]
  const kcal = Math.round(targetKcal * pct)

  // Escalar macros proporcionalmente al kcal real vs base
  const scale = kcal / (option.baseKcal || kcal)
  const p = Math.round(option.p * scale)
  const c = Math.round(option.c * scale)
  const g = Math.round(option.g * scale)

  return {
    tipo,
    label: option.label,
    icon: MEAL_ICONS[tipo],
    items: option.items,
    kcal,
    p,
    c,
    g,
    foto: option.foto,
    tiempo: option.tiempo,
    pasos: option.pasos,
  }
}
