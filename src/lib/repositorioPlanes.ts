/**
 * lib/repositorioPlanes.ts — Capa de persistencia con Supabase.
 *
 * ADAPTADO AL ESQUEMA REAL de Centro Metabólico Pro (verificado por inspección):
 *
 *   planes(id uuid, user_id, patient_id, professional_id, objetivo, kcal,
 *          macros jsonb, plan_data jsonb, ...)
 *   plan_data = { comidas: [ { nombre, kcal, p, items: string[] } ], plan: [...] }
 *   perfiles_digestivos(user_id, hinchazon, reflujo, ritmo, diag,
 *                       intolerancias text[], horario text[], severidad)
 *   profiles(id, nombre, email, role, ...)  ← identidad/suscripción, NO nutrición
 *
 * El "banco" agrega un array `opciones[]` dentro de cada comida de plan_data,
 * junto a `items` (no lo reemplaza). El resto de la app sigue leyendo `items`.
 *
 * Este archivo TRADUCE entre el shape real de la DB y el modelo de dominio
 * (TiempoComida con macros target). Por eso route.ts y aporte.ts NO cambian.
 *
 * Requiere:  npm i @supabase/supabase-js
 * Variables de entorno (server-only):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← NUNCA exponer al cliente.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  ContextoPaciente,
  MacrosTarget,
  OpcionPreparacion,
  Plan,
  TiempoComida,
} from "@/types/banco";

// --- Apuntadores al esquema real. Si más adelante consolidas en
//     `planes_nutricionales`/`plan_json`, cambia SÓLO estas constantes. ---
const TABLA_PLANES = "planes";
const COL_PLAN_DATA = "plan_data";
const ARRAY_COMIDAS = "comidas";

// Split energético para DERIVAR el target de CHO/grasa por comida, porque el
// esquema sólo guarda kcal + proteína (`p`) por comida. Es una estimación
// razonable; si algún día guardas CHO/grasa por comida, úsalos directamente.
const SPLIT_CHO = 0.6; // del kcal restante tras la proteína
const SPLIT_GRASA = 0.4;

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
// Tipos del shape real de plan_data (lo que vive en la DB)
// --------------------------------------------------------------------------- //
interface ComidaDB {
  nombre: string;
  kcal?: number;
  p?: number; // proteína en gramos
  items?: string[]; // alimentos como texto
  opciones?: OpcionPreparacion[]; // ← lo que agrega el banco
}
interface PlanDataDB {
  comidas?: ComidaDB[];
  plan?: unknown[];
  [k: string]: unknown;
}

/** Deriva el target de macros de una comida a partir de kcal + proteína. */
function targetDeComida(c: ComidaDB): MacrosTarget {
  const kcal = c.kcal ?? 0;
  const proteina_g = c.p ?? 0;
  const restante = Math.max(0, kcal - proteina_g * 4);
  return {
    kcal,
    proteina_g,
    carbohidrato_g: Math.round((restante * SPLIT_CHO) / 4),
    grasa_g: Math.round((restante * SPLIT_GRASA) / 9),
  };
}

// --------------------------------------------------------------------------- //
// Lectura del plan
// --------------------------------------------------------------------------- //
export async function obtenerPlan(planId: string): Promise<Plan | null> {
  const { data, error } = await client()
    .from(TABLA_PLANES)
    .select(`id, user_id, patient_id, ${COL_PLAN_DATA}`)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`Supabase obtenerPlan: ${error.message}`);
  if (!data) return null;

  const planData = (data[COL_PLAN_DATA] ?? {}) as PlanDataDB;
  const comidas = Array.isArray(planData[ARRAY_COMIDAS])
    ? (planData[ARRAY_COMIDAS] as ComidaDB[])
    : [];

  // Traducción DB → dominio. El id sintético "comida-N" permite volver a
  // ubicar la comida al guardar (las comidas no tienen id propio en la DB).
  const tiempos_comida: TiempoComida[] = comidas.map((c, i) => ({
    id: `comida-${i}`,
    tipo: c.nombre ?? `comida ${i + 1}`,
    kcal: c.kcal,
    macros: targetDeComida(c),
    opciones: Array.isArray(c.opciones) ? c.opciones : [],
  }));

  return {
    id: data.id as string,
    paciente_id: (data.patient_id ?? data.user_id) as string,
    tiempos_comida,
  };
}

