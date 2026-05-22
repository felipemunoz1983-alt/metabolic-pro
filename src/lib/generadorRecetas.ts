/**
 * lib/generadorRecetas.ts — Generación de opciones vía Anthropic (Modo A + B).
 *
 * Encapsula la skill preparaciones-culinarias en prompts. La API devuelve JSON
 * estructurado que se parsea a OpcionPreparacion. Restricciones duras (alergias,
 * alimentos rechazados) van en el prompt; el validador determinista (aporte.ts)
 * es la red de seguridad final.
 *
 * Requiere:  npm i @anthropic-ai/sdk
 * Variable de entorno:  ANTHROPIC_API_KEY
 */

import Anthropic from "@anthropic-ai/sdk";

import type {
  ContextoPaciente,
  MacrosTarget,
  OpcionPreparacion,
  Temporada,
} from "@/types/banco";

// Sonnet equilibra costo/calidad para generación estructurada en lote.
// Para sembrar bancos muy grandes, Haiku abarata. Configurable por entorno.
const MODELO = process.env.ANTHROPIC_MODEL_RECETAS ?? "claude-sonnet-4-6";

const anthropic = new Anthropic(); // toma ANTHROPIC_API_KEY del entorno

const SYSTEM_PROMPT = `\
Eres la capa culinaria de NutriApp Pro (Centro Metabólico). Conviertes targets de
macros en preparaciones reales, cocinables y adherentes, para pacientes en Chile.

REGLAS INNEGOCIABLES
- NUNCA incluyas un alimento listado en alergias o alimentos_rechazados del paciente.
- Respeta intolerancias y lo que "mal cae": evita o sustituye, y deja notas_digestivas.
- Comida chilena real: nombres, cortes y disponibilidad de Chile. Medidas caseras
  que un paciente chileno entienda (taza, palma, cdita).
- Ancla los valores por_100g en datos reales (USDA / tabla chilena). Para cada
  ingrediente DEBES entregar por_100g {kcal, proteina_g, carbohidrato_g, grasa_g, fibra_g}.
- Ajusta complejidad y tiempo a habilidad_culinaria y tiempo_cocinar_min.
- No diagnosticar, no prometer resultados, sin lenguaje alarmista.

OBJETIVO DE MACROS
Cada preparación debe acercarse al target del tiempo de comida (±10%). Un validador
posterior ajustará gramajes; prioriza realismo de porciones por sobre exactitud forzada.

FORMATO DE SALIDA
Devuelve EXCLUSIVAMENTE un array JSON (sin texto, sin markdown, sin fences), donde
cada elemento tiene EXACTAMENTE esta forma:
{
  "nombre": string,
  "preparacion": string,
  "porcion_casera": string,
  "notas_digestivas": string|null,
  "ingredientes": [
    {"alimento": string, "gramos": number, "medida_casera": string,
     "por_100g": {"kcal": n, "proteina_g": n, "carbohidrato_g": n, "grasa_g": n, "fibra_g": n}}
  ],
  "pasos": [string],
  "meta": {
    "tiempo_min": int, "dificultad": "facil|media|avanzada",
    "cocina": "chilena|mediterranea|asiatica|mexicana|libre",
    "temporada": ["verano"|"otono"|"invierno"|"primavera"],
    "presupuesto": "bajo|medio|alto",
    "apto_para": [string], "timing": "ninguno|pre_entreno|post_entreno"
  }
}
NO incluyas aporte_porcion ni fit_vs_target: los calcula el sistema.`;

