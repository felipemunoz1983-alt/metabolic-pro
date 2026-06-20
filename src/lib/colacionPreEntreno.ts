// ── Módulo: sugerencia de colación pre-entreno · Centro Metabólico Pro ──
//
// Calcula la hora sugerida de la colación pre-entreno y propone su contenido
// según objetivo, hora del día, anticipación al entreno y duración de la sesión.
//
// Heurística basada en práctica clínica deportiva chilena (Sochinut) +
// recomendaciones del ACSM 2016 + Burke 2011 (timing de CHO peri-entreno):
//
//  - Anticipación < 30 min  → CHO simple, mínima grasa/fibra, sin proteína sólida
//  - Anticipación 30-60 min → CHO moderado + algo de proteína líquida
//  - Anticipación 60-90 min → CHO + proteína moderada + grasa moderada
//  - Anticipación > 90 min  → comida pequeña balanceada
//
// El módulo NO escala porciones automáticamente — entrega 3 opciones con
// macros sugeridos. El profesional decide cuál encaja con el plan del paciente.

import type { Objetivo } from './nutrition'

/** Anticipación en minutos entre la colación pre-entreno y el inicio del entreno.
 *  Default 60 — balanceado para la mayoría de pacientes. */
export const DEFAULT_ANTICIPACION_MIN = 60

/** Una opción concreta de colación pre-entreno. */
export interface OpcionColacionPre {
  /** Nombre legible de la opción */
  label: string
  /** Ejemplo de ingredientes y cantidades */
  items: string[]
  /** Macros aproximados de la opción */
  kcal: number
  p: number
  c: number
  g: number
  /** Nota clínica: timing recomendado, contraindicaciones digestivas, etc. */
  nota?: string
  /** Apto vegano */
  vegano?: boolean
}

/** Categorías de anticipación clínica. Determinan el tipo de colación recomendable. */
export type AnticipacionCategoria = 'inmediata' | 'corta' | 'optima' | 'larga'

export interface SugerenciaColacionPre {
  /** Hora del entreno (HH:MM) */
  horaEntreno: string
  /** Anticipación en minutos */
  anticipacionMin: number
  /** Hora calculada para tomar la colación (HH:MM) */
  horaColacion: string
  /** Categoría clínica de la anticipación */
  categoria: AnticipacionCategoria
  /** Texto explicativo de la lógica aplicada */
  racional: string
  /** 3 opciones sugeridas, ordenadas de menor a mayor calorías */
  opciones: OpcionColacionPre[]
}

// ─── Helpers de tiempo ───────────────────────────────────────────────────────

function parseHHMM(hhmm: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}

function formatHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function restarMinutos(hhmm: string, minutos: number): string {
  const parsed = parseHHMM(hhmm)
  if (!parsed) return hhmm
  const totalMinutos = parsed.h * 60 + parsed.m - minutos
  // Manejar negativos (entreno temprano AM → colación día anterior teórico)
  const ajustado = ((totalMinutos % (24 * 60)) + 24 * 60) % (24 * 60)
  return formatHHMM(Math.floor(ajustado / 60), ajustado % 60)
}

function categorizarAnticipacion(min: number): AnticipacionCategoria {
  if (min < 30) return 'inmediata'
  if (min < 60) return 'corta'
  if (min <= 90) return 'optima'
  return 'larga'
}

// ─── Generación de opciones por escenario ────────────────────────────────────

/** Opciones para anticipación INMEDIATA (<30 min): CHO simple, sin proteína sólida.
 *  Foco: glucosa rápida disponible al inicio del entreno. */
function opcionesInmediata(objetivo: Objetivo): OpcionColacionPre[] {
  const base: OpcionColacionPre[] = [
    {
      label: 'Plátano + agua',
      items: ['1 plátano mediano (120g)', '300ml agua'],
      kcal: 110, p: 1.3, c: 27, g: 0.3,
      nota: 'CHO simple de absorción rápida. Sin proteína ni grasa para no enlentecer la digestión.',
      vegano: true,
    },
    {
      label: 'Dátiles + agua',
      items: ['3 dátiles deshuesados (~24g)', '300ml agua'],
      kcal: 67, p: 0.5, c: 18, g: 0,
      nota: 'CHO concentrado. Ideal si el entreno es de alta intensidad y corta duración.',
      vegano: true,
    },
    {
      label: 'Gel deportivo + agua',
      items: ['1 gel de energía (30-40g, ~25g CHO)', '300ml agua'],
      kcal: 100, p: 0, c: 25, g: 0,
      nota: 'Solución comercial para entrenos > 60 min. Tomar inmediato antes de iniciar.',
      vegano: true,
    },
  ]
  // Para hipertrofia, agregar opción con whey líquida (digiere rápido)
  if (objetivo === 'hipertrofia') {
    base.push({
      label: 'Batido de whey hidrolizado (rápido)',
      items: ['1 scoop whey hidrolizado (~25g)', '300ml agua'],
      kcal: 100, p: 22, c: 2, g: 1,
      nota: 'Hidrolizado tiene absorción más rápida que el isolate. Si tolera, puede ir 20-30 min pre.',
    })
  }
  return base
}

