/**
 * bariatrica.ts — Adaptación de plan nutricional para pacientes post-cirugía bariátrica.
 *
 * REFERENCIAS BIBLIOGRÁFICAS:
 *
 *  1. Mechanick JI et al. "Clinical Practice Guidelines for the Perioperative
 *     Nutrition, Metabolic, and Nonsurgical Support of Patients Undergoing
 *     Bariatric Procedures – 2019 Update". Endocr Pract. 2019;25(12):1346-1359.
 *     (AACE / TOS / ASMBS / OMA / ASA joint guideline)
 *
 *  2. O'Kane M et al. "British Obesity and Metabolic Surgery Society (BOMSS)
 *     Guidelines on perioperative and postoperative biochemical monitoring and
 *     micronutrient replacement for patients undergoing bariatric surgery -
 *     2020 update". Obes Rev. 2020;21(11):e13087.
 *
 *  3. Parrott J et al. "American Society for Metabolic and Bariatric Surgery
 *     Integrated Health Nutritional Guidelines for the Surgical Weight Loss
 *     Patient – 2016 Update: Micronutrients". Surg Obes Relat Dis. 2017;13(5):727-741.
 *
 *  4. Sherf Dagan S et al. "Nutritional Recommendations for Adult Bariatric
 *     Surgery Patients: Clinical Practice". Adv Nutr. 2017;8(2):382-394.
 *
 *  5. Tabesh MR et al. "Nutrition, Physical Activity, and Prescription of
 *     Supplements in Pre- and Post-bariatric Surgery Patients: a Practical
 *     Guideline". Obes Surg. 2019;29(10):3385-3400.
 *
 * REGLAS CLAVE QUE APLICA ESTE MÓDULO:
 *
 *  - Volumen máximo por comida varía según fase post-op (capacidad gástrica
 *    reducida tras sleeve gastrectomy o bypass Y-en-Roux).
 *  - Proteína prioridad: 60-80 g/día (sleeve), 80-100 g/día (bypass RYGB)
 *    para preservar masa magra durante la pérdida acelerada.
 *  - 4-6 comidas pequeñas distribuidas en el día (no 2-3 grandes).
 *  - Líquidos separados de sólidos por 30 min antes/después (riesgo de
 *    dumping syndrome en bypass; saciedad acelerada en sleeve).
 *  - Densidad calórica progresiva: arrancar con purés/líquidos, llegar a
 *    sólidos adaptados a partir de 8 semanas post-op.
 *
 * IMPORTANTE LEGAL/CLÍNICO:
 *  Este módulo NO reemplaza la indicación del cirujano bariátrico o
 *  nutricionista a cargo. El plan adaptado es una sugerencia inicial que el
 *  profesional DEBE revisar caso a caso. La fase post-op declarada por el
 *  paciente puede no coincidir con su evolución clínica real.
 */

export type CirugiaBariatricaTipo =
  | 'ninguna'
  | 'sleeve'           // Manga gástrica / gastrectomía vertical
  | 'bypass'           // Bypass gástrico Y de Roux (RYGB)
  | 'banda'            // Banda gástrica ajustable
  | 'otra'             // BPD/DS, mini-bypass, SADI, etc.

export type FasePostBariatrica =
  | 'no_aplica'
  | 'fase_1'           // Días 1-2: líquidos claros
  | 'fase_2'           // Días 3-14: líquidos completos
  | 'fase_3'           // Semanas 3-4: purés
  | 'fase_4'           // Semanas 5-6: blandos
  | 'fase_5'           // Semanas 7-8: sólidos blandos
  | 'mantenimiento'    // >2 meses: alimentación normal adaptada

export const CIRUGIA_BARIATRICA_LABELS: Record<CirugiaBariatricaTipo, string> = {
  ninguna: 'No he tenido cirugía bariátrica',
  sleeve:  'Manga gástrica (sleeve / gastrectomía vertical)',
  bypass:  'Bypass gástrico Y-en-Roux (RYGB)',
  banda:   'Banda gástrica ajustable',
  otra:    'Otra (BPD/DS, mini-bypass, SADI, etc.)',
}

