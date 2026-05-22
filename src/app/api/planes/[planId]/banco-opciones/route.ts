/**
 * app/api/planes/[planId]/banco-opciones/route.ts
 *
 * POST /api/planes/{planId}/banco-opciones  — Fase 1: sembrar el banco de opciones.
 *
 * Orquesta: cargar plan + contexto paciente → por cada tiempo de comida generar
 * opciones base (Modo A) + variantes (Modo B) → validar cada una con aporte.ts →
 * deduplicar → persistir en tiempos_comida[].opciones[] → devolver resumen.
 *
 * Notas de plataforma (Vercel):
 * - Esto hace varias llamadas a la IA, así que puede tardar. maxDuration eleva el
 *   límite; con Fluid Compute activado en tu proyecto puedes subirlo bastante, y
 *   el tiempo esperando a la IA/DB no cuenta como CPU activa (no se factura espera).
 * - Si un plan tiene muchos tiempos y aún así te acercas al límite, dispara este
 *   endpoint UNA VEZ POR tiempo_comida (pásalo como query) en vez de todo junto.
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthUser } from "@/lib/auth-server";
import { createServiceClient } from "@/lib/supabase-server";
import {
  validarYAnotar,
} from "@/lib/aporte";
import {
  generarOpcionesBase,
  generarVariantes,
} from "@/lib/generadorRecetas";
import {
  guardarOpcionesTiempo,
  obtenerContextoPaciente,
  obtenerPlan,
} from "@/lib/repositorioPlanes";
import {
  BANCO_CONFIG_DEFAULT,
  type BancoConfig,
  type ContextoPaciente,
  type EventoBanco,
  type OpcionPreparacion,
  type TiempoComida,
} from "@/types/banco";

// Node runtime (el SDK de Anthropic y supabase-js lo requieren) y duración alta.
export const runtime = "nodejs";
export const maxDuration = 300; // segundos; ajusta a tu plan/Fluid Compute.

/** Guard común: el caller debe estar logueado y tener role='professional'. */
async function exigirProfesional(req: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const user = await getAuthUser(req);
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await createServiceClient()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "professional") {
    return { ok: false, res: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

function claveDedupe(op: OpcionPreparacion): string {
  return `${op.nombre.trim().toLowerCase()}|${op.meta.cocina}`;
}

async function procesarTiempo(
  tiempo: TiempoComida,
  contexto: ContextoPaciente,
  cfg: BancoConfig,
): Promise<{ banco: OpcionPreparacion[]; eventos: EventoBanco[] }> {
  const eventos: EventoBanco[] = [];

  // --- Modo A: opciones base ---
  const bases = await generarOpcionesBase(
    tiempo.tipo,
    tiempo.macros,
    contexto,
    cfg.temporada_actual,
    cfg.opciones_base_por_tiempo,
  );

  // --- Modo B: variantes de cada base (en paralelo) ---
  const variantesAnidadas = await Promise.all(
    bases.map((b) =>
      generarVariantes(b, contexto, cfg.temporada_actual, cfg.variantes_por_base),
    ),
  );
  const candidatas: OpcionPreparacion[] = [...bases, ...variantesAnidadas.flat()];

  // --- Validación determinista + dedupe ---
  const banco: OpcionPreparacion[] = [];
  const vistas = new Set<string>();
  for (const op of candidatas) {
    let res;
    try {
      res = validarYAnotar(op, tiempo.macros, {
        toleranciaPct: cfg.tolerancia_pct,
        permitirGrasaBajaPostEntreno: cfg.permitir_grasa_baja_post_entreno,
      });
    } catch (e) {
      // Ingrediente sin por_100g u otro dato malformado de la IA: descartar.
      eventos.push({ opcion: op?.nombre ?? "?", estado: "rechazada", motivo: (e as Error).message });
      continue;
    }
    const clave = claveDedupe(res.opcion);
    if (res.aceptada && !vistas.has(clave)) {
      vistas.add(clave);
      banco.push(res.opcion);
      eventos.push({ opcion: res.opcion.nombre, estado: "aceptada", fit: res.opcion.fit_vs_target });
    } else {
      eventos.push({
        opcion: res.opcion.nombre,
        estado: "rechazada",
        motivo: res.motivo ?? "duplicada",
      });
    }
  }
  return { banco, eventos };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params; // En Next.js 15 los params son async.

  // Auth — solo profesionales pueden modificar el banco.
  const guard = await exigirProfesional(req);
  if (!guard.ok) return guard.res;

  // Permite override de config por body (opcional).
  let cfg: BancoConfig = BANCO_CONFIG_DEFAULT;
  try {
    const body = await req.json();
    cfg = { ...BANCO_CONFIG_DEFAULT, ...(body ?? {}) };
  } catch {
    /* body vacío: usar defaults */
  }

  const plan = await obtenerPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: `Plan ${planId} no encontrado.` }, { status: 404 });
  }
  if (!plan.tiempos_comida?.length) {
    return NextResponse.json({ error: "El plan no tiene tiempos de comida." }, { status: 422 });
  }

  let contexto: ContextoPaciente;
  try {
    contexto = await obtenerContextoPaciente(plan.paciente_id);
  } catch (e) {
    // Sin contexto no personalizamos: error explícito (regla NutriApp Pro).
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }

  let generadas = 0;
  let aceptadas = 0;
  let rechazadas = 0;
  const detalle: Array<Record<string, unknown>> = [];

  for (const tiempo of plan.tiempos_comida) {
    if (!tiempo.macros) {
      detalle.push({ tiempo: tiempo.tipo, error: "sin macros objetivo; se omite" });
      continue;
    }
    try {
      const { banco, eventos } = await procesarTiempo(tiempo, contexto, cfg);
      tiempo.opciones = banco;
      await guardarOpcionesTiempo(planId, tiempo); // progreso parcial resiliente

      generadas += eventos.length;
      aceptadas += banco.length;
      rechazadas += eventos.length - banco.length;
      detalle.push({ tiempo: tiempo.tipo, aceptadas: banco.length, eventos });
    } catch (e) {
      // Falla de generación/parseo/persistencia en este tiempo: no abortar todo.
      detalle.push({ tiempo: tiempo.tipo, error: (e as Error).message });
    }
  }

  return NextResponse.json({
    plan_id: planId,
    tiempos_procesados: plan.tiempos_comida.length,
    opciones_generadas: generadas,
    opciones_aceptadas: aceptadas,
    opciones_rechazadas: rechazadas,
    detalle,
  });
}

/**
 * GET /api/planes/{planId}/banco-opciones
 *
 * Lee el estado actual del banco — devuelve las opciones persistidas por tiempo
 * de comida sin regenerar nada. Lo usa el componente BancoOpciones para
 * hidratarse al mountar y refrescar tras un POST.
 *
 * Respuesta:
 *   {
 *     plan_id: string,
 *     opcionesPorTiempo: { [tipo: string]: OpcionPreparacion[] }
 *   }
 *
 * Auth: solo profesionales.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;

  const guard = await exigirProfesional(req);
  if (!guard.ok) return guard.res;

  const plan = await obtenerPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: `Plan ${planId} no encontrado.` }, { status: 404 });
  }

  const opcionesPorTiempo: Record<string, OpcionPreparacion[]> = {};
  for (const tiempo of plan.tiempos_comida ?? []) {
    opcionesPorTiempo[tiempo.tipo] = tiempo.opciones ?? [];
  }

  return NextResponse.json({
    plan_id: planId,
    opcionesPorTiempo,
    tiempos_count: plan.tiempos_comida?.length ?? 0,
  });
}
