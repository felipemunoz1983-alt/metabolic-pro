// ── Motor de Cálculo Nutricional · Centro Metabólico Pro ──
// Fórmula activa: Mifflin-St Jeor (1990) — estándar actual (Frankenfield et al. 2005)
// Harris-Benedict conservado solo como referencia comparativa (@deprecated)

import type { YogurTipo, SnackNutrevoTipo, BarraProteinaTipo } from './foods'

export type Objetivo = 'perdida grasa' | 'mantenimiento' | 'hipertrofia'
export type Sexo = 'masculino' | 'femenino'
export type TipoEjercicio = 'fuerza' | 'cardio' | 'mixto' | 'ninguno'
export type Crono = 'matutino' | 'vespertino' | 'neutro'
export type FormulaUsada = 'mifflin_st_jeor' | 'cunningham' | 'harris_benedict_legacy'

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
  eggsQtyDesayuno: number   // huevos en desayuno
  eggsQty: number           // huevos en almuerzo
  eggsQtyCena: number       // huevos en cena
  eggsQtyOnce: number       // huevos en once/colación
  /** Gramaje de carne/pescado en preparaciones de almuerzo (default: el de la receta) */
  carneGramosAlmuerzo?: number
  /** Gramaje de carne/pescado en preparaciones de cena (default: el de la receta) */
  carneGramosCena?: number
  sandwichQty: number
  sandwichQtyOnce: number
  semanas: number
  ultraProcesados: string[]
  ultraDias: number
  // ── Salud digestiva ──
  digHinchazon: 'nunca' | 'ocasional' | 'frecuente' | 'diaria'
  digReflujo: 'nunca' | 'ocasional' | 'frecuente'
  digRitmo: 'normal' | 'constipacion' | 'diarrea' | 'alternado'
  digIntolerancias: string[]
  digDiag: 'no' | 'si_sibo' | 'si_sii' | 'sospecha'
  digHorario: string[]
  // ── Suplementación segura ──
  supEmbarazo: 'no' | 'embarazo' | 'lactancia' | 'planificando'
  supCronicas: string[]
  supMedic: 'no' | 'si'
  supMedicDetalle: string
  supActuales: string
  // ── Composición corporal (BIA/ISAK) — activa Cunningham en deportistas ──
  /** % grasa medido profesionalmente (BIA o ISAK). Opcional. Activa Cunningham si cumple criterios. */
  porcentajeGrasa?: number
  /** Masa muscular esquelética en kg (InBody / ISAK). Opcional. Alimenta el algoritmo de noticias y alertas clínicas. */
  masaMuscularKg?: number
  /** Grasa corporal en kg (InBody / ISAK). Opcional. Si se omite, se estima desde porcentajeGrasa × peso. */
  grasaCorporalKg?: number
  // ── Suplementación indicada ──
  /** true = el profesional indicó proteína en polvo (whey u otra). Habilita opciones con scoop en el plan. */
  wheyIndicado?: boolean
  /** Tipo de yogur seleccionado por el paciente. Se extiende automáticamente con YOGUR_TIPOS en foods.ts. */
  yogurtTipo?: YogurTipo
  /** Snack saludable favorito de Nutrevo. Se extiende automáticamente con SNACK_NUTREVO_TIPOS en foods.ts. */
  snackNutrevoTipo?: SnackNutrevoTipo
  /** Barra de proteína favorita. Se extiende automáticamente con BARRA_PROTEINA_TIPOS en foods.ts. */
  barraProteinaTipo?: BarraProteinaTipo
  /** ¿Incluir el snack favorito en la rotación del plan? Default: false (opt-in clínico) */
  incluirSnackEnPlan?: boolean
  /** ¿Incluir la barra favorita en la rotación del plan? Default: false (opt-in clínico) */
  incluirBarraEnPlan?: boolean
  /** Horario habitual de entrenamiento — define timing peri-entreno de snack/barra */
  horarioEntrenamiento?: 'AM' | 'PM' | 'noche' | 'sin_entreno'
  // ── Contexto operativo del paciente (skill nutriapp-pro: variables obligatorias) ──
  /** Cantidad de comidas reales por día — usado para distribución de macros y rotación */
  comidasPorDia?: 3 | 4 | 5 | 6
  /** Presupuesto semanal aproximado (CLP) — filtra productos premium si es bajo */
  presupuestoSemanal?: 'bajo' | 'medio' | 'alto'
  /** Tiempo disponible para cocinar en cada comida principal */
  tiempoCocinar?: 'menos_15' | '15_30' | '30_60' | 'mas_60'
  /** Habilidad culinaria autoreportada */
  habilidadCulinaria?: 'principiante' | 'intermedio' | 'avanzado'
  /** Lugar habitual de almuerzo — afecta tipo de preparaciones */
  lugarAlmuerzo?: 'casa' | 'oficina' | 'restaurant' | 'colegio'
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
  /** Fórmula utilizada para BMR. Opcional para compatibilidad con planes guardados anteriores. */
  formulaUsada?: FormulaUsada
}

// ─── Mifflin-St Jeor 1990 (fórmula activa) ───────────────────────────────────
// Estándar actual: Frankenfield DC et al. J Am Diet Assoc. 2005;105(5):775-89.
// Error típico: ±10% (mejor que Harris-Benedict ±15% en no-obesos)
export function bmrMifflinStJeor(peso: number, talla: number, edad: number, sexo: Sexo): number {
  return sexo === 'masculino'
    ? (10 * peso) + (6.25 * talla) - (5 * edad) + 5
    : (10 * peso) + (6.25 * talla) - (5 * edad) - 161
}