/** Opciones para anticipación CORTA (30-60 min): CHO + proteína líquida moderada. */
function opcionesCorta(objetivo: Objetivo): OpcionColacionPre[] {
  const base: OpcionColacionPre[] = [
    {
      label: 'Plátano + scoop whey',
      items: ['1 plátano mediano (120g)', '1 scoop whey (~30g)', '300ml agua'],
      kcal: 230, p: 25, c: 30, g: 1.7,
      nota: 'Combinación clásica pre-entreno. CHO del plátano + proteína de absorción rápida.',
    },
    {
      label: 'Yogur descremado + miel',
      items: ['150g yogur natural descremado', '1 cdta miel (7g)', '1 fruta chica'],
      kcal: 170, p: 8, c: 30, g: 0.4,
      nota: 'Opción láctea. Si paciente tiene reflujo, preferir 60-90 min antes.',
    },
    {
      label: 'Pan integral + miel',
      items: ['1 rebanada pan integral (31g)', '1 cdta miel (7g)', '300ml agua'],
      kcal: 105, p: 3.3, c: 21, g: 1,
      nota: 'Opción baja en grasa y proteína. Para entrenos cortos < 45 min.',
      vegano: true,
    },
  ]
  if (objetivo === 'hipertrofia') {
    base.unshift({
      label: 'Avena + whey + plátano',
      items: ['40g avena en hojuelas', '1 scoop whey (~30g)', '½ plátano', '200ml leche descremada'],
      kcal: 360, p: 32, c: 50, g: 4,
      nota: 'Pre-entreno robusto para hipertrofia. Aporta glucógeno + aminoácidos antes del estímulo.',
    })
  }
  if (objetivo === 'perdida grasa') {
    base.push({
      label: 'Café + 1 fruta chica',
      items: ['Café espresso o americano sin azúcar', '1 fruta chica (manzana o pera 100g)'],
      kcal: 55, p: 0.3, c: 14, g: 0.2,
      nota: 'Cafeína mejora rendimiento + sensación de saciedad. Fruta cubre glucemia mínima.',
      vegano: true,
    })
  }
  return base
}

/** Opciones para anticipación ÓPTIMA (60-90 min): CHO + proteína + grasa moderada. */
function opcionesOptima(objetivo: Objetivo): OpcionColacionPre[] {
  const base: OpcionColacionPre[] = [
    {
      label: 'Avena con leche + fruta',
      items: ['40g avena cocida', '200ml leche descremada', '1 fruta mediana', 'Canela'],
      kcal: 245, p: 11, c: 45, g: 3,
      nota: 'Combinación equilibrada. Avena entrega energía sostenida durante el entreno.',
    },
    {
      label: 'Tostada integral + huevo',
      items: ['1 rebanada pan integral (31g)', '1 huevo revuelto', '½ palta (40g)'],
      kcal: 230, p: 9, c: 17, g: 12,
      nota: 'Opción salada balanceada. Si hay sensibilidad gástrica, reducir palta.',
    },
    {
      label: 'Yogur griego + granola + berries',
      items: ['150g yogur griego natural', '20g granola sin azúcar', '½ taza berries'],
      kcal: 260, p: 12, c: 35, g: 7,
      nota: 'Si el paciente entrena fuerza/hipertrofia, considerar agregar 1 scoop de whey.',
    },
  ]
  if (objetivo === 'hipertrofia') {
    base.unshift({
      label: 'Sándwich integral con pollo',
      items: ['2 rebanadas pan integral', '60g pollo cocido', 'Lechuga, tomate', '1 cdta aceite oliva'],
      kcal: 320, p: 22, c: 32, g: 11,
      nota: 'Pre-entreno robusto. Carbo + proteína sólida ideal 75-90 min antes.',
    })
  }
  if (objetivo === 'perdida grasa') {
    base.push({
      label: 'Manzana + 6 almendras + té verde',
      items: ['1 manzana mediana', '6 almendras (8g)', 'Té verde sin azúcar'],
      kcal: 130, p: 1.6, c: 23, g: 4,
      nota: 'Bajo kcal pero con CHO + grasa de absorción media. Té verde aporta cafeína suave.',
      vegano: true,
    })
  }
  return base
}

