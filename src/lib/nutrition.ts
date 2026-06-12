// ── Motor de Cálculo Nutricional · Centro Metabólico Pro ──
// Fórmula activa: Mifflin-St Jeor (1990) — estándar actual (Frankenfield et al. 2005)
// Harris-Benedict conservado solo como referencia comparativa (@deprecated)

import type { YogurTipo, SnackNutrevoTipo, BarraProteinaTipo, PanTipo, QuesoTipo } from './foods'
import { proteinaBariatricaOverride } from './bariatrica'

export type Objetivo = 'perdida grasa' | 'mantenimiento' | 'hipertrofia'
export type Sexo = 'masculino' | 'femenino'
export type TipoEjercicio = 'fuerza' | 'cardio' | 'mixto' | 'ninguno'
export type Crono = 'matutino' | 'vespertino' | 'neutro'
export type FormulaUsada = 'mifflin_st_jeor' | 'cunningham' | 'harris_benedict_legacy'

/** Método de cálculo de requerimientos energéticos.
 *  El profesional elige en el wizard. Default 'bmr_pal' (retrocompat planes antiguos).
 *
 *  - 'bmr_pal'         → BMR (Mifflin/Cunningham) × PAL → TDEE → macros (actual)
 *  - 'kcal_kg_pal'     → peso × kcal/kg × PAL → TDEE → macros
 *  - 'macros_directos' → macros como g/kg directos (Burke + Phillips + ACSM)
 *
 *  En cualquier método el profesional puede usar overrides (mezclas):
 *  proteinaGKgOverride / grasaGKgOverride / choGKgOverride sobrescriben el
 *  macro respectivo sin importar el método base. */
export type MetodoCalculo = 'bmr_pal' | 'kcal_kg_pal' | 'macros_directos'

/** Método de evaluación de composición corporal del paciente.
 *  Importante para trazabilidad clínica: cada método tiene supuestos distintos.
 *
 *  - 'bia'              → Bioimpedancia eléctrica (InBody, Tanita, etc.). Rápido pero
 *                         depende de hidratación, electrodos, comida reciente.
 *  - 'antropometria_5c' → Protocolo Kerr / ISAK 5 compartimentos (muscular, adiposo,
 *                         óseo, residual, piel). Gold standard en ciencia del deporte.
 *  - 'antropometria_2c' → Modelo 2 compartimentos clásico vía pliegues (Durnin-Womersley,
 *                         Jackson-Pollock). Divide en masa grasa y masa libre de grasa.
 */
export type MetodoComposicion = 'bia' | 'antropometria_5c' | 'antropometria_2c'

export const METODO_COMPOSICION_LABELS: Record<MetodoComposicion, { label: string; short: string; desc: string }> = {
  bia:              { label: 'Bioimpedancia',      short: 'BIA / InBody', desc: 'BIA (InBody, Tanita, OMRON). Rápido; depende de hidratación y protocolo.' },
  antropometria_5c: { label: 'Antropometría 5C',   short: 'ISAK / Kerr',  desc: 'Protocolo Kerr — ISAK 5 compartimentos (muscular, adiposo, óseo, residual, piel).' },
  antropometria_2c: { label: 'Antropometría 2C',   short: 'Pliegues',     desc: 'Pliegues cutáneos (Durnin-Womersley / Jackson-Pollock) — masa grasa + masa libre de grasa.' },
}

/** Momentos del dia donde el paciente incorpora whey/proteina en polvo.
 *  Multi-select: un mismo paciente puede consumirla en desayuno + post-entreno.
 *  Si wheyIndicado=true y wheyMomentos undefined => default ['desayuno', 'colacion_am', 'colacion_pm']. */
export type WheyMomento = 'desayuno' | 'colacion_am' | 'colacion_pm' | 'post_entreno'