// ─── Cunningham 1991 (fase futura — requiere % grasa medido por BIA/ISAK) ────
// Selección automática cuando: deportista de alto rendimiento + % grasa medido
// Fórmula: BMR = 500 + (22 × MLG)   donde MLG = peso × (1 - %grasa/100)
export function bmrCunningham(pesoKg: number, porcentajeGrasa: number): number {
  const mlg = pesoKg * (1 - porcentajeGrasa / 100)
  return 500 + (22 * mlg)
}

// ─── Harris-Benedict 1919 (@deprecated — solo referencia comparativa) ─────────
// NO usar en cálculo activo. Sobreestima ~5-15% (Frankenfield et al. 2005).
// Conservado para comparar con planes históricos y para auditoría clínica.
/** @deprecated Usar bmrMifflinStJeor(). Conservado solo para referencia histórica. */
export function bmrHarrisBenedictLegacy(peso: number, talla: number, edad: number, sexo: Sexo): number {
  return sexo === 'masculino'
    ? 66.5 + (13.75 * peso) + (5.003 * talla) - (6.75 * edad)
    : 655.1 + (9.563 * peso) + (1.85 * talla) - (4.676 * edad)
}

/** @deprecated Alias para compatibilidad — llama a bmrHarrisBenedictLegacy */
export const bmrHB = bmrHarrisBenedictLegacy

// ─── Comparativa HB vs Mifflin (útil para CSV de migración) ──────────────────
export function compararFormulas(
  peso: number, talla: number, edad: number, sexo: Sexo
): { bmrHB: number; bmrMSJ: number; deltaKcal: number; deltaPct: number } {
  const hb  = bmrHarrisBenedictLegacy(peso, talla, edad, sexo)
  const msj = bmrMifflinStJeor(peso, talla, edad, sexo)
  const delta = msj - hb
  return {
    bmrHB:     Math.round(hb),
    bmrMSJ:    Math.round(msj),
    deltaKcal: Math.round(delta),
    deltaPct:  Math.round((delta / hb) * 100 * 10) / 10,
  }
}

// ─── Etiqueta legible de la fórmula ──────────────────────────────────────────
export function formulaLabel(formula?: FormulaUsada): string {
  if (formula === 'cunningham')             return 'Cunningham'
  if (formula === 'harris_benedict_legacy') return 'Harris-Benedict'
  return 'Mifflin-St Jeor'   // default: fórmula activa
}

// ─── Selección automática de fórmula ─────────────────────────────────────────
// Cunningham 1991 se activa cuando:
//   • diasEjercicio >= 5 (actividad "alto" o "muy_alto")
//   • porcentajeGrasa fue medido (BIA / ISAK)
//   • % grasa ≤ 15% varones | ≤ 22% mujeres (deportista de bajo % grasa)
// En cualquier otro caso → Mifflin-St Jeor.
export function seleccionarFormula(
  sexo: Sexo,
  diasEjercicio: number,
  porcentajeGrasa?: number
): FormulaUsada {
  if (
    porcentajeGrasa != null      &&
    diasEjercicio >= 5           &&
    ((sexo === 'masculino' && porcentajeGrasa <= 15) ||
     (sexo === 'femenino'  && porcentajeGrasa <= 22))
  ) {
    return 'cunningham'
  }
  return 'mifflin_st_jeor'
}

/** Helper: devuelve true si los datos actuales del form activarán Cunningham */
export function usaraCunningham(
  sexo: Sexo,
  diasEjercicio: number,
  porcentajeGrasa?: number
): boolean {
  return seleccionarFormula(sexo, diasEjercicio, porcentajeGrasa) === 'cunningham'
}

// ─── Factor actividad PAL (FAO/WHO-OMS) ──────────────────────────────────────
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

// ─── Ajuste por objetivo ──────────────────────────────────────────────────────
export function kcalObjetivo(tdee: number, obj: Objetivo): number {
  if (obj === 'perdida grasa') return tdee * 0.80
  if (obj === 'hipertrofia')   return tdee * 1.10
  return tdee
}

// ─── Distribución de macros ───────────────────────────────────────────────────
export function calcMacros(kcal: number, peso: number, obj: Objetivo): Macros {
  let p: number, g: number
  if (obj === 'hipertrofia')       { p = peso * 2;   g = peso * 0.9 }
  else if (obj === 'perdida grasa') { p = peso * 2.1; g = peso * 0.8 }
  else                              { p = peso * 1.9; g = peso * 0.85 }

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

// ─── Cálculo completo ─────────────────────────────────────────────────────────
// Selección de fórmula automática:
//   • Cunningham 1991  → deportista (>=5 días) + BIA medido + bajo % grasa
//   • Mifflin-St Jeor  → todos los demás casos (default)
export function calcularNutricion(form: Pick<FormData,
  'peso' | 'talla' | 'edad' | 'sexo' | 'objetivo' |
  'diasEjercicio' | 'duracionSesion' | 'tipoEjercicio' | 'porcentajeGrasa'
>): NutritionResult {
  const formula = seleccionarFormula(form.sexo, form.diasEjercicio, form.porcentajeGrasa)

  const bmr = formula === 'cunningham' && form.porcentajeGrasa != null
    ? bmrCunningham(form.peso, form.porcentajeGrasa)
    : bmrMifflinStJeor(form.peso, form.talla, form.edad, form.sexo)

  const pal    = factorActividad(form.diasEjercicio, form.duracionSesion, form.tipoEjercicio)
  const tdee   = bmr * pal
  const kcal   = kcalObjetivo(tdee, form.objetivo)
  const macros = calcMacros(kcal, form.peso, form.objetivo)

  return {
    bmr:          Math.round(bmr),
    tdee:         Math.round(tdee),
    kcal:         Math.round(kcal),
    macros,
    pal,
    formulaUsada: formula,
  }
}

// ─── Etiquetas ───────────────────────────────────────────────────────────────
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