/** Opciones para anticipación LARGA (>90 min): comida pequeña balanceada. */
function opcionesLarga(objetivo: Objetivo): OpcionColacionPre[] {
  const base: OpcionColacionPre[] = [
    {
      label: 'Bowl de avena proteica',
      items: ['60g avena en hojuelas', '200ml leche descremada', '1 cda mantequilla maní', '1 plátano'],
      kcal: 430, p: 14, c: 70, g: 11,
      nota: 'Si el entreno es > 2h después, esta opción cubre las reservas de glucógeno.',
    },
    {
      label: 'Sándwich integral con queso y palta',
      items: ['2 rebanadas pan integral', '30g queso fresco', '¼ palta', '60g tomate'],
      kcal: 305, p: 13, c: 32, g: 14,
      nota: 'Balanceada. CHO complejo + proteína + grasa cardio-saludable.',
    },
    {
      label: 'Yogur natural + granola + frutos secos',
      items: ['150g yogur natural', '30g granola sin azúcar', '10 almendras', '½ taza berries'],
      kcal: 295, p: 12, c: 35, g: 12,
      nota: 'Versátil. Si entrena post-once chilena, esta puede SER la once.',
    },
  ]
  if (objetivo === 'hipertrofia') {
    base.unshift({
      label: 'Arroz integral + pollo + verduras',
      items: ['½ taza arroz integral cocido', '90g pollo cocido', '1 taza verduras salteadas', '1 cdta aceite'],
      kcal: 380, p: 28, c: 42, g: 9,
      nota: 'Comida tipo almuerzo chica. Ideal 2-3h antes del entreno, deja glucógeno completo.',
    })
  }
  return base
}

// ─── Función principal ───────────────────────────────────────────────────────

/** Calcula la hora sugerida de la colación pre-entreno y entrega opciones
 *  según objetivo, anticipación y duración del entreno.
 *
 *  @param horaEntreno HH:MM. Ejemplo: "07:30" para entreno matinal.
 *  @param objetivo Objetivo nutricional del paciente.
 *  @param opts Opciones: anticipación (default 60 min), duración entreno (min).
 *
 *  @returns SugerenciaColacionPre con hora calculada, racional y 3-5 opciones.
 *  @returns null si horaEntreno tiene formato inválido.
 */
export function sugerirColacionPreEntreno(
  horaEntreno: string,
  objetivo: Objetivo,
  opts?: { anticipacionMin?: number; duracionEntrenoMin?: number },
): SugerenciaColacionPre | null {
  if (!parseHHMM(horaEntreno)) return null

  const anticipacionMin = opts?.anticipacionMin ?? DEFAULT_ANTICIPACION_MIN
  const duracionEntrenoMin = opts?.duracionEntrenoMin ?? 60
  const horaColacion = restarMinutos(horaEntreno, anticipacionMin)
  const categoria = categorizarAnticipacion(anticipacionMin)

  let opciones: OpcionColacionPre[]
  let racionalBase: string

  switch (categoria) {
    case 'inmediata':
      opciones = opcionesInmediata(objetivo)
      racionalBase = `Con ${anticipacionMin} min de anticipación se prioriza CHO simple de absorción rápida (glucosa disponible al inicio del entreno). Se evita proteína sólida y grasa para no enlentecer la digestión.`
      break
    case 'corta':
      opciones = opcionesCorta(objetivo)
      racionalBase = `Con ${anticipacionMin} min de anticipación se busca CHO con proteína líquida moderada. El estómago alcanza a vaciar sin pesadez durante el entreno.`
      break
    case 'optima':
      opciones = opcionesOptima(objetivo)
      racionalBase = `${anticipacionMin} min es la ventana óptima: permite CHO + proteína + grasa moderada. El paciente entra al entreno con glucemia estable y aminoácidos disponibles.`
      break
    case 'larga':
      opciones = opcionesLarga(objetivo)
      racionalBase = `Con ${anticipacionMin} min de anticipación funciona como una comida pequeña balanceada. Si el entreno cae cerca de un tiempo de comida habitual (almuerzo/once), esta colación puede SER ese tiempo.`
      break
  }

  // Ajuste por duración del entreno: si > 75 min agregar nota de CHO extra durante el entreno
  let racional = racionalBase
  if (duracionEntrenoMin > 75) {
    racional += ` Como el entreno dura ${duracionEntrenoMin} min, considerar 30g de CHO líquido (bebida deportiva o gel) cada 45-60 min durante la sesión.`
  }

  // Ajuste por objetivo: nota clínica corta
  if (objetivo === 'perdida grasa') {
    racional += ' Para pérdida de grasa se priorizan opciones más bajas en kcal pero suficientes para sostener el rendimiento — el déficit calórico se construye en la suma del día, no eliminando comida pre-entreno.'
  } else if (objetivo === 'hipertrofia') {
    racional += ' Para hipertrofia se priorizan opciones con más CHO + proteína para optimizar síntesis proteica peri-entreno y recuperación.'
  }

  return {
    horaEntreno,
    anticipacionMin,
    horaColacion,
    categoria,
    racional,
    opciones,
  }
}