export const WHEY_MOMENTO_LABELS: Record<WheyMomento, { label: string; emoji: string; desc: string }> = {
  desayuno:      { label: 'Desayuno',       emoji: '☀️', desc: 'Avena proteica / batido en ayunas' },
  colacion_am:   { label: 'Colación AM',    emoji: '☕', desc: 'Batido + fruta a media mañana' },
  colacion_pm:   { label: 'Colación PM',    emoji: '🍵', desc: 'Once / batido a media tarde' },
  post_entreno:  { label: 'Post-entreno',   emoji: '🏋️', desc: 'Ventana anabólica 30-60 min post' },
}

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
  /** Cirugía bariátrica previa. Default 'ninguna'.
   *  Si != 'ninguna' Y digFasePostBariatrica != 'no_aplica', el motor:
   *   - Reduce volumenes de comida segun fase (Mechanick 2019)
   *   - Recomienda 4-6 comidas pequeñas (no 2-3 grandes)
   *   - Ajusta proteina objetivo (60-80g sleeve, 80-100g bypass)
   *  Referencias completas en src/lib/bariatrica.ts */
  digCirugiaBariatrica?: import('./bariatrica').CirugiaBariatricaTipo
  /** Fase post-operatoria actual. Default 'no_aplica'.
   *  Las fases 1-5 son progresivas (días 1-2 a semanas 7-8).
   *  'mantenimiento' aplica a >2 meses post-op (capacidad gástrica estable). */
  digFasePostBariatrica?: import('./bariatrica').FasePostBariatrica
  // ── Suplementación segura ──
  supEmbarazo: 'no' | 'embarazo' | 'lactancia' | 'planificando'
  supCronicas: string[]
  supMedic: 'no' | 'si'
  supMedicDetalle: string
  supActuales: string
  // ── Composición corporal (BIA/ISAK) — activa Cunningham en deportistas ──
  /** Método con el que se midió la composición corporal. Opcional pero
   *  recomendado para trazabilidad clínica: indica si los valores vienen de
   *  BIA, ISAK 5C o pliegues 2C. Si no se especifica el algoritmo asume BIA
   *  (más común en consultorios chilenos con InBody). */
  metodoComposicion?: MetodoComposicion
  /** % grasa medido profesionalmente (BIA o ISAK). Opcional. Activa Cunningham si cumple criterios. */
  porcentajeGrasa?: number
  /** Masa muscular esquelética en kg (InBody / ISAK). Opcional. Alimenta el algoritmo de noticias y alertas clínicas. */
  masaMuscularKg?: number
  /** Grasa corporal en kg (InBody / ISAK). Opcional. Si se omite, se estima desde porcentajeGrasa × peso. */
  grasaCorporalKg?: number
  // ── Suplementación indicada ──
  /** true = el profesional indicó proteína en polvo (whey u otra). Habilita opciones con scoop en el plan. */
  wheyIndicado?: boolean
  /** Momentos del día donde se incorpora el scoop de whey. Default si wheyIndicado y este
   *  campo no se setea: ['desayuno', 'colacion_am', 'colacion_pm'] (mantiene comportamiento
   *  legacy + extiende a colaciones donde tambien hay opciones con whey).
   *  - 'desayuno': permite avena proteica, avena platano+whey, etc.
   *  - 'colacion_am' / 'colacion_pm': permite "Fruta + batido de proteína" y similares.
   *  - 'post_entreno': inyecta el batido en la colacion post-entreno automaticamente
   *    (segun horarioEntrenamiento AM/PM/noche). Util para hipertrofia/recuperacion. */
  wheyMomentos?: WheyMomento[]
  /** Tipo de yogur seleccionado por el paciente. Se extiende automáticamente con YOGUR_TIPOS en foods.ts. */
  yogurtTipo?: YogurTipo
  /** Tipo de pan preferido por el paciente. Aplica a TODAS las preparaciones con `tienePan: true`
   *  (sándwiches, tostadas, sopa con pan). Si no se elige, cada receta usa su `panTipoDefault`.
   *  Se extiende automáticamente con PAN_TIPOS en foods.ts. */
  panTipo?: PanTipo
  /** Tipo de queso seleccionado por el paciente. Aplica a TODAS las preparaciones
   *  con `tieneQueso: true` (sándwiches con queso, marraqueta jamón queso, etc.).
   *  Si no se elige, cada receta usa su `quesoTipoDefault` (gauda). Se extiende
   *  automáticamente con QUESO_TIPOS en foods.ts (4 opciones: gauda / mantecoso /
   *  light / quesillo). */
  quesoTipo?: QuesoTipo
  /** Snack saludable favorito de Nutrevo. Se extiende automáticamente con SNACK_NUTREVO_TIPOS en foods.ts. */
  snackNutrevoTipo?: SnackNutrevoTipo
  /** Barra de proteína favorita. Se extiende automáticamente con BARRA_PROTEINA_TIPOS en foods.ts. */
  barraProteinaTipo?: BarraProteinaTipo
  /** ¿Incluir el snack favorito en la rotación del plan? Default: false (opt-in clínico) */
  incluirSnackEnPlan?: boolean
  /** Slot donde aparece el snack opt-in. Default 'ambas'. */
  snackSlot?: 'am' | 'pm' | 'ambas'
  /** ¿Incluir la barra favorita en la rotación del plan? Default: false (opt-in clínico) */
  incluirBarraEnPlan?: boolean
  /** Slot donde aparece la barra opt-in. Default 'ambas'. */
  barraSlot?: 'am' | 'pm' | 'ambas'
  /** Gramos de arroz/carbo principal en almuerzo. Default según el target del paciente. */
  carboGramosAlmuerzo?: number
  /** Gramos de arroz/carbo principal en cena. Default según el target del paciente. */
  carboGramosCena?: number
  /** Horario habitual de entrenamiento — define timing peri-entreno de snack/barra */
  horarioEntrenamiento?: 'AM' | 'PM' | 'noche' | 'sin_entreno'
  // ── Contexto operativo del paciente (skill nutriapp-pro: variables obligatorias) ──
  /** Cantidad de comidas reales por día — usado para distribución de macros y rotación.
   *  NOTA: si `tiemposComida` esta definido y no vacio, se usa ESE como fuente de
   *  verdad y este campo solo se mantiene para compat con planes anteriores. */
  comidasPorDia?: 3 | 4 | 5 | 6
  /** Tiempos de comida ESPECIFICOS elegidos por el profesional para este paciente.
   *  Si esta definido y tiene al menos 1 elemento, el motor lo usa directamente
   *  ignorando la derivacion automatica de `comidasPorDia`. Si es undefined o
   *  vacio, el motor usa buildMealSlots(comidasPorDia, horarioEntrenamiento)
   *  como fallback (backward compat con planes existentes).
   *
   *  Permite combinaciones flexibles que la derivacion automatica no permitia:
   *   - 'desayuno + almuerzo' (paciente intermitente, 2 comidas)
   *   - 'desayuno + cena' (sin almuerzo, dieta inusual)
   *   - 'almuerzo + cena' (paciente que ayuna mañanas)
   *   - 'desayuno + once + cena' (sin almuerzo formal)
   *   - Cualquier subconjunto que tenga sentido clinico para el paciente. */
  tiemposComida?: Array<'desayuno' | 'colacion_manana' | 'almuerzo' | 'once' | 'cena' | 'ultra_extra'>
  /** Presupuesto semanal aproximado (CLP) — filtra productos premium si es bajo */
  presupuestoSemanal?: 'bajo' | 'medio' | 'alto'
  /** Tiempo disponible para cocinar en cada comida principal */
  tiempoCocinar?: 'menos_15' | '15_30' | '30_60' | 'mas_60'
  /** Habilidad culinaria autoreportada */
  habilidadCulinaria?: 'principiante' | 'intermedio' | 'avanzado'
  /** Lugar habitual de almuerzo — afecta tipo de preparaciones */
  lugarAlmuerzo?: 'casa' | 'oficina' | 'restaurant' | 'colegio'
  // ── Modalidad de planificación (menús vs porciones) ──
  /** Modalidad del plan entregado al paciente.
   *   - 'menus' (default, retrocompat) → preparaciones específicas con foto, pasos, ingredientes.
   *   - 'porciones' → intercambios alimentarios por grupos (estándar Sochinut/INTA).
   *  El motor de cálculo nutricional NO cambia — solo cambia el output al paciente. */
  modalidadPlan?: import('./porciones').ModalidadPlan
  // ── Método de cálculo (Opciones A/B/C + overrides para mezclas) ──
  /** Método de cálculo elegido por el profesional. Default 'bmr_pal' (retrocompat). */
  metodoCalculo?: MetodoCalculo
  /** Solo para metodoCalculo='kcal_kg_pal'. Rango clínico 20-50 kcal/kg.
   *  20=déficit profundo bariátrico, 25-30=déficit/mantenimiento sedentario,
   *  35-40=activo, 45-50=atleta o ganancia. */
  kcalPorKg?: number
  /** Override de proteína en g/kg de peso. Permite "mezclas":
   *  ej. método bmr_pal + proteína forzada a 2.0 g/kg. Si definido, sobrescribe
   *  el cálculo de proteína del método base. Rango clínico 0.8-3.1 (Phillips). */
  proteinaGKgOverride?: number
  /** Override de grasa en g/kg. Mismo patrón. Rango clínico 0.5-1.5 (ACSM).
   *  Floor crítico 0.5 — por debajo riesgo hormonal. */
  grasaGKgOverride?: number
  /** Override de CHO en g/kg. Rango clínico 3-12 según volumen entrenamiento
   *  (Burke et al. 2011, J Sports Sci 29(S1):S17-S27). */
  choGKgOverride?: number
  /** Override del PAL (Physical Activity Level). Si definido, reemplaza el PAL
   *  derivado automáticamente desde diasEjercicio/duracionSesion/tipoEjercicio.
   *  Niveles FAO/WHO 2001:
   *    1.200 Sedentario · 1.375 Liviano · 1.550 Moderado ·
   *    1.725 Activo    · 1.900 Muy activo
   *  Aplica a métodos 'bmr_pal' y 'kcal_kg_pal'. 'macros_directos' no usa PAL. */
  palOverride?: number
}