function contextoATexto(ctx: ContextoPaciente): string {
  const digestivo: string[] = [];
  if (ctx.diagnostico_sibo) digestivo.push("SIBO diagnosticado (preferir bajo FODMAP)");
  if (ctx.hinchazon_frecuente) digestivo.push("hinchazón frecuente");
  const lista = (a: string[]) => (a.length ? a.join(", ") : "ninguno");
  return [
    `- Alergias (EXCLUIR SIEMPRE): ${lista(ctx.alergias)}`,
    `- Alimentos rechazados (EXCLUIR): ${lista(ctx.alimentos_rechazados)}`,
    `- Intolerancias: ${lista([...ctx.intolerancias, ...ctx.intolerancias_percibidas])}`,
    `- Mal caen: ${lista(ctx.alimentos_mal_caen)}`,
    `- Digestivo: ${digestivo.join(", ") || "sin observaciones"}`,
    `- Preferidos (priorizar): ${lista(ctx.alimentos_preferidos)}`,
    `- Tiempo para cocinar: ${ctx.tiempo_cocinar_min} min`,
    `- Habilidad culinaria: ${ctx.habilidad_culinaria}`,
    `- Presupuesto: ${ctx.presupuesto}`,
    `- Objetivo: ${ctx.objetivo_principal}`,
    `- Horario entrenamiento: ${ctx.horario_entrenamiento ?? "no entrena / N/A"}`,
  ].join("\n");
}

async function llamar(user: string): Promise<unknown[]> {
  const resp = await anthropic.messages.create({
    model: MODELO,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: user }],
  });

  let texto = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Defensa: si el modelo envolvió en ```json, limpiar.
  if (texto.startsWith("```")) {
    texto = texto.split("```")[1].replace(/^json/, "").trim();
  }

  let data: unknown;
  try {
    data = JSON.parse(texto);
  } catch (e) {
    throw new Error(
      `La API no devolvió JSON válido: ${(e as Error).message}\n${texto.slice(0, 300)}`,
    );
  }
  return Array.isArray(data) ? data : [data];
}

/** Modo A — n preparaciones base distintas que apuntan al target. */
export async function generarOpcionesBase(
  tipoComida: string,
  target: MacrosTarget,
  contexto: ContextoPaciente,
  temporada: Temporada,
  n = 3,
): Promise<OpcionPreparacion[]> {
  const user =
    `Genera ${n} preparaciones DISTINTAS para el tiempo de comida "${tipoComida}".\n\n` +
    `TARGET DE MACROS (por porción): proteína ${target.proteina_g} g, ` +
    `carbohidrato ${target.carbohidrato_g} g, grasa ${target.grasa_g} g` +
    `${target.kcal ? `, kcal ${target.kcal}` : ""}.\n` +
    `TEMPORADA ACTUAL: ${temporada} (las preparaciones deben ser apropiadas; marca meta.temporada).\n\n` +
    `CONTEXTO DEL PACIENTE:\n${contextoATexto(contexto)}\n\n` +
    `Si el paciente entrena y este tiempo es peri-entrenamiento, ajusta el timing en meta. ` +
    `Varía proteína/carbohidrato base entre las ${n} opciones.`;
  const crudas = await llamar(user);
  return crudas as OpcionPreparacion[];
}

/** Modo B — n variantes con el MISMO perfil nutricional, distinta cocina. */
export async function generarVariantes(
  base: OpcionPreparacion,
  contexto: ContextoPaciente,
  temporada: Temporada,
  n = 1,
): Promise<OpcionPreparacion[]> {
  const user =
    `Toma esta preparación base y genera ${n} VARIANTE(S) con el MISMO perfil de macros ` +
    `(mismos ingredientes estructurales y gramajes), pero distinta cocina/sabor/técnica para ` +
    `mejorar adherencia. Mantén proteína, carbohidrato y grasa estructurales; cambia sazón, ` +
    `técnica o temperatura.\n\n` +
    `PREPARACIÓN BASE:\n${JSON.stringify(base, null, 2)}\n\n` +
    `TEMPORADA ACTUAL: ${temporada}.\n` +
    `CONTEXTO DEL PACIENTE:\n${contextoATexto(contexto)}\n\n` +
    `Usa una cocina DISTINTA a la base (la base es "${base.meta.cocina}").`;
  const crudas = await llamar(user);
  return crudas as OpcionPreparacion[];
}
