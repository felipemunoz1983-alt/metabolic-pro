/**
 * lib/repositorioPlanes.ts — Capa de persistencia del banco con Supabase.
 *
 * ESQUEMA REAL DE CENTRO METABÓLICO PRO (verificado en supabase/planes_nutricionales.sql):
 *
 *   planes_nutricionales(
 *     id uuid pk,
 *     user_id uuid → profiles.id,
 *     professional_id uuid → profiles.id (nullable),
 *     objetivo text, kcal int, proteina int, carbohidrato int, grasa int,
 *     plan_json jsonb not null,   ← { form: FormData, result: NutritionResult, opcionesPorTiempo? }
 *     created_at timestamptz
 *   )
 *   perfiles_digestivos(user_id, hinchazon, reflujo, ritmo, diag, intolerancias, ...)
 *   profiles(id, nombre, email, role, ...)
 *
 * EL BANCO SE PERSISTE COMO EXTENSIÓN DE plan_json:
 *   plan_json.opcionesPorTiempo: Record<tipo, OpcionPreparacion[]>
 * Los campos originales `form` y `result` no se tocan — la app sigue leyendo
 * plan_json.form y plan_json.result sin cambios.
 *
 * LOS TIEMPOS DE COMIDA SE DERIVAN — NO SE PERSISTEN como columnas separadas.
 * Reusamos `generarPlan(form, result.kcal)` (la misma lógica que muestra el
 * PlanResult al paciente) para obtener los meals del día 1, sus kcal y macros.
 * Así, una sola fuente de verdad: el form genera los tiempos siempre igual.
 *
 * Variables de entorno (server-only, NUNCA exponer al cliente):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { generarPlan } from "@/lib/planGenerator";
import type { FormData, NutritionResult } from "@/lib/nutrition";
import type {
  ContextoPaciente,
  OpcionPreparacion,
  Plan,
  TiempoComida,
} from "@/types/banco";

// --- Apuntadores al schema real ----------------------------------------------
const TABLA_PLANES = "planes_nutricionales";
const COL_PLAN_JSON = "plan_json";

// --- Etiquetas humanas por tipo de DayMeal (alineado con banco-adapter.ts) ---
const MEAL_TYPE_LABEL: Record<string, string> = {
  desayuno:        "Desayuno",
  colacion_manana: "Colación AM",
  almuerzo:        "Almuerzo",
  once:            "Once",
  cena:            "Cena",
};

function client(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor.",
    );
  }
  // Service role bypassa RLS → la ruta que lo use DEBE validar el rol del llamador.
  return createClient(url, key, { auth: { persistSession: false } });
}

// --------------------------------------------------------------------------- //
// Shape persistido en plan_json
// --------------------------------------------------------------------------- //
interface PlanJsonShape {
  form: FormData;
  result: NutritionResult;
  /** Banco de opciones generadas por la skill — extensión opcional. */
  opcionesPorTiempo?: Record<string, OpcionPreparacion[]>;
}

// --------------------------------------------------------------------------- //
// Lectura del plan: deriva tiempos desde form+result y attacha opciones guardadas
// --------------------------------------------------------------------------- //
export async function obtenerPlan(planId: string): Promise<Plan | null> {
  const { data, error } = await client()
    .from(TABLA_PLANES)
    .select(`id, user_id, ${COL_PLAN_JSON}`)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`Supabase obtenerPlan: ${error.message}`);
  if (!data) return null;

  const planJson = (data[COL_PLAN_JSON] ?? {}) as Partial<PlanJsonShape>;
  if (!planJson.form || !planJson.result) {
    throw new Error(
      `Plan ${planId} no tiene form/result en plan_json (shape antiguo o vacío).`,
    );
  }

  // Deriva los tiempos usando la misma lógica que ve el paciente en su UI.
  // El día 1 representa la "plantilla" del plan; el banco aplica a TODOS los días.
  const week = generarPlan(planJson.form, planJson.result.kcal);
  const day1 = week.dias[0];
  if (!day1) return null;

  const opcionesGuardadas = planJson.opcionesPorTiempo ?? {};

  const tiempos_comida: TiempoComida[] = day1.meals
    .filter((m) => m.tipo !== "ultra") // ultra-procesados no son tiempos del banco
    .map((meal) => {
      const tipoLabel = MEAL_TYPE_LABEL[meal.tipo] ?? meal.label;
      // Aceptamos opciones guardadas tanto por etiqueta humana ("Almuerzo")
      // como por el código interno ("almuerzo"), para sobrevivir migraciones.
      const opciones =
        opcionesGuardadas[tipoLabel] ?? opcionesGuardadas[meal.tipo] ?? [];
      return {
        id:   meal.tipo, // p.ej. "almuerzo" — estable y único por tiempo
        tipo: tipoLabel,
        kcal: meal.kcal,
        macros: {
          kcal:           meal.kcal,
          proteina_g:     meal.p,
          carbohidrato_g: meal.c,
          grasa_g:        meal.g,
        },
        opciones,
      };
    });

  return {
    id:          data.id as string,
    paciente_id: data.user_id as string, // plan.user_id = paciente
    tiempos_comida,
  };
}