/** Niveles de actividad física FAO/WHO 2001 — usados como presets clínicos
 *  estándar en el selector del wizard. Exportado para que la UI los renderice
 *  sin duplicar valores. */
export const PAL_NIVELES_FAO = [
  { value: 1.200, label: 'Sedentario',  desc: 'Trabajo de escritorio, sin ejercicio' },
  { value: 1.375, label: 'Liviano',     desc: '1-3 días/sem ejercicio ligero' },
  { value: 1.550, label: 'Moderado',    desc: '3-5 días/sem ejercicio moderado' },
  { value: 1.725, label: 'Activo',      desc: '6-7 días/sem ejercicio intenso' },
  { value: 1.900, label: 'Muy activo',  desc: 'Diario intenso + trabajo físico' },
] as const

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
  /** Método de cálculo usado. 'bmr_pal' por default si no se especifica (planes antiguos). */
  metodoUsado?: MetodoCalculo
  /** Advertencias clínicas no-bloqueantes detectadas durante el cálculo
   *  (ej. proteína fuera de techo evidencia-respaldado, grasa cerca del floor).
   *  El profesional las ve en el reporte para revisión consciente. */
  warnings?: string[]
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

// ─── Opción B: TDEE por kcal/kg × PAL ────────────────────────────────────────
// Método rápido para profesionales con caso "calibrado" o pacientes en flujo
// clínico con historia previa de respuesta calórica conocida.
//
// kcalPorKg orientativos (no son ley):
//   20 = déficit profundo / post-bariátrico
//   25 = déficit moderado
//   30 = mantenimiento sedentario
//   35 = activo / mantenimiento moderado
//   40 = atleta mantenimiento
//   45 = superávit hipertrofia
//   50+ = ultra-endurance
//
// Después se aplica el PAL igual que en Opción A para sumar el costo de la
// actividad por encima del baseline metabólico estimado por kcal/kg.
export function tdeeKcalPorKg(peso: number, kcalKg: number, pal: number): number {
  return peso * kcalKg * pal
}