// --------------------------------------------------------------------------- //
// Contexto del paciente (opción "a": digestivo + médico que SÍ existen)
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

  // Digestivo (existe).
  const { data: dig, error: eDig } = await sb
    .from("perfiles_digestivos")
    .select("hinchazon, diag, intolerancias")
    .eq("user_id", pacienteId)
    .maybeSingle();
  if (eDig) throw new Error(`Supabase perfiles_digestivos: ${eDig.message}`);

  const diag = (dig?.diag ?? "").toString().toLowerCase();
  const intolerancias = Array.isArray(dig?.intolerancias) ? dig!.intolerancias : [];

  // ⚠️ HUECO DE DATOS (decisión "a"): tu esquema actual NO almacena alergias,
  // alimentos rechazados/preferidos, presupuesto, tiempo de cocina ni habilidad
  // culinaria. Se devuelven vacíos: el generador NO podrá filtrar por ellos
  // hasta que captures esos campos (p.ej. tabla `perfiles_nutricionales`).
  // Cuando existan, mapéalos aquí y el generador los respetará automáticamente.
  return {
    alergias: [], // ← pendiente de capturar en la app
    alimentos_rechazados: [], // ← pendiente
    intolerancias: [],
    intolerancias_percibidas: intolerancias,
    alimentos_mal_caen: [],
    diagnostico_sibo: diag.includes("sibo"),
    hinchazon_frecuente: esAfirmativo(dig?.hinchazon),
    alimentos_preferidos: [], // ← pendiente
    tiempo_cocinar_min: 30, // ← default hasta capturarlo
    habilidad_culinaria: "intermedia", // ← default
    presupuesto: "medio", // ← default
    objetivo_principal: "salud_metabolica", // ← se puede wirear desde planes.objetivo
    horario_entrenamiento: null,
  };
}

// --------------------------------------------------------------------------- //
// Escritura: agrega opciones[] a la comida correspondiente en plan_data
// --------------------------------------------------------------------------- //
export async function guardarOpcionesTiempo(
  planId: string,
  tiempo: TiempoComida,
): Promise<void> {
  const sb = client();

  const { data, error } = await sb
    .from(TABLA_PLANES)
    .select(COL_PLAN_DATA)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`Supabase read (guardar): ${error.message}`);
  if (!data) throw new Error(`Plan ${planId} desapareció durante la escritura.`);

  const planData = (data[COL_PLAN_DATA] ?? {}) as PlanDataDB;
  const comidas = Array.isArray(planData[ARRAY_COMIDAS])
    ? (planData[ARRAY_COMIDAS] as ComidaDB[])
    : [];

  // Recupera el índice desde el id sintético "comida-N".
  const idx = Number.parseInt(tiempo.id.replace("comida-", ""), 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= comidas.length) {
    throw new Error(`No se ubicó la comida ${tiempo.id} en el plan ${planId}.`);
  }

  // Extiende SIN tocar items: agrega/reescribe sólo opciones[].
  comidas[idx] = { ...comidas[idx], opciones: tiempo.opciones };
  const nuevoPlanData: PlanDataDB = { ...planData, [ARRAY_COMIDAS]: comidas };

  const { error: errUpd } = await sb
    .from(TABLA_PLANES)
    .update({ [COL_PLAN_DATA]: nuevoPlanData })
    .eq("id", planId);
  if (errUpd) throw new Error(`Supabase update (guardar): ${errUpd.message}`);
}
