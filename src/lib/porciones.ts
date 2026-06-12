/**
 * Sistema de intercambios alimentarios para planificación por porciones.
 *
 * Estándar clínico chileno: 6 grupos de intercambio según INTA-UCH y la
 * práctica nutricional de Sochinut. Los valores macro de cada intercambio
 * son datos factuales de composición de alimentos (INTA Chile, USDA
 * FoodData Central, etiquetas oficiales chilenas).
 *
 * Filosofía: una "porción" dentro de un grupo aporta macros similares
 * (no exactamente iguales — error clínicamente aceptable ±15%) y es
 * intercambiable libremente. Esto le da al paciente flexibilidad para
 * elegir según gusto / disponibilidad / presupuesto.
 *
 * Referencias:
 *   - Atalah E, Castillo C. Manual de Alimentación y Nutrición. INTA-UCH.
 *   - Carrasco F. Nutrición Clínica. Sochinut.
 *   - MINSAL Guías Alimentarias para Chile 2022.
 *   - USDA FoodData Central (cross-validación).
 */

export type GrupoPorcion = 'lacteos' | 'frutas' | 'verduras' | 'cereales' | 'proteinas' | 'grasas'

export const GRUPO_PORCION_LABELS: Record<GrupoPorcion, { label: string; emoji: string; descKcal: number }> = {
  lacteos:   { label: 'Lácteos',          emoji: '🥛', descKcal: 90 },
  frutas:    { label: 'Frutas',           emoji: '🍎', descKcal: 60 },
  verduras:  { label: 'Verduras',         emoji: '🥦', descKcal: 25 },
  cereales:  { label: 'Cereales/Féculas', emoji: '🍞', descKcal: 80 },
  proteinas: { label: 'Proteínas',        emoji: '🍗', descKcal: 75 },
  grasas:    { label: 'Grasas',           emoji: '🥑', descKcal: 45 },
}

export interface IntercambioPorcion {
  /** Descripción genérica para el paciente (ej. "1 rebanada de pan integral") */
  alimento: string
  /** Gramos de la porción */
  gramos: number
  kcal: number
  p: number
  c: number
  g: number
  /** Ejemplo chileno específico (marca/producto local) — null si genérico */
  ejemploChileno?: string
  /** Notas clínicas: alergenos, sellos chilenos, contraindicaciones, etc. */
  notas?: string
}

/** Tablas de intercambios — macros por porción según INTA Chile + USDA.
 *  Cada intercambio dentro de un grupo aporta macros similares (±15%) para
 *  que sean libremente intercambiables sin afectar el target nutricional. */