// ─── Opción C: Macros directos por g/kg ──────────────────────────────────────
// Calcula los macros como g/kg de peso corporal, ignorando el TDEE.
// Las kcal totales son resultado, no input — la suma de los 3 macros define
// la energía. Ideal para deportistas serios donde la prescripción de cada
// macro tiene racional clínico distinto.
//
// Referencias bibliográficas activas:
//   • CHO: Burke LM et al. J Sports Sci. 2011;29(S1):S17-S27.
//          Rangos 3-12 g/kg/día según volumen de entrenamiento.
//   • Proteína: Phillips SM, van Loon LJ. J Sports Sci. 2011;29(S1):S29-S38.
//               Morton RW et al. Br J Sports Med. 2018;52(6):376-384.
//               Helms ER, Aragon AA, Phillips SM. J Int Soc Sports Nutr. 2014;11:20.
//               Rangos 0.8-3.1 g/kg según objetivo + déficit.
//   • Grasa: ACSM/ISSN/IOM consensus. Rango 0.5-1.5 g/kg.
//            Floor crítico 0.5 g/kg (riesgo hormonal y vitaminas liposolubles).
export function macrosDirectos(
  peso: number,
  proteinaGKg: number,
  grasaGKg: number,
  choGKg: number,
): Macros & { kcal: number } {
  // Redondear primero los macros y luego calcular kcal sobre los valores
  // que verá el profesional — evita inconsistencia entre P/C/G mostrados
  // y kcal total reportado.
  const p = Math.round(peso * proteinaGKg)
  const g = Math.round(peso * grasaGKg)
  const c = Math.round(peso * choGKg)
  const kcal = p * 4 + c * 4 + g * 9
  return { p, c, g, kcal, nota: '' }
}