export const FASE_POST_LABELS: Record<FasePostBariatrica, { label: string; periodo: string; textura: string }> = {
  no_aplica:     { label: '—',                       periodo: '',                textura: '' },
  fase_1:        { label: 'Líquidos claros',         periodo: 'Días 1-2',        textura: 'Solo líquidos claros (agua, caldo colado)' },
  fase_2:        { label: 'Líquidos completos',      periodo: 'Días 3-14',       textura: 'Líquidos completos (leche, batidos, sopas coladas)' },
  fase_3:        { label: 'Purés',                   periodo: 'Semanas 3-4',     textura: 'Texturas suaves tipo puré' },
  fase_4:        { label: 'Blandos',                 periodo: 'Semanas 5-6',     textura: 'Alimentos blandos cocidos' },
  fase_5:        { label: 'Sólidos blandos',         periodo: 'Semanas 7-8',     textura: 'Sólidos blandos y bien masticados' },
  mantenimiento: { label: 'Mantenimiento adaptado',  periodo: 'Desde 2 meses',   textura: 'Alimentación normal en volúmenes pequeños' },
}

/** Volumen MÁXIMO por comida principal (en mililitros / gramos equivalentes).
 *  Basado en Mechanick 2019 (Endocr Pract) + ASMBS 2016 (Parrott et al).
 *  El motor escalará los platos para no exceder este volumen. */
export const VOLUMEN_MAX_POR_COMIDA_ML: Record<FasePostBariatrica, number> = {
  no_aplica:     Infinity,
  fase_1:        30,    // 30ml cada 15 min (no es "comida" tradicional)
  fase_2:        120,   // 60-120ml por comida (rango clínico)
  fase_3:        150,   // 100-150ml o 1/4 - 1/2 taza
  fase_4:        180,   // 150-180ml o ~3/4 taza
  fase_5:        200,   // 180-200ml
  mantenimiento: 250,   // 200-250ml (1 taza) - capacidad gástrica estable
}

/** Proteína objetivo gramos/día según tipo de cirugía.
 *  - Sleeve: 60-80 g/día (Mechanick 2019; Sherf Dagan 2017)
 *  - Bypass RYGB: 80-100 g/día (mayor riesgo de malabsorción)
 *  - Banda: 60-80 g/día (sin malabsorción, similar a sleeve)
 *  - Otra (BPD/DS): 90-120 g/día (alta malabsorción) */
export const PROTEINA_OBJETIVO_G_DIA: Record<CirugiaBariatricaTipo, { min: number; max: number }> = {
  ninguna: { min: 0,   max: 0   },   // No aplica
  sleeve:  { min: 60,  max: 80  },
  bypass:  { min: 80,  max: 100 },
  banda:   { min: 60,  max: 80  },
  otra:    { min: 90,  max: 120 },
}

/** Número de comidas pequeñas por día recomendado.
 *  Mechanick 2019: "4-6 small meals throughout the day rather than 2-3 large meals". */
export const COMIDAS_POR_DIA_RECOMENDADO: Record<FasePostBariatrica, number> = {
  no_aplica:     5,
  fase_1:        8,    // Sorbos cada 15 min
  fase_2:        6,    // Tomas pequeñas frecuentes
  fase_3:        6,
  fase_4:        5,
  fase_5:        5,
  mantenimiento: 5,    // 4-6 según tolerancia
}

/** Devuelve el factor de escala para gramajes de un plato post-bariátrico.
 *  Compara el volumen total estimado del plato (sum carne + carbo + verduras)
 *  contra el VOLUMEN_MAX_POR_COMIDA_ML de la fase. Si excede, retorna ratio < 1.
 *
 *  IMPORTANTE: aplica solo si cirugía != 'ninguna' Y fase != 'no_aplica'.
 *  El profesional siempre puede sobrescribir los gramajes manualmente desde
 *  los sliders carne / carbo en el wizard.
 */
