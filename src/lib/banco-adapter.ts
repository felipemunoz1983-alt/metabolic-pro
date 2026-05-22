/**
 * src/lib/banco-adapter.ts — Adapter entre el plan persistido y el BancoOpciones UI.
 *
 * El plan se guarda como `plan_json: { form, result }` (NutritionResult: totales
 * diarios). El componente BancoOpciones necesita los tiempos de comida
 * desglosados con sus macros target.
 *
 * Este helper usa `generarPlan(form, kcal)` para reproducir el split de macros
 * por tiempo de comida (la misma lógica que muestra el PlanResult al paciente)
 * y lo convierte al shape ComidaConOpciones que el componente espera.
 *
 * Las `opciones[]` inician vacías — se llenan vía POST /api/planes/[id]/banco-opciones
 * que persiste en plan_data.comidas[].opciones[] (capa repositorioPlanes).
 */
import { generarPlan } from '@/lib/planGenerator'
import type { FormData, NutritionResult } from '@/lib/nutrition'
import type { ComidaConOpciones } from '@/components/profesional/BancoOpciones'

const MEAL_TYPE_LABEL: Record<string, string> = {
  desayuno:        'Desayuno',
  colacion_manana: 'Colación AM',
  almuerzo:        'Almuerzo',
  once:            'Once',
  cena:            'Cena',
}

/**
 * Deriva los tiempos de comida (con sus macros target) desde el plan persistido.
 * Las opciones[] se inicializan vacías — el componente las pobla regenerando
 * el banco vía endpoint, o las lee desde plan_data si ya están persistidas.
 *
 * @param planId   ID del plan en DB — usado para construir IDs estables de cada tiempo
 * @param form     FormData del plan (comidasPorDia, horarioEntrenamiento, etc.)
 * @param result   NutritionResult con kcal total y macros totales del día
 * @param opcionesPorTiempo  Opcional — si ya conocemos opciones persistidas
 *                           desde plan_data.comidas[], las pegamos al adaptar.
 *                           Map key = tipo de comida (string).
 */
export function derivarComidasDePlan(
  planId: string,
  form: FormData,
  result: NutritionResult,
  opcionesPorTiempo?: Record<string, ComidaConOpciones['opciones']>,
): ComidaConOpciones[] {
  const week  = generarPlan(form, result.kcal)
  const day1  = week.dias[0]
  if (!day1) return []
  return day1.meals
    .filter(m => m.tipo !== 'ultra')   // ultra-procesados no son tiempos del banco
    .map(meal => ({
      id:    `${planId}-${meal.tipo}`,
      tipo:  MEAL_TYPE_LABEL[meal.tipo] ?? meal.label,
      kcal:  meal.kcal,
      macros: {
        proteina_g:      meal.p,
        carbohidrato_g:  meal.c,
        grasa_g:         meal.g,
      },
      opciones: opcionesPorTiempo?.[meal.tipo] ?? [],
    }))
}
