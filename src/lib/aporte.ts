/**
 * lib/aporte.ts — Validación nutricional determinista (port de calcular_aporte.py).
 *
 * Es la barrera de calidad de la Fase 1: ninguna opción entra al banco si no
 * cuadra con el target del tiempo de comida. La variedad nunca rompe el plan.
 * Sin dependencias externas: pura aritmética, fácil de testear.
 */

import type {
  AportePorcion,
  FitVsTarget,
  MacrosTarget,
  MetaOpcion,
  OpcionPreparacion,
} from "@/types/banco";

const MACROS = [
  "kcal",
  "proteina_g",
  "carbohidrato_g",
  "grasa_g",
  "fibra_g",
] as const;

const ATWATER: Record<string, number> = {
  proteina_g: 4,
  carbohidrato_g: 4,
  grasa_g: 9,
};

export function calcularAporte(opcion: OpcionPreparacion): AportePorcion {
  const total: Record<string, number> = {
    kcal: 0,
    proteina_g: 0,
    carbohidrato_g: 0,
    grasa_g: 0,
    fibra_g: 0,
  };

  for (const ing of opcion.ingredientes) {
    if (!ing.por_100g) {
      throw new Error(
        `Ingrediente "${ing.alimento}" sin valores por_100g; el generador debe entregarlos para validar.`,
      );
    }
    const g = ing.gramos;
    for (const m of MACROS) {
      total[m] += (ing.por_100g[m] * g) / 100;
    }
  }

  if (total.kcal === 0) {
    // Estimación Atwater si no vino kcal.
    total.kcal = Object.entries(ATWATER).reduce(
      (acc, [m, f]) => acc + total[m] * f,
      0,
    );
  }

  return {
    kcal: round1(total.kcal),
    proteina_g: round1(total.proteina_g),
    carbohidrato_g: round1(total.carbohidrato_g),
    grasa_g: round1(total.grasa_g),
    fibra_g: round1(total.fibra_g),
  };
}

/** Validación cruzada kcal declaradas vs Atwater (detecta por_100g mal cargado). */
export function kcalCoherente(
  aporte: AportePorcion,
  toleranciaPct = 8,
): boolean {
  const atwater = Object.entries(ATWATER).reduce(
    (acc, [m, f]) => acc + (aporte as unknown as Record<string, number>)[m] * f,
    0,
  );
  if (aporte.kcal === 0) return true;
  const desvio = (Math.abs(atwater - aporte.kcal) / aporte.kcal) * 100;
  return desvio <= toleranciaPct;
}

export function calcularFit(
  aporte: AportePorcion,
  target: MacrosTarget,
): FitVsTarget {
  const pct = (v: number, t: number) => (t ? Math.round((v / t) * 100) : 0);
  return {
    proteina_pct: pct(aporte.proteina_g, target.proteina_g),
    carbohidrato_pct: pct(aporte.carbohidrato_g, target.carbohidrato_g),
    grasa_pct: pct(aporte.grasa_g, target.grasa_g),
  };
}

/**
 * Regla de aceptación. Decisión de diseño acordada con Felipe: proteína y CHO
 * siempre dentro de ±tolerancia. La grasa también, EXCEPTO que puede caer hasta
 * -30 % cuando la preparación es post-entreno (donde una grasa más baja es
 * deseable, no un error).
 */
export function cuadra(
  fit: FitVsTarget,
  meta: MetaOpcion,
  toleranciaPct = 10,
  permitirGrasaBajaPostEntreno = true,
): { ok: boolean; motivo: string | null } {
  const lo = 100 - toleranciaPct;
  const hi = 100 + toleranciaPct;

  if (!(fit.proteina_pct >= lo && fit.proteina_pct <= hi))
    return { ok: false, motivo: `proteína fuera de rango (${fit.proteina_pct}%)` };
  if (!(fit.carbohidrato_pct >= lo && fit.carbohidrato_pct <= hi))
    return { ok: false, motivo: `CHO fuera de rango (${fit.carbohidrato_pct}%)` };

  let grasaLo = lo;
  if (permitirGrasaBajaPostEntreno && meta.timing === "post_entreno") {
    grasaLo = 70; // relajación a la baja sólo post-entreno
  }
  if (!(fit.grasa_pct >= grasaLo && fit.grasa_pct <= hi))
    return { ok: false, motivo: `grasa fuera de rango (${fit.grasa_pct}%)` };

  return { ok: true, motivo: null };
}

function factorEscalaProteina(
  aporte: AportePorcion,
  target: MacrosTarget,
): number {
  if (aporte.proteina_g <= 0) return 1;
  return Math.round((target.proteina_g / aporte.proteina_g) * 1000) / 1000;
}

/** Escala SOLO ingredientes estructurales (>10 g) para no volver absurda 1 cdita de aceite. */
function reescalarGramajes(
  opcion: OpcionPreparacion,
  factor: number,
): OpcionPreparacion {
  const nueva: OpcionPreparacion = structuredClone(opcion);
  for (const ing of nueva.ingredientes) {
    if (ing.gramos > 10) ing.gramos = Math.round(ing.gramos * factor);
  }
  return nueva;
}

export interface ResultadoValidacion {
  opcion: OpcionPreparacion;
  aceptada: boolean;
  motivo: string | null;
}

/**
 * Calcula aporte, escribe aporte_porcion + fit_vs_target en la opción y decide
 * si entra al banco. Si no cuadra e `intentarReescalar`, hace UN intento de
 * reescalado por factor de proteína (sin gastar API).
 */
export function validarYAnotar(
  opcion: OpcionPreparacion,
  target: MacrosTarget,
  opts: {
    toleranciaPct?: number;
    permitirGrasaBajaPostEntreno?: boolean;
    intentarReescalar?: boolean;
  } = {},
): ResultadoValidacion {
  const {
    toleranciaPct = 10,
    permitirGrasaBajaPostEntreno = true,
    intentarReescalar = true,
  } = opts;

  let op = opcion;
  let aporte = calcularAporte(op);

  if (!kcalCoherente(aporte)) {
    return {
      opcion: op,
      aceptada: false,
      motivo: "kcal incoherente con macros (revisar por_100g)",
    };
  }

  let fit = calcularFit(aporte, target);
  let { ok, motivo } = cuadra(
    fit,
    op.meta,
    toleranciaPct,
    permitirGrasaBajaPostEntreno,
  );

  if (!ok && intentarReescalar) {
    const factor = factorEscalaProteina(aporte, target);
    if (factor >= 0.5 && factor <= 2.0) {
      op = reescalarGramajes(op, factor);
      aporte = calcularAporte(op);
      fit = calcularFit(aporte, target);
      ({ ok, motivo } = cuadra(
        fit,
        op.meta,
        toleranciaPct,
        permitirGrasaBajaPostEntreno,
      ));
    }
  }

  op.aporte_porcion = aporte;
  op.fit_vs_target = fit;
  return { opcion: op, aceptada: ok, motivo: ok ? null : motivo };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