export const INTERCAMBIOS: Record<GrupoPorcion, IntercambioPorcion[]> = {
  // ─── LÁCTEOS (~90 kcal · 6g P · 10g C · 2g G) ──────────────────────────
  lacteos: [
    { alimento: '1 taza de leche descremada',  gramos: 200, kcal: 66,  p: 6.2, c: 9.6, g: 0.2, ejemploChileno: 'Soprole / Colun descremada 200ml' },
    { alimento: '1 yogur natural sin azúcar',   gramos: 150, kcal: 95,  p: 5,   c: 11,  g: 3,   ejemploChileno: 'Soprole Activia natural 150g' },
    { alimento: '1 yogur griego natural',        gramos: 150, kcal: 143, p: 6.8, c: 15,  g: 5.5, ejemploChileno: 'Danone Oikos griego 150g' },
    { alimento: '30g de queso fresco/cottage',  gramos: 30,  kcal: 50,  p: 6,   c: 1,   g: 3,   ejemploChileno: 'Quesillo Quillayes 30g' },
    { alimento: '1 vaso leche de almendras sin azúcar', gramos: 200, kcal: 30, p: 0.6, c: 1, g: 2.4, notas: 'Apto vegano. Bajo en proteína — NO equivale en calidad proteica al lácteo.' },
  ],

  // ─── FRUTAS (~60 kcal · 15g C) ─────────────────────────────────────────
  frutas: [
    { alimento: '1 manzana mediana',             gramos: 150, kcal: 78, p: 0.4, c: 21, g: 0.3 },
    { alimento: '1 plátano chico',                gramos: 100, kcal: 89, p: 1.1, c: 23, g: 0.3 },
    { alimento: '1 naranja mediana',              gramos: 150, kcal: 71, p: 1.4, c: 18, g: 0.2 },
    { alimento: '1 pera mediana',                  gramos: 150, kcal: 86, p: 0.5, c: 23, g: 0.2 },
    { alimento: '1 taza de berries',               gramos: 150, kcal: 81, p: 1.5, c: 19, g: 0.6, notas: 'Frutillas, arándanos, frambuesas.' },
    { alimento: '2 kiwis',                         gramos: 150, kcal: 92, p: 1.7, c: 22, g: 0.8 },
    { alimento: '1 durazno mediano',               gramos: 150, kcal: 59, p: 1.4, c: 14, g: 0.4 },
    { alimento: '1 taza de melón en cubos',        gramos: 170, kcal: 58, p: 1.4, c: 14, g: 0.3 },
  ],

  // ─── VERDURAS (~25 kcal · 5g C · libres en muchos planes) ──────────────
  verduras: [
    { alimento: '1 taza de lechuga',               gramos: 50,  kcal: 8,  p: 0.7, c: 1.6, g: 0.1 },
    { alimento: '1 tomate mediano',                gramos: 130, kcal: 23, p: 1.1, c: 5,   g: 0.3 },
    { alimento: '1 zanahoria mediana',             gramos: 80,  kcal: 33, p: 0.8, c: 8,   g: 0.2 },
    { alimento: '½ taza de brócoli cocido',        gramos: 80,  kcal: 27, p: 2.3, c: 5,   g: 0.3 },
    { alimento: '1 taza de pepino picado',         gramos: 120, kcal: 19, p: 0.8, c: 4,   g: 0.1 },
    { alimento: '1 taza de zapallo italiano salteado', gramos: 130, kcal: 22, p: 1.6, c: 4, g: 0.4 },
    { alimento: '1 taza de espinaca cruda',         gramos: 30,  kcal: 7,  p: 0.9, c: 1.1, g: 0.1 },
    { alimento: '1 taza de coliflor cocida',        gramos: 120, kcal: 29, p: 2.3, c: 5,   g: 0.6 },
  ],

  // ─── CEREALES / FÉCULAS (~80 kcal · 15g C) ─────────────────────────────
  cereales: [
    { alimento: '1 rebanada de pan integral',       gramos: 31,  kcal: 84,  p: 3.3, c: 15.5, g: 1,    ejemploChileno: 'Pan Castaño Integral 1 rebanada' },
    { alimento: '⅓ taza de arroz cocido',            gramos: 65,  kcal: 84,  p: 1.8, c: 18,   g: 0.2 },
    { alimento: '1 papa chica cocida',                gramos: 100, kcal: 87,  p: 2,   c: 20,   g: 0.1 },
    { alimento: '⅓ taza de fideos cocidos',          gramos: 55,  kcal: 87,  p: 3.2, c: 17,   g: 0.5 },
    { alimento: '⅓ taza de quinoa cocida',           gramos: 65,  kcal: 78,  p: 2.9, c: 14,   g: 1.2 },
    { alimento: '½ taza de avena cocida',            gramos: 120, kcal: 90,  p: 3.2, c: 16,   g: 1.8, notas: 'Apta sin gluten si avena certificada.' },
    { alimento: '½ marraqueta',                       gramos: 30,  kcal: 90,  p: 2.8, c: 18,   g: 0.5, ejemploChileno: 'Marraqueta clásica panadería' },
    { alimento: '1 hallulla pequeña',                gramos: 35,  kcal: 105, p: 3,   c: 19,   g: 1.5, ejemploChileno: 'Hallulla típica chilena' },
    { alimento: '6 galletas de soda',                 gramos: 25,  kcal: 109, p: 2.5, c: 17,   g: 3,   notas: 'Mayor en grasas saturadas — preferir pan integral.' },
  ],

  // ─── PROTEÍNAS (~75 kcal · 7g P · bajas en grasa) ──────────────────────
  // NOTA: porción de 30g de carne magra = 1 intercambio. Para una comida real
  // se prescriben 4-6 intercambios (120-180g de carne cocida).
  proteinas: [
    { alimento: '30g de pollo cocido',                gramos: 30,  kcal: 50,  p: 9,   c: 0,   g: 1.4, ejemploChileno: 'Super Pollo pechuga 30g' },
    { alimento: '30g de pescado blanco',              gramos: 30,  kcal: 35,  p: 7,   c: 0,   g: 1,   ejemploChileno: 'Merluza austral 30g' },
    { alimento: '30g de atún en agua escurrido',      gramos: 30,  kcal: 31,  p: 7.8, c: 0,   g: 0.3, ejemploChileno: 'Robinson Crusoe atún en agua' },
    { alimento: '1 huevo entero',                      gramos: 50,  kcal: 78,  p: 6.2, c: 0.6, g: 5,   notas: 'Apto vegetariano.' },
    { alimento: '30g de carne vacuno magra',           gramos: 30,  kcal: 68,  p: 8,   c: 0,   g: 4,   ejemploChileno: 'Posta vacuno magra 30g' },
    { alimento: '30g de quesillo',                     gramos: 30,  kcal: 40,  p: 4,   c: 0.6, g: 2.4, ejemploChileno: 'Quesillo Quillayes 30g' },
    { alimento: '½ taza de legumbres cocidas',         gramos: 100, kcal: 117, p: 8,   c: 20,  g: 0.4, notas: 'Lentejas / porotos / garbanzos. Apto vegano. Cuenta también como carbo.' },
    { alimento: '100g de tofu firme',                  gramos: 100, kcal: 144, p: 17,  c: 2.8, g: 8.7, notas: 'Apto vegano.' },
    { alimento: '30g de jamón pavo light',             gramos: 30,  kcal: 30,  p: 6,   c: 0.5, g: 0.4, ejemploChileno: 'Pavo Mol / San Jorge light' },
  ],

  // ─── GRASAS (~45 kcal · 5g G) ──────────────────────────────────────────
  grasas: [
    { alimento: '1 cdta de aceite de oliva',          gramos: 5,   kcal: 45, p: 0,   c: 0,   g: 5 },
    { alimento: '¼ palta',                              gramos: 40,  kcal: 64, p: 0.8, c: 3.4, g: 5.9, ejemploChileno: 'Palta Hass chilena' },
    { alimento: '10 maní sin sal',                      gramos: 10,  kcal: 57, p: 2.6, c: 1.6, g: 5 },
    { alimento: '6 almendras',                          gramos: 8,   kcal: 46, p: 1.7, c: 1.6, g: 4 },
    { alimento: '2 nueces',                              gramos: 8,   kcal: 52, p: 1.2, c: 1.1, g: 5.2 },
    { alimento: '1 cda de mantequilla de maní',         gramos: 15,  kcal: 95, p: 4,   c: 3,   g: 8, notas: '100% maní sin azúcar añadida.' },
    { alimento: '1 cdta de mantequilla',                gramos: 5,   kcal: 36, p: 0,   c: 0,   g: 4 },
    { alimento: '10 aceitunas',                          gramos: 35,  kcal: 41, p: 0.3, c: 1,   g: 3.8 },
    { alimento: '1 cda de semillas de chía',            gramos: 12,  kcal: 58, p: 2,   c: 5,   g: 3.7 },
  ],
}