// --------------------------------------------------------------------------- //
// Contexto del paciente (digestivo + médico desde perfiles_digestivos)
// --------------------------------------------------------------------------- //
function esAfirmativo(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return ["si", "sí", "frecuente", "siempre", "alta", "a veces", "moderada", "severa"]
    .some((t) => s.includes(t));
}

export async function obtenerContextoPaciente(
  pacienteId: string,
): Promise<ContextoPaciente> {
  const sb = client();

  // Digestivo (existe en producción).
  const { data: dig, error: eDig } = await sb
    .from("perfiles_digestivos")
    .select("hinchazon, diag, intolerancias")
    .eq("user_id", pacienteId)
    .maybeSingle();
  if (eDig) throw new Error(`Supabase perfiles_digestivos: ${eDig.message}`);

  const diag = (dig?.diag ?? "").toString().toLowerCase();
  const intolerancias = Array.isArray(dig?.intolerancias) ? dig!.intolerancias : [];

  // ⚠️ HUECO DE DATOS: el esquema actual NO almacena alergias, alimentos
  // rechazados/preferidos, presupuesto, tiempo de cocina ni habilidad culinaria.
  // Devolvemos defaults razonables; cuando se capturen (p.ej. perfiles_nutricionales),
  // mapéalos aquí y la skill los respetará automáticamente.
  return {
    alergias:                [], // ← pendiente
    alimentos_rechazados:    [], // ← pendiente
    intolerancias:           [],
    intolerancias_percibidas: intolerancias,
    alimentos_mal_caen:      [],
    diagnostico_sibo:        diag.includes("sibo"),
    hinchazon_frecuente:     esAfirmativo(dig?.hinchazon),
    alimentos_preferidos:    [], // ← pendiente
    tiempo_cocinar_min:      30,       // ← default
    habilidad_culinaria:     "intermedia",
    presupuesto:             "medio",
    objetivo_principal:      "salud_metabolica", // ← se podría wirear desde planes.objetivo
    horario_entrenamiento:   null,
  };
}

// --------------------------------------------------------------------------- //
// Escritura: actualiza plan_json.opcionesPorTiempo[tiempo.tipo] sin tocar form/result
// --------------------------------------------------------------------------- //
export async function guardarOpcionesTiempo(
  planId: string,
  tiempo: TiempoComida,
): Promise<void> {
  const sb = client();

  // Read current plan_json
  const { data, error } = await sb
    .from(TABLA_PLANES)
    .select(COL_PLAN_JSON)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`Supabase read (guardar): ${error.message}`);
  if (!data) throw new Error(`Plan ${planId} no encontrado al guardar opciones.`);

  const planJson = (data[COL_PLAN_JSON] ?? {}) as Partial<PlanJsonShape>;
  if (!planJson.form || !planJson.result) {
    throw new Error(
      `Plan ${planId} no tiene form/result; no se pueden agregar opciones a un plan vacío.`,
    );
  }

  // Merge en el mapa por tipo. Sobrescribe lo que había para ese tipo.
  const opcionesPorTiempo: Record<string, OpcionPreparacion[]> = {
    ...(planJson.opcionesPorTiempo ?? {}),
  };
  opcionesPorTiempo[tiempo.tipo] = tiempo.opciones;

  const nuevoPlanJson: PlanJsonShape = {
    form:    planJson.form,
    result:  planJson.result,
    opcionesPorTiempo,
  };

  const { error: errUpd } = await sb
    .from(TABLA_PLANES)
    .update({ [COL_PLAN_JSON]: nuevoPlanJson })
    .eq("id", planId);
  if (errUpd) throw new Error(`Supabase update (guardar): ${errUpd.message}`);
}