// ─── Helpers de sugerencia (hints UI, NO auto-llenan) ───────────────────────
// Muestran al profesional el rango recomendado por evidencia, pero NO escriben
// el valor automáticamente (decisión clínica del profesional ingresar cada
// g/kg uno por uno).
//
// CHO según Burke 2011 — clasifica volumen de entrenamiento:
//   light    (0 días o <1h)        → 3-5 g/kg
//   moderate (1-3 días, ~1h/día)   → 5-7 g/kg
//   high     (4-5 días, 1-3h/día)  → 6-10 g/kg
//   veryhigh (6-7 días, >4h/día)   → 8-12 g/kg
export function sugerirCho(diasEjercicio: number, duracionMin: number): { min: number; max: number; carga: 'light' | 'moderate' | 'high' | 'very_high' } {
  if (diasEjercicio === 0 || duracionMin < 60) return { min: 3, max: 5, carga: 'light' }
  if (diasEjercicio <= 3) return { min: 5, max: 7, carga: 'moderate' }
  if (diasEjercicio <= 5 && duracionMin <= 180) return { min: 6, max: 10, carga: 'high' }
  return { min: 8, max: 12, carga: 'very_high' }
}

// Proteína según Phillips 2011/2014, Morton 2018, Helms 2014:
//   sedentario              → 0.8 g/kg (RDA, mínimo no óptimo)
//   activo general / cardio → 1.2-1.6 g/kg
//   hipertrofia / fuerza    → 1.6-2.2 g/kg
//   déficit calórico        → 2.0-2.7 g/kg (preservación masa magra)
export function sugerirProteina(
  objetivo: Objetivo,
  tipoEjercicio: TipoEjercicio,
): { min: number; max: number } {
  if (objetivo === 'perdida grasa')                          return { min: 2.0, max: 2.7 }
  if (objetivo === 'hipertrofia')                            return { min: 1.6, max: 2.2 }
  if (tipoEjercicio === 'cardio' || tipoEjercicio === 'ninguno') return { min: 1.2, max: 1.6 }
  return { min: 1.4, max: 1.8 }
}

// Grasa según consensus ACSM/ISSN/IOM:
//   déficit / pérdida grasa → 0.6-1.0 g/kg
//   mantenimiento           → 0.8-1.2 g/kg
//   hipertrofia             → 1.0-1.5 g/kg
// Floor absoluto siempre 0.5 g/kg (no se permite por debajo).
export function sugerirGrasa(objetivo: Objetivo): { min: number; max: number } {
  if (objetivo === 'perdida grasa') return { min: 0.6, max: 1.0 }
  if (objetivo === 'hipertrofia')   return { min: 1.0, max: 1.5 }
  return { min: 0.8, max: 1.2 }
}

// ─── Validación clínica de macros (warnings y blocks) ───────────────────────
// Genera advertencias sin bloquear el cálculo cuando los valores ingresados
// por el profesional están fuera de rango evidencia-respaldado. Las
// situaciones críticas (grasa < 0.5 g/kg) sí se bloquean y la app debe
// mostrar el mensaje en rojo al profesional para corrección.
export interface MacrosValidacion {
  warnings: string[]
  bloqueos: string[]
}