/** Macros promedio por porción de cada grupo. Usado para distribuir el target
 *  nutricional total en # de porciones por grupo. */
export const MACROS_POR_GRUPO: Record<GrupoPorcion, { kcal: number; p: number; c: number; g: number }> = {
  lacteos:   { kcal: 90,  p: 6,  c: 10, g: 2 },
  frutas:    { kcal: 60,  p: 1,  c: 15, g: 0.3 },
  verduras:  { kcal: 25,  p: 1.5, c: 5,  g: 0.3 },
  cereales:  { kcal: 80,  p: 3,  c: 15, g: 1 },
  proteinas: { kcal: 75,  p: 7,  c: 0,  g: 4 },
  grasas:    { kcal: 45,  p: 0.3, c: 0.5, g: 5 },
}

export interface DistribucionPorciones {
  lacteos: number
  frutas: number
  verduras: number
  cereales: number
  proteinas: number
  grasas: number
  /** Macros totales que aporta esta distribución (para validar vs target) */
  totales: { kcal: number; p: number; c: number; g: number }
  /** Diferencia con el target (delta = aportado - target) */
  delta: { kcal: number; p: number; c: number; g: number }
}

/**
 * Distribuye el target nutricional en # de porciones por grupo.
 *
 * Algoritmo (basado en práctica clínica Sochinut):
 *  1. Fijar lácteos según objetivo (2 mantenimiento, 3 hipertrofia, 2 déficit)
 *  2. Fijar frutas según kcal target (2-4 porciones)
 *  3. Verduras libre (4 porciones recomendadas, no se cuentan estrictamente)
 *  4. Calcular proteínas restantes después de lácteos
 *  5. Calcular cereales con el CHO remanente
 *  6. Calcular grasas con la grasa remanente
 *
 * Los #s se redondean al entero o medio más cercano (intercambios son
 * unidades enteras o medias en la práctica clínica).
 */
