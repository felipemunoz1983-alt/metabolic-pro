// ── Motor de Cálculo Nutricional · Centro Metabólico Pro ──

export type Objetivo = 'perdida grasa' | 'mantenimiento' | 'hipertrofia'
export type Sexo = 'masculino' | 'femenino'
export type TipoEjercicio = 'fuerza' | 'cardio' | 'mixto' | 'ninguno'
export type Crono = 'matutino' | 'vespertino' | 'neutro'

export interface FormData {
  nombre: string
  edad: number
  peso: number
  talla: number
  sexo: Sexo
  objetivo: Objetivo
  diasEjercicio: number
  duracionSesion: number
  tipoEjercicio: TipoEjercicio
  crono: Crono
  tendencia: string
  rechazos: string
  desayunos: string[]
  colacionManana: string[]
  almuerzos: string[]
  cenas: string[]
  once: string[]
  protGramos: number
  protGramosCena: number
  eggsQty: number
  eggsQtyOnce: number
  sandwichQty: number
  sandwichQtyOnce: number
  semanas: number
}

export interface Macros {
  p: number
  c: number
  g: number
  nota: string
}

export interface NutritionResult {
  bmr: number
  tdee: number
  kcal: number
  macros: Macros
  pal: number
}

// Harris-Benedict
export function bmrHB(peso: number, talla: number, edad: number, sexo: Sexo): number {
  return sexo === 'masculino'
    ? 66.5 + (13.75 * peso) + (5.003 * talla) - (6.75 * edad)
    : 655.1 + (9.563 * peso) + (1.85 * talla) - (4.676 * edad)
}

// Factor actividad PAL (FAO/WHO-OMS)
export function factorActividad(dias: number, duracion: number, tipo: TipoEjercicio): number {
  let pal: number
  if (dias === 0)     pal = 1.200
  else if (dias <= 2) pal = 1.375
  else if (dias <= 4) pal = 1.550
  else if (dias <= 6) pal = 1.725
  else                pal = 1.900

  if (tipo === 'cardio') pal += 0.075
  else if (tipo === 'mixto') pal += 0.050

  if (duracion > 90)      pal += 0.050
  else if (duracion > 60) pal += 0.025

  return Math.min(Math.round(pal * 1000) / 1000, 2.50)
}

// Ajuste por objetivo
export function kcalObjetivo(tdee: number, obj: Objetivo): number {
  if (obj === 'perdida grasa') return tdee * 0.80
  if (obj === 'hipertrofia')   return tdee * 1.10
  return tdee
}

// Distribución de macros
export function calcMacros(kcal: number, peso: number, obj: Objetivo): Macros {
  let p: number, g: number
  if (obj === 'hipertrofia')    { p = peso * 2;   g = peso * 0.9 }
  else if (obj === 'perdida grasa') { p = peso * 2.1; g = peso * 0.8 }
  else                          { p = peso * 1.9; g = peso * 0.85 }

  let c = (kcal - (p * 4 + g * 9)) / 4
  if (c < 80) {
    c = 80
    g = Math.max((kcal - (p * 4 + c * 4)) / 9, peso * 0.4)
  }

  const totalKcal = p * 4 + c * 4 + g * 9
  if (totalKcal > kcal * 1.05) {
    const excess = totalKcal - kcal
    p = Math.max(p - excess / 4, peso * 1.6)
  }

  return { p: Math.round(p), c: Math.round(c), g: Math.round(g), nota: '' }
}

// Cálculo completo
export function calcularNutricion(form: Pick<FormData,
  'peso' | 'talla' | 'edad' | 'sexo' | 'objetivo' | 'diasEjercicio' | 'duracionSesion' | 'tipoEjercicio'
>): NutritionResult {
  const bmr  = bmrHB(form.peso, form.talla, form.edad, form.sexo)
  const pal  = factorActividad(form.diasEjercicio, form.duracionSesion, form.tipoEjercicio)
  const tdee = bmr * pal
  const kcal = kcalObjetivo(tdee, form.objetivo)
  const macros = calcMacros(kcal, form.peso, form.objetivo)
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal: Math.round(kcal), macros, pal }
}

// Etiquetas
export const OBJETIVO_LABELS: Record<Objetivo, string> = {
  'perdida grasa': '🔥 Pérdida de grasa',
  'mantenimiento': '⚖️ Mantenimiento',
  'hipertrofia':   '💪 Hipertrofia',
}

export const SEXO_LABELS: Record<Sexo, string> = {
  masculino: '♂️ Masculino',
  femenino:  '♀️ Femenino',
}

export const EJERCICIO_LABELS: Record<TipoEjercicio, string> = {
  fuerza:  '🏋️ Fuerza',
  cardio:  '🏃 Cardio',
  mixto:   '⚡ Mixto',
  ninguno: '🛋️ Ninguno',
}