export function factorEscalaBariatrica(
  cirugia: CirugiaBariatricaTipo | undefined,
  fase: FasePostBariatrica | undefined,
  volumenEstimadoMl: number,
): number {
  if (!cirugia || cirugia === 'ninguna') return 1
  if (!fase || fase === 'no_aplica') return 1
  const max = VOLUMEN_MAX_POR_COMIDA_ML[fase]
  if (!Number.isFinite(max)) return 1
  if (volumenEstimadoMl <= max) return 1
  return max / volumenEstimadoMl
}

/** Densidad calórica aproximada para estimar el volumen total de un plato.
 *  Asumimos 1g sólido ≈ 1ml (aproximación clínica suficiente para escalado). */
export function estimarVolumenPlatoMl(
  carneGramos: number | undefined,
  carboGramos: number | undefined,
  verdurasGramos: number = 100,  // ensalada/guarnición típica
): number {
  return (carneGramos ?? 0) + (carboGramos ?? 0) + verdurasGramos
}

/** Override de proteína objetivo según tipo de cirugía y fase post-op.
 *  El cálculo estándar usa peso × 1.9-2.1, lo cual genera 200g+ para pacientes
 *  con sobrepeso — IMPOSIBLE de cubrir con capacidad gástrica reducida.
 *
 *  Mechanick 2019 + Sherf Dagan 2017: la proteína post-bariátrica se calcula
 *  por valor ABSOLUTO según tipo de cirugía, NO por kg de peso.
 *
 *  Regla:
 *   - Fases 1-5 (post-op activo): forzar al MAX del rango (prioridad
 *     absoluta de proteína para preservar masa magra durante pérdida acelerada).
 *   - Mantenimiento (>2 meses): usar MIN del rango como piso. Si el cálculo
 *     estándar daba más, se respeta (paciente puede tolerar más volumen).
 *
 *  Returns: proteína objetivo en gramos/día, o null si no aplica
 *  (paciente sin cirugía o sin fase declarada).
 */
export function proteinaBariatricaOverride(
  cirugia: CirugiaBariatricaTipo | undefined,
  fase: FasePostBariatrica | undefined,
  calculadaEstandar: number,
): number | null {
  if (!cirugia || cirugia === 'ninguna') return null
  if (!fase || fase === 'no_aplica') return null
  const target = PROTEINA_OBJETIVO_G_DIA[cirugia]
  if (!target || target.max === 0) return null

  if (fase === 'mantenimiento') {
    // Piso: nunca menos que el min Mechanick. Techo: el calculado estándar.
    return Math.max(calculadaEstandar, target.min)
  }
  // Fases 1-5: forzar al MAX del rango como objetivo (paciente debe alcanzarlo).
  return target.max
}

/** Texturas alimentarias permitidas por fase. Usado para alertar al paciente
 *  que en fases muy tempranas (1-3) el catálogo estándar de Centro Metabólico
 *  NO es apropiado (son liquidos/purés terapéuticos que arma el equipo médico).
 *
 *  Returns: true si el catálogo regular es apropiado, false si requiere plan
 *  especializado del cirujano/nutricionista. */
export function faseAceptaCatalogoEstandar(fase: FasePostBariatrica | undefined): boolean {
  if (!fase || fase === 'no_aplica' || fase === 'mantenimiento') return true
  // fase_5 (sólidos blandos, semanas 7-8): catálogo OK con gramajes escalados
  // fase_4 (blandos, semanas 5-6): catálogo parcialmente OK (desayunos y colaciones)
  // fase_1/2/3 (líquidos y purés): NO apto, requiere plan especializado
  return fase === 'fase_5' || fase === 'fase_4'
}