export function validarMacros(
  peso: number,
  proteinaGKg: number,
  grasaGKg: number,
  choGKg: number,
  kcal: number,
  diasEjercicio: number,
): MacrosValidacion {
  const warnings: string[] = []
  const bloqueos: string[] = []

  if (grasaGKg < 0.5) {
    bloqueos.push(`Grasa ${grasaGKg.toFixed(2)} g/kg está por debajo del floor crítico 0.5 g/kg (riesgo hormonal y déficit vitaminas liposolubles).`)
  } else if (grasaGKg < 0.6) {
    warnings.push(`Grasa ${grasaGKg.toFixed(2)} g/kg cerca del floor crítico. Revisar perfil hormonal a 4 semanas.`)
  }
  if (proteinaGKg > 3.1) {
    warnings.push(`Proteína ${proteinaGKg.toFixed(2)} g/kg supera el techo evidencia-respaldado 3.1 g/kg (Phillips 2018).`)
  }
  if (proteinaGKg < 0.8) {
    warnings.push(`Proteína ${proteinaGKg.toFixed(2)} g/kg por debajo de la RDA 0.8 g/kg.`)
  }
  if (choGKg < 3 && diasEjercicio >= 3) {
    warnings.push(`CHO ${choGKg.toFixed(1)} g/kg inadecuado para ${diasEjercicio} días de entrenamiento (Burke 2011 sugiere ≥${diasEjercicio <= 3 ? 5 : 6} g/kg).`)
  }
  if (kcal < 800) {
    bloqueos.push(`Total ${Math.round(kcal)} kcal por debajo de 800 kcal (umbral fisiológico mínimo).`)
  }
  if (kcal > 5500) {
    bloqueos.push(`Total ${Math.round(kcal)} kcal por encima de 5500 kcal (valida con calorimetría en atletas profesionales).`)
  }
  void peso  // reservado para validaciones futuras peso-específicas

  return { warnings, bloqueos }
}

