/**
 * types/banco.ts — Tipos del "banco de opciones" (Fase 1) para NutriApp Pro.
 *
 * Reflejan el esquema canónico del plan (references/schemas.md) y la extensión
 * `opcion` de la skill preparaciones-culinarias. NO se inventan campos paralelos:
 * `OpcionPreparacion` es backward-compatible con el `opciones[]` del plan.
 */

export interface MacrosPor100g {
  kcal: number;
  proteina_g: number;
  carbohidrato_g: number;
  grasa_g: number;
  fibra_g: number;
}

/** Target de un tiempo de comida. kcal es opcional (se estima por Atwater). */
export interface MacrosTarget {
  kcal?: number;
  proteina_g: number;
  carbohidrato_g: number;
  grasa_g: number;
}

export interface AportePorcion {
  kcal: number;
  proteina_g: number;
  carbohidrato_g: number;
  grasa_g: number;
  fibra_g: number;
}

export interface FitVsTarget {
  proteina_pct: number;
  carbohidrato_pct: number;
  grasa_pct: number;
}

export type Cocina =
  | "chilena"
  | "mediterranea"
  | "asiatica"
  | "mexicana"
  | "libre";

export type Timing = "ninguno" | "pre_entreno" | "post_entreno";
export type Temporada = "verano" | "otono" | "invierno" | "primavera";

export interface Ingrediente {
  alimento: string;
  gramos: number;
  medida_casera?: string;
  /** Lo entrega el generador (anclado en la tabla de alimentos); se usa para
   *  validar. No es obligatorio persistirlo si no se quiere. */
  por_100g?: MacrosPor100g;
}

export interface MetaOpcion {
  tiempo_min: number;
  dificultad: "facil" | "media" | "avanzada";
  cocina: Cocina;
  temporada: Temporada[];
  presupuesto: "bajo" | "medio" | "alto";
  apto_para: string[];
  timing: Timing;
}

export interface OpcionPreparacion {
  // --- Campos originales de NutriApp Pro (no renombrar) ---
  nombre: string;
  preparacion: string;
  porcion_casera: string;
  notas_digestivas: string | null;
  // --- Extensión culinaria ---
  ingredientes: Ingrediente[];
  pasos: string[];
  // --- Extensión nutricional (la calcula el sistema, no la IA) ---
  aporte_porcion?: AportePorcion;
  fit_vs_target?: FitVsTarget;
  // --- Extensión meta ---
  meta: MetaOpcion;
  // --- Control de rotación (Fase 2; se inicializa null) ---
  ultima_servida_en?: string | null;
}

export interface TiempoComida {
  id: string;
  tipo: string;
  hora_sugerida?: string;
  kcal?: number;
  macros: MacrosTarget;
  opciones: OpcionPreparacion[];
}

export interface Plan {
  id: string;
  paciente_id: string;
  tiempos_comida: TiempoComida[];
}

/** Subset del schema paciente que la generación debe respetar. */
export interface ContextoPaciente {
  alergias: string[];
  alimentos_rechazados: string[];
  intolerancias: string[];
  intolerancias_percibidas: string[];
  alimentos_mal_caen: string[];
  diagnostico_sibo: boolean;
  hinchazon_frecuente: boolean;
  alimentos_preferidos: string[];
  tiempo_cocinar_min: number;
  habilidad_culinaria: "basica" | "intermedia" | "avanzada";
  presupuesto: "bajo" | "medio" | "alto";
  objetivo_principal: string;
  horario_entrenamiento: string | null;
}

export interface BancoConfig {
  opciones_base_por_tiempo: number; // Modo A
  variantes_por_base: number; // Modo B
  temporada_actual: Temporada;
  tolerancia_pct: number; // ±% permitido por macro
  permitir_grasa_baja_post_entreno: boolean; // decisión de diseño acordada
}

export const BANCO_CONFIG_DEFAULT: BancoConfig = {
  opciones_base_por_tiempo: 3,
  variantes_por_base: 1,
  temporada_actual: "invierno",
  tolerancia_pct: 10,
  permitir_grasa_baja_post_entreno: true,
};

export interface EventoBanco {
  opcion: string;
  estado: "aceptada" | "rechazada";
  motivo?: string;
  fit?: FitVsTarget;
}

export interface BancoResponse {
  plan_id: string;
  tiempos_procesados: number;
  opciones_generadas: number;
  opciones_aceptadas: number;
  opciones_rechazadas: number;
  detalle: Array<Record<string, unknown>>;
}
