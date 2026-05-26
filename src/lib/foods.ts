// ── Base de alimentos · Centro Metabólico Pro ──

// Las imagenes del catalogo se sirven desde /public/img/ del propio Next.js (Vercel CDN).
// Antes apuntaban a raw.githubusercontent.com, pero ese host requiere auth para repos
// privados — al hacer el repo privado las fotos quedaban 404 para los pacientes.
// /img/ es servido por Vercel directo desde la build, sin depender de GitHub.
const IMG = '/img/'
const USP = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&h=600&fit=crop&q=90&auto=format`

export interface MealOption {
  label: string
  items: string[]
  baseKcal: number
  p: number
  c: number
  g: number
  foto?: string
  tiempo?: string
  pasos?: string[]
  alergenosNota?: string  // aviso alérgenos (barras proteicas)
  /** Tendencia alimentaria. undefined = compatible con ambas. */
  tendencia?: ('omnivoro' | 'vegetariano' | 'vegano')[]
  /** Sellos chilenos de advertencia nutricional (p.ej. "Alto en Grasas Saturadas") */
  sellos?: string[]
  tieneHuevo?: boolean      // muestra selector de cantidad de huevos en PlanGenerator
  eggsDefault?: number      // cantidad de huevos por defecto de la receta
  /** true = la preparación incluye carne / pescado — activa selector de gramaje */
  tieneCarne?: boolean
  /** Tipo de carne en la preparación, usado para ajustar macros al cambiar gramaje */
  carneTipo?: 'pollo' | 'pavo' | 'carne_roja' | 'salmon' | 'atun'
  /** Gramaje base de la carne en la receta (ej: 150g pollo → 150) */
  carneGramosBase?: number
  /** true = la preparación incluye un carbohidrato principal cuyo gramaje ajusta
   *  el profesional según el requerimiento calórico del paciente (objetivo, target). */
  tieneCarboPrincipal?: boolean
  /** Tipo del carbo principal — usado para ajustar macros al cambiar gramaje */
  carboTipo?: 'arroz_blanco' | 'arroz_integral' | 'papas' | 'quinoa' | 'fideos' | 'pan_integral'
  /** Gramaje base del carbo principal en la receta (peso cocido) */
  carboGramosBase?: number
  requiereWhey?: boolean    // true = solo incluir si el profesional indica proteína en polvo
  tieneYogur?: boolean      // muestra selector de tipo de yogur en PlanGenerator
  /** Alérgenos / componentes que contiene — para filtrar por digIntolerancias del paciente.
   *  Valores válidos coinciden con CheckChips de Intolerancias en step 3:
   *  'lactosa' | 'gluten' | 'legumbres' | 'cruciferas' | 'cebolla_ajo' | 'soya' | 'frutos_secos' | 'mani' | 'huevo' */
  contiene?: string[]
  /** true = alta carga FODMAP — se oculta si el paciente declara SIBO o SII */
  altoFODMAP?: boolean
  /** true = alta en grasas saturadas / frituras — se filtra de cenas si hay reflujo frecuente */
  altaGrasa?: boolean
  /** Estacionalidad: 'frio' para sopas/cremas (preferida en otoño-invierno),
   *  'calor' para bowls/ensaladas frías (preferida en primavera-verano). undefined = todo año. */
  estacional?: 'frio' | 'calor'
  /** Dificultad culinaria. Si paciente declara principiante, se ocultan 'avanzado'. */
  dificultad?: 'facil' | 'intermedio' | 'avanzado'
  /** Duración numérica en minutos para filtrar por tiempoCocinar del paciente.
   *  Si no se define, se intenta parsear desde `tiempo` (string como "20 min"). */
  tiempoMin?: number
  /** true = producto industrial en porción fija (barra, snack envasado, postre individual).
   *  buildMeal NO escala sus macros al kcal del slot — usa baseKcal/p/c/g tal cual.
   *  Aplica a: barras de proteína, snacks Nutrevo, Goodnes Protein, Costa Mini Chips,
   *  galletón Quaker, y cualquier producto que venga en envase con porción única. */
  porcionFija?: boolean
  /** true = la preparación incluye pan (tostada, sándwich, marraqueta, etc.).
   *  Activa el selector de tipo de pan en el wizard. El paciente puede elegir
   *  cambiar el tipo (ej. integral → masa madre, marraqueta → multicereal). */
  tienePan?: boolean
  /** Tipo de pan que usa la receta por defecto. Se usa para calcular el delta
   *  cuando el paciente elige otro tipo en el wizard. */
  panTipoDefault?: 'integral' | 'blanco' | 'marraqueta' | 'multicereal' | 'molde_integral' | 'pita_integral' | 'masa_madre' | 'sin_gluten' | 'proteico' | 'hallulla'
}

// ─── Macros por gramo de carne (USDA simplificado) ───────────────────────────
// Usado para reajustar p/c/g cuando el paciente cambia el gramaje en su selector.
export const CARNE_MACROS_POR_GRAMO: Record<
  'pollo' | 'pavo' | 'carne_roja' | 'salmon' | 'atun',
  { kcal: number; p: number; g: number }
> = {
  pollo:      { kcal: 1.65, p: 0.31, g: 0.036 },  // pechuga magra cocida
  pavo:       { kcal: 1.35, p: 0.29, g: 0.020 },  // pechuga pavo
  carne_roja: { kcal: 1.50, p: 0.26, g: 0.050 },  // posta/lomo magro
  salmon:     { kcal: 2.00, p: 0.22, g: 0.130 },  // salmón fresco
  atun:       { kcal: 1.05, p: 0.26, g: 0.010 },  // atún en agua
}

// ─── Macros por gramo de carbohidrato principal (USDA, peso COCIDO) ──────────
// Usado para reajustar c/kcal/p cuando el profesional cambia el gramaje del
// carbo principal según el target del paciente (déficit / mantenimiento / surplus).
export const CARBO_MACROS_POR_GRAMO: Record<
  'arroz_blanco' | 'arroz_integral' | 'papas' | 'quinoa' | 'fideos' | 'pan_integral',
  { kcal: number; p: number; c: number; g: number }
> = {
  arroz_blanco:    { kcal: 1.30, p: 0.027, c: 0.28, g: 0.003 },   // arroz blanco cocido
  arroz_integral:  { kcal: 1.11, p: 0.026, c: 0.23, g: 0.009 },   // arroz integral cocido
  papas:           { kcal: 0.87, p: 0.020, c: 0.20, g: 0.001 },   // papa cocida con cáscara
  quinoa:          { kcal: 1.20, p: 0.044, c: 0.21, g: 0.019 },   // quinoa cocida
  fideos:          { kcal: 1.31, p: 0.050, c: 0.25, g: 0.011 },   // fideos cocidos
  pan_integral:    { kcal: 2.47, p: 0.130, c: 0.41, g: 0.034 },   // pan integral (no cocido — base seca)
}

// ─── Helpers de contexto temporal ─────────────────────────────────────────────
/** Estación actual en Chile (hemisferio sur).
 *  - frio: abril a septiembre (otoño + invierno)
 *  - calor: octubre a marzo (primavera + verano) */
export function getCurrentSeason(): 'frio' | 'calor' {
  const month = new Date().getMonth() + 1 // 1-12
  return month >= 4 && month <= 9 ? 'frio' : 'calor'
}

/** Parser de tiempo "20 min" → 20. Devuelve Infinity si no puede parsear. */
export function parseTiempoMin(opt: MealOption): number {
  if (opt.tiempoMin !== undefined) return opt.tiempoMin
  if (!opt.tiempo) return 30 // default razonable
  const match = opt.tiempo.match(/(\d+)/)
  return match ? Number(match[1]) : 30
}

/** Convierte el rango UI "menos_15" / "15_30" / "30_60" / "mas_60" a minutos máximos */
export function tiempoCocinarMax(t: string | undefined): number {
  switch (t) {
    case 'menos_15': return 15
    case '15_30': return 30
    case '30_60': return 60
    case 'mas_60': return Infinity
    default: return 30
  }
}

// ─── Tipos de yogur disponibles ───────────────────────────────────────────────
export const YOGUR_TIPOS = {
  griego: {
    label: 'Danone Oikos Griego Endulzado',
    emoji: '🥛',
    // item oficial Danone Oikos Griego Natural Endulzado 110g
    item: 'Yogur Danone Oikos Griego Natural Endulzado 110g',
    // Fuente: etiqueta oficial 110g — 104.5 kcal · 5.3g prot · 10.9g CH · 4.4g G · endulzado con estevia + sucralosa
    kcal: 105, p: 5, c: 11, g: 4,
    badge: '5g prot · Clásico griego Danone',
    alergenosNota: '⚠️ Danone Oikos · Puede contener trazas de almendra, pasas, nuez, soya y gluten (avena). Endulzado con estevia y sucralosa.',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/361284-900-900?width=900&height=900&aspect=true',
    vegano: false, vegetariano: true,
    contiene: ['lactosa', 'frutos_secos', 'soya', 'gluten'] as string[],
  },
  fullpro: {
    label: 'FullPro Protein Loncoleche',
    emoji: '💪',
    item: 'Yogur FullPro Protein Loncoleche 150g (frutilla)',
    // Fuente: etiqueta oficial 150g — 112.5 kcal · 18g prot · 7.5g CH · 1.2g G · sin lactosa
    kcal: 113, p: 18, c: 8, g: 1,
    badge: '18g prot · Sin lactosa · Bajo en grasa',
    alergenosNota: '⚠️ FullPro Loncoleche · Puede contener trazas de almendra, pasas, nuez, soya y gluten (avena).',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/485106-900-900?width=900&height=900&aspect=true',
    vegano: false, vegetariano: true,
    contiene: ['frutos_secos', 'soya', 'gluten'] as string[],
  },
  soprole_power: {
    label: 'Soprole Protein+ Power',
    emoji: '⚡',
    item: 'Yogur Soprole Protein+ Power 155g (frutilla)',
    // Fuente: etiqueta oficial 155g — 130 kcal · 16g prot · 11g CH · 2g G · sin lactosa · sin gluten · libre de sellos
    kcal: 130, p: 16, c: 11, g: 2,
    badge: '16g prot · Sin lactosa · Con Magnesio · Libre sellos',
    alergenosNota: '⚠️ Soprole Protein+ Power · Elaborado en líneas que también procesan nueces.',
    foto: 'https://www.soprole.cl/public/storage/imagenes/banners/202604011757power%20frutilla.png',
    vegano: false, vegetariano: true,
    contiene: ['frutos_secos'] as string[],
  },
  soprole_protein: {
    label: 'Soprole Protein+ Frutilla',
    emoji: '🍓',
    item: 'Yogur Soprole Protein+ Batido Frutilla 155g',
    // Fuente: etiqueta oficial 155g — 105 kcal · 10.2g prot · 9.8g CH · 2.8g G · sin lactosa · libre de gluten · libre de sellos
    kcal: 105, p: 10, c: 10, g: 3,
    badge: '10g prot · Sin lactosa · Libre gluten · Libre sellos',
    alergenosNota: '⚠️ Soprole Protein+ · Endulzado con sucralosa y estevia.',
    foto: 'https://www.soprole.cl/public/storage/imagenes/banners/202304051741batido-frutilla.png',
    vegano: false, vegetariano: true,
    contiene: [] as string[],
  },
  colun_protein: {
    label: 'Colun Protein Plus Vainilla',
    emoji: '🌾',
    item: 'Yogur Colun Protein Plus! Squeeze Vainilla 150g',
    // Fuente: etiqueta oficial 150g — 120 kcal · 11.1g prot · 17.9g CH · 0.5g G · sin lactosa · 0% grasa · libre de gluten
    kcal: 120, p: 11, c: 18, g: 1,
    badge: '11g prot · 0% grasa · Sin lactosa · Libre gluten',
    alergenosNota: '⚠️ Colun Protein Plus · Libre de soya, huevo, mariscos, maní, frutos secos, nueces, sulfitos, trigo, gluten y lactosa.',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/365573-900-900?width=900&height=900&aspect=true',
    vegano: false, vegetariano: true,
    contiene: [] as string[],   // el más limpio del catálogo: libre de 9 alérgenos comunes
  },
  loncoleche_vegetal: {
    label: 'Loncoleche Vegetal Soya',
    emoji: '🌱',
    item: 'Yogur Loncoleche Vegetal Soya con trozos Mango-Maracuyá 130g',
    // Fuente: etiqueta oficial 130g — 66.3 kcal · 3.4g prot · 9.4g CH · 1.2g G · 3.4g fibra · 100% vegetal · vegano
    kcal: 66, p: 3, c: 9, g: 1,
    badge: 'Vegano · 100% vegetal · 3g fibra',
    alergenosNota: '⚠️ Loncoleche Vegetal · Base soya · Vegano y vegetariano · Libre de huevo, peces, mariscos, maní, sulfitos y trigo. Solo 3.4g proteína por porción — combinar con otra fuente proteica.',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/325169-900-900?width=900&height=900&aspect=true',
    vegano: true, vegetariano: true,
    contiene: ['soya'] as string[],
  },
} as const

export type YogurTipo = keyof typeof YOGUR_TIPOS

// ─── Tipos de pan disponibles ────────────────────────────────────────────────
// Cada tipo define macros para SU porción típica (1 rebanada, 1 marraqueta, etc.)
// porque los panes chilenos tienen pesos estándar muy distintos entre sí.
// Si una receta usa 2 rebanadas, planGenerator multiplica el delta x2 automáticamente.
//
// El paciente elige UN tipo en el wizard (form.panTipo) y aplica a TODAS las
// comidas con `tienePan: true`. Cada opción define su `panTipoDefault` para
// que si el paciente no elige (o elige el mismo), no haya recálculo.
//
// Para preparaciones con 2 rebanadas (tostadas, sándwich con tapa), planGenerator
// detecta el número en el item ("2 tostadas pan integral") y escala.
export const PAN_TIPOS = {
  integral: {
    label: 'Pan Castaño Linaza Chía Prebiótico',
    emoji: '🍞',
    // Pan Castaño Linaza Chía Prebiótico (envase 600g · ~19 rebanadas).
    // Cada rebanada ≈ 31.5g. La etiqueta nutricional reporta por PORCIÓN
    // de 2 rebanadas (63g · 164 kcal) — lo aclaramos en el badge y en alergenosNota.
    item: 'pan Castaño Linaza Chía Prebiótico (1 rebanada · 31.5g)',
    gramos: 31.5,
    // Macros por 1 rebanada (31.5g) — derivadas de la etiqueta oficial Castaño:
    //   100g: 260 kcal · 13.2g P · 4.6g G · 39.7g C disponibles · 10.6g fibra · 370mg sodio
    //   1 porción (2 rebanadas, 63g): 163.8 kcal · 8.3g P · 2.9g G · 25g C · 6.7g fibra · 233mg sodio
    kcal: 82, p: 4.2, c: 12.5, g: 1.5,
    badge: 'Integral · Linaza+Chía · Prebiótico · Porción=2 rebanadas',
    alergenosNota: 'Pan Castaño Linaza Chía Prebiótico · Contiene gluten (trigo, avena). Aporta polidextrosa prebiótica (3.5%) y semillas de linaza/chía. Puede contener trazas de leche, soya, nueces, avena, maíz, quinua y semillas (amapola, calabaza, maravilla, sésamo). La porción estándar de etiqueta son 2 rebanadas (63g · 164 kcal · 8.3g proteína · 6.7g fibra).',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'medio',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/560590-900-900?width=900&height=900&aspect=true',
  },
  blanco: {
    label: 'Pan Ideal Blanco XL',
    emoji: '🍞',
    // Pan Ideal Blanco XL (envase 750g · ~27 rebanadas).
    // Cada rebanada ≈ 28g. La etiqueta reporta por PORCIÓN
    // de 2 rebanadas (56g · 144 kcal) — lo aclaramos en badge y nota.
    item: 'pan Ideal Blanco XL (1 rebanada · 28g)',
    gramos: 28,
    // Macros por 1 rebanada (28g) — derivadas de la etiqueta oficial Ideal:
    //   100g: 257 kcal · 9.8g P · 3.3g G · 47g C disponibles · 4.9g azúcares · 392mg sodio
    //   1 porción (2 rebanadas, 56g): 143.9 kcal · 5.5g P · 1.8g G · 26.3g C · 219.5mg sodio
    kcal: 72, p: 2.7, c: 13.2, g: 0.9,
    badge: 'Blanco suave · IG alto · Porción=2 rebanadas',
    alergenosNota: 'Pan Ideal Blanco XL · Contiene gluten (trigo). LIBRE de huevo, lactosa, peces, mariscos, maní y sulfitos. Apto APLV, vegano, vegetariano y kosher. La porción estándar son 2 rebanadas (56g · 144 kcal · 5.5g proteína · 219mg sodio).',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'alto',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/580441-900-900?width=900&height=900&aspect=true',
  },
  marraqueta: {
    label: 'Marraqueta',
    emoji: '🥖',
    // Datos del INTA Chile (Tabla de Composición Química de Alimentos Chilenos)
    // + estudio MINSAL-FAO sobre alimentos prioritarios chilenos.
    //
    // PORCIÓN DE REFERENCIA: 1 marraqueta entera = 90g (promedio nacional).
    // Rango real medido: 72g (Osorno) — 111g (Iquique).
    // Supermercado: ~86g · Panadería tradicional: ~94g.
    //
    // La PORCIÓN NUTRICIONAL HABITUAL en guías chilenas es ½ marraqueta (~45g · 112 kcal),
    // pero el catálogo del plan usa 1 unidad entera porque así se consume en la práctica.
    item: 'marraqueta (1 unidad · 90g)',
    gramos: 90,
    // Macros por 1 unidad de 90g — Fuente: INTA Chile + MINSAL/FAO:
    //   100g: 249 kcal · 9.46g P · 1.0g G · 63.04g C · 3.0g fibra · 647mg sodio
    //   90g  (1 marraqueta): 224 kcal · 8.5g P · 0.9g G · 56.7g C · 2.7g fibra · 582mg sodio
    kcal: 224, p: 8.5, c: 56.7, g: 0.9,
    badge: 'Pan corriente chileno · INTA · ½ unidad = 45g · 112 kcal',
    alergenosNota: 'Marraqueta · Pan corriente blanco chileno (datos INTA Chile + MINSAL/FAO). Contiene gluten (trigo). Aporta hierro (3.1 mg/unidad) y vitamina B1 (0.6 mg/unidad). La porción nutricional habitual en guías alimentarias chilenas es ½ marraqueta (45g · 112 kcal · 4.3g proteína · 291 mg sodio).',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'alto',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/369294-900-900?width=900&height=900&aspect=true',
  },
  multicereal: {
    label: 'Pan multicereal',
    emoji: '🌾',
    item: 'pan multicereal (40g)',
    gramos: 40,
    // 1 rebanada 40g — pan con varios granos (trigo, avena, centeno, linaza)
    kcal: 100, p: 4.4, c: 18, g: 1.4,
    badge: 'Multicereal · Granos enteros',
    alergenosNota: 'Pan multicereal · Contiene gluten (trigo, avena, centeno). Puede contener trazas de sésamo y maravilla.',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'medio',
  },
  molde_integral: {
    label: 'Pan de molde integral',
    emoji: '🍞',
    item: 'pan de molde integral (40g)',
    gramos: 40,
    // 1 rebanada 40g — molde integral típico Ideal/Bimbo integral
    kcal: 96, p: 4.4, c: 16, g: 1.6,
    badge: 'Molde · Práctico para sándwiches',
    alergenosNota: 'Pan de molde integral · Contiene gluten (trigo). Puede contener trazas de soya.',
    contiene: ['gluten', 'soya'] as string[],
    indiceGlicemico: 'medio',
  },
  pita_integral: {
    label: 'Pan pita integral',
    emoji: '🫓',
    item: 'pan pita integral (50g)',
    gramos: 50,
    // 1 pan pita 50g — versión integral
    kcal: 131, p: 4.5, c: 25, g: 1,
    badge: 'Pita · Ideal sándwich tipo wrap',
    alergenosNota: 'Pan pita integral · Contiene gluten (trigo).',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'medio',
  },
  masa_madre: {
    label: 'Pan de masa madre',
    emoji: '🍞',
    item: 'pan de masa madre (40g)',
    gramos: 40,
    // 1 rebanada 40g — masa madre integral (fermentación natural mejora digestión)
    kcal: 96, p: 4.4, c: 17.6, g: 0.6,
    badge: 'Masa madre · Mejor tolerancia digestiva',
    alergenosNota: 'Pan de masa madre · Contiene gluten (trigo) pero su fermentación lenta lo hace más digerible para algunas personas sensibles.',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'bajo',
  },
  sin_gluten: {
    label: 'Pan sin gluten',
    emoji: '🌿',
    item: 'pan sin gluten (40g)',
    gramos: 40,
    // 1 rebanada 40g — pan sin gluten (mezcla de arroz, maíz, almidones)
    kcal: 96, p: 1.6, c: 18, g: 2,
    badge: 'Sin gluten · Apto celíacos',
    alergenosNota: 'Pan sin gluten · Libre de trigo, centeno, cebada y avena. Puede contener huevo, soya o trazas de frutos secos según la marca.',
    contiene: [] as string[],
    indiceGlicemico: 'alto',
  },
  proteico: {
    label: 'Pan Castaño Multigrano Proteína',
    emoji: '💪',
    // Pan Castaño Multigrano Proteína (envase 620g · ~19 rebanadas · "10g proteína por porción").
    // Cada rebanada ≈ 32.5g. La etiqueta reporta por PORCIÓN
    // de 2 rebanadas (65g · 170 kcal · 10.4g P) — lo aclaramos en badge y nota.
    item: 'pan Castaño Multigrano Proteína (1 rebanada · 32.5g)',
    gramos: 32.5,
    // Macros por 1 rebanada (32.5g) — derivadas de la etiqueta oficial Castaño Multigrano Proteína:
    //   100g: 261 kcal · 16g P · 4.4g G · 38.6g C disponibles · 5.2g azúcares · 6.5g fibra · 370mg sodio
    //   1 porción (2 rebanadas, 65g): 169.7 kcal · 10.4g P · 2.9g G · 25.1g C · 4.2g fibra · 240.5mg sodio
    kcal: 85, p: 5.2, c: 12.6, g: 1.5,
    badge: 'Multigrano + Proteína vegetal · 10g P por porción · Porción=2 rebanadas',
    alergenosNota: 'Pan Castaño Multigrano Proteína · 100% granos enteros + proteína de trigo y arveja (refuerzo proteico). Semillas: maravilla, sésamo, linaza, calabaza, amapola, chía + quínoa y avena. Fortificado con Zinc, Vit. A, B6 y D3. Contiene gluten (trigo, avena, gluten añadido) y semillas. La porción estándar son 2 rebanadas (65g · 170 kcal · 10g proteína · 4.2g fibra · 240mg sodio). Envase 620g rinde ~10 porciones (~20 rebanadas).',
    contiene: ['gluten', 'legumbres'] as string[],
    indiceGlicemico: 'bajo',
    foto: 'https://unimarc.vtexassets.com/arquivos/ids/251429/000000000000685504-UN-01.jpg?v=638932901997600000',
  },
  hallulla: {
    label: 'Hallulla',
    emoji: '🥯',
    item: 'hallulla (70g)',
    gramos: 70,
    // 1 hallulla 70g — pan plano chileno (alternativa típica a marraqueta)
    kcal: 196, p: 6, c: 38, g: 1.5,
    badge: 'Clásico chileno · Plano y compacto',
    alergenosNota: 'Hallulla · Pan blanco chileno. Contiene gluten (trigo) y manteca.',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'alto',
  },
} as const

export type PanTipo = keyof typeof PAN_TIPOS

// ─── Snacks saludables Nutrevo ────────────────────────────────────────────────
export const SNACK_NUTREVO_TIPOS = {
  alfajor_activa2: {
    label: 'Alfajor Activa2',
    emoji: '🍫',
    item: '1 Alfajor Activa2 Nutrevo (80g)',
    // Fuente: nutrevo.cl — 265 kcal · 15g prot · 27g CH · 9g G · sin azúcar añadida (alulosa)
    kcal: 265, p: 15, c: 27, g: 9,
    badge: '15g prot · Sin azúcar añadida',
    alergenosNota: '⚠️ Alfajor Activa2 · Contiene leche (whey), avena. Sin azúcar añadida (endulzado con alulosa).',
    foto: 'https://nutrevo.cl/wp-content/uploads/2025/10/ALFAJORAIWEB-600x750.webp',
    vegano: false, vegetariano: true,
    contiene: ['lactosa', 'gluten'] as string[],
  },
  moroketo: {
    label: 'Moroketo Proteínas',
    emoji: '🍪',
    item: '1 Moroketo Proteínas Nutrevo (pack 6 unid · 1 unid ≈ 30g)',
    // Fuente: nutrevo.cl — 210 kcal · 14g prot · 4g CH · 13g G · keto · vegano
    kcal: 210, p: 14, c: 4, g: 13,
    badge: '14g prot · Keto · Vegano · Sin gluten',
    alergenosNota: '⚠️ Moroketo · Contiene maní, almendra, coco. Sin gluten ni lactosa. Proteína 100% vegetal (arveja + arroz).',
    foto: 'https://nutrevo.cl/wp-content/uploads/2026/04/MOROKETO_WEB12-1FINAL-600x750.webp',
    vegano: true, vegetariano: true,
    contiene: ['mani', 'frutos_secos'] as string[],
  },
  volki_coco: {
    label: 'Volki de Coco',
    emoji: '🥥',
    item: '1 Volki de Coco Nutrevo (pack 2 unid)',
    // Fuente: nutrevo.cl — 129 kcal · 3g prot · keto · vegano · sin gluten · sin lácteos · sin huevo · sin soya
    kcal: 129, p: 3, c: 5, g: 11,
    badge: 'Keto · Vegano · Sin 5 alérgenos',
    alergenosNota: '⚠️ Volki Coco · Contiene almendra y coco. Sin gluten, sin lácteos, sin huevo, sin soya, sin azúcar.',
    foto: 'https://nutrevo.cl/wp-content/uploads/2025/10/VOLKI-KETO1WEB-600x750.webp',
    vegano: true, vegetariano: true,
    contiene: ['frutos_secos'] as string[],
  },
} as const

export type SnackNutrevoTipo = keyof typeof SNACK_NUTREVO_TIPOS

// ─── Barras de proteína (marcas Chile) ────────────────────────────────────────
export const BARRA_PROTEINA_TIPOS = {
  wild_protein: {
    label: 'Wild Protein Caramelo',
    emoji: '💪',
    item: '1 Barra Wild Protein Caramelo (45g)',
    // Fuente: etiqueta oficial 45g — 173 kcal · 15g prot · 17g CH · 5g G
    kcal: 173, p: 15, c: 17, g: 5,
    badge: '15g prot · Sabor caramelo · Libre sellos',
    alergenosNota: '⚠️ Wild Protein · Contiene maní, leche, soya. Elaborado en líneas que también procesan gluten, nueces y sulfitos.',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/542802-900-900?width=900&height=900&aspect=true',
    vegano: false, vegetariano: true,
    contiene: ['lactosa', 'soya', 'mani', 'frutos_secos', 'gluten'] as string[],
  },
  protein_bite_bw: {
    label: 'Protein Bite Black & White',
    emoji: '🍫',
    item: '1 Protein Bite Black & White (55g)',
    // Fuente: Your Goal Smart Nutrition — 161 kcal · 21g prot · 2.6g CH · 7.4g G · 3.2g fibra · sin azúcar
    kcal: 161, p: 21, c: 3, g: 7,
    badge: '21g prot · Low carb · Sin azúcar',
    alergenosNota: '⚠️ Protein Bite · Contiene leche, soya. Elaborado en líneas que procesan huevo y maní. Fenilcetonúricos: contiene fenilalanina.',
    foto: 'https://hausnusse.cl/cdn/shop/files/Black2.png?v=1692795895',
    vegano: false, vegetariano: true,
    contiene: ['lactosa', 'soya'] as string[],
  },
  twentys_hazelnut: {
    label: "Twenty's Hazelnut Praline",
    emoji: '🔵',
    item: "1 Twenty's Hazelnut Praline (60g)",
    // Fuente: Your Goal — 152 kcal · 19.4g prot · 5.5g CH · 5.8g G · 14.3g fibra · sin azúcar · sin gluten
    kcal: 152, p: 19, c: 6, g: 6,
    badge: '19g prot · 14g fibra · Sin gluten',
    alergenosNota: "⚠️ Twenty's · Contiene leche, soya (lecitinas), avellana. Elaborado en líneas que procesan huevo, maní, nueces y sulfitos.",
    foto: 'https://www.mixgreen.cl/cdn/shop/files/13363a.jpg?v=1724272525',
    vegano: false, vegetariano: true,
    contiene: ['lactosa', 'soya', 'frutos_secos'] as string[],
  },
} as const

export type BarraProteinaTipo = keyof typeof BARRA_PROTEINA_TIPOS

export interface UltraOption {
  label: string
  porcion: string
  kcal: number
  p: number
  c: number
  g: number
  foto?: string
  sellos?: string[]
  alergenos?: string[]
}

// ─── DESAYUNOS ────────────────────────────────────────────────────────────────
export const desayunosOpts: Record<string, MealOption> = {
  avena_platano: {
    label: 'Avena natural + plátano',
    items: ['80g avena en hojuelas', '1 plátano mediano', '200ml leche descremada', '1 cdta canela o miel'],
    baseKcal: 360, p: 14, c: 62, g: 7,
    foto: USP('1638813133218-4367bd8123f6'),
    tiempo: '10 min',
    pasos: [
      'Calentar 200ml de leche en una olla a fuego medio.',
      'Agregar 80g de avena y revolver continuamente 3-4 minutos hasta espesar.',
      'Servir en un tazón y decorar con el plátano cortado en rodajas.',
      'Opcional: agregar canela molida, miel o stevia al gusto.',
    ],
  },
  avena_proteica: {
    label: 'Avena proteica + plátano',
    items: ['80g avena en hojuelas', '1 scoop proteína en polvo', '1 plátano mediano', '200ml leche descremada'],
    baseKcal: 480, p: 38, c: 62, g: 7,
    requiereWhey: true,
    foto: USP('1638813133218-4367bd8123f6'), // tazón de avena con frutas encima, foto real
    tiempo: '10 min',
    pasos: [
      'Calentar 200ml de leche en una olla a fuego medio.',
      'Agregar 80g de avena y revolver continuamente 3-4 minutos hasta espesar.',
      'Apagar el fuego e incorporar el scoop de proteína; mezclar bien hasta disolver.',
      'Servir en un tazón y decorar con el plátano cortado en rodajas.',
      'Opcional: agregar canela molida o stevia al gusto.',
    ],
  },
  huevos_tostadas: {
    label: 'Omelette proteico + pan integral',
    items: ['3 huevos enteros', '2 claras adicionales', 'Espinaca y champiñones', '1 rebanada pan integral', '1 cdta aceite de oliva'],
    baseKcal: 420, p: 28, c: 35, g: 18, tieneHuevo: true, eggsDefault: 3,
    tienePan: true, panTipoDefault: 'integral',
    foto: IMG + 'omelette_pan_integral.jfif',
    tiempo: '12 min',
    pasos: [
      'Batido: mezclar huevos + claras con sal y pimienta hasta homogeneizar.',
      'Base vegetal: saltear champiñones y espinaca 2-3 min en la sartén con aceite. Reduce el agua y evita que el omelette quede aguado.',
      'Cocción: verter el huevo batido sobre las verduras en sartén antiadherente a fuego medio-bajo.',
      'Armado: cuando los bordes cuajen, doblar el omelette por la mitad.',
      'Acompañar con 1 rebanada de pan integral tostado.',
    ],
  },
  tostadas_palta: {
    label: 'Pan integral + palta + huevo pochado',
    items: ['2 tostadas pan integral', '½ palta madura', '2 huevos pochados', 'Café o té sin azúcar'],
    baseKcal: 460, p: 22, c: 40, g: 22, tieneHuevo: true, eggsDefault: 2,
    tienePan: true, panTipoDefault: 'integral',
    foto: IMG + 'Pan_palta_huevo_pochado.jfif',
    tiempo: '15 min',
    pasos: [
      'Tostadas: tostar 2 rebanadas de pan integral hasta dorar levemente. El tostado reduce el índice glicémico.',
      'Palta: aplastar con tenedor, sazonar con sal, pimienta y unas gotas de limón. El limón evita la oxidación.',
      'Pochado: hervir agua con un chorrito de vinagre blanco. Formar un remolino y verter el huevo sin cáscara. Cocinar 3 minutos.',
      'Armado: untar la palta sobre las tostadas y colocar el huevo pochado encima.',
      'Café: acompañar con café o té sin azúcar para completar el desayuno sin sumar calorías.',
    ],
  },
  yogur_granola: {
    label: 'Yogur + berries + semillas',
    items: ['150g yogur natural', '½ taza berries (arándanos, frambuesas o frutillas)', '1 cda chía o linaza', '10-15 almendras naturales'],
    baseKcal: 380, p: 20, c: 50, g: 8,
    tieneYogur: true,
    foto: IMG + 'Yogurt_griego_con_berries_semillas.jfif',
    tiempo: '5 min',
    pasos: [
      'Base: verter el yogur en un bowl. Los yogures proteicos aportan el doble de proteína que un yogur común.',
      'Berries: agregar ½ taza de berries encima del yogur. Aportan antioxidantes y fibra soluble.',
      'Semillas: espolvorear 1 cda de chía o linaza. La chía absorbe líquido y prolonga la saciedad.',
      'Almendras: agregar las almendras enteras o picadas.',
      'Sin cocción. Preparación en menos de 5 minutos. Ideal para llevar.',
    ],
  },
  batido_proteico: {
    label: 'Batido proteico + frutos secos',
    items: ['1 scoop proteína en polvo', '1 plátano congelado', '200ml leche', '30g nueces o almendras', '1 cdta mantequilla de maní'],
    baseKcal: 490, p: 35, c: 42, g: 18,
    requiereWhey: true,
    foto: USP('1622597468620-656aa1f981ea'), // batido proteico de frutilla en vaso transparente
    tiempo: '5 min',
    pasos: [
      'Colocar todos los ingredientes en la licuadora: leche, plátano congelado, proteína y frutos secos.',
      'Licuar a velocidad alta por 60 segundos hasta obtener una mezcla homogénea.',
      'Probar la consistencia: si queda muy espeso, agregar un poco más de leche.',
      'Servir inmediatamente para evitar que el plátano oxide la mezcla.',
      'Opcional: agregar canela o cacao en polvo para variedad de sabor.',
    ],
  },
  chia_pudding: {
    label: 'Chía pudding + yogur proteico',
    items: ['2 cdas semillas de chía (~20g)', '150g yogur alto en proteínas', '1 fruta a elección', 'Canela o vainilla sin azúcar'],
    baseKcal: 430, p: 24, c: 58, g: 10,
    tieneYogur: true,
    foto: IMG + 'chia_pudding.jfif',
    tiempo: '5 min + reposo 2h',
    pasos: [
      'Mezcla: combinar semillas de chía con el yogur en un frasco o recipiente con tapa. La chía absorbe hasta 12 veces su peso en líquido.',
      'Reposo: refrigerar mínimo 2 horas o toda la noche. Las semillas gelifican y el pudding toma consistencia.',
      'Preparar la noche anterior ahorra tiempo en la mañana.',
      'Fruta: al servir, cortar la fruta fresca y colocarla encima del pudding.',
      'Espolvorear canela o agregar vainilla para mayor sabor. Consumir frío directamente del frasco.',
    ],
  },
  tostadas_ricotta: {
    label: 'Tostadas + ricotta + miel + nueces',
    items: ['2 tostadas de pan integral', '80-100g ricotta', '1 cdta miel', '10 nueces enteras o picadas'],
    baseKcal: 400, p: 18, c: 48, g: 14,
    tienePan: true, panTipoDefault: 'integral',
    foto: IMG + 'tostadas_ricotta_miel_nueces.jfif',
    tiempo: '8 min',
    pasos: [
      'Tostadas: tostar 2 rebanadas de pan integral hasta lograr superficie dorada y crujiente. El tostado reduce el índice glicémico.',
      'Ricotta: esparcir generosamente 80-100g de ricotta sobre cada tostada aún caliente. La ricotta aporta caseína de absorción lenta.',
      'Miel: agregar 1 cdta de miel distribuida sobre la ricotta. No exceder la porción indicada.',
      'Nueces: colocar las nueces encima, enteras o picadas gruesas para mayor textura.',
      'Servir inmediatamente. La combinación cremoso + crujiente + dulce mejora la adherencia al desayuno.',
    ],
  },
  cottage_frutas: {
    label: 'Cottage + frutas + semillas',
    items: ['150-200g cottage', '1 fruta a elección (berries, kiwi, durazno)', '1 cda semillas (chía, linaza o sésamo)', 'Canela o ralladura de limón'],
    baseKcal: 360, p: 22, c: 42, g: 10,
    foto: IMG + 'cottage_frutas_semillas.jfif',
    tiempo: '5 min',
    pasos: [
      'Base: colocar 150-200g de cottage en un bowl. La caseína del cottage se digiere lentamente → mayor control de apetito.',
      'Fruta: cortar la fruta en trozos y agregar encima. Aporta fibra y micronutrientes que complementan el perfil proteico.',
      'Semillas: espolvorear 1 cda de semillas sobre la preparación. Suman fibra soluble que potencia el efecto saciante.',
      'Sabor: añadir canela o ralladura de limón para elevar el sabor sin agregar calorías.',
      'Consumir de inmediato o refrigerar hasta 1 hora. Ideal para preparar rápido en la mañana.',
    ],
  },
}

// ─── COLACIONES MAÑANA y ONCE (mismo pool) ────────────────────────────────────
export const colacionesOpts: Record<string, MealOption> = {
  yogur_frutossecos_am: {
    label: 'Yogur + frutos secos',
    items: ['150g yogur sin azúcar', '20g mix frutos secos (nueces, almendras)', '1 fruta pequeña'],
    baseKcal: 230, p: 14, c: 22, g: 10,
    tieneYogur: true,
    foto: IMG + 'Yogurt_griego_con_berries_semillas.jfif',
    tiempo: '3 min',
    pasos: [
      'Verter el yogur en un bowl o tazón.',
      'Agregar la fruta pequeña cortada en trozos encima del yogur.',
      'Distribuir los frutos secos sobre la mezcla.',
      'Sin cocción. Listo para consumir en menos de 3 minutos.',
    ],
  },
  fruta_proteina: {
    label: 'Fruta + batido de proteína',
    items: ['1 scoop proteína en polvo', '200ml agua o leche', '1 fruta mediana'],
    baseKcal: 210, p: 26, c: 22, g: 2,
    foto: USP('1622597468620-656aa1f981ea'), // batido proteico en vaso, colación
    tiempo: '3 min',
    pasos: [
      'Mezclar el scoop de proteína con el agua o leche en una botella shaker.',
      'Agitar vigorosamente por 20-30 segundos hasta disolver bien.',
      'Consumir junto a la fruta mediana como acompañamiento sólido.',
      'Ideal como colación post-entrenamiento o entre comidas.',
    ],
  },
  cottage_nueces: {
    label: 'Queso cottage + nueces',
    items: ['150g queso cottage', '20g nueces', '½ taza frutillas o arándanos'],
    baseKcal: 200, p: 18, c: 8, g: 11,
    foto: IMG + 'cottage_frutas_semillas.jfif',
    tiempo: '4 min',
    pasos: [
      'Colocar el cottage en un bowl pequeño.',
      'Agregar las frutillas o arándanos encima.',
      'Distribuir las nueces sobre la mezcla.',
      'Consumir de inmediato. Colación alta en proteína y grasas saludables.',
    ],
  },
  tostadas_ricotta_col: {
    label: 'Tostada integral + ricotta',
    items: ['1 rebanada pan integral', '40g ricotta', '1 cdta miel', '5 nueces'],
    baseKcal: 190, p: 8, c: 24, g: 7,
    tienePan: true, panTipoDefault: 'integral',
    foto: IMG + 'tostadas_ricotta_miel_nueces.jfif',
    tiempo: '5 min',
    pasos: [
      'Tostar 1 rebanada de pan integral.',
      'Esparcir la ricotta sobre la tostada caliente.',
      'Agregar la miel y las nueces encima.',
      'Consumir inmediatamente para aprovechar la textura crujiente.',
    ],
  },
  barra_fruta: {
    label: 'Barra de cereal + fruta',
    items: ['1 barra de cereal integral sin azúcar añadida', '1 fruta mediana', 'Té o infusión sin azúcar'],
    baseKcal: 180, p: 5, c: 36, g: 4,
    foto: USP('1504708706948-13d6cbba4062'), // mix de berries y frutos secos, snack saludable
    tiempo: '2 min',
    pasos: [
      'Opción rápida: barra de cereal + fruta para llevar.',
      'Acompañar con té o infusión sin azúcar.',
      'Ideal cuando no hay tiempo de preparar colación elaborada.',
    ],
  },
  sandwich_jamonqueso: {
    label: 'Sándwich de jamón queso',
    items: [
      '1 rebanada de pan integral (40g)',
      '30g de jamón de pavo (cuello)',
      '30g de queso laminado tipo gauda o mantecoso',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
    ],
    baseKcal: 248, p: 16, c: 20, g: 11,
    tienePan: true, panTipoDefault: 'integral',
    foto: USP('1528735602780-2552fd46c7af'),
    tiempo: '5 min',
    tendencia: ['omnivoro'],
    alergenosNota: 'Contiene gluten (pan) y lácteos (queso). Si tienes intolerancia a alguno, sustituye por pan sin gluten o queso vegetal.',
    pasos: [
      'Tostar la rebanada de pan integral (sartén seca o tostadora) hasta dorar.',
      'Sobre el pan tibio, colocar el jamón de pavo cubriendo toda la superficie.',
      'Agregar el queso laminado encima del jamón.',
      'Si tienes microondas: 15-20 s para que el queso funda apenas. Opcional.',
      'Coronar con la hoja de lechuga y la rodaja de tomate.',
      'Consumir inmediatamente como sándwich abierto, o cubrir con otra rebanada si se duplica la porción.',
    ],
  },
  sandwich_jamonqueso_huevo: {
    label: 'Sándwich de jamón queso + huevo duro',
    items: [
      '1 rebanada de pan integral (40g)',
      '30g de jamón de pavo (cuello)',
      '30g de queso laminado tipo gauda',
      '1 huevo duro en rodajas',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
    ],
    baseKcal: 319, p: 22, c: 20, g: 16,
    tienePan: true, panTipoDefault: 'integral',
    foto: USP('1525351484163-7529414344d8'),
    tiempo: '12 min',
    tendencia: ['omnivoro'],
    tieneHuevo: true,
    eggsDefault: 1,
    alergenosNota: 'Contiene gluten (pan), lácteos (queso) y huevo. Versión más alta en proteína — ideal post-entreno.',
    pasos: [
      'Poner el huevo en agua hirviendo 9 minutos (huevo duro). Pasarlo a agua fría y pelar.',
      'Tostar la rebanada de pan integral.',
      'Cortar el huevo en rodajas de 0,5 cm.',
      'Armar: pan tostado + jamón + queso + huevo en rodajas + lechuga + tomate.',
      'Sazonar con un toque de sal y pimienta. Consumir inmediatamente.',
    ],
  },
  sandwich_vegetariano_palta: {
    label: 'Sándwich vegetariano (queso + palta)',
    items: [
      '1 rebanada de pan integral (40g)',
      '30g de queso laminado tipo gauda',
      '40g de palta (1/4)',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
      'Sal y pimienta a gusto',
    ],
    baseKcal: 279, p: 12, c: 22, g: 16,
    tienePan: true, panTipoDefault: 'integral',
    foto: USP('1539252554935-80c8cb01a76d'),
    tiempo: '4 min',
    tendencia: ['omnivoro', 'vegetariano'],
    alergenosNota: 'Contiene gluten (pan) y lácteos (queso). Apto vegetariano. Para vegano: reemplazar queso por hummus o queso vegetal.',
    pasos: [
      'Tostar la rebanada de pan integral hasta dorar.',
      'Aplastar la palta con un tenedor sobre la tostada caliente.',
      'Sazonar la palta con sal y pimienta.',
      'Colocar el queso laminado encima.',
      'Coronar con lechuga y rodaja de tomate.',
      'Consumir inmediatamente para aprovechar la textura crujiente del pan.',
    ],
  },
  sandwich_jamonpavo_light: {
    label: 'Sándwich de jamón light (sin queso)',
    items: [
      '1 rebanada de pan integral (40g)',
      '50g de jamón de pavo (cuello)',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
      'Mostaza Dijon o aceite de oliva a gusto',
    ],
    baseKcal: 165, p: 12.5, c: 19, g: 3,
    tienePan: true, panTipoDefault: 'integral',
    foto: USP('1567234669003-dbbf01c4f7b5'),
    tiempo: '3 min',
    tendencia: ['omnivoro'],
    alergenosNota: 'Contiene gluten (pan). Sin lácteos. Versión más liviana del clásico — ideal para tarde si necesitas economizar calorías.',
    pasos: [
      'Tostar levemente la rebanada de pan integral.',
      'Untar mostaza Dijon o un toque de aceite de oliva.',
      'Disponer el jamón de pavo en capas sobre el pan.',
      'Agregar la hoja de lechuga y la rodaja de tomate.',
      'Consumir como sándwich abierto. Sin queso para mantener bajo el aporte de grasa.',
    ],
  },
  costa_mini_chips: {
    label: 'Galletas Costa Mini Chips',
    items: [
      '1 paquete individual de Costa Mini Chips (35 g)',
      '(Opcional) Té, infusión o café sin azúcar para acompañar',
    ],
    // Datos validados contra etiqueta nutricional del envase (35 g · 1 porción):
    //   Energía:                 179,9 kcal
    //   Proteínas:               1,5 g
    //   Grasas totales:          8,8 g    (saturadas 5,1 g · trans 0,2 g)
    //   H. de C. disp.:          23,8 g   (de los cuales azúcares: 11,5 g)
    //   Sodio:                   112 mg
    //   Colesterol:              1,6 mg
    // SELLOS CHILENOS: Alto en azúcares · Alto en grasas saturadas · Alto en calorías
    baseKcal: 180, p: 1.5, c: 24, g: 9,
    porcionFija: true, // 35g paquete individual — no escalable al slot
    foto: IMG + 'costa_mini_chips.webp', // chocolate chip cookies · 900x600 webp 65KB
    tiempo: '1 min',
    tendencia: ['omnivoro', 'vegetariano'], // contiene leche, huevos, soya — no vegano
    sellos: ['Alto en Azúcares', 'Alto en Grasas Saturadas', 'Alto en Calorías'],
    alergenosNota: 'Producto ultraprocesado con 3 sellos chilenos (azúcares, grasas saturadas, calorías). Contiene gluten, leche y soya. Puede contener trazas de almendras, avellanas, huevos, maní, nueces, sésamo y sulfitos. 11,5 g de azúcares por porción — usar con criterio, no como rutina diaria.',
    pasos: [
      'Abrir el paquete individual de 35 g.',
      'Consumir como colación rápida acompañando té, café o infusión.',
      'Aviso clínico: por sus 3 sellos chilenos (Alto en azúcar, grasa saturada, calorías) conviene espaciarlo — máximo 1-2 veces por semana si el plan es de pérdida de grasa.',
    ],
  },
  goodnes_protein_caramelo: {
    label: 'Postre Goodnes Protein (caramelo)',
    items: [
      '1 pote de Postre Goodnes Protein sabor caramelo (115 g · 1 unidad)',
      '(Opcional) 1 fruta pequeña como acompañamiento',
    ],
    // Datos validados contra etiqueta nutricional del envase (115 g):
    //   Energía:        97,7 kcal
    //   Proteínas:      10 g
    //   H. de C. disp.: 9,8 g  (de los cuales azúcares totales: 7 g)
    //   Grasas:         2,1 g  (saturadas 1,3 g)
    //   Sodio:          167,9 mg
    //   Colesterol:     11,5 mg
    baseKcal: 98, p: 10, c: 10, g: 2,
    porcionFija: true, // 115g pote — no escalable al slot
    foto: USP('1488477181946-6428a0291777'),
    tiempo: '1 min',
    tendencia: ['omnivoro', 'vegetariano'],
    alergenosNota: 'Producto industrial — contiene lácteos. 7 g de azúcares totales por porción (no es "sin azúcar"). Bajo en grasa y sodio. Verifica contraindicaciones si tienes intolerancia a la lactosa.',
    pasos: [
      'Sacar el pote del refrigerador (mejor frío para la textura).',
      'Abrir y revolver suavemente si el caramelo está en el fondo.',
      'Consumir directo del pote o servir en bowl con una fruta picada encima como acompañamiento.',
      'Útil como colación post-entreno por su proteína de absorción rápida; el contenido de azúcar (7 g) lo hace menos óptimo si el paciente está en déficit estricto.',
    ],
  },
  marraqueta_jamonqueso: {
    label: 'Marraqueta con jamón queso',
    items: [
      '1 marraqueta (60g)',
      '30g de jamón de pavo (cuello)',
      '30g de queso laminado tipo gauda',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
    ],
    baseKcal: 328, p: 17.5, c: 36, g: 11,
    tienePan: true, panTipoDefault: 'marraqueta',
    foto: USP('1509440159596-0249088772ff'),
    tiempo: '4 min',
    tendencia: ['omnivoro'],
    alergenosNota: 'Contiene gluten (marraqueta — pan blanco chileno) y lácteos (queso). Mayor índice glucémico que el integral por el pan blanco.',
    pasos: [
      'Abrir la marraqueta por la mitad horizontalmente.',
      'Si quieres, tostar 2 minutos en sartén seca con el lado abierto hacia abajo.',
      'Colocar el jamón en una mitad, cubrir con el queso laminado.',
      'Agregar la lechuga y el tomate.',
      'Tapar con la otra mitad. Comer inmediatamente para aprovechar el crocante del pan.',
    ],
  },
  galleton_quaker_chocolate: {
    label: '🍪 Galletón Quaker Casero — Chips Chocolate',
    items: ['1 galletón Quaker Casero Chips Chocolate (40 g)'],
    baseKcal: 173, p: 2.8, c: 22, g: 7.6,
    porcionFija: true, // 40g unidad — no escalable al slot
    foto: USP('1499636136210-6f4ee915583e'), // placeholder: chocolate chip cookies — reemplazar con foto real del producto Quaker
    tiempo: '1 min',
    pasos: [
      'Abrir el envase y consumir directamente.',
      'Acompañar con té, café o agua sin azúcar.',
    ],
    sellos: ['Alto en azúcares', 'Alto en calorías'],
    alergenosNota: 'Contiene trigo y avena (gluten), huevo y lecitinas (soya). Puede contener almendras, leche, maní y sulfitos.',
  },
  // Nota: las barras de proteína y snacks Nutrevo se integran al plan
  // exclusivamente a través de los selectores dedicados "Barra de proteína favorita"
  // y "Snack saludable favorito (Nutrevo)" en PlanGenerator (step 5).
  // El planGenerator las inyecta en la rotación de colaciones automáticamente.

  hummus_verduras: {
    label: 'Hummus + bastones de verdura',
    items: ['80g hummus', 'Bastones de zanahoria, apio y pepino', '5 galletas integrales'],
    baseKcal: 215, p: 8, c: 26, g: 9,
    foto: USP('1637949385162-e416fb15b2ce'), // bowl de hummus con garnish de aceite, foto real
    tiempo: '5 min',
    pasos: [
      'Lavar y cortar las verduras en bastones del mismo tamaño.',
      'Colocar el hummus en un bol pequeño al centro del plato.',
      'Disponer los bastones de verdura y galletas alrededor del hummus.',
      'Colación alta en fibra y grasas saludables del garbanzo.',
    ],
  },
}

// ─── ALMUERZOS ────────────────────────────────────────────────────────────────
export const almuerzosOpts: Record<string, MealOption> = {
  pollo_arroz: {
    label: 'Pollo a la plancha + arroz integral + ensalada',
    items: ['200g pechuga pollo a la plancha', '150g arroz integral cocido', 'Ensalada de tomate, pepino y lechuga', '1 cda aceite de oliva'],
    baseKcal: 580, p: 52, c: 58, g: 12,
    foto: IMG + 'pollo_plancha_arroz_ensalada.jfif',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 200,
    tieneCarboPrincipal: true, carboTipo: 'arroz_integral', carboGramosBase: 150,
    tiempo: '30 min',
    pasos: [
      'Pollo: sazonar la pechuga con sal, pimienta, ajo en polvo y gotas de limón. Cocinar 6-7 min por lado en plancha caliente con spray de aceite. El sellado a fuego alto retiene los jugos.',
      'Arroz: cocinar en 2 tazas de agua con pizca de sal. Llevar a hervor, bajar a fuego bajo y tapar 18-20 min. El arroz integral aporta fibra y menor índice glicémico.',
      'Ensalada: cortar tomate y pepino. Aliñar con 1 cda de aceite de oliva, sal y limón. El aceite mejora la absorción de licopeno del tomate.',
      'Reposo: dejar reposar el pollo 2 min antes de cortar para que los jugos se redistribuyan.',
      'Armado: servir el pollo junto al arroz y la ensalada al costado.',
    ],
  },
  carne_papas: {
    label: 'Carne magra + papas cocidas + ensalada',
    items: ['150g carne magra (posta, lomo o filete)', '1 papa mediana cocida con cáscara', 'Ensalada de lechuga, tomate y pepino', '1 cdta aceite de oliva'],
    baseKcal: 590, p: 46, c: 54, g: 16,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 150,
    tieneCarboPrincipal: true, carboTipo: 'papas', carboGramosBase: 250,
    tiempo: '30 min',
    pasos: [
      'Papa: lavar y cocinar entera con cáscara en agua hirviendo con sal 20-25 min. La cáscara conserva nutrientes y reduce el índice glicémico.',
      'Carne: sazonar con sal, pimienta, ajo y limón. Cocinar en plancha bien caliente 4-5 min por lado según grosor. La carne magra aporta proteína de alto valor biológico sin exceso calórico.',
      'Reposo: dejar reposar la carne 2-3 min antes de cortar para redistribuir los jugos.',
      'Ensalada: cortar las verduras en trozos medianos. Aliñar con aceite, sal y limón.',
      'Armado: servir la carne junto a la papa partida y la ensalada al costado.',
    ],
  },
  carne_arroz: {
    label: 'Carne magra + papas salteadas con romero + ensalada',
    items: ['150g carne magra (posta, lomo o filete)', '250g papas salteadas con romero', 'Ensalada de lechuga, tomate y pepino', '1 cdta aceite de oliva'],
    baseKcal: 565, p: 44, c: 50, g: 16,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 150,
    tieneCarboPrincipal: true, carboTipo: 'papas', carboGramosBase: 250,
    tiempo: '25 min',
    pasos: [
      'Papas: cortar 250g de papas en cubos medianos (con o sin cáscara según preferencia). Hervir 8 min en agua con sal hasta que estén firmes pero tiernas. Escurrir y dejar enfriar 2 min para que sequen.',
      'Saltear: calentar 1 cdta de aceite de oliva en sartén bien caliente. Agregar las papas hervidas y 2-3 ramitas de romero fresco (o ½ cdta seco). Saltear 5-7 min hasta que doren en los bordes.',
      'Carne: sazonar la pieza con sal, pimienta, ajo y un toque de limón. Cocinar en plancha bien caliente 4-5 min por lado según grosor. La carne magra aporta hierro hemo y proteína de alto valor biológico.',
      'Reposo: dejar reposar la carne 2-3 min antes de cortar para que los jugos se redistribuyan.',
      'Ensalada: cortar lechuga, tomate y pepino. Aliñar con aceite de oliva, sal y limón.',
      'Armado: servir la carne junto a las papas salteadas y la ensalada al costado.',
      'Variante: si el target del paciente requiere más CHO (ej. surplus para hipertrofia), el profesional puede subir los gramos de papas desde el selector dinámico.',
    ],
  },
  salmon_quinoa: {
    label: 'Salmón al horno + quinoa + verduras',
    items: ['200g salmón fresco', '100g quinoa cocida', '150g verduras salteadas (zapallo, pimentón, espinaca)', '1 cdta aceite de oliva'],
    baseKcal: 600, p: 48, c: 42, g: 20,
    foto: IMG + 'salmon_quinoa.webp',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'salmon', carneGramosBase: 200,
    tiempo: '30 min',
    pasos: [
      'Quinoa: lavar en colador fino bajo agua fría. Cocinar en 2 tazas de agua con sal a fuego medio-bajo 15 min tapado. La quinoa es proteína completa con índice glicémico bajo.',
      'Salmón: sazonar con sal, pimienta, ajo y limón. Cocinar en sartén 3-4 min por lado hasta que el centro esté opaco pero jugoso. Aporta EPA y DHA con efecto antiinflamatorio.',
      'Reposo: retirar el salmón y dejar reposar 2 min antes de servir.',
      'Verduras: en la misma sartén, saltear las verduras 3-4 min a fuego alto con ajo y sal.',
      'Armado: servir la quinoa como base, el salmón encima y las verduras al costado. Finalizar con limón.',
    ],
  },
  ensalada_proteica_alm: {
    label: 'Ensalada proteica de pollo + huevo + palta',
    // Macros base por porción: 150g pollo (250kcal/47g prot/0g CH/5g G) + 1 huevo (78kcal/6g P/0.6g CH/5g G)
    // + ½ palta (120kcal/1.5g P/6g CH/11g G) + verduras (60kcal/2g P/12g CH/0.5g G)
    // + 100g quinoa cocida (120kcal/4g P/21g CH/2g G) + 1 cda aceite oliva (90kcal/0/0/10g G)
    // Total: 718 kcal · 60g prot · 40g CH · 34g grasa
    items: ['150g pollo a la plancha en tiras', '1 huevo duro o pochado', '½ palta en láminas', '100g quinoa cocida', 'Mix de verduras: lechuga, tomate cherry, pepino, zanahoria', '1 cda aceite de oliva'],
    baseKcal: 718, p: 60, c: 40, g: 34, tieneHuevo: true, eggsDefault: 1,
    foto: IMG + 'ensalada_proteica.webp',
    tendencia: ['omnivoro'],
    contiene: ['huevo'],
    estacional: 'calor',
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 150,
    tiempo: '25 min',
    pasos: [
      'Quinoa: enjuagar bien y cocinar en proporción 1:2 con agua. Hervir 15 min a fuego bajo. Escurrir y dejar enfriar.',
      'Pollo: sazonar con sal, pimienta y limón. Cocinar en plancha 5-6 min por lado. Dejar reposar 2 min y cortar en tiras.',
      'Huevo: cocinar a elección: duro (10 min) o pochado (agua con vinagre, 3 min). El huevo aporta proteína de alto valor biológico y vitamina D.',
      'Palta: cortar en láminas justo antes de servir para evitar oxidación. Aporta ácido oleico que mejora absorción de vitaminas liposolubles.',
      'Verduras: lavar y secar el mix. Cortar tomate cherry, pepino y zanahoria rallada.',
      'Armado: disponer la quinoa como base, agregar las verduras, el pollo, huevo y palta. Aliñar con aceite de oliva y limón.',
    ],
  },
  arroz_huevo_saltado: {
    label: 'Arroz saltado con huevo y verduras',
    items: ['160g arroz cocido (idealmente frío del día anterior)', '2-3 huevos enteros', 'Verduras a gusto: zanahoria, zapallo, pimentón', '1 cdta aceite + salsa de soya opcional'],
    baseKcal: 550, p: 32, c: 70, g: 14, tieneHuevo: true, eggsDefault: 2,
    foto: IMG + 'salteado_de_arroz_con_huevo.webp',
    tendencia: ['vegetariano'],
    contiene: ['huevo', 'soya'],   // salsa de soya
    tiempo: '15 min',
    pasos: [
      'Arroz: usar arroz frío del día anterior. El almidón retrogradado del arroz frío tiene menor índice glicémico y saltea mejor.',
      'Verduras: cortar en trozos pequeños y uniformes. Calentar aceite en wok a fuego alto. Saltear 3-4 min hasta tiernas con textura.',
      'Huevos: empujar verduras al borde. Verter los huevos batidos al centro. Revolver hasta ¾ de cocción.',
      'Integrar: agregar el arroz frío y mezclar continuamente 2-3 min hasta que esté caliente.',
      'Sazonar con sal, pimienta y salsa de soya si usas. Servir de inmediato.',
    ],
  },
  legumbres_arroz: {
    label: 'Porotos / lentejas + arroz integral',
    items: ['200g porotos o lentejas cocidas', '100g arroz integral cocido', 'Sofrito de tomate, cebolla y ajo', 'Ensalada mixta'],
    baseKcal: 550, p: 30, c: 80, g: 8,
    foto: USP('1503838922633-d7892c7a2bc0'), // porotos/lentejas en bol con cuchara, foto real
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres', 'cebolla_ajo'],
    altoFODMAP: true,
    tiempo: '25 min',
    pasos: [
      'Sofrito: saltear cebolla y ajo picados en aceite hasta transparentar. Agregar tomate y cocinar 5 min.',
      'Legumbres: agregar las legumbres ya cocidas al sofrito. Mezclar y sazonar con sal, comino y orégano.',
      'Arroz: cocinar aparte en agua con sal. El arroz integral se cocina en 18-20 min a fuego bajo tapado.',
      'Armado: servir las legumbres junto al arroz y la ensalada mixta al costado.',
    ],
  },
  pavo_papas: {
    label: 'Pechuga de pavo + papas + ensalada',
    items: ['200g pechuga pavo a la plancha', '150g papas cocidas con perejil', 'Ensalada de pepino y tomate', '1 cdta aceite de oliva'],
    baseKcal: 560, p: 48, c: 52, g: 11,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'pavo', carneGramosBase: 200,
    tiempo: '25 min',
    pasos: [
      'Papas: cocer con cáscara en agua hirviendo con sal 20 min. Escurrir y espolvorear perejil fresco.',
      'Pavo: sazonar con sal, pimienta y ajo. Cocinar en plancha caliente 5-6 min por lado hasta dorar.',
      'Reposo: dejar reposar el pavo 2 min antes de cortar.',
      'Ensalada: cortar pepino y tomate. Aliñar con aceite, sal y limón.',
      'Armado: servir el pavo con las papas y la ensalada al costado.',
    ],
  },
  tofu_quinoa: {
    label: 'Tofu salteado + quinoa + verduras',
    items: ['180g tofu firme', '100g quinoa cocida', '150g verduras salteadas (pimentón, zapallo, champiñones)', '1 cdta aceite de oliva + salsa de soya reducida en sodio'],
    baseKcal: 540, p: 34, c: 46, g: 18,
    foto: USP('1546069930-d8b9-4567-86b8-2f814bbb4f08'),
    tiempo: '25 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['soya', 'cruciferas'],   // tofu = soya · champiñones aceptable
    pasos: [
      'Quinoa: lavar bajo agua fría en colador fino. Cocinar en 2 tazas de agua con sal a fuego bajo 15 min tapado. Reposar 5 min antes de esponjar con tenedor.',
      'Tofu: cortar en cubos de 2cm. Secar con papel absorbente para eliminar el exceso de agua — así queda crocante al saltear.',
      'Saltear el tofu en aceite caliente a fuego alto 4-5 min por lado hasta dorar. Agregar 1 cdta salsa de soya al final.',
      'Verduras: en la misma sartén, saltear pimentón, zapallo y champiñones 3-4 min. El champiñón aporta umami natural.',
      'Armado: servir la quinoa como base, el tofu encima y las verduras al costado. El tofu aporta proteína completa de origen vegetal.',
    ],
  },
  bowl_garbanzos: {
    label: 'Bowl de garbanzos + vegetales asados',
    items: ['200g garbanzos cocidos', '150g vegetales asados (zanahoria, berenjena, zapallo)', '1 cda tahini o aceite de oliva', '80g arroz integral o pan pita integral'],
    baseKcal: 560, p: 28, c: 72, g: 12,
    foto: USP('1512621776951-a52572ce91c9'),
    tiempo: '30 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres', 'cebolla_ajo'],
    altoFODMAP: true,
    estacional: 'calor',   // bowl con vegetales asados — versátil pero ideal templado
    pasos: [
      'Vegetales: cortar en trozos medianos, mezclar con aceite, sal y comino. Asar a 200°C por 20-25 min hasta caramelizar.',
      'Garbanzos: si son de lata, enjuagar bien. Si son secos, remojar 12h y hervir 45 min. Los garbanzos aportan 15g de proteína por 100g.',
      'Arroz: cocinar en agua con sal a fuego bajo 18-20 min tapado.',
      'Salsa: mezclar tahini con limón, ajo y agua hasta lograr consistencia cremosa.',
      'Armado: colocar el arroz como base, los garbanzos y vegetales asados encima. Bañar con la salsa de tahini.',
    ],
  },
  curry_garbanzos: {
    label: 'Curry de garbanzos + arroz integral',
    items: ['200g garbanzos cocidos', '150g arroz integral cocido', 'Leche de coco 100ml + curry en polvo', '150g espinaca y tomate cherry', '1 cdta aceite de coco o de oliva'],
    baseKcal: 560, p: 26, c: 74, g: 14,
    foto: USP('1565557981-d9a55e1b9e6c'),
    tiempo: '25 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres', 'cebolla_ajo'],
    altoFODMAP: true,
    pasos: [
      'Sofrito: calentar aceite en sartén profunda. Saltear cebolla y ajo 3 min hasta transparentar.',
      'Especias: agregar 1 cdta curry, cúrcuma y comino. Tostar 1 min sin quemar — libera aromas y activa los polifenoles.',
      'Garbanzos: incorporar los garbanzos cocidos y el tomate cherry. Revolver bien.',
      'Leche de coco: agregar los 100ml y llevar a fuego suave 8-10 min hasta que la salsa espese.',
      'Espinaca: añadir al final, cocinar 2 min. Servir sobre el arroz integral. La cúrcuma tiene efecto antiinflamatorio documentado.',
    ],
  },
  vegetal_burger_abuelo: {
    label: 'Vegetal Burger Porotos Negros + papas',
    items: ['100g medallón vegetal (porotos negros + zapallo italiano)', '200g papas cocidas con cáscara', '2 tazas ensalada mixta (lechuga, tomate, pepino, pimentón)', '1 cdta aceite de oliva + mostaza sin azúcar'],
    baseKcal: 350, p: 13, c: 55, g: 10,
    foto: IMG + 'vegetal_burguer_abuelo.jpg',
    tiempo: '25 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres', 'gluten', 'soya', 'cebolla_ajo'],
    altoFODMAP: true,
    alergenosNota: 'Ingredientes: Porotos negros, Agua, Cebolla, Aceite de soya, Zapallo italiano (5%), Champiñones, Pimentón rojo, Harina de trigo (gluten), Metilcelulosa, Sal, Extracto de levadura, Maltodextrina, Aceite de maravilla, Aceite de canola, Saborizante idéntico a natural, Dióxido de silicio amorfo. Puede contener trazas de huevo, leche y alimentos cárnicos. Contiene gluten (harina de trigo) — no apto para celíacos.',
    pasos: [
      'Sartén o plancha: cocinar el medallón congelado directo a fuego medio-alto, 4-5 min por lado sin presionar. No descongelar antes — cocinar directo da mejor textura.',
      'Papas: cocer con cáscara en agua hirviendo 20-22 min o al microondas 8 min. Sazonar con sal y hierbas al gusto.',
      'Ensalada: lavar y secar las verduras. Trozar tomate, pepino y pimentón. Aliñar con aceite, sal y limón justo antes de servir.',
      'Armado: servir el medallón con las papas y la ensalada. Aporta 7.7 g de proteína vegetal (porotos negros) por medallón.',
      'Nota: el medallón puede presentar color morado/rosado natural por los porotos negros — es normal y no indica carne cruda.',
    ],
  },
  beyond_burger: {
    label: 'Beyond Burger + ensalada + papas',
    items: ['85g Beyond Burger (1 medallón vegetal)', '2 tazas ensalada mixta (lechuga, tomate, pepino)', '150g papas cocidas o asadas', '1 cdta aceite de oliva + mostaza o ketchup sin azúcar'],
    baseKcal: 560, p: 30, c: 54, g: 20,
    foto: IMG + 'beyond_burguer.jpg',
    tiempo: '20 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres'],   // proteína aislada de arveja + frijol mungo
    altoFODMAP: true,           // proteína aislada tiene menos FODMAP que legumbre entera, pero precaución en SIBO
    altaGrasa: true,
    sellos: ['Alto en Grasas Saturadas (5,1 g/porción)'],
    alergenosNota: 'Ingredientes: Agua, Aislado de proteína de arveja, Aceite de canola, Aceite de coco refinado, Proteína de arroz, Almidón de papa, Saborizantes naturales vegetales, Levadura seca, Proteína de frijol mungo, Metilcelulosa, Extracto de manzana, Extracto de granada, Extracto de levadura, Cloruro de potasio, Sal, Extracto de betarraga, Concentrado de jugo de limón, Lecitina de maravilla, Extracto licopeno de tomate, Aceite de maravilla, Glicerina vegetal, Maltodextrina, Ácido ascórbico, Vinagre. Sin gluten · Sin soya · Sin mariscos · Sin lácteos · Sin huevo. Elaborado en planta que también procesa soya y gluten.',
    pasos: [
      'Sartén o plancha: calentar a fuego alto sin aceite. Cocinar el medallón 3 min por lado hasta dorar. No presionar para que retenga los jugos.',
      'Papas: cocer con cáscara en agua hirviendo 20 min o en microondas 8 min. Sazonar con sal y hierbas.',
      'Ensalada: lavar y secar las verduras. Aliñar con aceite de oliva, sal y limón justo antes de servir.',
      'Armado: servir el Beyond Burger junto a las papas y la ensalada. Aporta 15,3 g de proteína vegetal completa (arveja + arroz) por porción.',
      'Nota: el color rosado al centro es normal — se debe al extracto de betarraga, no indica carne cruda.',
    ],
  },
}

// ─── CENAS ────────────────────────────────────────────────────────────────────
export const cenasOpts: Record<string, MealOption> = {
  carne_arroz: {
    label: 'Carne magra + papas salteadas con romero + ensalada (porción cena)',
    items: ['120g carne magra (posta, lomo o filete)', '180g papas salteadas con romero', 'Ensalada de lechuga, tomate y pepino', '1 cdta aceite de oliva'],
    baseKcal: 395, p: 33, c: 33, g: 13,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 120,
    tieneCarboPrincipal: true, carboTipo: 'papas', carboGramosBase: 180,
    tiempo: '25 min',
    pasos: [
      'Papas: cortar 180g de papas en cubos medianos. Hervir 7-8 min en agua con sal hasta firmes pero tiernas. Escurrir y dejar secar 2 min.',
      'Saltear: en sartén caliente con 1 cdta aceite de oliva, agregar las papas y 1-2 ramitas de romero (o ½ cdta seco). Saltear 5 min hasta dorar los bordes. Porción cena moderada.',
      'Carne: sazonar y cocinar en plancha 4-5 min por lado. Reposar 2 min antes de cortar.',
      'Ensalada: aliñar con aceite, sal y limón.',
      'Armado: servir la carne con las papas salteadas y la ensalada. Versión moderada para cena — el profesional puede ajustar gramaje de las papas según objetivo del paciente.',
    ],
  },
  pollo_verduras: {
    label: 'Pechuga de pollo + verduras al vapor',
    items: ['150g pechuga pollo a la plancha', '200g mix verduras al vapor (brócoli, zanahorias, zapallito)', '1 cdta aceite de oliva', 'Limón y ajo'],
    baseKcal: 320, p: 40, c: 16, g: 9,
    foto: IMG + 'pollo_plancha_arroz_ensalada.jfif',
    tendencia: ['omnivoro'],
    contiene: ['cruciferas', 'cebolla_ajo'],   // brócoli
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 150,
    tiempo: '20 min',
    pasos: [
      'Pollo: sazonar con sal, pimienta, ajo y limón. Cocinar en plancha 6-7 min por lado.',
      'Verduras: colocar en vaporera o colador sobre agua hirviendo. Tapar y cocinar 8-10 min hasta tiernas pero firmes.',
      'Alternativa horno: disponer las verduras en una fuente, rociar con aceite y sal, hornear 15 min a 200°C.',
      'Reposo: dejar reposar el pollo 2 min antes de cortar en tiras.',
      'Servir el pollo con las verduras al vapor. Aliñar con limón y aceite de oliva.',
    ],
  },
  huevos_ensalada: {
    label: 'Omelette de huevos + ensalada verde',
    items: ['3 huevos enteros', 'Espinacas, champiñones y tomate', 'Ensalada de hojas verdes', '1 cdta aceite de oliva'],
    baseKcal: 310, p: 28, c: 10, g: 18, tieneHuevo: true, eggsDefault: 3,
    foto: IMG + 'omelette_pan_integral.jfif',
    tendencia: ['vegetariano'],
    contiene: ['huevo'],
    tiempo: '12 min',
    pasos: [
      'Batido: mezclar los 3 huevos con sal y pimienta hasta homogeneizar.',
      'Verduras: saltear espinaca y champiñones 2 min en sartén con unas gotas de aceite.',
      'Cocción: verter los huevos sobre las verduras en sartén a fuego medio-bajo. Cuando los bordes cuajen, doblar el omelette.',
      'Ensalada: lavar las hojas verdes y aliñar con aceite, sal y limón.',
      'Servir el omelette junto a la ensalada verde.',
    ],
  },
  atun_ensalada: {
    label: 'Ensalada proteica de atún + huevo + palta',
    items: ['150g atún en agua escurrido', '1 huevo duro', '¼ palta', 'Lechuga, tomate cherry, pepino, zanahoria rallada'],
    baseKcal: 330, p: 36, c: 12, g: 14, tieneHuevo: true, eggsDefault: 1,
    foto: IMG + 'ensalada_proteica.webp',
    tendencia: ['omnivoro'],
    contiene: ['huevo'],
    estacional: 'calor',
    tieneCarne: true, carneTipo: 'atun', carneGramosBase: 150,
    tiempo: '15 min',
    pasos: [
      'Atún: escurrir bien la lata. El atún en agua aporta 26g de proteína por 100g con solo 1g de grasa.',
      'Huevo: cocinar duro 10 min en agua hirviendo. Pelar y cortar en mitades.',
      'Palta: cortar en láminas justo antes de servir. Aporta grasas monoinsaturadas saludables.',
      'Verduras: lavar y cortar tomate cherry, pepino y zanahoria. Las verduras crudas conservan vitamina C y folato.',
      'Armado: disponer verduras como base, agregar atún, huevo y palta. Aliñar con aceite de oliva y limón.',
    ],
  },
  salmon_brocoli: {
    label: 'Salmón al horno + brócoli al vapor',
    items: ['150g salmón al horno', '200g brócoli al vapor', '1 cdta aceite de oliva', 'Ajo y limón al gusto'],
    baseKcal: 340, p: 38, c: 8, g: 16,
    foto: IMG + 'salmon_quinoa.webp',
    tendencia: ['omnivoro'],
    contiene: ['cruciferas', 'cebolla_ajo'],
    tieneCarne: true, carneTipo: 'salmon', carneGramosBase: 150,
    tiempo: '20 min',
    pasos: [
      'Salmón: sazonar con sal, pimienta, ajo y limón. Cocinar en sartén 3-4 min por lado hasta que el centro esté opaco pero jugoso.',
      'Brócoli: colocar en vaporera sobre agua hirviendo 8-10 min. Debe quedar tierno pero con textura.',
      'Alternativa: hornear salmón a 180°C por 12-15 min cubierto con papel aluminio.',
      'Reposo: retirar el salmón y dejar reposar 2 min.',
      'Servir el salmón junto al brócoli. Finalizar con gotas de limón y aceite.',
    ],
  },
  carne_zapallo: {
    label: 'Carne magra + zapallo italiano + ensalada',
    items: ['150g bistec magro a la plancha', '200g zapallo italiano salteado', 'Ensalada de hojas verdes', 'Sal, pimienta y ajo al gusto'],
    baseKcal: 310, p: 35, c: 14, g: 11,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 150,
    tiempo: '20 min',
    pasos: [
      'Carne: sazonar con sal, pimienta y ajo. Cocinar en plancha bien caliente 4-5 min por lado.',
      'Reposo: dejar reposar 2-3 min antes de cortar para redistribuir los jugos.',
      'Zapallo: cortar en rodajas de 1cm. Saltear en sartén con unas gotas de aceite y ajo 4-5 min hasta dorar.',
      'Ensalada: lavar hojas verdes y aliñar con limón y sal.',
      'Servir la carne con el zapallo salteado y la ensalada al costado.',
    ],
  },
  sopa_pollo: {
    label: 'Sopa de pollo y verduras',
    items: ['150g pollo desmenuzado', 'Zanahoria, apio, puerro y papas', 'Caldo natural bajo en sodio', 'Perejil fresco al gusto'],
    baseKcal: 290, p: 30, c: 22, g: 6,
    foto: USP('1627366422957-3efa9c6df0fc'), // sopa con carne en bol blanco, foto real
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    estacional: 'frio',   // sopa caliente — preferida en otoño/invierno
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 150,
    tiempo: '35 min',
    pasos: [
      'Caldo: calentar 1 litro de caldo de pollo en una olla grande a fuego medio.',
      'Verduras: pelar y cortar en trozos medianos zanahoria, puerro, apio y papa. Agregar al caldo.',
      'Cocinar 20-25 min hasta que las verduras estén tiernas.',
      'Pollo: agregar el pollo desmenuzado (puede ser cocido o crudo: si crudo, agregar desde el inicio).',
      'Rectificar sal. Servir caliente con perejil fresco picado.',
    ],
  },
  sopa_lentejas: {
    label: 'Sopa de lentejas + verduras',
    items: ['200g lentejas cocidas', 'Zanahoria, apio, tomate y espinaca', 'Caldo vegetal bajo en sodio', '1 rebanada pan integral'],
    baseKcal: 310, p: 22, c: 38, g: 5,
    tienePan: true, panTipoDefault: 'integral',
    foto: USP('1547592166-9a59b8dddb7f'),
    tiempo: '30 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres', 'gluten', 'cebolla_ajo'],  // pan integral
    altoFODMAP: true,
    estacional: 'frio',
    pasos: [
      'Sofrito: saltear cebolla, ajo y zanahoria en una olla con pizca de aceite 3-4 min.',
      'Tomate: agregar tomate picado, cocinar 5 min hasta ablandar.',
      'Lentejas: agregar las lentejas ya cocidas y el caldo vegetal. Llevar a hervor y cocinar 10-15 min a fuego bajo.',
      'Espinaca: agregar al final, cocinar 2 min más. La espinaca aporta hierro no hemo que se absorbe mejor con el limón.',
      'Servir caliente con 1 rebanada de pan integral. Exprimir limón antes de consumir para mejorar absorción del hierro.',
    ],
  },
  ensalada_garbanzos: {
    label: 'Ensalada de garbanzos + palta + huevo',
    items: ['150g garbanzos cocidos', '½ palta en láminas', '2 huevos duros', 'Lechuga, tomate cherry, pepino y zanahoria rallada', '1 cdta aceite de oliva + limón'],
    baseKcal: 390, p: 26, c: 32, g: 18,
    foto: USP('1512621776951-a52572ce91c9'),
    tiempo: '15 min',
    tendencia: ['vegetariano'],
    contiene: ['legumbres', 'huevo'],
    altoFODMAP: true,
    estacional: 'calor',   // ensalada fría — ideal primavera/verano
    pasos: [
      'Huevos: cocinar duros 10 min en agua hirviendo. Pelar y cortar en mitades.',
      'Garbanzos: si son de lata, enjuagar y escurrir. Secar levemente para que absorban el aliño.',
      'Palta: cortar en láminas justo antes de servir para evitar oxidación.',
      'Verduras: lavar y cortar tomate cherry, pepino y zanahoria. Disponer en bowl grande.',
      'Armado: agregar garbanzos, huevo y palta sobre las verduras. Aliñar con aceite de oliva, limón y sal.',
    ],
  },
  wok_tofu_vegano: {
    label: 'Wok de tofu + verduras + fideos integrales',
    items: ['180g tofu firme en cubos', '100g fideos integrales o de arroz cocidos', '150g verduras (brócoli, pimentón, zanahoria, champiñones)', '1 cdta aceite de sésamo + salsa de soya'],
    baseKcal: 320, p: 24, c: 34, g: 10,
    foto: USP('1546069930-d8b9-4567-86b8-2f814bbb4f08'),
    tiempo: '20 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['soya', 'gluten', 'cruciferas', 'cebolla_ajo'],   // tofu+soya · fideos integrales · brócoli
    pasos: [
      'Tofu: cortar en cubos de 2cm, secar con papel absorbente. Saltear en wok caliente con aceite 4-5 min por lado hasta dorar y crocante.',
      'Verduras: retirar el tofu, saltear brócoli, pimentón y zanahoria a fuego alto 3-4 min. Agregar champiñones los últimos 2 min.',
      'Fideos: incorporar los fideos ya cocidos. Mezclar continuamente 2 min.',
      'Salsa: agregar salsa de soya y aceite de sésamo. El sésamo aporta calcio biodisponible importante en dietas veganas.',
      'Reincorporar el tofu, mezclar y servir de inmediato.',
    ],
  },
  bowl_lentejas_aguacate: {
    label: 'Bowl de lentejas + aguacate + tomate',
    items: ['200g lentejas cocidas', '½ aguacate en láminas', 'Tomate cherry, pepino y rúcula', '1 cdta aceite de oliva + limón + cúrcuma'],
    baseKcal: 360, p: 22, c: 34, g: 14,
    foto: USP('1547592166-9a59b8dddb7f'),
    tiempo: '10 min',
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['legumbres'],
    altoFODMAP: true,
    estacional: 'calor',
    pasos: [
      'Lentejas: usar cocidas (lata o cocción previa). Escurrir y sazonar con sal, comino y limón.',
      'Verduras: cortar tomate cherry por la mitad, rodajas de pepino y lavar la rúcula.',
      'Aguacate: cortar en láminas justo antes de servir. Aporta grasas monoinsaturadas y potasio.',
      'Armado: disponer las verduras y rúcula como base, las lentejas al centro y el aguacate encima.',
      'Aliño: mezclar aceite de oliva, limón y pizca de cúrcuma. Verter sobre el bowl. Sin cocción — listo en 10 minutos.',
    ],
  },
}

// ─── ULTRA PROCESADOS ─────────────────────────────────────────────────────────
export const ultraProcOpts: Record<string, UltraOption> = {
  chips_papas: {
    label: '🍟 Papas fritas snack',
    porcion: '1 paquete pequeño (28g)',
    kcal: 536, p: 7, c: 53, g: 34,
    sellos: ['Alto en grasas saturadas', 'Alto en sodio'],
  },
  galletas_dulces: {
    label: '🍪 Galletitas Mini Costa Limón',
    porcion: '1 bolsa (35g)',
    kcal: 173, p: 1.8, c: 25.8, g: 6.9,
    sellos: ['Alto en azúcares (8.8g)', 'Alto en grasas saturadas (3.8g)', 'Alto en calorías', 'Contiene grasas trans (0.1g)', 'Alto en sodio (137.6mg)'],
  },
  chocolate_leche: {
    label: '🍫 Chocolate Trencito Nestlé',
    porcion: '6 cuadritos (25g) · 6 porciones por envase',
    kcal: 137, p: 2.1, c: 15, g: 7.6,
    sellos: ['Alto en azúcares (13.1g)', 'Alto en grasas saturadas (4.8g)', 'Contiene grasas trans (0.15g)'],
    alergenos: ['Leche', 'Soya', 'Puede contener nueces y derivados'],
  },
  bebida_cola: {
    label: '🥤 Bebida cola/gaseosa',
    porcion: '1 lata (355ml)',
    kcal: 150, p: 0, c: 40, g: 0,
    sellos: ['Alto en azúcares'],
  },
  helado: {
    label: '🍦 Sandwich Helado Vainilla (Great Value)',
    porcion: '1 sándwich (68ml) · 16 unidades por caja',
    kcal: 100, p: 2, c: 17, g: 3.5,
    sellos: ['Alto en azúcares (8g)', 'Alto en sodio (70mg)', 'Alto en calorías'],
    alergenos: ['Leche'],
  },
  doritos: {
    label: '🌽 Doritos Sabor Queso',
    porcion: '1 porción (25g) · 6 porciones por envase (150g)',
    kcal: 128, p: 1.5, c: 16, g: 6.3,
    sellos: ['Alto en sodio (197mg por porción)', 'Alto en carbohidratos (16g)', 'Grasas saturadas (0.7g)'],
    alergenos: ['Leche (queso, sólidos de leche)'],
  },
  kuchen: {
    label: '🎂 Kuchen/Pastel',
    porcion: '1 trozo (80g)',
    kcal: 350, p: 5, c: 40, g: 19,
    sellos: ['Alto en azúcares', 'Alto en grasas saturadas'],
    alergenos: ['Gluten', 'Huevo', 'Leche'],
  },
  gomitas: {
    label: '🍬 Gomitas/Dulces',
    porcion: '1 porción (30g)',
    kcal: 320, p: 6, c: 74, g: 0,
    sellos: ['Alto en azúcares'],
  },
  barra_cereal_azucar: {
    label: '🍫 Barra de cereal azucarada',
    porcion: '1 barra (35g)',
    kcal: 400, p: 4, c: 65, g: 14,
    sellos: ['Alto en azúcares'],
  },
  nuggets: {
    label: '🍗 Nuggets fritos',
    porcion: '6 unidades (100g)',
    kcal: 297, p: 15, c: 17, g: 18,
    sellos: ['Alto en sodio', 'Alto en grasas saturadas'],
  },
  chocolate_sahne_nuss: {
    label: '🍫 Chocolate Sahne-Nuss con Almendras',
    porcion: '2 cuadritos (31g) · 5 porciones por envase',
    kcal: 173, p: 3.5, c: 14.5, g: 11.2,
    sellos: ['Alto en azúcares (13.6g)', 'Alto en grasas saturadas (4.8g)', 'Contiene colesterol (5mg)'],
    alergenos: ['Almendras', 'Soya (lecitina)', 'Leche'],
  },
  donuts: {
    label: '🍩 Donuts de chocolate',
    porcion: '5 unidades (36g)',
    kcal: 522, p: 5, c: 66, g: 27,
    sellos: ['Alto en azúcares', 'Alto en grasas saturadas', 'Alto en calorías'],
    alergenos: ['Gluten', 'Leche', 'Soya', 'Huevo'],
  },
  chomp_bombon: {
    label: '🍦 Bombón Helado Chomp Frambuesa (Savory)',
    porcion: '5 bombones (75ml) · 3 porciones por envase (225ml)',
    kcal: 213, p: 0.8, c: 18.8, g: 15,
    sellos: ['Alto en azúcares (16.5g)', 'Alto en grasas saturadas (11.3g)', 'Alto en calorías', 'Contiene grasas trans (0.1g)'],
    alergenos: ['Leche'],
  },
}

// ─── Helper: obtener option con fallback ──────────────────────────────────────
export function getMealOption(
  pool: Record<string, MealOption>,
  keys: string[],
  index: number,
): MealOption {
  if (!keys || keys.length === 0) {
    return Object.values(pool)[0]
  }
  const key = keys[index % keys.length]
  return pool[key] ?? Object.values(pool)[0]
}