// ─── Cálculo completo ─────────────────────────────────────────────────────────
// Selección de método según form.metodoCalculo (default 'bmr_pal'):
//   • 'bmr_pal'         → BMR × PAL → kcalObjetivo → calcMacros (clásico)
//   • 'kcal_kg_pal'     → peso × kcalPorKg × PAL → kcalObjetivo → calcMacros
//   • 'macros_directos' → macrosDirectos(p, g, c) → kcal resultante
//
// MEZCLAS (overrides): cualquier método base puede tener proteinaGKgOverride /
// grasaGKgOverride / choGKgOverride seteado. Cuando un override está definido,
// reemplaza el macro respectivo después del cálculo base y recalcula kcal.
//
// Para 'bmr_pal' la selección de fórmula sigue siendo automática:
//   • Cunningham 1991  → deportista (>=5 días) + BIA medido + bajo % grasa
//   • Mifflin-St Jeor  → todos los demás casos (default)
export function calcularNutricion(form: Pick<FormData,
  'peso' | 'talla' | 'edad' | 'sexo' | 'objetivo' |
  'diasEjercicio' | 'duracionSesion' | 'tipoEjercicio' | 'porcentajeGrasa' |
  'digCirugiaBariatrica' | 'digFasePostBariatrica' |
  'metodoCalculo' | 'kcalPorKg' |
  'proteinaGKgOverride' | 'grasaGKgOverride' | 'choGKgOverride' | 'palOverride'
>): NutritionResult {
  const metodo: MetodoCalculo = form.metodoCalculo ?? 'bmr_pal'
  // PAL: si el profesional definió un override manual (típicamente eligió un
  // nivel FAO/WHO desde el selector), respetarlo. Si no, derivar automático
  // desde días/duración/tipo del wizard.
  const pal = form.palOverride ?? factorActividad(form.diasEjercicio, form.duracionSesion, form.tipoEjercicio)
  const formula = seleccionarFormula(form.sexo, form.diasEjercicio, form.porcentajeGrasa)

  // bmrEstimado se calcula siempre para mostrar al pro como referencia,
  // aunque el método activo no lo use directamente.
  const bmrEstimado = formula === 'cunningham' && form.porcentajeGrasa != null
    ? bmrCunningham(form.peso, form.porcentajeGrasa)
    : bmrMifflinStJeor(form.peso, form.talla, form.edad, form.sexo)

  let tdee: number
  let kcal: number
  let macros: Macros

  if (metodo === 'macros_directos') {
    // Opción C: macros como g/kg, kcal es resultado
    const p = form.proteinaGKgOverride ?? 1.6
    const g = form.grasaGKgOverride    ?? 1.0
    const c = form.choGKgOverride      ?? 5
    const res = macrosDirectos(form.peso, p, g, c)
    macros = { p: res.p, c: res.c, g: res.g, nota: '' }
    kcal   = res.kcal
    tdee   = kcal  // en este método no hay TDEE intermedio
  } else {
    // Opción A o B: calcular TDEE → kcal → macros
    if (metodo === 'kcal_kg_pal') {
      const kcalKg = form.kcalPorKg ?? 30
      tdee = tdeeKcalPorKg(form.peso, kcalKg, pal)
    } else {
      tdee = bmrEstimado * pal
    }
    kcal   = kcalObjetivo(tdee, form.objetivo)
    macros = calcMacros(kcal, form.peso, form.objetivo)

    // Aplicar overrides (mezcla): el pro fuerza un macro específico aunque el
    // método base haya calculado otro valor. Tras aplicar, recalcular kcal
    // totales para que el resumen refleje el output real.
    if (form.proteinaGKgOverride != null) {
      macros.p = Math.round(form.peso * form.proteinaGKgOverride)
    }
    if (form.grasaGKgOverride != null) {
      macros.g = Math.round(form.peso * form.grasaGKgOverride)
    }
    if (form.choGKgOverride != null) {
      macros.c = Math.round(form.peso * form.choGKgOverride)
    }
    if (
      form.proteinaGKgOverride != null ||
      form.grasaGKgOverride    != null ||
      form.choGKgOverride      != null
    ) {
      kcal = macros.p * 4 + macros.c * 4 + macros.g * 9
    }
  }

  // Override post-bariátrico: el cálculo estándar usa peso × 1.9-2.1 que para
  // pacientes con sobrepeso da 200g+ — imposible con capacidad gástrica reducida.
  // Mechanick 2019: proteína post-bariátrica es valor ABSOLUTO según tipo de
  // cirugía (60-100g/día), NO por kg. Ver src/lib/bariatrica.ts.
  const protOverride = proteinaBariatricaOverride(
    form.digCirugiaBariatrica,
    form.digFasePostBariatrica,
    macros.p,
  )
  if (protOverride !== null && protOverride !== macros.p) {
    const newP = protOverride
    const remainingKcal = kcal - (newP * 4) - (macros.g * 9)
    const newC = Math.max(50, Math.round(remainingKcal / 4))  // piso 50g (cetosis-evitar)
    macros.p = newP
    macros.c = newC
    macros.nota = `Proteína ajustada a ${newP}g/día por cirugía bariátrica (Mechanick 2019).`
  }

  // Validación clínica de macros finales (genera warnings + bloqueos)
  const proteinaGKgFinal = macros.p / form.peso
  const grasaGKgFinal    = macros.g / form.peso
  const choGKgFinal      = macros.c / form.peso
  const validacion = validarMacros(
    form.peso, proteinaGKgFinal, grasaGKgFinal, choGKgFinal, kcal, form.diasEjercicio,
  )
  const warnings = [...validacion.bloqueos.map(b => `🚨 ${b}`), ...validacion.warnings]

  return {
    bmr:          Math.round(bmrEstimado),
    tdee:         Math.round(tdee),
    kcal:         Math.round(kcal),
    macros,
    pal,
    formulaUsada: formula,
    metodoUsado:  metodo,
    warnings:     warnings.length > 0 ? warnings : undefined,
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

export const METODO_CALCULO_LABELS: Record<MetodoCalculo, { label: string; desc: string; refs: string }> = {
  bmr_pal: {
    label: 'Metabolismo basal × actividad',
    desc:  'BMR (Mifflin-St Jeor o Cunningham) multiplicado por factor PAL. Ajusta por objetivo.',
    refs:  'Mifflin MD et al. 1990. Frankenfield DC et al. 2005. FAO/WHO PAL 2001.',
  },
  kcal_kg_pal: {
    label: 'Kcal por kg × actividad',
    desc:  'Estima TDEE con kcal/kg de peso (20-50) × PAL. Más rápido en pacientes con caso calibrado.',
    refs:  'ACSM/ISSN consensus. Tabla referencial 20-50 kcal/kg.',
  },
  macros_directos: {
    label: 'Macros directos (g/kg)',
    desc:  'Define cada macro como g/kg de peso. Kcal son resultado, no input. Ideal deportistas serios.',
    refs:  'CHO: Burke et al. 2011. Proteína: Phillips/Morton 2018, Helms 2014. Grasa: ACSM consensus.',
  },
}