export function distribuirEnPorciones(
  kcalTarget: number,
  proteinaG: number,
  choG: number,
  grasaG: number,
  objetivo: 'perdida grasa' | 'mantenimiento' | 'hipertrofia',
): DistribucionPorciones {
  // 1. Fijar lácteos según objetivo
  const lacteos =
    objetivo === 'hipertrofia'   ? 3 :
    objetivo === 'perdida grasa' ? 2 :
                                    2

  // 2. Fijar frutas según kcal total
  const frutas =
    kcalTarget <= 1500 ? 2 :
    kcalTarget <  2300 ? 3 :
                          4

  // 3. Verduras (recomendación estándar 3-4, no se ajusta finamente)
  const verduras = 4

  // 4. Calcular CHO ya aportado por frutas + verduras + lácteos
  const choAportado = lacteos * MACROS_POR_GRUPO.lacteos.c + frutas * MACROS_POR_GRUPO.frutas.c + verduras * MACROS_POR_GRUPO.verduras.c
  const choRestante = Math.max(0, choG - choAportado)
  const cereales = Math.max(0, Math.round((choRestante / MACROS_POR_GRUPO.cereales.c) * 2) / 2)

  // 5. Calcular proteínas restantes (target - aportado por lácteos)
  const protAportadoPorLacteos = lacteos * MACROS_POR_GRUPO.lacteos.p
  const protAportadoPorCereales = cereales * MACROS_POR_GRUPO.cereales.p
  const protRestante = Math.max(0, proteinaG - protAportadoPorLacteos - protAportadoPorCereales)
  const proteinas = Math.max(0, Math.round((protRestante / MACROS_POR_GRUPO.proteinas.p) * 2) / 2)

  // 6. Calcular grasas restantes (target - aportado por todos los grupos)
  const grasaAportada =
    lacteos   * MACROS_POR_GRUPO.lacteos.g +
    cereales  * MACROS_POR_GRUPO.cereales.g +
    proteinas * MACROS_POR_GRUPO.proteinas.g +
    frutas    * MACROS_POR_GRUPO.frutas.g
  const grasaRestante = Math.max(0, grasaG - grasaAportada)
  const grasas = Math.max(0, Math.round((grasaRestante / MACROS_POR_GRUPO.grasas.g) * 2) / 2)

  // Macros totales con la distribución calculada
  const grupos: Record<GrupoPorcion, number> = { lacteos, frutas, verduras, cereales, proteinas, grasas }
  const totales = (Object.keys(grupos) as GrupoPorcion[]).reduce(
    (acc, grupo) => {
      const porciones = grupos[grupo]
      const m = MACROS_POR_GRUPO[grupo]
      return {
        kcal: acc.kcal + porciones * m.kcal,
        p:    acc.p    + porciones * m.p,
        c:    acc.c    + porciones * m.c,
        g:    acc.g    + porciones * m.g,
      }
    },
    { kcal: 0, p: 0, c: 0, g: 0 },
  )

  return {
    lacteos, frutas, verduras, cereales, proteinas, grasas,
    totales: {
      kcal: Math.round(totales.kcal),
      p:    Math.round(totales.p),
      c:    Math.round(totales.c),
      g:    Math.round(totales.g),
    },
    delta: {
      kcal: Math.round(totales.kcal - kcalTarget),
      p:    Math.round(totales.p    - proteinaG),
      c:    Math.round(totales.c    - choG),
      g:    Math.round(totales.g    - grasaG),
    },
  }
}

/** Modalidad de planificación elegida por el profesional. */
export type ModalidadPlan = 'menus' | 'porciones'

export const MODALIDAD_PLAN_LABELS: Record<ModalidadPlan, { label: string; emoji: string; desc: string }> = {
  menus:     { label: 'Plan por menús',     emoji: '🍽️', desc: 'Preparaciones específicas con foto, pasos e ingredientes. Más guiado.' },
  porciones: { label: 'Plan por porciones', emoji: '⚖️', desc: 'Intercambios alimentarios por grupos. Más flexible. Lista chilena INTA/Sochinut.' },
}
