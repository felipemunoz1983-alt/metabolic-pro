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
  carneTipo?: 'pollo' | 'pavo' | 'carne_roja' | 'salmon' | 'atun' | 'pescado_blanco'
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
  panTipoDefault?: 'integral' | 'blanco' | 'marraqueta' | 'multicereal' | 'molde_integral' | 'pita_integral' | 'masa_madre' | 'sin_gluten' | 'proteico' | 'clean_label' | 'hallulla'
  /** true = la preparación incluye queso (sándwich, tostada con queso, etc.).
   *  Activa el selector de tipo de queso en el wizard. El paciente puede elegir
   *  entre gauda (default), mantecoso, laminado light o quesillo fresco. */
  tieneQueso?: boolean
  /** Tipo de queso que usa la receta por defecto. Casi todos los sándwich del
   *  catálogo usan gauda como base; el selector lo deja cambiar.  */
  quesoTipoDefault?: 'gauda' | 'mantecoso' | 'light' | 'quesillo' | 'quesillo_zerolacto' | 'surlat_protein' | 'parcelas_chanco'
  /** Gramaje base del queso en la receta (típicamente 30g por lámina). Usado
   *  para escalar macros si el paciente cambia el tipo. */
  quesoGramosBase?: number
}

// ─── Macros por gramo de carne (USDA simplificado) ───────────────────────────
// Usado para reajustar p/c/g cuando el paciente cambia el gramaje en su selector.
export const CARNE_MACROS_POR_GRAMO: Record<
  'pollo' | 'pavo' | 'carne_roja' | 'salmon' | 'atun' | 'pescado_blanco',
  { kcal: number; p: number; g: number }
> = {
  pollo:          { kcal: 0.96, p: 0.196, g: 0.017 },  // Super Pollo · etiqueta oficial 100g: 96kcal · 19.6gP · 1.7gG · 0.5gC · 141mg Na — usado en cálculo dinámico de gramaje + base de todos los platos con pollo
  pavo:           { kcal: 1.35, p: 0.29,  g: 0.020 },  // pechuga pavo
  carne_roja:     { kcal: 1.50, p: 0.26,  g: 0.050 },  // posta/lomo magro
  salmon:         { kcal: 2.00, p: 0.22,  g: 0.130 },  // salmón fresco
  atun:           { kcal: 1.05, p: 0.26,  g: 0.010 },  // atún en agua
  pescado_blanco: { kcal: 0.88, p: 0.18,  g: 0.013 },  // merluza / reineta / corvina — pescado blanco magro INTA/USDA
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
    categoria: 'yogur' as const,
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
    categoria: 'yogur' as const,
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
    categoria: 'yogur' as const,
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
    categoria: 'yogur' as const,
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
  loncoleche_protein: {
    label: 'Loncoleche Proteína Natural',
    emoji: '🥛',
    item: 'Yogur Loncoleche Proteína Natural Endulzado 140g (pote individual)',
    // Fuente: ficha nutricional Jumbo CL 2026 (idsku=73012) — pote 140g completo:
    //   84 kcal · 12.3 P · 8.3 C (5.5g azúcar) · 0.1 G · 56 mg sodio
    //   Por 100g: 60 kcal · 8.8 P · 5.9 C · 0.07 G
    //   Sin lactosa (deslactosado con enzima lactasa) · 0% grasa · libre de gluten.
    //   Sellos chilenos: NO aparecen (perfil nutricional limpio).
    //   Endulzado con sucralosa + estevia. Precio: $750 CLP / 140g.
    //   Foto Jumbo (cuadrada 900x900, 55KB webp).
    //   Mejor ratio prot/kcal del catalogo: 12.3g/84kcal = 0.146 (vs Colun 11/120 = 0.092).
    kcal: 84, p: 12, c: 8, g: 0,
    badge: '12.3g prot · 84 kcal · Sin lactosa · 0% grasa',
    alergenosNota: '⚠️ Loncoleche Proteína · Pote 140g individual · Sin lactosa (con enzima lactasa). Endulzado con sucralosa + estevia. Trazas posibles de almendra, pasas, nueces, soya y gluten (avena). Libre de huevo, peces, mariscos, maní, sulfitos y trigo.',
    foto: '/img/yogur_loncoleche_protein.webp',
    vegano: false, vegetariano: true,
    contiene: [] as string[],   // sin lactosa, sin gluten (solo posibles trazas, no contenido directo)
    categoria: 'yogur' as const,
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
    categoria: 'yogur' as const,
  },
  // ─── Bebidas lácteas proteicas (no son yogur estrictamente, pero comparten
  //     uso clínico: snack proteico líquido, pre/post-entreno, colación). ───
  milo_protein: {
    label: 'Milo Protein Up',
    emoji: '🥤',
    item: 'Bebida láctea Milo Protein Up 330ml (1 botella)',
    // Fuente: etiqueta oficial Nestlé Chile · 330ml = 1 porción individual
    //   201.3 kcal · 20.1g prot · 23.1g CH (de los cuales 15.5g azúcares) · 3g grasa · 198mg sodio
    //   Sin sellos chilenos (azúcar viene del cacao + leche, dentro del límite)
    //   Foto oficial descargada desde Jumbo (vtexassets)
    kcal: 201, p: 20, c: 23, g: 3,
    badge: '20g prot · Bebida lista para llevar · Sabor chocolate',
    alergenosNota: '⚠️ Nestlé Milo Protein Up · Contiene leche y soya · CON lactosa · 15.5g de azúcares por porción (no es bajo en azúcar). Sin sellos chilenos por el momento, pero el azúcar agregado es relevante en plan de pérdida de grasa. Útil como post-entreno listo para llevar.',
    foto: '/img/milo_protein_up.jpg',
    vegano: false, vegetariano: true,
    contiene: ['lactosa', 'soya'] as string[],
    categoria: 'bebida_proteica' as const,
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
    alergenosNota: 'Pan Castaño Linaza Chía Prebiótico · Contiene gluten (trigo, avena). Aporta polidextrosa prebiótica (3.5%) y semillas de linaza/chía. Puede contener trazas de leche, soya, nueces, avena, maíz, quinua y semillas (amapola, calabaza, maravilla, sésamo). La porción estándar de etiqueta son 2 rebanadas (63g · 164 kcal · 8.3g proteína · 6.7g fibra). Envase 600g rinde ~10 porciones (~19 rebanadas).',
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
    alergenosNota: 'Pan Ideal Blanco XL · Contiene gluten (trigo). LIBRE de huevo, lactosa, peces, mariscos, maní y sulfitos. Apto APLV, vegano, vegetariano y kosher. La porción estándar son 2 rebanadas (56g · 144 kcal · 5.5g proteína · 219mg sodio). Envase 750g rinde ~13 porciones (~27 rebanadas).',
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
    alergenosNota: 'Marraqueta · Pan corriente blanco chileno (datos INTA Chile + MINSAL/FAO). Contiene gluten (trigo). Aporta hierro (3.1 mg/unidad) y vitamina B1 (0.6 mg/unidad). La porción nutricional habitual en guías alimentarias chilenas es ½ marraqueta (45g · 112 kcal · 4.3g proteína · 291 mg sodio). 1 kg de marraqueta ≈ 11 unidades de 90g (se vende a granel por peso en panadería).',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'alto',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/369294-900-900?width=900&height=900&aspect=true',
  },
  multicereal: {
    label: 'Pan Castaño Calabaza Proteína',
    emoji: '🎃',
    // Pan Molde Integral Castaño Calabaza Proteína (envase 600g · 10 porciones · ~20 rebanadas).
    // La etiqueta reporta por PORCIÓN de 2 rebanadas (63g · 164 kcal · 10g P).
    // Multigrano con CALABAZA (zapallo) + sésamo + refuerzo proteico (trigo + arveja).
    // Diferencial vs el `proteico` Castaño Multigrano: este lleva calabaza como signature.
    item: 'pan Castaño Calabaza Proteína (1 rebanada · 31.5g)',
    gramos: 31.5,
    // Macros por 1 rebanada (31.5g) — derivadas de la etiqueta oficial Castaño Calabaza Proteína:
    //   100g: 261 kcal · 16.2g P · 5.1g G · 36.7g C disponibles · 5.1g azúcares · 5.9g fibra · 372mg sodio
    //   1 porción (2 rebanadas, 63g): 164.4 kcal · 10.2g P · 3.2g G · 23.1g C · 3.7g fibra · 234.4mg sodio
    kcal: 82, p: 5.1, c: 11.6, g: 1.6,
    badge: 'Multigrano + Calabaza + Proteína · 10g P por porción · Porción=2 rebanadas',
    alergenosNota: 'Pan Castaño Calabaza Proteína · 100% harina integral + proteína de trigo y arveja. Semillas tostadas de zapallo + sésamo + zapallo natural deshidratado. Fortificado con Zinc, Vit. A, B6 y D3. Contiene gluten (trigo) y sésamo. LIBRE de huevo, lactosa, peces, mariscos, maní y sulfitos. Trazas de leche, soya, nueces, avena, maíz, quinua, amapola, linaza y maravilla. Apto vegano y vegetariano. La porción estándar son 2 rebanadas (63g · 164 kcal · 10g proteína · 3.7g fibra · 234mg sodio). Envase 600g rinde 10 porciones (~20 rebanadas).',
    contiene: ['gluten', 'legumbres'] as string[],
    indiceGlicemico: 'bajo',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/560603-900-900?width=900&height=900&aspect=true',
  },
  molde_integral: {
    label: 'Pan Castaño Integral XL',
    emoji: '🍞',
    // Pan Molde Castaño Integral XL (envase 770g · 14 porciones · ~28 rebanadas).
    // La etiqueta reporta por PORCIÓN de 55g = 2 rebanadas (~27.5g cada una).
    // Versión "integral simple" formato XL — sin semillas ni prebióticos
    // (a diferencia del Castaño Linaza Chía que está en el slot `integral`).
    item: 'pan Castaño Integral XL (1 rebanada · 27.5g)',
    gramos: 27.5,
    // Macros por 1 rebanada (27.5g) — derivadas de la etiqueta oficial Castaño Integral XL:
    //   100g: 249 kcal · 12.7g P · 3.2g G · 42.5g C disponibles · 4.1g azúcares · 6.4g fibra · 396mg sodio
    //   1 porción (2 rebanadas, 55g): 137 kcal · 7g P · 1.8g G · 23.4g C · 3.5g fibra · 217.8mg sodio
    kcal: 69, p: 3.5, c: 11.7, g: 0.9,
    badge: 'Integral simple · XL · Práctico sándwich · Porción=2 rebanadas',
    alergenosNota: 'Pan Castaño Integral XL · 100% harina de trigo integral grano entero + trigo laminado. Contiene gluten (trigo). LIBRE de huevo, lactosa, peces, mariscos, maní, frutos secos, nueces y sulfitos. Trazas de leche y soya. Apto vegano, vegetariano y sin lactosa. La porción estándar son 2 rebanadas (55g · 137 kcal · 7g proteína · 3.5g fibra · 218mg sodio). Envase 770g rinde 14 porciones (~28 rebanadas).',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'medio',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/445374-900-900?width=900&height=900&aspect=true',
  },
  pita_integral: {
    label: 'Pan Pita Castaño Chía Linaza',
    emoji: '🫓',
    // Pan Pita Castaño Chía Linaza (envase 300g · ~8 pitas de 38g c/u).
    // La etiqueta reporta por PORCIÓN = 1 pita entera = 38g.
    // Integral con linaza + chía. Pita más chica que la convencional (38g vs 50-60g típicos).
    item: 'pan pita Castaño Chía Linaza (1 pita · 38g)',
    gramos: 38,
    // Macros por 1 pita (38g) — derivadas de la etiqueta oficial Castaño:
    //   100g: 232 kcal · 10.4g P · 3.6g G · 38.7g C disponibles · 2.2g azúcares · 7.8g fibra · 310mg sodio
    //   1 porción (1 pita, 38g): 88.2 kcal · 4g P · 1.4g G · 14.7g C · 3g fibra · 117.8mg sodio
    kcal: 88, p: 4, c: 14.7, g: 1.4,
    badge: 'Pita integral · Chía + Linaza · Porción=1 pita',
    alergenosNota: 'Pan Pita Castaño Chía Linaza · 100% harina integral de trigo grano entero + semillas de chía y linaza. Contiene gluten (trigo). LIBRE de huevo, lactosa, peces, mariscos, maní y sulfitos. Trazas de leche, soya, nueces, avena, maíz, quínoa y semillas (amapola, calabaza, girasol, sésamo). Apto vegano, vegetariano y sin lactosa. Buena fuente de fibra (3g por pita · 7.8g/100g). La porción estándar es 1 pita (38g · 88 kcal · 4g proteína · 3g fibra · 118mg sodio). Envase 300g rinde ~8 pitas — ideal para wraps y sándwich tipo árabe.',
    contiene: ['gluten'] as string[],
    indiceGlicemico: 'medio',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/552785-900-900?width=900&height=900&aspect=true',
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
    label: 'Marraqueta sin gluten Cuisine & Co',
    emoji: '🥖',
    // Pan Marraqueta sin gluten Cuisine & Co (envase 480g · 4 unidades de 120g c/u).
    // La etiqueta reporta por PORCIÓN = 1 marraqueta entera = 120g.
    // Base de harina de arroz + maíz + almidones de mandioca/maíz.
    // ⚠️ Bajo en proteína (sin trigo) — combinar con fuente proteica si es comida principal.
    item: 'marraqueta sin gluten Cuisine & Co (1 unidad · 120g)',
    gramos: 120,
    // Macros por 1 marraqueta (120g) — derivadas de la etiqueta oficial Cuisine & Co:
    //   100g: 221 kcal · 2.8g P · 3.0g G · 45.6g C disponibles · 4.6g azúcares · 3.1g fibra · 522mg sodio
    //   1 porción (1 marraqueta, 120g): 265 kcal · 3.4g P · 3.6g G · 54.7g C · 3.7g fibra · 626mg sodio
    kcal: 265, p: 3.4, c: 54.7, g: 3.6,
    badge: 'Sin gluten · Apto celíacos APLV · Marraqueta · Porción=1 unidad',
    alergenosNota: 'Marraqueta sin gluten Cuisine & Co · Base de harina de arroz + maíz + almidones (mandioca + maíz). CONTIENE soya y huevo (albúmina). LIBRE de trigo, gluten, lactosa, peces, mariscos, maní, frutos secos, nueces y sulfitos. Apto celíacos, APLV, vegetariano y sin lactosa. ⚠️ Baja en proteína (2.8g/100g) — combinar con fuente proteica (huevo, palta, jamón pavo, queso, hummus). Sodio elevado: 626mg por unidad. La porción estándar es 1 marraqueta entera (120g · 265 kcal). Envase 480g = 4 marraquetas.',
    contiene: ['soya', 'huevo'] as string[],
    indiceGlicemico: 'alto',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/636257-900-900?width=900&height=900&aspect=true',
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
  clean_label: {
    label: 'Pan Proteína Clean Label · Jumbo Artesanal',
    emoji: '🌱',
    // Pan Molde Proteína Clean Label - Jumbo Artesanal (envase 780g · ~10 porciones · ~20 rebanadas).
    // Atributo signature: CLEAN LABEL — sin aditivos artificiales, sin conservantes químicos.
    // Solo: harina integral, proteína chía, proteína soya, sal, KCl, vinagre, enzimas, semillas.
    // El pan con MAYOR proteína (16.4g/100g) y MAYOR fibra (8g/100g) del catálogo actual.
    item: 'pan Proteína Clean Label Jumbo Artesanal (1 rebanada · 40g)',
    gramos: 40,
    // Macros por 1 rebanada (40g) — derivadas de la etiqueta oficial Jumbo Artesanal:
    //   100g: 233 kcal · 16.4g P · 5.6g G · 33.4g C disponibles · 1.4g azúcares · 8g fibra · 395mg sodio
    //   1 porción (2 rebanadas, 80g): 186.4 kcal · 13.1g P · 4.5g G · 26.7g C · 6.4g fibra · 316mg sodio
    kcal: 93, p: 6.6, c: 13.4, g: 2.3,
    badge: 'Clean Label · Sin aditivos · 13g P + 6.4g fibra / porción',
    alergenosNota: 'Pan Proteína Clean Label Jumbo Artesanal · Ingredientes 100% reconocibles: harina integral grano entero de trigo, proteína de chía, proteína de soya, sal, KCl (cloruro potasio para reducir sodio), vinagre, enzimas, semillas (chía, sésamo, girasol). SIN aditivos artificiales, SIN conservantes químicos. Contiene gluten (trigo) y soya. LIBRE de lactosa, peces, mariscos, maní y sulfitos. Trazas de huevo, leche y nueces. El pan más alto en proteína (16.4g/100g) y fibra (8g/100g) del catálogo. La porción estándar son 2 rebanadas (80g · 186 kcal · 13.1g proteína · 6.4g fibra · 316mg sodio). Envase 780g rinde ~10 porciones (~20 rebanadas).',
    contiene: ['gluten', 'soya'] as string[],
    indiceGlicemico: 'bajo',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/310748-900-900?width=900&height=900&aspect=true',
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

// ─── Tipos de queso laminado disponibles (4 opciones) ────────────────────────
// Datos por 30g (1 lámina típica de sandwich). Macros INTA Chile + etiquetas
// oficiales productores chilenos (Soprole, Colun, Chilean Goat, etc.).
// Diferenciación clínica: cada opción cubre un escenario distinto:
//   - gauda:      default sabor, alto sodio (clásico mercado)
//   - mantecoso:  más graso, más sabor (clásico chileno premium)
//   - light:      bajo en grasa (déficit, hipertensión)
//   - quesillo:   fresco bajo en sodio (cardiacos, embarazo)
export const QUESO_TIPOS = {
  gauda: {
    label: 'Gauda clásico',
    emoji: '🧀',
    item: '30g de queso gauda laminado',
    // Soprole Gauda — etiqueta: 113 kcal · 8 P · 0.3 C · 9 G · 210 mg sodio
    kcal: 113, p: 8, c: 0.3, g: 9, sodioMg: 210,
    badge: '8g prot · Clásico · Mejor sabor',
    descripcion: 'El estándar del mercado chileno. Mejor sabor y cremosidad, pero alto en sodio. Apto vegetariano.',
    contiene: ['lactosa'] as string[],
    vegetariano: true,
  },
  mantecoso: {
    label: 'Mantecoso',
    emoji: '🟡',
    item: '30g de queso mantecoso laminado',
    // Colun Mantecoso — etiqueta: 95 kcal · 6.5 P · 0.5 C · 7.5 G · 195 mg sodio
    // Menor densidad calórica que gauda por mayor humedad.
    kcal: 95, p: 6.5, c: 0.5, g: 7.5, sodioMg: 195,
    badge: '6.5g prot · Menos calórico · Tradicional',
    descripcion: 'Queso fresco tradicional chileno, más blando y húmedo que el gauda. Menos kcal y grasa por mayor contenido de agua. Apto vegetariano.',
    contiene: ['lactosa'] as string[],
    vegetariano: true,
  },
  light: {
    label: 'Laminado Light',
    emoji: '🥬',
    item: '30g de queso laminado light (bajo en grasa)',
    // Soprole Laminado Light — etiqueta: 63 kcal · 8.5 P · 0.6 C · 3 G · 240 mg sodio
    // -44% kcal vs gauda, -67% grasa, +6% proteína. Para déficit estricto.
    kcal: 63, p: 8.5, c: 0.6, g: 3, sodioMg: 240,
    badge: '8.5g prot · -44% kcal · Ideal déficit',
    descripcion: 'Versión reducida en grasa. -44% kcal vs gauda con MÁS proteína. Ideal para déficit calórico estricto. Sigue alto en sodio. Apto vegetariano.',
    contiene: ['lactosa'] as string[],
    vegetariano: true,
  },
  quesillo: {
    label: 'Quesillo fresco',
    emoji: '⚪',
    item: '30g de quesillo fresco chileno',
    // Quesillo nacional — etiqueta promedio: 63 kcal · 4.5 P · 1 C · 4.8 G · 60 mg sodio
    // El más bajo en sodio del catálogo — apto cardiopatía e hipertensión.
    kcal: 63, p: 4.5, c: 1, g: 4.8, sodioMg: 60,
    badge: '4.5g prot · -71% sodio · Apto HTA',
    descripcion: 'Queso fresco artesanal chileno, muy bajo en sodio (-71% vs gauda). Apto para hipertensión, embarazo y cardiopatía. Sabor neutro, textura húmeda. Apto vegetariano.',
    contiene: ['lactosa'] as string[],
    vegetariano: true,
  },
  quesillo_quillayes: {
    // Quillayes Quesillo Sano y Natural 150g — quesillo premium artesanal
    // chileno. Datos VERIFICADOS contra etiqueta oficial (foto enviada por
    // Felipe + Jumbo CL id 303273):
    //   Por porción 30g (1 rebanada): 40.5 kcal · 4.1 P · 0.3 C · 2.5 G · 82 mg sodio
    //                                  (1.5 sat · 0.8 mono · 0.1 poli · 0 trans · 8.2 mg colesterol)
    //   Por 100g:                    135 kcal · 13 P · 1 C · 8 G · 274 mg sodio
    //   Azúcares totales: 2g/100g = lactosa residual (es quesillo CON lactosa).
    //   Envase: 150g · 5 porciones de 30g · ~$1.390 CLP (Jumbo).
    //   Sellos chilenos: sin sellos visibles en etiqueta (perfil limpio).
    //   Marca: Quillayes (grupo Quillayes-Surlat).
    //   Foto Jumbo (cuadrada 900x900, 55KB webp).
    //
    // Posicionamiento clínico: el QUESILLO MÁS EFICIENTE EN PROTEÍNA POR KCAL
    // del catálogo (4.1g/40.5kcal = ratio 0.10). Supera al quesillo genérico
    // (4.5/63 = 0.071) y al Zero Lacto (3.9/42 = 0.093). Trade-off: tiene
    // lactosa. Sodio intermedio (82mg) entre quesillo genérico (60mg) y
    // Zero Lacto (107mg). Apto para paciente sin intolerancia que busca
    // déficit + alta proteína sin pagar el premium del zero lacto.
    label: 'Quesillo Quillayes Sano y Natural',
    emoji: '⚪',
    item: '30g de Quesillo Quillayes Sano y Natural (1 rebanada)',
    kcal: 41, p: 4.1, c: 0.3, g: 2.5, sodioMg: 82,
    badge: '4.1g prot · 41 kcal · Premium artesanal',
    descripcion: 'Quesillo premium chileno (Quillayes). Envase 150g · 5 rebanadas. Mejor ratio proteína/kcal del catálogo en quesillos: -35% kcal vs quesillo genérico con CASI la misma proteína. Sodio moderado (82mg). Contiene lactosa (apto solo si tolera). Sin sellos chilenos. Apto vegetariano.',
    contiene: ['lactosa'] as string[],
    vegetariano: true,
    foto: '/img/quesillo_quillayes.webp',
  },
  quesillo_zerolacto: {
    // Soprole Quesillo Zero Lacto — quesillo fresco SIN LACTOSA. Datos
    // VERIFICADOS contra etiqueta oficial (foto enviada por Felipe):
    //   Por porción 30g (1 rebanada): 41.7 kcal · 3.9 P · 1.4 C · 2.3 G · 106.8 mg sodio
    //   Por 100g:                    139 kcal · 13 P · 4 C · 7 G · 356 mg sodio
    //   Sin sellos chilenos (perfil nutricional limpio: -34% kcal vs quesillo regular).
    //   Envase: Pote 300g · 10 porciones aprox.
    //   Foto oficial Soprole (cuadrada 570x570, 17KB webp).
    label: 'Quesillo Zero Lacto (Soprole)',
    emoji: '⚪',
    item: '30g de Quesillo Soprole Zero Lacto (~1 rebanada)',
    kcal: 42, p: 3.9, c: 1.4, g: 2.3, sodioMg: 107,
    badge: '3.9g prot · Sin lactosa · -34% kcal',
    descripcion: 'Versión deslactosada del quesillo fresco. Soprole pote 300g con 10 porciones. Sin lactosa (apto intolerantes). El más bajo en calorías del catálogo: -34% vs quesillo regular, -50% vs gauda. Más bajo en grasa pero más alto en sodio que el quesillo artesanal (107mg vs 60mg). Ideal déficit estricto + intolerancia lactosa simultáneo.',
    contiene: [] as string[],   // sin lactosa
    vegetariano: true,
    foto: '/img/quesillo_soprole_zerolacto.webp',
  },
  parcelas_chanco: {
    // Las Parcelas de Valdivia — Queso Chanco Laminado SIN LACTOSA.
    // Queso chanco tradicional chileno (sur de Chile, Valdivia), curado y
    // de sabor más intenso que el gauda. Datos VERIFICADOS contra etiqueta
    // oficial (foto enviada por Felipe):
    //   Por porción 2 rebanadas 33g: 113.9 kcal · 8.4 P · 0 C · 8.9 G · 165 mg sodio
    //                                 (6.3 sat · 2.3 mono · 0.3 poli · 0.2 trans · 22.1 mg colesterol)
    //   Por 100g:                    345 kcal · 25 P · 0 C · 26 G · 500 mg sodio
    //   Escalado a 30g:              104 kcal · 7.5 P · 0 C · 7.8 G · 150 mg sodio
    //   Sellos chilenos: Alto en sodio (1 solo sello).
    //   Envase: 233g · 14 láminas · 7 porciones aprox.
    //   Foto oficial Las Parcelas (cuadrada 401x401, 46KB webp).
    label: 'Chanco Las Parcelas (sin lactosa)',
    emoji: '🟠',
    item: '30g de queso Chanco Las Parcelas Sin Lactosa (~2 rebanadas)',
    kcal: 104, p: 7.5, c: 0, g: 7.8, sodioMg: 150,
    badge: '7.5g prot · Sin lactosa · Sabor intenso',
    descripcion: 'Queso chanco tradicional del sur de Chile (Valdivia), curado y de sabor más intenso que el gauda. Sin lactosa (apto intolerantes). Sodio intermedio (150mg, menor que gauda y light). Trazas de grasas trans (0.2g/porción). Marca Las Parcelas de Valdivia 233g · 14 láminas.',
    contiene: [] as string[],   // sin lactosa
    vegetariano: true,
    foto: '/img/queso_parcelas_chanco.webp',
  },
  surlat_protein: {
    // Surlat Sin Lactosa Proteína — laminado fortificado SIN LACTOSA + SIN GLUTEN.
    // Datos VERIFICADOS contra etiqueta oficial (foto enviada por Felipe):
    //   Por porción 2 láminas 34g: 87.7 kcal · 10.3 P · 1 C · 4.7 G · 148.6 mg sodio
    //   Por 100g equivalente:    258 kcal · 30 P · 2 C · 13 G · 437 mg sodio
    //   Escalado a 30g (para coincidir con el resto del catálogo):
    //     77 kcal · 9 P · 0.6 C · 3.9 G · 131 mg sodio
    //   Sellos chilenos: Alto en sodio (1 solo sello, no triple).
    //   Envase: 200g · 6 porciones aprox (de 2 láminas c/u).
    //   Foto oficial Surlat (cuadrada 411x411, 20KB webp).
    label: 'Surlat Proteína (sin lactosa)',
    emoji: '💪',
    item: '30g de queso Surlat Sin Lactosa Proteína (~2 láminas pequeñas)',
    kcal: 77, p: 9, c: 0.6, g: 3.9, sodioMg: 131,
    badge: '9g prot · Sin lactosa · Sin gluten',
    descripcion: 'Queso laminado fortificado con proteína — el más PROTEICO del catálogo (9g/30g, +12% vs light). Sin lactosa y sin gluten (apto intolerantes). Apto vegetariano. Único sello chileno: alto en sodio (intermedio, menos que gauda/light). Marca Surlat 200g · 6 porciones.',
    contiene: [] as string[],   // sin lactosa, sin gluten — el más limpio
    vegetariano: true,
    foto: '/img/queso_surlat_protein.webp',
  },
} as const

export type QuesoTipo = keyof typeof QUESO_TIPOS

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
  /** Marca comercial del producto. Permite agrupar/filtrar en la UI por
   *  fabricante (Nestle, Costa, Savory, Frito-Lay, etc.). Usar 'Genérico'
   *  para productos sin marca especifica (papas fritas genericas, gomitas,
   *  kuchen casero, etc.) que aplican a multiples fabricantes. */
  marca?: string
  /** Categoria de producto para agrupacion adicional (snack salado,
   *  chocolate, helado, gaseosa, panaderia, etc.). */
  categoriaProducto?: 'snack_salado' | 'chocolate' | 'helado' | 'galleta_dulce' | 'gaseosa' | 'panaderia' | 'golosina' | 'cereal' | 'frito'
}

// ─── DESAYUNOS ────────────────────────────────────────────────────────────────
export const desayunosOpts: Record<string, MealOption> = {
  avena_platano: {
    label: 'Avena natural + plátano',
    items: ['80g avena en hojuelas', '1 plátano mediano (120g)', '200ml leche descremada', '1 cdta miel o canela'],
    // Macros INTA Chile (auditoría 2026-05):
    //   80g avena hojuelas:         303 kcal · 10.6 P · 53.6 C · 5.2 G
    //   1 plátano mediano 120g:     110 kcal · 1.3 P · 27 C · 0.4 G
    //   200ml leche descremada:      66 kcal · 6.2 P · 9.6 C · 0.2 G (etiqueta)
    //   1 cdta miel 7g:              21 kcal · 0 P · 5.7 C · 0 G
    //   Total: 500 kcal · 18 P · 96 C · 6 G
    baseKcal: 500, p: 18, c: 96, g: 6,
    foto: '/img/recetas/unsplash_1638813133218-4367bd8123f6.webp',
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
    items: ['80g avena en hojuelas', '1 scoop proteína en polvo (~30g)', '1 plátano mediano (120g)', '200ml leche descremada'],
    // Macros INTA Chile + etiquetas reales (auditoría 2026-05):
    //   80g avena hojuelas:         303 kcal · 10.6 P · 53.6 C · 5.2 G
    //   1 scoop whey 30g:           120 kcal · 24 P · 3 C · 1.5 G
    //   1 plátano mediano 120g:     110 kcal · 1.3 P · 27 C · 0.4 G
    //   200ml leche descremada:      66 kcal · 6.2 P · 9.6 C · 0.2 G
    //   Total: 599 kcal · 42 P · 93 C · 7 G
    baseKcal: 599, p: 42, c: 93, g: 7,
    requiereWhey: true,
    // foto: scoop de proteina sobre superficie (Unsplash) — diferencia
    // visualmente la version proteica de la avena natural (avena_platano),
    // que sigue usando la foto del tazon de avena con frutas.
    foto: '/img/recetas/unsplash_1693996046865-19217d179161.webp',
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
    items: ['150g yogur natural', '½ taza berries (75g, arándanos/frambuesas/frutillas)', '1 cda chía o linaza (12g)', '10-15 almendras naturales (15g)'],
    // Macros INTA Chile (auditoría 2026-05) — base Danone Oikos Griego:
    //   150g yogur Danone Oikos (escalado de 110g):  143 kcal · 6.8 P · 15 C · 5.5 G
    //   ½ taza berries 75g:                            30 kcal · 0.6 P · 7.5 C · 0.4 G
    //   1 cda chía 12g:                                58 kcal · 2 P · 5 C · 3.7 G
    //   10-15 almendras 15g:                           87 kcal · 3.2 P · 3.3 C · 7.5 G
    //   Total: 318 kcal · 13 P · 31 C · 17 G
    // (El selector tieneYogur ajusta macros si el paciente elige otro yogur — FullPro, Soprole Protein+, etc.)
    baseKcal: 318, p: 13, c: 31, g: 17,
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
    items: ['1 scoop proteína en polvo (~30g)', '1 plátano mediano congelado (120g)', '200ml leche descremada', '30g nueces o almendras', '1 cdta mantequilla de maní (5g)'],
    // Macros recalculadas con datos INTA + etiquetas reales:
    //   1 scoop whey 30g:               120 kcal · 24 P · 3 C · 1.5 G
    //   1 plátano mediano INTA 120g:   110 kcal · 1.3 P · 27 C · 0.4 G
    //   200ml leche descremada:         66 kcal · 6.2 P · 9.6 C · 0.2 G
    //   30g nueces INTA:               198 kcal · 4.6 P · 4 C · 19.6 G
    //   5g mantequilla maní:            29 kcal · 1.2 P · 1.1 C · 2.5 G
    //   Total: 523 kcal · 37 P · 45 C · 24 G
    baseKcal: 523, p: 37, c: 45, g: 24,
    porcionFija: true, // porciones discretas: 1 scoop, 1 plátano, 30g nueces — no escalable
    requiereWhey: true,
    foto: '/img/recetas/unsplash_1622597468620-656aa1f981ea.webp', // batido proteico de frutilla en vaso transparente
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
    items: ['2 cdas semillas de chía (~20g)', '150g yogur alto en proteínas', '1 fruta a elección (150g manzana, kiwi, durazno)', 'Canela o vainilla sin azúcar'],
    // Macros INTA Chile (auditoría 2026-05) — base yogur alto-proteína Soprole Protein+ Power 150g:
    //   2 cdas chía 20g:                       97 kcal · 3.3 P · 8.3 C · 6.1 G
    //   150g yogur alto-proteína (escalado):  126 kcal · 15.5 P · 10.6 C · 1.9 G
    //   1 fruta mediana 150g (manzana INTA):   78 kcal · 0.4 P · 19.5 C · 0.5 G
    //   Canela/vainilla:                        0 kcal
    //   Total: 301 kcal · 19 P · 38 C · 9 G — redondeado a 305/16/40/10
    baseKcal: 305, p: 16, c: 40, g: 10,
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
    items: ['2 tostadas de pan integral (63g Castaño)', '90g ricotta 4% MG', '1 cdta miel (7g)', '10 nueces enteras (20g)'],
    // Macros INTA Chile (auditoría 2026-05):
    //   2 tostadas pan Castaño 63g:    164 kcal · 8.3 P · 25 C · 3 G (etiqueta)
    //   90g ricotta 4% MG:             156 kcal · 10.2 P · 2.7 C · 11.8 G (INTA)
    //   1 cdta miel 7g:                 21 kcal · 0 P · 5.7 C · 0 G
    //   10 nueces 20g:                 130 kcal · 3 P · 2.7 C · 13 G (INTA)
    //   Total: 471 kcal · 22 P · 36 C · 28 G
    // Nota: la grasa estaba muy subestimada (era 14g, real 28g) — nueces son densas.
    baseKcal: 471, p: 22, c: 36, g: 28,
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
    items: ['175g cottage 4% MG', '1 fruta a elección (150g - durazno, kiwi, berries)', '1 cda semillas (12g - chía, linaza o sésamo)', 'Canela o ralladura de limón'],
    // Macros INTA Chile (auditoría 2026-05):
    //   175g cottage 4% MG (INTA):       171 kcal · 18.7 P · 5.2 C · 7.6 G
    //   1 fruta 150g (durazno INTA):      59 kcal · 1.4 P · 14 C · 0.4 G
    //   1 cda chía 12g:                   58 kcal · 2 P · 5 C · 3.7 G
    //   Canela/limón:                      0 kcal
    //   Total: 288 kcal · 22 P · 24 C · 12 G
    baseKcal: 288, p: 22, c: 24, g: 12,
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
  huevos_revueltos_cremosos: {
    label: 'Huevos revueltos cremosos + tostadas + tomate cherry',
    items: [
      '2 huevos enteros',
      '30ml leche descremada (cremosidad)',
      '2 rebanadas pan integral Castaño (63g)',
      '5g aceite de oliva o mantequilla light',
      '100g tomate cherry partido',
      'Sal, pimienta, cebollín fresco',
    ],
    // Auditoría INTA Chile + etiqueta Castaño (2026-06):
    //   2 huevos enteros (50g c/u):            156 kcal · 12.4 P · 1.2 C · 10 G
    //   30ml leche descremada:                  10 kcal · 1 P · 1.5 C · 0 G
    //   2 rebanadas pan Castaño 63g:           168 kcal · 6.6 P · 31 C · 2 G
    //   5g aceite de oliva:                     45 kcal · 0 P · 0 C · 5 G
    //   100g tomate cherry:                     18 kcal · 0.9 P · 3.9 C · 0.2 G
    //   Total: 397 kcal · 21 P · 38 C · 17 G
    baseKcal: 397, p: 21, c: 38, g: 17, tieneHuevo: true, eggsDefault: 2,
    tienePan: true, panTipoDefault: 'integral',
    tiempo: '10 min',
    pasos: [
      'Sartén fría: derretir la mantequilla o entibiar el aceite a fuego BAJO. El cuajado lento es la clave de la textura cremosa.',
      'Batido: mezclar los 2 huevos con la leche descremada, sal y pimienta hasta homogeneizar.',
      'Cocción lenta: verter sobre la sartén. Remover suavemente con espátula cada 20 seg, formando pliegues. Retirar del fuego cuando aún se vea ligeramente brillante (~3-4 min) — el calor residual termina la cocción.',
      'Tostadas: tostar el pan integral hasta dorar levemente.',
      'Plato: servir los huevos sobre las tostadas. Acompañar con tomate cherry partido y espolvorear cebollín fresco picado.',
    ],
  },
  shakshuka_individual: {
    label: 'Shakshuka individual (huevos al sartén con tomate)',
    items: [
      '2 huevos enteros (pochados en la salsa)',
      '150g tomate triturado natural',
      '60g pimiento rojo en cubos',
      '30g cebolla picada',
      '5g aceite de oliva',
      'Comino, páprika dulce, ajo',
      '1 rebanada pan integral Castaño (31g) para mojar',
    ],
    // Auditoría INTA Chile (2026-06):
    //   2 huevos enteros:                      156 kcal · 12.4 P · 1.2 C · 10 G
    //   150g tomate triturado natural:          30 kcal · 1.5 P · 6 C · 0.3 G
    //   60g pimiento rojo:                      19 kcal · 0.6 P · 4.5 C · 0.2 G
    //   30g cebolla:                            12 kcal · 0.3 P · 2.8 C · 0 G
    //   5g aceite de oliva:                     45 kcal · 0 P · 0 C · 5 G
    //   1 rebanada pan Castaño 31g:             84 kcal · 3.3 P · 15.5 C · 1 G
    //   Total: 346 kcal · 18 P · 30 C · 17 G
    baseKcal: 346, p: 18, c: 30, g: 17, tieneHuevo: true, eggsDefault: 2,
    tienePan: true, panTipoDefault: 'integral',
    contiene: ['cebolla_ajo'] as string[],
    estacional: 'frio',
    tiempo: '15 min',
    pasos: [
      'Sofrito: calentar el aceite, dorar cebolla y pimiento rojo 5 min a fuego medio hasta que se ablanden.',
      'Salsa: añadir el tomate triturado, comino, páprika y ajo. Cocinar 5 min hasta que espese ligeramente.',
      'Huevos: hacer 2 hoyos en la salsa con la cuchara y romper un huevo en cada uno. Sazonar con sal.',
      'Cuajado: tapar y cocinar 4 min a fuego bajo hasta que la clara cuaje pero la yema quede líquida.',
      'Servir directo del sartén con el pan integral tostado para mojar en la salsa y la yema.',
    ],
  },
  tortilla_espanola_mini: {
    label: 'Tortilla española mini al horno',
    items: [
      '3 huevos enteros',
      '100g papas cocidas en cubos pequeños (idealmente del día anterior)',
      '40g cebolla salteada',
      '5g aceite de oliva',
      'Sal, pimienta, perejil fresco',
    ],
    // Auditoría INTA Chile (2026-06):
    //   3 huevos enteros:                      234 kcal · 18.6 P · 1.8 C · 15 G
    //   100g papas cocidas:                     87 kcal · 2 P · 20 C · 0.1 G
    //   40g cebolla:                            16 kcal · 0.4 P · 3.7 C · 0 G
    //   5g aceite de oliva:                     45 kcal · 0 P · 0 C · 5 G
    //   Total: 382 kcal · 20 P · 25 C · 20 G
    baseKcal: 382, p: 20, c: 25, g: 20, tieneHuevo: true, eggsDefault: 3,
    contiene: ['cebolla_ajo'] as string[],
    tiempo: '25 min',
    pasos: [
      'Preparación previa: cocer las papas con cáscara la noche anterior (o usar sobrantes). Pelar y cortar en cubos pequeños de ~1cm.',
      'Sofrito: saltear la cebolla en una sartén pequeña con el aceite hasta dorar (~5 min).',
      'Mezcla: batir los 3 huevos con sal y pimienta. Incorporar las papas y la cebolla.',
      'Horneado: verter la mezcla en un molde individual de silicona o cerámica untado. Hornear a 180°C por 18 min hasta que cuaje pero quede jugoso al centro.',
      'Servir tibia, espolvorear perejil fresco. Ideal para meal prep: dura 3-4 días refrigerada.',
    ],
  },
  sandwich_huevo_pavo_palta: {
    label: 'Sándwich de huevos + jamón pavo + palta',
    items: [
      '2 rebanadas pan integral Castaño (63g)',
      '2 huevos enteros revueltos',
      '30g jamón de pavo light (Pavo+Mol o equivalente)',
      '¼ palta madura (40g) en láminas',
      '60g tomate en rodajas',
      'Mostaza Dijon opcional',
    ],
    // Auditoría INTA Chile + etiquetas (2026-06):
    //   2 rebanadas pan Castaño 63g:           168 kcal · 6.6 P · 31 C · 2 G
    //   2 huevos enteros revueltos:            156 kcal · 12.4 P · 1.2 C · 10 G
    //   30g jamón pavo light:                   30 kcal · 6 P · 0.5 C · 0.4 G
    //   ¼ palta 40g:                            64 kcal · 0.8 P · 3.4 C · 5.9 G
    //   60g tomate:                             11 kcal · 0.5 P · 2.3 C · 0.1 G
    //   Total: 429 kcal · 26 P · 38 C · 18 G
    baseKcal: 429, p: 26, c: 38, g: 18, tieneHuevo: true, eggsDefault: 2,
    tienePan: true, panTipoDefault: 'integral',
    tieneCarne: true, carneTipo: 'pavo', carneGramosBase: 30,
    tiempo: '12 min',
    pasos: [
      'Huevos: revolver los 2 huevos en una sartén antiadherente a fuego medio-bajo con sal y pimienta, hasta que cuajen pero queden jugosos (~3 min).',
      'Tostadas: tostar levemente las 2 rebanadas de pan integral.',
      'Armado: untar mostaza Dijon en una de las rebanadas (opcional).',
      'Capas: colocar los huevos revueltos, encima el jamón pavo, las láminas de palta y las rodajas de tomate.',
      'Cerrar el sándwich y cortar por la mitad. Servir inmediatamente.',
    ],
  },
  avena_overnight_mani: {
    label: 'Avena overnight + plátano + mantequilla de maní',
    items: [
      '60g avena en hojuelas',
      '200ml leche de almendras sin azúcar',
      '1 plátano mediano (120g)',
      '15g mantequilla de maní 100% maní',
      '5g semillas de chía',
      'Canela al gusto',
    ],
    // Auditoría INTA Chile + etiquetas (2026-06):
    //   60g avena hojuelas:               227 kcal · 8 P · 40 C · 4 G
    //   200ml leche almendras:             30 kcal · 0.6 P · 1 C · 2.4 G
    //   120g plátano:                     110 kcal · 1.3 P · 27 C · 0.4 G
    //   15g mantequilla maní:              95 kcal · 4 P · 3 C · 8 G
    //   5g chía:                           24 kcal · 0.8 P · 2 C · 1.5 G
    //   Total: ~485 kcal · 15 P · 73 C · 16 G (vegano, sin coccion)
    baseKcal: 485, p: 15, c: 73, g: 16,
    porcionFija: true,
    tendencia: ['vegano', 'vegetariano'],
    contiene: ['frutos_secos', 'gluten'] as string[],
    tiempo: '5 min + reposo nocturno',
    pasos: [
      'En un frasco o bol mezclar la avena con la leche de almendras y la chía.',
      'Refrigerar tapado mínimo 4 horas (idealmente toda la noche). La avena absorbe el líquido y la chía gelifica.',
      'A la mañana siguiente, agregar el plátano cortado en rodajas y la mantequilla de maní encima.',
      'Espolvorear canela. Servir frío directamente del frasco o transferir a un bol.',
      'Meal prep: preparar 3-4 frascos individuales para toda la semana.',
    ],
  },
  tostadas_palta_semillas: {
    label: 'Tostadas con palta + tomate + semillas',
    items: [
      '2 rebanadas pan integral Castaño (63g)',
      '½ palta madura (60g) aplastada',
      '80g tomate en rodajas',
      '5g semillas de sésamo o chía',
      'Jugo de limón, sal, pimienta',
    ],
    // Auditoría INTA Chile (2026-06):
    //   2 rebanadas pan Castaño 63g:      168 kcal · 6.6 P · 31 C · 2 G
    //   60g palta:                         96 kcal · 1.2 P · 5.1 C · 8.8 G
    //   80g tomate:                        14 kcal · 0.7 P · 3.1 C · 0.2 G
    //   5g sésamo:                         29 kcal · 1 P · 1.2 C · 2.5 G
    //   Total: ~310 kcal · 10 P · 40 C · 14 G (vegano, sin estufa)
    baseKcal: 310, p: 10, c: 40, g: 14,
    porcionFija: true,
    tendencia: ['vegano', 'vegetariano'],
    contiene: ['gluten', 'sesamo'] as string[],
    tienePan: true, panTipoDefault: 'integral',
    tiempo: '8 min',
    pasos: [
      'Tostar el pan integral hasta dorar levemente. El tostado baja el índice glicémico.',
      'Aplastar la palta con tenedor, sazonar con sal, pimienta y unas gotas de limón (evita oxidación).',
      'Untar la palta sobre las tostadas calientes.',
      'Disponer las rodajas de tomate encima y espolvorear las semillas.',
      'Finalizar con un toque más de limón. Servir inmediato.',
    ],
  },
  smoothie_bowl_berries: {
    label: 'Smoothie bowl de berries + granola',
    items: [
      '200ml leche de almendras congelada (en cubitos)',
      '150g berries congeladas (frutillas + frambuesas + arándanos)',
      '½ plátano congelado (60g)',
      '30g granola sin azúcar',
      '15g mantequilla de maní',
      '5g semillas de chía',
    ],
    // Auditoría INTA Chile (2026-06):
    //   200ml leche almendras:             30 kcal · 0.6 P · 1 C · 2.4 G
    //   150g berries congeladas:           81 kcal · 1.6 P · 19 C · 0.6 G
    //   60g plátano:                       55 kcal · 0.7 P · 13.5 C · 0.2 G
    //   30g granola sin azúcar:           132 kcal · 3 P · 19 C · 4.5 G
    //   15g mantequilla maní:              95 kcal · 4 P · 3 C · 8 G
    //   5g chía:                           24 kcal · 0.8 P · 2 C · 1.5 G
    //   Total: ~417 kcal · 11 P · 58 C · 17 G (vegano, antioxidantes)
    baseKcal: 415, p: 11, c: 58, g: 17,
    porcionFija: true,
    tendencia: ['vegano', 'vegetariano'],
    contiene: ['frutos_secos', 'gluten'] as string[],
    estacional: 'calor',
    tiempo: '7 min',
    pasos: [
      'Licuar la leche de almendras congelada, las berries y el medio plátano congelado hasta obtener textura tipo sorbete espeso.',
      'Verter en bol frío. La textura debe ser espesa para que los toppings no se hundan.',
      'Distribuir encima la granola, la mantequilla de maní en pequeños puntos y las semillas de chía.',
      'Servir inmediatamente con cuchara — el smoothie se ablanda rápido.',
      'Opcional: agregar coco rallado sin azúcar o cacao nibs encima.',
    ],
  },
  pan_hummus_verduras: {
    label: 'Pan integral con hummus + verduras crudas',
    items: [
      '2 rebanadas pan integral Castaño (63g)',
      '60g hummus (envasado o casero)',
      '30g zanahoria rallada',
      '30g pepino en rodajas',
      '30g pimiento rojo en tiras',
      'Cilantro fresco picado',
    ],
    // Auditoría INTA Chile + etiqueta Nutrissette (2026-06):
    //   2 rebanadas pan Castaño 63g:      168 kcal · 6.6 P · 31 C · 2 G
    //   60g hummus:                       102 kcal · 4.8 P · 9 C · 6 G
    //   90g mix verduras crudas:           25 kcal · 1 P · 5 C · 0.2 G
    //   Total: ~295 kcal · 12 P · 45 C · 8 G (vegano, mas bajo en grasa del set)
    baseKcal: 295, p: 12, c: 45, g: 8,
    porcionFija: true,
    tendencia: ['vegano', 'vegetariano'],
    contiene: ['gluten', 'sesamo'] as string[],
    tienePan: true, panTipoDefault: 'integral',
    tiempo: '5 min',
    pasos: [
      'Tostar levemente las rebanadas de pan integral (opcional, da mejor textura).',
      'Untar generosamente el hummus sobre cada rebanada.',
      'Disponer encima la zanahoria rallada, las rodajas de pepino y las tiras de pimiento rojo.',
      'Espolvorear cilantro fresco picado.',
      'Servir abierto como tostada o cerrar como sándwich. Sin necesidad de cocción.',
    ],
  },
  tofu_revuelto_chileno: {
    label: 'Tofu revuelto al estilo chileno + tostadas',
    items: [
      '100g tofu firme desmenuzado con tenedor',
      '60g cebolla picada',
      '80g tomate en cubos',
      '½ cdta cúrcuma + comino + paprika',
      '1 cdta aceite de oliva',
      '2 rebanadas pan integral Castaño (63g)',
    ],
    // Auditoría INTA Chile (2026-06):
    //   100g tofu firme:                  144 kcal · 17.3 P · 2.8 C · 8.7 G
    //   60g cebolla:                       24 kcal · 0.7 P · 5.6 C · 0.1 G
    //   80g tomate:                        14 kcal · 0.7 P · 3.1 C · 0.2 G
    //   1 cdta aceite oliva:               45 kcal · 0 P · 0 C · 5 G
    //   2 rebanadas pan Castaño 63g:      168 kcal · 6.6 P · 31 C · 2 G
    //   Total: ~395 kcal · 25 P · 43 C · 16 G (vegano alto en prot)
    //   La cúrcuma le da color amarillo identico a huevos revueltos.
    baseKcal: 395, p: 25, c: 43, g: 16,
    porcionFija: true,
    tendencia: ['vegano', 'vegetariano'],
    contiene: ['soya', 'gluten', 'cebolla_ajo'] as string[],
    tienePan: true, panTipoDefault: 'integral',
    tiempo: '12 min',
    pasos: [
      'Desmenuzar el tofu firme con un tenedor hasta lograr textura tipo huevo revuelto.',
      'Sofrito: en sartén con aceite dorar la cebolla 3 min. Añadir la cúrcuma, comino y paprika, mezclar 30 seg.',
      'Tofu: incorporar el tofu desmenuzado y revolver 4 min hasta calentar bien y absorber los sabores.',
      'Tomate: agregar el tomate en cubos los últimos 2 min para que ablande pero no se deshaga.',
      'Tostar el pan integral. Servir el tofu revuelto sobre las tostadas. Apto vegano y muy similar visualmente a huevos revueltos clásicos.',
    ],
  },
}

// ─── COLACIONES MAÑANA y ONCE (mismo pool) ────────────────────────────────────
export const colacionesOpts: Record<string, MealOption> = {
  yogur_frutossecos_am: {
    label: 'Yogur + frutos secos',
    items: ['150g yogur natural sin azúcar', '20g mix frutos secos (nueces, almendras)', '1 fruta pequeña (manzana, pera o naranja ~100g)'],
    // Auditoría INTA (2026-05):
    //   150g yogur natural sin azúcar: 90 kcal · 6 P · 7.5 C · 4.5 G
    //   20g mix nueces+almendras:     130 kcal · 4 P · 4 C · 12 G
    //   1 fruta pequeña 100g (manzana):52 kcal · 0.3 P · 14 C · 0.2 G
    //   Total: 272 kcal · 10 P · 26 C · 17 G  (G subestimado: frutos secos)
    baseKcal: 272, p: 10, c: 26, g: 17,
    porcionFija: true,
    tieneYogur: true,
    // foto: bowl de yogur griego con almendras y nueces, sin berries
    // (generada con OpenAI gpt-image-1) — diferencia la colacion de
    // frutos secos de la version desayuno con berries.
    foto: '/img/recetas/yogur_frutos_secos.webp',
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
    items: ['1 scoop proteína en polvo (~30g)', '200ml leche descremada o agua', '1 fruta mediana (manzana, naranja o pera)'],
    // Macros recalculadas con datos oficiales (INTA + etiqueta producto):
    //   1 scoop whey/proteína 30g:    120 kcal · 24 P · 3 C · 1.5 G  (Wild Protein / estándar)
    //   200ml leche descremada:        66 kcal · 6.2 P · 9.6 C · 0.2 G (etiqueta verificada)
    //   1 fruta mediana 150g (manzana INTA): 78 kcal · 0.4 P · 19.5 C · 0.5 G
    //   Total con leche: 264 kcal · 31 P · 32 C · 2.2 G
    //   Total con agua:  198 kcal · 24 P · 22 C · 2.0 G
    // Usamos versión con leche (más nutricionalmente completa) como base.
    baseKcal: 264, p: 31, c: 32, g: 2,
    // porcionFija: los componentes son cantidades DISCRETAS (1 scoop, 1 fruta).
    // Sin esto, el motor escalaba el plato al slot kcal del paciente (ej: 537 kcal
    // implica 2.55 scoops = absurdo). Esta colación tiene macros fijos por receta.
    porcionFija: true,
    foto: '/img/recetas/unsplash_1622597468620-656aa1f981ea.webp', // batido proteico en vaso, colación
    tiempo: '3 min',
    requiereWhey: true,
    pasos: [
      'Mezclar el scoop de proteína con el agua o leche en una botella shaker.',
      'Agitar vigorosamente por 20-30 segundos hasta disolver bien.',
      'Consumir junto a la fruta mediana como acompañamiento sólido.',
      'Ideal como colación post-entrenamiento o entre comidas.',
    ],
  },
  cottage_nueces: {
    label: 'Queso cottage + nueces',
    items: ['150g queso cottage', '20g nueces', '½ taza frutillas o arándanos (75g)'],
    // Auditoría INTA (2026-05):
    //   150g queso cottage Soprole:147 kcal · 17 P · 5 C · 6 G
    //   20g nueces:               130 kcal · 3 P · 3 C · 13 G
    //   ½ taza frutillas (75g):    24 kcal · 0.5 P · 5.7 C · 0.2 G
    //   Total: 301 kcal · 20 P · 14 C · 19 G  (kcal +50%, G +73%)
    baseKcal: 301, p: 20, c: 14, g: 19,
    porcionFija: true,
    // foto: bowl de cottage cheese con nueces, sin frutas
    // (generada con OpenAI gpt-image-1) — diferencia la colacion de
    // cottage+nueces de la version desayuno con frutas y semillas.
    foto: '/img/recetas/cottage_nueces.webp',
    tiempo: '4 min',
    pasos: [
      'Colocar el cottage en un bowl pequeño.',
      'Agregar las frutillas o arándanos encima.',
      'Distribuir las nueces sobre la mezcla.',
      'Consumir de inmediato. Colación alta en proteína y grasas saludables.',
    ],
  },
  tostadas_ricotta_col: {
    label: 'Tostadas integrales + ricotta',
    items: ['2 rebanadas pan integral Castaño (63g)', '40g ricotta', '1 cdta miel (7g)', '5 nueces (~15g)'],
    // Auditoría INTA + feedback Felipe 2026-06 (2 rebanadas):
    //   2 reb pan integral 63g:  164 kcal · 8.4 P · 25 C · 3 G
    //   40g ricotta:              68 kcal · 4.5 P · 1.2 C · 5 G
    //   1 cdta miel 7g:           21 kcal · 0 P · 5.8 C · 0 G
    //   5 nueces (~15g):          98 kcal · 2.3 P · 2 C · 9.7 G
    //   Total: 351 kcal · 15 P · 34 C · 18 G
    baseKcal: 351, p: 15, c: 34, g: 18,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'integral',
    foto: IMG + 'tostadas_ricotta_miel_nueces.jfif',
    tiempo: '5 min',
    pasos: [
      'Tostar 2 rebanadas de pan integral hasta dorar.',
      'Esparcir la ricotta sobre las tostadas calientes.',
      'Agregar la miel y las nueces encima.',
      'Consumir inmediatamente para aprovechar la textura crujiente.',
    ],
  },
  barra_fruta: {
    label: 'Barra de cereal + fruta',
    items: ['1 barra de cereal integral sin azúcar añadida', '1 fruta mediana', 'Té o infusión sin azúcar'],
    // Auditoría INTA (2026-05):
    //   1 barra cereal integral 25g: 90 kcal · 3 P · 15 C · 2.5 G
    //   1 fruta mediana 150g (manzana):78 kcal · 0.4 P · 19.5 C · 0.5 G
    //   Té/infusión sin azúcar:       0 kcal
    //   Total: 168 kcal · 3.4 P · 34.5 C · 3 G  (delta <10% — OK, solo redondeo)
    baseKcal: 168, p: 3, c: 35, g: 3,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1504708706948-13d6cbba4062.webp', // mix de berries y frutos secos, snack saludable
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
      '2 rebanadas de pan integral (80g)',
      '30g de jamón de pavo (cuello)',
      '30g de queso laminado tipo gauda o mantecoso',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
    ],
    // Auditoría INTA + feedback Felipe 2026-06: el sándwich clásico lleva DOS
    // rebanadas de pan (1 base + 1 tapa), no una. Corregido item y macros.
    //   2 reb pan integral 80g: 208 kcal · 10.6 P · 31.6 C · 3.8 G  (+104/5.3/15.8/1.9)
    //   30g jamón pavo:          35 kcal · 6 P · 0.5 C · 0.9 G
    //   30g queso gauda:        113 kcal · 8 P · 0.3 C · 9 G
    //   Lechuga + tomate:         8 kcal · 0.4 P · 2 C · 0 G
    //   Total: 364 kcal · 25 P · 34 C · 14 G
    baseKcal: 364, p: 25, c: 34, g: 14,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'integral',
    tieneQueso: true, quesoTipoDefault: 'gauda', quesoGramosBase: 30,
    foto: '/img/recetas/unsplash_1528735602780-2552fd46c7af.webp',
    tiempo: '5 min',
    tendencia: ['omnivoro'],
    alergenosNota: 'Contiene gluten (pan) y lácteos (queso). Si tienes intolerancia a alguno, sustituye por pan sin gluten o queso vegetal.',
    pasos: [
      'Tostar las 2 rebanadas de pan integral (sartén seca o tostadora) hasta dorar.',
      'Sobre la rebanada base tibia, colocar el jamón de pavo cubriendo toda la superficie.',
      'Agregar el queso laminado encima del jamón.',
      'Si tienes microondas: 15-20 s para que el queso funda apenas. Opcional.',
      'Coronar con la hoja de lechuga y la rodaja de tomate.',
      'Tapar con la segunda rebanada y consumir inmediatamente para aprovechar el crocante.',
    ],
  },
  sandwich_jamonqueso_huevo: {
    label: 'Sándwich de jamón queso + huevo duro',
    items: [
      '2 rebanadas de pan integral (80g)',
      '30g de jamón de pavo (cuello)',
      '30g de queso laminado tipo gauda',
      '1 huevo duro en rodajas',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
    ],
    // Auditoría INTA + feedback Felipe 2026-06 (2 rebanadas):
    //   Base sándwich con 2 panes: 364 kcal · 25 P · 34 C · 14 G
    //   1 huevo duro:               78 kcal · 6 P · 0.6 C · 5 G
    //   Total: 442 kcal · 31 P · 35 C · 19 G
    baseKcal: 442, p: 31, c: 35, g: 19,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'integral',
    tieneQueso: true, quesoTipoDefault: 'gauda', quesoGramosBase: 30,
    foto: '/img/recetas/unsplash_1525351484163-7529414344d8.webp',
    tiempo: '12 min',
    tendencia: ['omnivoro'],
    tieneHuevo: true,
    eggsDefault: 1,
    alergenosNota: 'Contiene gluten (pan), lácteos (queso) y huevo. Versión más alta en proteína — ideal post-entreno.',
    pasos: [
      'Poner el huevo en agua hirviendo 9 minutos (huevo duro). Pasarlo a agua fría y pelar.',
      'Tostar las 2 rebanadas de pan integral.',
      'Cortar el huevo en rodajas de 0,5 cm.',
      'Armar: pan tostado + jamón + queso + huevo en rodajas + lechuga + tomate + segunda rebanada encima.',
      'Sazonar con un toque de sal y pimienta. Consumir inmediatamente.',
    ],
  },
  sandwich_vegetariano_palta: {
    label: 'Sándwich vegetariano (queso + palta)',
    items: [
      '2 rebanadas de pan integral (80g)',
      '30g de queso laminado tipo gauda',
      '40g de palta (1/4)',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
      'Sal y pimienta a gusto',
    ],
    // Auditoría INTA + feedback Felipe 2026-06 (2 rebanadas):
    //   2 reb pan integral 80g: 208 kcal · 10.6 P · 31.6 C · 3.8 G
    //   30g queso gauda:        113 kcal · 8 P · 0.3 C · 9 G
    //   40g palta:               64 kcal · 0.8 P · 3.4 C · 5.9 G
    //   Lechuga + tomate:         8 kcal · 0.4 P · 2 C · 0 G
    //   Total: 393 kcal · 20 P · 38 C · 19 G
    baseKcal: 393, p: 20, c: 38, g: 19,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'integral',
    tieneQueso: true, quesoTipoDefault: 'gauda', quesoGramosBase: 30,
    foto: '/img/recetas/unsplash_1515041761709-f9fc96e04cd3.webp',
    tiempo: '4 min',
    tendencia: ['omnivoro', 'vegetariano'],
    alergenosNota: 'Contiene gluten (pan) y lácteos (queso). Apto vegetariano. Para vegano: reemplazar queso por hummus o queso vegetal.',
    pasos: [
      'Tostar las 2 rebanadas de pan integral hasta dorar.',
      'Aplastar la palta con un tenedor sobre una de las tostadas calientes.',
      'Sazonar la palta con sal y pimienta.',
      'Colocar el queso laminado encima.',
      'Coronar con lechuga y rodaja de tomate.',
      'Tapar con la segunda rebanada y consumir inmediatamente para aprovechar la textura crujiente del pan.',
    ],
  },
  sandwich_jamonpavo_light: {
    label: 'Sándwich de jamón light (sin queso)',
    items: [
      '2 rebanadas de pan integral (80g)',
      '50g de jamón de pavo (cuello)',
      '1 hoja de lechuga',
      '1 rodaja de tomate',
      'Mostaza Dijon o aceite de oliva a gusto',
    ],
    // Auditoría INTA + feedback Felipe 2026-06 (2 rebanadas):
    //   2 reb pan integral 80g: 208 kcal · 10.6 P · 31.6 C · 3.8 G
    //   50g jamón pavo:          58 kcal · 10 P · 0.8 C · 1.5 G
    //   Lechuga + tomate:         8 kcal · 0.4 P · 2 C · 0 G
    //   Mostaza Dijon ~5g:        3 kcal · 0 P · 0.3 C · 0.2 G
    //   Total: 277 kcal · 21 P · 35 C · 6 G
    baseKcal: 277, p: 21, c: 35, g: 6,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'integral',
    foto: '/img/recetas/unsplash_1541833000669-8dbe1bfb574a.webp',
    tiempo: '3 min',
    tendencia: ['omnivoro'],
    alergenosNota: 'Contiene gluten (pan). Sin lácteos. Versión más liviana del clásico — ideal para tarde si necesitas economizar calorías.',
    pasos: [
      'Tostar levemente las 2 rebanadas de pan integral.',
      'Untar mostaza Dijon o un toque de aceite de oliva en una de las rebanadas.',
      'Disponer el jamón de pavo en capas sobre el pan.',
      'Agregar la hoja de lechuga y la rodaja de tomate.',
      'Tapar con la segunda rebanada. Sin queso para mantener bajo el aporte de grasa.',
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
  colun_mi_leche_chocolate: {
    label: 'Colun Mi Leche Chocolate (cajita)',
    items: [
      '1 cajita Colun Mi Leche Semidescremada Chocolate (200 ml)',
      '(Opcional) Acompañar con 1 fruta para sumar fibra',
    ],
    // Datos validados contra etiqueta nutricional del envase (200 ml = 1 porción):
    //   Energía:             94 kcal
    //   Proteínas:           6.4 g
    //   Grasas totales:      2.6 g  (saturadas 1.7 g · monoinsat 0.8 g · poliinsat 0.1 g · trans 0.1 g)
    //   Colesterol:          8 mg
    //   H. de C. disp.:      11.2 g  (de los cuales azúcares totales: 10 g)
    //   Sodio:               178 mg
    //   Vitaminas A · D · E (fortificación)
    //   Sin reconstituir · Leche grass-fed · Libre de gluten
    baseKcal: 94, p: 6, c: 11, g: 3,
    porcionFija: true, // 200ml cajita individual — no escalable al slot
    foto: IMG + 'colun_mi_leche_chocolate.webp',
    tiempo: '1 min',
    tendencia: ['omnivoro', 'vegetariano'],
    alergenosNota:
      'Contiene lácteos (leche semidescremada Colun) — NO apto intolerantes a lactosa. 10 g de azúcares totales por cajita (azúcar añadido del chocolate). Aporta calcio y vitaminas A/D/E. Libre de gluten. Útil como colación post-entreno por su perfil 6g prot + 11g CH, pero el azúcar (10g) lo hace menos óptimo si el paciente está en déficit estricto.',
    pasos: [
      'Tomar la cajita Colun Mi Leche Chocolate del refrigerador (mejor fría).',
      'Agitar suavemente y abrir.',
      'Beber directamente o servir en vaso.',
      'Combinación post-entrenamiento práctica: 6.4 g proteína + 11.2 g CH disponibles en formato listo para llevar.',
      'Tip clínico: si estás en déficit estricto, prefiere la versión Sin Lactosa Sin Azúcar de Colun (también 200ml) para reducir kcal y carga glicémica.',
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
    // Etiqueta original del producto: foto del envase real con marca Goodnes Protein,
    // sabor caramelo y sellos chilenos. Descargada desde jumbo.cl (vtexassets 900x900).
    // Si el archivo aún no está, el componente hace fallback al placeholder (gradiente
    // cyan + inicial) gracias al onError.
    foto: IMG + 'goodnes_protein_caramelo.jpg',
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
    // Auditoría INTA (2026-05):
    //   1 marraqueta 60g (pan blanco): 168 kcal · 5.4 P · 33.6 C · 0.6 G
    //   30g jamón pavo:                 35 kcal · 6 P · 0.5 C · 0.9 G
    //   30g queso gauda:               113 kcal · 8 P · 0.3 C · 9 G
    //   Lechuga + tomate:                8 kcal · 0.4 P · 2 C · 0 G
    //   Total: 324 kcal · 20 P · 36 C · 11 G  (P estaba subestimado)
    baseKcal: 324, p: 20, c: 36, g: 11,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'marraqueta',
    tieneQueso: true, quesoTipoDefault: 'gauda', quesoGramosBase: 30,
    foto: '/img/recetas/unsplash_1509440159596-0249088772ff.webp',
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
    // Etiqueta original del producto: envase Quaker Casero Avena + Chips Chocolate 40g
    // con sellos chilenos. Descargada desde jumbo.cl (vtexassets 900x900).
    foto: IMG + 'galleton_quaker_casero.jpg',
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
    items: ['80g hummus', 'Bastones de zanahoria, apio y pepino (~150g)', '5 galletas integrales (~25g)'],
    // Auditoría INTA (2026-05):
    //   80g hummus comercial:    134 kcal · 5.5 P · 12 C · 8 G
    //   150g verduras bastones:   35 kcal · 2 P · 8 C · 0.3 G
    //   5 galletas integrales 25g:105 kcal · 3 P · 17 C · 3.5 G
    //   Total: 274 kcal · 11 P · 37 C · 12 G  (+27% kcal vs anterior)
    baseKcal: 274, p: 11, c: 37, g: 12,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1637949385162-e416fb15b2ce.webp', // bowl de hummus con garnish de aceite, foto real
    tiempo: '5 min',
    pasos: [
      'Lavar y cortar las verduras en bastones del mismo tamaño.',
      'Colocar el hummus en un bol pequeño al centro del plato.',
      'Disponer los bastones de verdura y galletas alrededor del hummus.',
      'Colación alta en fibra y grasas saludables del garbanzo.',
    ],
  },
  tostada_palta_ricotta_chia: {
    label: 'Tostada de palta + tomate + ricotta + chía',
    items: [
      '1 rebanada pan integral Castaño (31g)',
      '¼ palta (40g) aplastada',
      '60g tomate en rodajas',
      '30g ricotta light o cottage',
      '5g semillas de chía',
      'Sal, pimienta, limón',
    ],
    // Auditoría INTA Chile (2026-06):
    //   1 rebanada pan Castaño 31g:        84 kcal · 3.3 P · 15.5 C · 1 G
    //   40g palta:                         64 kcal · 0.8 P · 3.4 C · 5.9 G
    //   60g tomate:                        11 kcal · 0.5 P · 2.3 C · 0.1 G
    //   30g ricotta light:                 39 kcal · 4.5 P · 1.3 C · 1.5 G
    //   5g chía:                           24 kcal · 0.8 P · 2 C · 1.5 G
    //   Total: ~222 kcal · 10 P · 25 C · 10 G (premium, ratio prot/kcal alto)
    baseKcal: 222, p: 10, c: 25, g: 10,
    porcionFija: true,
    tendencia: ['vegetariano'],
    contiene: ['gluten', 'lactosa'] as string[],
    tienePan: true, panTipoDefault: 'integral',
    tiempo: '5 min',
    pasos: [
      'Tostar el pan integral hasta dorar levemente.',
      'Aplastar la palta con tenedor y sazonar con sal, pimienta y unas gotas de limón.',
      'Untar la palta sobre la tostada caliente.',
      'Disponer encima las rodajas de tomate y luego cucharadas pequeñas de ricotta light.',
      'Espolvorear las semillas de chía. Finalizar con pimienta recién molida.',
    ],
  },
  bowl_fruta_yogur_griego: {
    label: 'Bowl de fruta + yogur griego + miel + nueces',
    items: [
      '150g yogur griego natural (Danone Oikos)',
      '150g manzana o pera en cubos',
      '7g miel (1 cdta)',
      '15g nueces partidas',
      'Canela al gusto',
    ],
    // Auditoría INTA Chile + etiqueta Danone Oikos (2026-06):
    //   150g yogur Oikos griego:          143 kcal · 6.8 P · 15 C · 5.5 G
    //   150g manzana:                      78 kcal · 0.4 P · 21 C · 0.3 G
    //   7g miel:                           21 kcal · 0 P · 5.7 C · 0 G
    //   15g nueces:                        98 kcal · 2.3 P · 2 C · 9.8 G
    //   Total: ~340 kcal · 10 P · 44 C · 16 G (premium, omega-3 ALA)
    baseKcal: 340, p: 10, c: 44, g: 16,
    porcionFija: true,
    tendencia: ['vegetariano'],
    contiene: ['lactosa', 'frutos_secos'] as string[],
    tieneYogur: true,
    tiempo: '5 min',
    pasos: [
      'Colocar el yogur griego en un bol pequeño como base.',
      'Cortar la fruta en cubos pequeños (manzana o pera con cáscara para máxima fibra).',
      'Disponer la fruta sobre el yogur cubriendo toda la superficie.',
      'Dejar caer la miel en hilos delgados encima.',
      'Espolvorear las nueces partidas y la canela. Servir inmediato para que las nueces mantengan textura crocante.',
    ],
  },
  galleton_avena_platano_leche: {
    label: 'Galletón casero de avena + plátano + leche',
    items: [
      '3 galletas caseras (avena + plátano + maní · sin azúcar añadida)',
      '30g avena hojuelas (masa)',
      '60g plátano maduro aplastado (masa)',
      '15g mantequilla de maní (masa)',
      'Canela, esencia de vainilla',
      '200ml leche descremada (para acompañar)',
    ],
    // Auditoría INTA Chile (2026-06):
    //   3 galletas caseras (~60g masa total):
    //     30g avena:                      113 kcal · 4 P · 20 C · 2 G
    //     60g plátano:                     55 kcal · 0.7 P · 13.5 C · 0.2 G
    //     15g mantequilla maní:            95 kcal · 4 P · 3 C · 8 G
    //     Subtotal galletas:              263 kcal · 8.7 P · 36.5 C · 10.2 G
    //   200ml leche descremada:            66 kcal · 6.2 P · 9.6 C · 0.2 G
    //   Total: ~330 kcal · 15 P · 46 C · 10 G (sin azúcar agregada)
    //   Meal prep: hacer 12 galletas a la vez (~110 kcal c/u), guardar en frasco.
    baseKcal: 330, p: 15, c: 46, g: 10,
    porcionFija: true,
    tendencia: ['vegetariano'],
    contiene: ['gluten', 'lactosa', 'frutos_secos'] as string[],
    tiempo: '25 min (incluye horneo)',
    pasos: [
      'Aplastar el plátano maduro con tenedor en un bol hasta obtener puré.',
      'Mezclar el plátano con la avena, la mantequilla de maní, canela y vainilla. Formar masa pegajosa.',
      'Dividir en 3 porciones del tamaño de una cuchara colmada. Aplastar con la mano sobre bandeja con papel mantequilla.',
      'Hornear a 180°C por 12-15 min hasta dorar los bordes. Dejar enfriar 5 min sobre rejilla (firmán al enfriarse).',
      'Servir con 200ml de leche descremada bien fría. Meal prep: doblar receta para 12 galletas y guardar en frasco hermético 5 días.',
    ],
  },
  chia_pudding_cacao_frutilla: {
    label: 'Chía pudding de cacao + frutilla',
    items: [
      '20g semillas de chía',
      '150ml leche de almendras o descremada',
      '5g cacao 100% sin azúcar (1 cdta)',
      '80g frutillas frescas',
      '7g miel o estevia (1 cdta o sobre)',
      '10g almendras laminadas',
    ],
    // Auditoría INTA Chile (2026-06):
    //   20g chía:                          97 kcal · 3.4 P · 8.4 C · 6.2 G
    //   150ml leche almendras:             23 kcal · 0.5 P · 0.7 C · 1.8 G
    //   5g cacao 100%:                     12 kcal · 1 P · 1 C · 0.5 G
    //   80g frutillas:                     26 kcal · 0.6 P · 6.2 C · 0.2 G
    //   7g miel:                           21 kcal · 0 P · 5.7 C · 0 G
    //   10g almendras:                     58 kcal · 2.1 P · 2 C · 5 G
    //   Total: ~240 kcal · 8 P · 24 C · 14 G (vegano con estevia, omega-3 ALA)
    baseKcal: 240, p: 8, c: 24, g: 14,
    porcionFija: true,
    tendencia: ['vegetariano', 'vegano'],
    contiene: ['frutos_secos'] as string[],
    tiempo: '5 min + 4h reposo',
    pasos: [
      'En un frasco mezclar las semillas de chía, leche de almendras, cacao y miel/estevia. Batir bien para que el cacao se integre.',
      'Tapar y refrigerar mínimo 4 horas (idealmente toda la noche). La chía absorbe el líquido formando textura tipo pudding.',
      'Cortar las frutillas en cuartos justo antes de servir.',
      'Servir el pudding en bol o copa. Disponer las frutillas y las almendras laminadas encima.',
      'Apto vegano si se usa estevia o sirope de agave en vez de miel.',
    ],
  },
  mote_huesillo_light: {
    label: 'Mote con huesillo light (sin azúcar agregada)',
    items: [
      '60g mote (trigo mote) cocido',
      '1 huesillo (durazno deshidratado, 30g)',
      '200ml agua con canela y clavo de olor',
      'Estevia o sin endulzar (no azúcar)',
    ],
    // Auditoría INTA Chile (2026-06):
    //   60g mote (trigo mote) cocido:      95 kcal · 2.8 P · 19 C · 0.5 G
    //   1 huesillo 30g:                    87 kcal · 1 P · 23 C · 0.2 G
    //   Agua + canela + clavo + estevia:    0 kcal
    //   Total: ~182 kcal · 4 P · 42 C · 1 G (clasico chileno reinventado)
    //   La receta tradicional con almibar es ~350 kcal — esta version baja
    //   65 kcal manteniendo el sabor por la canela y el clavo.
    baseKcal: 182, p: 4, c: 42, g: 1,
    porcionFija: true,
    tendencia: ['vegano', 'vegetariano'],
    contiene: ['gluten'] as string[],
    estacional: 'calor',
    tiempo: '15 min',
    pasos: [
      'Hidratar los huesillos: remojar en agua hervida con 1 ramita de canela y 2 clavos de olor por 10 min.',
      'Mote: comprar mote pre-cocido del supermercado (Mote La Hoguera o similar) y enjuagar bien. Si es seco, hervir 30 min hasta blando.',
      'Combinar: en un vaso largo o copa colocar el mote escurrido al fondo.',
      'Verter encima el huesillo con su líquido aromático (sin azúcar, solo la dulzura natural del durazno y la canela).',
      'Endulzar con estevia si se desea o servir tal cual. Frío en verano, tibio en invierno. Versión saludable del clásico chileno sin culpas.',
    ],
  },
}

// ─── ALMUERZOS ────────────────────────────────────────────────────────────────
export const almuerzosOpts: Record<string, MealOption> = {
  pollo_arroz: {
    label: 'Pollo a la plancha + arroz integral + ensalada',
    items: [
      '200g pechuga pollo a la plancha',
      '150g arroz integral cocido',
      'Ensalada de tomate, pepino y lechuga',
      '1 cda aceite de oliva',
      '💡 Cambia el arroz por: 130g fideos cocidos · 250g papas cocidas · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Macros INTA + Super Pollo (auditoría 2026-05):
    //   200g pollo Super Pollo:           192 kcal · 39.2 P · 0 C · 3.4 G
    //   150g arroz integral cocido INTA:  167 kcal · 4 P · 35 C · 1.35 G
    //   Ensalada tomate/pepino/lechuga 150g: 25 kcal · 1 P · 5 C · 0 G
    //   1 cda aceite oliva 10g:            90 kcal · 0 P · 0 C · 10 G
    //   Total: 474 kcal · 44 P · 40 C · 15 G
    baseKcal: 474, p: 44, c: 40, g: 15,
    // porcionFija: los componentes son discretos (200g pollo, 150g arroz, 1 cda aceite).
    // Sin esto, el motor escalaba al slot del paciente (caso visto: 939 kcal = 2.2× lo real)
    // dejando los items diciendo "200g pollo" pero con macros de 440g virtuales — inconsistente.
    // Si el paciente requiere más kcal en almuerzo, el profesional ajusta gramaje via selector.
    porcionFija: true,
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
    items: [
      '150g carne magra (posta, lomo o filete)',
      '250g papas cocidas con cáscara (~1 papa grande)',
      'Ensalada de lechuga, tomate y pepino',
      '1 cdta aceite de oliva',
      '💡 Cambia las papas por: 150g arroz cocido · 130g fideos cocidos · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Auditoría INTA (2026-05):
    //   150g carne magra:        225 kcal · 39 P · 0 C · 7.5 G
    //   250g papa cocida cáscara:218 kcal · 5 P · 50 C · 0.25 G (coincide con carboGramosBase=250)
    //   Ensalada simple:          25 kcal · 1 P · 5 C · 0 G
    //   1 cdta aceite oliva 5g:   45 kcal · 0 P · 0 C · 5 G
    //   Total: 513 kcal · 45 P · 55 C · 13 G
    baseKcal: 513, p: 45, c: 55, g: 13,
    porcionFija: true,
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
    items: [
      '150g carne magra (posta, lomo o filete)',
      '250g papas salteadas con romero',
      'Ensalada de lechuga, tomate y pepino',
      '1 cdta aceite de oliva',
      '💡 Cambia las papas por: 150g arroz cocido · 130g fideos cocidos · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    baseKcal: 565, p: 44, c: 50, g: 16,
    porcionFija: true,
    // foto: bistec asado con papas doradas + zanahorias + romero/hierbas
    // (Unsplash) — diferencia visualmente esta receta de la version con
    // papas cocidas blancas planas (carne_papas_cocidas) que sigue usando
    // carne_con_papas..webp.
    foto: '/img/recetas/unsplash_1778784153322-9b20b164012c.webp',
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
    items: [
      '200g salmón fresco',
      '100g quinoa cocida',
      '150g verduras salteadas (zapallo, pimentón, espinaca)',
      '1 cdta aceite de oliva',
      '💡 Cambia la quinoa por: 100g arroz cocido · 80g fideos cocidos · 150g papas cocidas · 100g fideos de arroz cocidos',
    ],
    // Auditoría INTA (2026-05):
    //   200g salmón fresco INTA: 400 kcal · 44 P · 0 C · 26 G (alto en omega 3)
    //   100g quinoa cocida:      120 kcal · 4.4 P · 21 C · 1.9 G
    //   150g verduras salteadas:  35 kcal · 2 P · 8 C · 0.3 G
    //   1 cdta aceite oliva 5g:   45 kcal · 0 P · 0 C · 5 G
    //   Total: 600 kcal · 50 P · 29 C · 33 G
    //   (Versión anterior subestimaba la grasa del salmón y sobreestimaba CHO)
    baseKcal: 600, p: 50, c: 29, g: 33,
    porcionFija: true,
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
    // Macros base por porción (recalculadas con pollo Super Pollo 96kcal/19.6gP/100g):
    // 150g pollo Super Pollo (144 kcal · 29.4 P · 0 C · 2.55 G)
    // + 1 huevo (78kcal · 6P · 0.6C · 5G)
    // + ½ palta (120kcal · 1.5P · 6C · 11G)
    // + verduras (60kcal · 2P · 12C · 0.5G)
    // + 100g quinoa cocida (120kcal · 4P · 21C · 2G)
    // + 1 cda aceite oliva (90kcal · 0 · 0 · 10G)
    // Total ≈ 612 kcal · 42 P · 40 C · 32 G
    items: [
      '150g pollo a la plancha en tiras',
      '1 huevo duro o pochado',
      '½ palta en láminas',
      '100g quinoa cocida',
      'Mix de verduras: lechuga, tomate cherry, pepino, zanahoria',
      '1 cda aceite de oliva',
      '💡 Cambia la quinoa por: 100g arroz cocido · 80g fideos cocidos · 150g papas cocidas · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    baseKcal: 612, p: 42, c: 40, g: 32, tieneHuevo: true, eggsDefault: 1,
    porcionFija: true,
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
  bowl_quinoa_huevo: {
    label: 'Bowl proteico de quinoa + huevo pochado + espinaca',
    items: [
      '100g quinoa cocida',
      '2 huevos enteros pochados',
      '100g espinaca baby (salteada o cruda)',
      '80g tomate cherry partido',
      '¼ palta (40g) en láminas',
      '5g aceite de oliva',
      'Limón, sal, pimienta',
      '💡 Cambia la quinoa por: 100g arroz cocido · 80g fideos cocidos · 150g papas cocidas · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA Chile (2026-06):
    //   100g quinoa cocida:        120 kcal · 4.4 P · 21 C · 1.9 G
    //   2 huevos enteros pochados: 156 kcal · 12.4 P · 1.2 C · 10 G
    //   100g espinaca baby:         23 kcal · 2.9 P · 3.6 C · 0.4 G
    //   80g tomate cherry:          14 kcal · 0.7 P · 3.1 C · 0.2 G
    //   ¼ palta 40g:                64 kcal · 0.8 P · 3.4 C · 5.9 G
    //   5g aceite de oliva:         45 kcal · 0 P · 0 C · 5 G
    //   Total: 422 kcal · 21 P · 32 C · 23 G
    //   Quinoa = proteína completa (los 9 aa esenciales) + bajo IG.
    //   Excelente perfil para deportistas y objetivo hipertrofia.
    baseKcal: 422, p: 21, c: 32, g: 23, tieneHuevo: true, eggsDefault: 2,
    porcionFija: true,
    tendencia: ['vegetariano'],
    contiene: ['huevo'] as string[],
    tiempo: '20 min',
    pasos: [
      'Quinoa: enjuagar bien y cocinar en proporción 1:2 con agua. Hervir 15 min a fuego bajo. Escurrir y dejar entibiar. La quinoa es proteína completa con índice glicémico bajo.',
      'Espinaca: lavar y elegir entre crudo (más vitaminas) o salteado rápido 1 min con un toque del aceite (más volumen).',
      'Huevos: hervir agua con un chorrito de vinagre blanco. Formar un remolino y verter cada huevo sin cáscara. Cocinar 3 min para yema líquida.',
      'Verduras: cortar tomate cherry por la mitad. Laminar la palta justo antes de servir (con unas gotas de limón evita oxidación).',
      'Armado: disponer la quinoa como base, agregar la espinaca, los tomates y la palta. Coronar con los huevos pochados. Aliñar con limón, sal, pimienta y un hilo del aceite.',
    ],
  },
  arroz_huevo_saltado: {
    label: 'Arroz saltado con huevo y verduras',
    items: [
      '160g arroz cocido (idealmente frío del día anterior)',
      '3 huevos enteros',
      'Verduras a gusto: zanahoria, zapallo, pimentón (~100g)',
      '1 cdta aceite + salsa de soya light opcional',
      '💡 Cambia el arroz por: 130g fideos cocidos · 250g papas cocidas · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Auditoría INTA (2026-05) — asumiendo 3 huevos (default):
    //   160g arroz blanco cocido: 208 kcal · 4.3 P · 45 C · 0.5 G
    //   3 huevos enteros 150g:    234 kcal · 18 P · 1.8 C · 15 G
    //   ~100g verduras salteadas:  35 kcal · 1.5 P · 7 C · 0.3 G
    //   1 cdta aceite + soya:      55 kcal · 1 P · 0 C · 5 G
    //   Total: 532 kcal · 25 P · 54 C · 21 G
    baseKcal: 532, p: 25, c: 54, g: 21, tieneHuevo: true, eggsDefault: 3,
    porcionFija: true,
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
    items: [
      '200g porotos o lentejas cocidas',
      '100g arroz integral cocido',
      'Sofrito de tomate, cebolla y ajo (1 cdta aceite)',
      'Ensalada mixta (~100g)',
      '💡 Cambia el arroz por: 100g quinoa cocida · 80g fideos cocidos · 100g fideos de arroz cocidos (granos enteros mantienen la complementación proteica con la legumbre)',
    ],
    // Auditoría INTA (2026-05) — promedio porotos/lentejas:
    //   200g legumbres cocidas:  232 kcal · 17 P · 40 C · 0.9 G
    //   100g arroz integral:     111 kcal · 2.6 P · 23 C · 0.9 G
    //   Sofrito + 1 cdta aceite:  50 kcal · 1 P · 6 C · 5.5 G
    //   Ensalada mixta 100g:      20 kcal · 1 P · 4 C · 0 G
    //   Total: 413 kcal · 22 P · 73 C · 7 G
    baseKcal: 413, p: 22, c: 73, g: 7,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1503838922633-d7892c7a2bc0.webp', // porotos/lentejas en bol con cuchara, foto real
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
    items: [
      '200g pechuga pavo a la plancha',
      '150g papas cocidas con perejil',
      'Ensalada de pepino y tomate (~100g)',
      '1 cdta aceite de oliva',
      '💡 Cambia las papas por: 100g arroz cocido · 80g fideos cocidos · 100g quinoa cocida · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA (2026-05):
    //   200g pavo pechuga INTA: 270 kcal · 58 P · 0 C · 4 G (muy magro)
    //   150g papas cocidas:    131 kcal · 3 P · 30 C · 0.2 G
    //   Ensalada pepino+tomate: 20 kcal · 0.8 P · 4 C · 0.2 G
    //   1 cdta aceite oliva 5g: 45 kcal · 0 P · 0 C · 5 G
    //   Total: 466 kcal · 62 P · 34 C · 9 G
    //   (Versión anterior subestimaba proteína — pavo es más magro que pollo)
    baseKcal: 466, p: 62, c: 34, g: 9,
    porcionFija: true,
    // foto: pavo asado con papas en plato blanco (Unsplash) — corrige
    // mismatch previo donde se usaba la foto generica de "carne con papas"
    // que mostraba carne roja en vez de pavo (carne blanca).
    foto: '/img/recetas/unsplash_1642192429402-90e329af29a4.webp',
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
    items: [
      '180g tofu firme',
      '100g quinoa cocida',
      '150g verduras salteadas (pimentón, zapallo, champiñones)',
      '1 cdta aceite de oliva + salsa de soya reducida en sodio',
      '💡 Cambia la quinoa por: 100g arroz cocido · 80g fideos cocidos · 150g papas cocidas · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA (2026-05):
    //   180g tofu firme INTA:    137 kcal · 14 P · 3.4 C · 8.6 G
    //   100g quinoa cocida:      120 kcal · 4.4 P · 21 C · 1.9 G
    //   150g verduras salteadas:  35 kcal · 2 P · 7 C · 0.4 G
    //   1 cdta aceite + soya:     55 kcal · 1 P · 0 C · 5 G
    //   Total: 347 kcal · 21 P · 31 C · 16 G
    //   (Versión anterior MUY sobreestimada — el tofu es menos denso que la carne)
    baseKcal: 347, p: 21, c: 31, g: 16,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1680173073730-852e0ec93bec.webp',
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
    items: [
      '200g garbanzos cocidos',
      '150g vegetales asados (zanahoria, berenjena, zapallo)',
      '1 cda tahini (15g) o aceite de oliva',
      '80g arroz integral cocido o 1 pan pita integral',
      '💡 Cambia el carbohidrato por: 80g arroz cocido · 65g fideos cocidos · 120g papas cocidas · 80g quinoa cocida · 80g fideos de arroz cocidos · 1 pan pita integral',
    ],
    // Auditoría INTA (2026-05):
    //   200g garbanzos cocidos: 328 kcal · 18 P · 54 C · 5.2 G
    //   150g vegetales asados:   85 kcal · 2 P · 8 C · 5.3 G (incluye aceite del asado)
    //   1 cda tahini 15g:        89 kcal · 2.5 P · 3 C · 8 G
    //   80g arroz integral:      89 kcal · 2.1 P · 18 C · 0.7 G
    //   Total: 591 kcal · 25 P · 83 C · 19 G
    baseKcal: 591, p: 25, c: 83, g: 19,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1623428187969-5da2dcea5ebf.webp',
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
    items: [
      '200g garbanzos cocidos',
      '150g arroz integral cocido',
      'Leche de coco 100ml + curry en polvo',
      '150g espinaca y tomate cherry',
      '1 cdta aceite de coco o de oliva',
      '💡 Cambia el arroz por: 130g fideos cocidos · 250g papas cocidas · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Auditoría INTA (2026-05) — plato denso por la leche de coco:
    //   200g garbanzos cocidos: 328 kcal · 18 P · 54 C · 5.2 G
    //   150g arroz integral:   167 kcal · 3.9 P · 35 C · 1.35 G
    //   100ml leche de coco:   230 kcal · 2.3 P · 3.3 C · 24 G ← MUY graso
    //   150g espinaca+tomate:   30 kcal · 2 P · 5 C · 0.4 G
    //   1 cdta aceite + sofrito:65 kcal · 0.5 P · 4 C · 5.2 G
    //   Total: 820 kcal · 27 P · 101 C · 36 G
    //   (Versión anterior subestimaba MUCHO — la leche de coco pesa mucho en kcal y grasa)
    baseKcal: 820, p: 27, c: 101, g: 36,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1623428188474-b1d532c5e560.webp',
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
    items: [
      '100g medallón vegetal (porotos negros + zapallo italiano)',
      '200g papas cocidas con cáscara',
      '2 tazas ensalada mixta (lechuga, tomate, pepino, pimentón) ~200g',
      '1 cdta aceite de oliva + mostaza sin azúcar',
      '💡 Cambia las papas por: 130g arroz cocido · 110g fideos cocidos · 130g quinoa cocida · 130g fideos de arroz cocidos · 70g pan integral',
    ],
    // Auditoría INTA (2026-05):
    //   100g medallón vegetal:    150 kcal · 8 P · 18 C · 5 G (etiqueta porotos negros)
    //   200g papas cocidas:       174 kcal · 4 P · 40 C · 0.2 G
    //   2 tazas ensalada 200g:     30 kcal · 2 P · 6 C · 0.3 G
    //   1 cdta aceite + mostaza:   45 kcal · 0 P · 0 C · 5 G
    //   Total: 399 kcal · 14 P · 64 C · 10 G
    baseKcal: 399, p: 14, c: 64, g: 10,
    porcionFija: true,
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
    items: [
      '85g Beyond Burger (1 medallón vegetal)',
      '2 tazas ensalada mixta (lechuga, tomate, pepino) ~200g',
      '150g papas cocidas o asadas',
      '1 cdta aceite de oliva + mostaza o ketchup sin azúcar',
      '💡 Cambia las papas por: 100g arroz cocido · 80g fideos cocidos · 100g quinoa cocida · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA + etiqueta Beyond (2026-05):
    //   85g Beyond Burger (1 medallón): 230 kcal · 20 P · 7 C · 14 G (etiqueta oficial)
    //   2 tazas ensalada 200g:           30 kcal · 2 P · 6 C · 0.3 G
    //   150g papas cocidas/asadas:      131 kcal · 3 P · 30 C · 0.2 G
    //   1 cdta aceite + mostaza:         45 kcal · 0 P · 0 C · 5 G
    //   Total: 436 kcal · 25 P · 43 C · 19 G
    baseKcal: 436, p: 25, c: 43, g: 19,
    porcionFija: true,
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
  carne_arroz_clasico: {
    label: 'Carne con arroz + ensalada',
    items: [
      '150g carne magra (posta, lomo o filete)',
      '150g arroz blanco cocido',
      'Ensalada de lechuga, tomate y pepino',
      '1 cda aceite de oliva',
      '💡 Cambia el arroz por: 130g fideos cocidos · 250g papas cocidas · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Macros base por porción (almuerzo amplio):
    // 150g carne magra USDA (225 kcal · 39 P · 0 C · 7.5 G)
    // + 150g arroz blanco cocido (195 kcal · 4 P · 42 C · 0.5 G)
    // + ensalada simple (30 kcal · 1 P · 6 C · 0 G)
    // + 1 cda aceite oliva (90 kcal · 0 P · 0 C · 10 G)
    // Total ≈ 540 kcal · 44 P · 48 C · 18 G
    baseKcal: 540, p: 44, c: 48, g: 18,
    porcionFija: true,
    foto: IMG + '100GRSDEARROZ_150GRSDEALBONDIGAS.jpg',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 150,
    tieneCarboPrincipal: true, carboTipo: 'arroz_blanco', carboGramosBase: 150,
    tiempo: '25 min',
    pasos: [
      'Arroz: lavar 150g de arroz blanco hasta que el agua salga clara. Cocinar en 2 tazas de agua hirviendo con pizca de sal. Tapar y cocinar a fuego bajo 12-15 min hasta absorber el agua.',
      'Carne: sazonar la pieza con sal, pimienta, ajo y un toque de limón. Cocinar en plancha bien caliente 4-5 min por lado según grosor. La carne magra aporta hierro hemo y proteína de alto valor biológico.',
      'Reposo: dejar reposar la carne 2-3 min antes de cortar para que los jugos se redistribuyan.',
      'Ensalada: cortar lechuga, tomate y pepino. Aliñar con aceite de oliva, sal y limón.',
      'Armado: servir la carne junto al arroz y la ensalada al costado. Variante clásica chilena.',
    ],
  },
  pure_huevo: {
    label: 'Puré de papas + huevos + ensalada',
    items: [
      '250g papas cocidas (puré)',
      '50ml leche descremada',
      '5g mantequilla',
      '2 huevos enteros (revueltos o pochados)',
      'Ensalada de hojas verdes y tomate',
      '💡 Cambia el puré por: 150g arroz cocido · 130g fideos cocidos · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Macros base por porción (almuerzo):
    // 250g papas cocidas (218 kcal · 5 P · 50 C · 0.3 G)
    // + 50ml leche descremada (18 kcal · 1.8 P · 2.5 C · 0.2 G)
    // + 5g mantequilla (35 kcal · 0 P · 0 C · 4 G)
    // + 2 huevos (156 kcal · 12 P · 1.2 C · 10 G)
    // + ensalada (40 kcal · 2 P · 8 C · 0.5 G)
    // Total ≈ 467 kcal · 21 P · 62 C · 15 G
    baseKcal: 467, p: 21, c: 62, g: 15, tieneHuevo: true, eggsDefault: 2,
    porcionFija: true,
    // foto: pure de papas con huevos pochados encima (Unsplash) - reemplaza
    // ID anterior 1568901346375-23c9450c58cd que Unsplash reasigno a una foto
    // de hamburguesa (reportado por Felipe 2026-06).
    foto: '/img/recetas/unsplash_1710445458303-857b8cdab3d0.webp',
    tendencia: ['omnivoro', 'vegetariano'],
    contiene: ['huevo', 'lactosa'],
    tieneCarboPrincipal: true, carboTipo: 'papas', carboGramosBase: 250,
    tiempo: '30 min',
    pasos: [
      'Papas: pelar y cortar 250g de papas en cubos medianos. Hervir en agua con sal 15-18 min hasta que estén blandas al pincharlas con tenedor.',
      'Puré: escurrir bien las papas y machacarlas con tenedor o pasapuré. Agregar 50ml de leche descremada caliente y 5g de mantequilla. Mezclar hasta lograr textura cremosa. Sazonar con sal y nuez moscada.',
      'Huevos: cocinar a elección — revueltos (sartén con poco aceite, fuego medio, revolver constante 2-3 min) o pochados (agua con vinagre, formar remolino, verter el huevo 3 min).',
      'Ensalada: cortar hojas verdes y tomate. Aliñar con aceite, sal y limón.',
      'Armado: servir el puré como base, los huevos encima y la ensalada al costado. Combinación reconfortante alta en CHO con proteína completa.',
    ],
  },
  arroz_huevo: {
    label: 'Arroz salteado con huevos + verduras',
    items: [
      '150g arroz blanco cocido',
      '2 huevos enteros',
      '1 cdta aceite vegetal',
      'Verduras salteadas (zapallo italiano, zanahoria, cebollín)',
      'Salsa de soya light (opcional)',
      '💡 Cambia el arroz por: 130g fideos cocidos · 250g papas cocidas · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Macros base por porción (almuerzo, estilo salteado oriental):
    // 150g arroz blanco cocido (195 kcal · 4 P · 42 C · 0.5 G)
    // + 2 huevos (156 kcal · 12 P · 1.2 C · 10 G)
    // + 1 cdta aceite (45 kcal · 0 P · 0 C · 5 G)
    // + verduras salteadas (50 kcal · 2 P · 10 C · 0 G)
    // + salsa soya 5ml (5 kcal · 1 P · 0 C · 0 G)
    // Total ≈ 451 kcal · 19 P · 53 C · 16 G
    baseKcal: 451, p: 19, c: 53, g: 16, tieneHuevo: true, eggsDefault: 2,
    porcionFija: true,
    foto: IMG + 'salteado_de_arroz_con_huevo.webp',
    tendencia: ['omnivoro', 'vegetariano'],
    contiene: ['huevo', 'cebolla_ajo', 'soya'],
    tieneCarboPrincipal: true, carboTipo: 'arroz_blanco', carboGramosBase: 150,
    tiempo: '15 min',
    pasos: [
      'Pre-cocinar arroz: idealmente arroz cocido del día anterior (textura ideal para saltear). Si lo cocinas ahora: 150g secos en 2 tazas de agua con sal 12-15 min y dejar enfriar.',
      'Verduras: cortar zapallo italiano en cubos, zanahoria en juliana y cebollín en rodajas. Saltear en sartén/wok bien caliente con 1 cdta de aceite 3-4 min hasta que estén firmes pero cocidas.',
      'Huevos: hacer un hueco en el centro del wok, agregar los 2 huevos batidos y revolver hasta que cuajen. Integrar con las verduras.',
      'Arroz: incorporar el arroz frío al wok y saltear todo junto 2-3 min para que se mezcle. Romper grumos con la cuchara.',
      'Sazonar: agregar salsa de soya light al final (opcional, ojo con sodio). Pimienta blanca a gusto. Servir caliente.',
    ],
  },
  fideos_pollo_tomate: {
    label: 'Fideos con pollo a la plancha + salsa de tomate',
    items: [
      '150g pechuga de pollo en cubos',
      '100g fideos integrales cocidos',
      '100g salsa de tomate natural Carozzi sin azúcar',
      '1 cdta aceite de oliva',
      '10g queso parmesano rallado (opcional)',
      'Albahaca fresca al gusto',
      '💡 Cambia los fideos por: 100g arroz cocido · 150g papas cocidas · 100g quinoa cocida · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA Chile + etiqueta Carozzi (2026-06):
    //   150g pollo plancha:               144 kcal · 29.4 P · 0 C · 2.5 G
    //   100g fideos integrales cocidos:   158 kcal · 5.8 P · 31 C · 0.8 G
    //   100g salsa tomate Carozzi nat.:    35 kcal · 1.5 P · 7 C · 0.2 G
    //   1 cdta aceite oliva:               45 kcal · 0 P · 0 C · 5 G
    //   10g queso parmesano:               42 kcal · 3.8 P · 0.4 C · 2.9 G
    //   Total: ~485 kcal · 40 P · 38 C · 11 G (con queso default)
    baseKcal: 485, p: 38, c: 50, g: 12,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['gluten', 'lacteos'] as string[],
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 150,
    tiempo: '15 min',
    pasos: [
      'Fideos: hervir agua con sal, cocinar fideos integrales 8-10 min hasta al dente. Escurrir.',
      'Pollo: sazonar con sal, pimienta y ajo en polvo. Sellar en sartén con aceite a fuego alto 4-5 min hasta dorar.',
      'Salsa: agregar la salsa de tomate Carozzi al pollo, cocinar 2 min para que se integre.',
      'Armado: incorporar los fideos a la sartén con el pollo+salsa, mezclar bien.',
      'Servir con albahaca fresca picada y opcional queso parmesano rallado encima.',
    ],
  },
  cazuela_vacuno: {
    label: 'Cazuela express de vacuno',
    items: [
      '150g posta de vacuno (magra)',
      '150g zapallo amarillo en trozos',
      '100g papa pelada en cubos',
      '50g choclo desgranado (congelado)',
      '100g porotos verdes',
      '60g cebolla picada',
      '1 cdta aceite de oliva',
      'Ajo, orégano, sal',
    ],
    // Auditoría INTA Chile (2026-06):
    //   150g posta vacuno magra:          225 kcal · 39 P · 0 C · 7.5 G
    //   150g zapallo amarillo:             39 kcal · 1.5 P · 9 C · 0.3 G
    //   100g papa cocida:                  87 kcal · 2 P · 20 C · 0.1 G
    //   50g choclo:                        43 kcal · 1.7 P · 9 C · 0.6 G
    //   100g porotos verdes:               31 kcal · 1.8 P · 7 C · 0.2 G
    //   60g cebolla + condimentos:         18 kcal · 0.5 P · 4 C · 0 G
    //   1 cdta aceite oliva:               45 kcal · 0 P · 0 C · 5 G
    //   Total: ~430 kcal · 40 P · 45 C · 10 G (calculo en olla + reduccion caldo)
    baseKcal: 430, p: 40, c: 45, g: 10,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'] as string[],
    estacional: 'frio',
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 150,
    tiempo: '25 min',
    pasos: [
      'Sofrito: dorar la cebolla picada en olla con aceite 2-3 min. Agregar la carne en trozos y sellar 4 min.',
      'Caldo base: cubrir con agua hirviendo (~1 litro). Agregar ajo, orégano y sal. Si tienes olla a presión: 15 min desde primer hervor.',
      'Verduras duras: agregar papa, choclo y zapallo. Cocinar 10 min adicionales.',
      'Verduras blandas: incorporar porotos verdes los últimos 5 min.',
      'Servir bien caliente en plato hondo con todo el caldo. Aliñar con perejil fresco picado.',
    ],
  },
  charquican_huevo: {
    label: 'Charquicán light con huevo a caballo',
    items: [
      '100g carne molida magra 5%',
      '150g zapallo cocido y aplastado',
      '100g papa cocida y aplastada',
      '60g cebolla picada',
      '100g porotos verdes o choclo',
      '1 huevo entero a la plancha (encima)',
      '1 cdta aceite de oliva',
      'Orégano, comino, sal',
    ],
    // Auditoría INTA Chile (2026-06):
    //   100g carne molida 5%:             150 kcal · 21 P · 0 C · 7.5 G
    //   150g zapallo:                      39 kcal · 1.5 P · 9 C · 0.3 G
    //   100g papa cocida:                  87 kcal · 2 P · 20 C · 0.1 G
    //   60g cebolla + condimentos:         18 kcal · 0.5 P · 4 C · 0 G
    //   100g porotos verdes:               31 kcal · 1.8 P · 7 C · 0.2 G
    //   1 huevo plancha:                   78 kcal · 6.2 P · 0.6 C · 5 G
    //   1 cdta aceite oliva:               45 kcal · 0 P · 0 C · 5 G
    //   Total: ~490 kcal · 32 P · 50 C · 16 G
    baseKcal: 490, p: 32, c: 50, g: 16, tieneHuevo: true, eggsDefault: 1,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['huevo', 'cebolla_ajo'] as string[],
    estacional: 'frio',
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 100,
    tiempo: '25 min',
    pasos: [
      'Sofrito: dorar la cebolla 3 min en sartén con aceite. Agregar la carne molida, deshacer con espátula y cocinar 5 min hasta sellar.',
      'Verduras: incorporar zapallo y papa previamente cocidos (ideal del día anterior) y aplastar con tenedor mientras se mezcla con la carne.',
      'Porotos verdes: agregar los porotos verdes precocidos, integrar 3 min con orégano, comino y sal.',
      'Huevo: en otra sartén o el mismo a un costado, freír 1 huevo a la plancha con muy poco aceite (clara cuajada, yema líquida).',
      'Servir el charquicán en plato hondo con el huevo encima. La yema líquida se integra al mezclar.',
    ],
  },
  atun_arroz_primavera: {
    label: 'Atún con arroz primavera (al plato)',
    items: [
      '1 lata atún en agua escurrido (120g)',
      '150g arroz cocido (microondas o sobras)',
      '50g choclo cocido (congelado descongelado)',
      '50g zanahoria rallada',
      '½ palta (60g) en cubos',
      '15g mayonesa light o yogur natural',
      'Limón, sal, pimienta',
      '💡 Cambia el arroz por: 130g fideos cocidos · 250g papas cocidas · 150g quinoa cocida · 150g fideos de arroz cocidos · 80g pan integral (1 marraqueta)',
    ],
    // Auditoría INTA Chile + etiqueta Robinson Crusoe (2026-06):
    //   120g atún en agua escurrido:      126 kcal · 31 P · 0 C · 1.2 G
    //   150g arroz blanco cocido:         195 kcal · 4 P · 42 C · 0.5 G
    //   50g choclo cocido:                 43 kcal · 1.7 P · 9 C · 0.6 G
    //   50g zanahoria rallada:             20 kcal · 0.5 P · 4.5 C · 0.1 G
    //   60g palta:                         96 kcal · 1.2 P · 5.1 C · 8.8 G
    //   15g mayonesa light:                36 kcal · 0.1 P · 1.2 C · 3.4 G
    //   Total: ~485 kcal · 35 P · 50 C · 15 G
    baseKcal: 485, p: 35, c: 50, g: 15,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['pescados'] as string[],
    estacional: 'calor',
    tieneCarne: true, carneTipo: 'atun', carneGramosBase: 120,
    tiempo: '10 min',
    pasos: [
      'Arroz: si es del día anterior, usar tal cual. Si es nuevo, cocinar arroz en bolsa autoclave 2 min en microondas o cocer 12 min.',
      'Choclo: descongelar el choclo 1 min en microondas (si está congelado).',
      'Mezcla: en un bowl grande, mezclar el atún escurrido, arroz, choclo, zanahoria rallada y mayonesa light.',
      'Palta: cortar la palta en cubos justo antes de servir (con limón evita oxidación) y agregar al bowl.',
      'Sazonar con sal, pimienta y limón. Servir frío o a temperatura ambiente. Ideal verano.',
    ],
  },
  pollo_arvejado: {
    label: 'Pollo arvejado express',
    items: [
      '150g pollo en cubos',
      '100g arvejas congeladas',
      '100g salsa de tomate natural Carozzi sin azúcar',
      '60g cebolla picada',
      '100g arroz blanco cocido',
      '1 cdta aceite de oliva',
      'Ajo, comino, sal',
      '💡 Cambia el arroz por: 80g fideos cocidos · 150g papas cocidas · 100g quinoa cocida · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA Chile + etiquetas (2026-06):
    //   150g pollo plancha:                144 kcal · 29.4 P · 0 C · 2.5 G
    //   100g arvejas congeladas:            84 kcal · 5.4 P · 14 C · 0.4 G
    //   100g salsa tomate Carozzi nat.:     35 kcal · 1.5 P · 7 C · 0.2 G
    //   60g cebolla + ajo + comino:         24 kcal · 0.6 P · 5.5 C · 0.1 G
    //   100g arroz blanco cocido:          130 kcal · 2.7 P · 28 C · 0.3 G
    //   1 cdta aceite oliva:                45 kcal · 0 P · 0 C · 5 G
    //   Total: ~470 kcal · 38 P · 50 C · 11 G (porción individual)
    baseKcal: 470, p: 38, c: 50, g: 11,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'] as string[],
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 150,
    tiempo: '20 min',
    pasos: [
      'Sofrito: dorar la cebolla 3 min en sartén con aceite. Agregar ajo picado y comino, mezclar 30 seg.',
      'Pollo: incorporar pollo en cubos y sellar 5 min hasta dorar por todos lados.',
      'Salsa: agregar la salsa de tomate y las arvejas congeladas (sin descongelar). Cocinar 8 min tapado a fuego medio-bajo.',
      'Arroz: en paralelo, calentar arroz en microondas 1 min o cocer fresco si no hay.',
      'Servir el pollo arvejado sobre cama de arroz. Aliñar con perejil fresco.',
    ],
  },
}

// ─── CENAS ────────────────────────────────────────────────────────────────────
export const cenasOpts: Record<string, MealOption> = {
  carne_arroz: {
    label: 'Carne magra + papas salteadas con romero + ensalada (porción cena)',
    items: [
      '120g carne magra (posta, lomo o filete)',
      '180g papas salteadas con romero (incluye 1 cdta aceite del salteado)',
      'Ensalada de lechuga, tomate y pepino',
      '1 cdta aceite de oliva (ensalada)',
      '💡 Cambia las papas por: 120g arroz cocido · 100g fideos cocidos · 120g quinoa cocida · 120g fideos de arroz cocidos · 60g pan integral',
    ],
    // Auditoría INTA (2026-05):
    //   120g carne magra:     180 kcal · 31 P · 0 C · 6 G
    //   180g papas + 1cdta aceite salteado: 202 kcal · 3.6 P · 36 C · 5.2 G
    //   Ensalada simple:       25 kcal · 1 P · 5 C · 0 G
    //   1 cdta aceite ensalada:45 kcal · 0 P · 0 C · 5 G
    //   Total: 452 kcal · 36 P · 41 C · 16 G
    baseKcal: 452, p: 36, c: 41, g: 16,
    porcionFija: true,
    // foto: misma que la version almuerzo de papas salteadas con romero
    // (Unsplash) — porcion cena reducida pero presentacion visual identica.
    foto: '/img/recetas/unsplash_1778784153322-9b20b164012c.webp',
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
    // Macros recalculadas con pollo Super Pollo (96 kcal · 19.6gP · 1.7gG por 100g):
    // 150g pollo (144 kcal · 29.4 P · 0 C · 2.55 G) + 200g verduras vapor (60 kcal · 4 P · 12 C · 0.5 G)
    // + 1 cdta aceite oliva (40 kcal · 0 P · 0 C · 4.5 G) + limón/ajo (~0)
    // Total ≈ 244 kcal · 33 P · 12 C · 8 G — porción cena moderada con alto contenido proteico
    baseKcal: 244, p: 33, c: 12, g: 8,
    porcionFija: true,
    // foto: pollo a la plancha con verduras coloridas (Unsplash) — corrige
    // mismatch previo donde se reusaba la foto del almuerzo con ARROZ que
    // contradecia la receta de cena sin carbohidrato.
    foto: '/img/recetas/unsplash_1633683789521-99cba8ec5d1b.webp',
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
    // Auditoría INTA (2026-05):
    //   3 huevos enteros:    234 kcal · 18 P · 1.8 C · 15 G
    //   Veg salteadas ~100g:  25 kcal · 2 P · 4 C · 0.3 G
    //   Ensalada hojas verdes:15 kcal · 1 P · 3 C · 0 G
    //   1 cdta aceite oliva:  45 kcal · 0 P · 0 C · 5 G
    //   Total: 319 kcal · 21 P · 9 C · 20 G
    baseKcal: 319, p: 21, c: 9, g: 20, tieneHuevo: true, eggsDefault: 3,
    porcionFija: true,
    // foto: omelette/tortilla con ensalada verde en plato blanco (Unsplash)
    // — corrige mismatch previo donde se reusaba la foto del omelette de
    // desayuno con PAN integral que no aplica a la version cena.
    foto: '/img/recetas/unsplash_1625536059909-84924b9899ea.webp',
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
    items: ['150g atún en agua escurrido', '1 huevo duro', '¼ palta (40g)', 'Lechuga, tomate cherry, pepino, zanahoria rallada'],
    // Auditoría INTA (2026-05):
    //   150g atún en agua:   158 kcal · 39 P · 0 C · 1.5 G
    //   1 huevo duro:         78 kcal · 6 P · 0.6 C · 5 G
    //   ¼ palta (40g):        64 kcal · 0.8 P · 3.4 C · 5.9 G
    //   Verduras 150g:        30 kcal · 1.5 P · 6 C · 0.3 G
    //   Total: 330 kcal · 47 P · 10 C · 13 G  (P estaba subestimado: atún en agua es muy proteico)
    baseKcal: 330, p: 47, c: 10, g: 13, tieneHuevo: true, eggsDefault: 1,
    porcionFija: true,
    // foto: ensalada chilena de atun de lata + huevo duro + palta + lechuga
    // (generada con OpenAI gpt-image-1) — diferencia de la version pollo
    // del almuerzo (ensalada_proteica.webp) y evita confusion con poke
    // bowl de atun crudo.
    foto: '/img/recetas/ensalada_atun.webp',
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
    // Auditoría INTA (2026-05):
    //   150g salmón al horno: 300 kcal · 33 P · 0 C · 19.5 G
    //   200g brócoli vapor:    70 kcal · 4.8 P · 14 C · 0.8 G
    //   1 cdta aceite oliva:   45 kcal · 0 P · 0 C · 5 G
    //   Total: 415 kcal · 38 P · 14 C · 25 G  (C +75%, G +56% — salmón es graso)
    baseKcal: 415, p: 38, c: 14, g: 25,
    porcionFija: true,
    // foto: salmon al horno con brocoli en plato negro (Unsplash) — corrige
    // mismatch previo donde se reusaba la foto del almuerzo con QUINOA que
    // contradecia la receta de cena sin carbohidrato.
    foto: '/img/recetas/unsplash_1675209705883-7aec595f5aa8.webp',
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
    items: ['150g bistec magro a la plancha', '200g zapallo italiano salteado (1 cdta aceite)', 'Ensalada de hojas verdes', 'Sal, pimienta y ajo al gusto'],
    // Auditoría INTA (2026-05):
    //   150g carne magra:    225 kcal · 39 P · 0 C · 7.5 G
    //   200g zapallo+aceite:  79 kcal · 2.4 P · 6 C · 5.6 G
    //   Ensalada hojas:       15 kcal · 1 P · 3 C · 0 G
    //   Total: 319 kcal · 42 P · 9 C · 13 G
    baseKcal: 319, p: 42, c: 9, g: 13,
    porcionFija: true,
    // foto: carne grillada con zapallo italiano en plato blanco (Unsplash)
    // — corrige mismatch previo donde se reusaba la foto generica de
    // "carne con PAPAS" que contradice la receta de cena (zapallo, no papa).
    foto: '/img/recetas/unsplash_1627871852845-afb02c53b422.webp',
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
    // Macros recalculadas con pollo Super Pollo (96 kcal · 19.6gP · 1.7gG por 100g):
    // 150g pollo (144 kcal · 29.4 P · 0 C · 2.55 G) + verduras + papas (~40 kcal · 1 P · 9 C · 0 G)
    // + caldo bajo en sodio (~3 kcal) + perejil (~0)
    // Total ≈ 187 kcal · 30 P · 9 C · 3 G — sopa ligera proteica
    baseKcal: 187, p: 30, c: 9, g: 3,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1627366422957-3efa9c6df0fc.webp', // sopa con carne en bol blanco, foto real
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
    items: ['200g lentejas cocidas', 'Zanahoria, apio, tomate y espinaca', 'Caldo vegetal bajo en sodio', 'Sofrito (cebolla, ajo, 1 cdta aceite)', '1 rebanada pan integral Castaño'],
    // Auditoría INTA (2026-05):
    //   200g lentejas cocidas: 232 kcal · 18 P · 40 C · 0.8 G
    //   Verduras 100g:          25 kcal · 1.5 P · 5 C · 0.2 G
    //   Sofrito + 1 cdta aceite:50 kcal · 1 P · 4 C · 5 G
    //   1 reb pan integral 31.5g:82 kcal · 4.2 P · 12.5 C · 1.5 G
    //   Total: 389 kcal · 25 P · 62 C · 7.5 G  (C estaba muy subestimado)
    baseKcal: 389, p: 25, c: 62, g: 8,
    porcionFija: true,
    tienePan: true, panTipoDefault: 'integral',
    foto: '/img/recetas/unsplash_1605909388460-74ec8b204127.webp',
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
    items: ['150g garbanzos cocidos', '½ palta en láminas (80g)', '2 huevos duros', 'Lechuga, tomate cherry, pepino y zanahoria rallada', '1 cdta aceite de oliva + limón'],
    // Auditoría INTA (2026-05):
    //   150g garbanzos cocidos:246 kcal · 14 P · 40 C · 3.9 G
    //   ½ palta (80g):         130 kcal · 1.5 P · 7 C · 12 G
    //   2 huevos duros:        156 kcal · 12 P · 1.2 C · 10 G
    //   Verduras 150g:          30 kcal · 1.5 P · 6 C · 0.3 G
    //   1 cdta aceite oliva:    45 kcal · 0 P · 0 C · 5 G
    //   Total: 607 kcal · 29 P · 54 C · 31 G  (estaba muy subestimado, +56%)
    baseKcal: 607, p: 29, c: 54, g: 31,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1773871614358-41ab249dbd2f.webp',
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
    items: [
      '180g tofu firme en cubos',
      '100g fideos integrales o de arroz cocidos',
      '150g verduras (brócoli, pimentón, zanahoria, champiñones)',
      '1 cdta aceite de sésamo + salsa de soya',
      '💡 Cambia los fideos por: 100g arroz cocido · 150g papas cocidas · 100g quinoa cocida · 50g pan integral (1 rebanada)',
    ],
    // Auditoría INTA (2026-05):
    //   180g tofu firme:     137 kcal · 14 P · 3.4 C · 8.6 G
    //   100g fideos integ.:  130 kcal · 5 P · 25 C · 1.1 G
    //   150g verduras wok:    50 kcal · 3 P · 10 C · 0.5 G
    //   1 cdta sésamo + soya: 55 kcal · 1 P · 0 C · 5 G
    //   Total: 372 kcal · 23 P · 38 C · 15 G
    baseKcal: 372, p: 23, c: 38, g: 15,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1694934588452-a1a02b2ec718.webp',
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
    items: ['200g lentejas cocidas', '½ aguacate en láminas (80g)', 'Tomate cherry, pepino y rúcula', '1 cdta aceite de oliva + limón + cúrcuma'],
    // Auditoría INTA (2026-05):
    //   200g lentejas cocidas: 232 kcal · 18 P · 40 C · 0.8 G
    //   ½ palta (80g):         130 kcal · 1.5 P · 7 C · 12 G
    //   Verduras ~100g:         20 kcal · 1 P · 4 C · 0.2 G
    //   1 cdta aceite oliva:    45 kcal · 0 P · 0 C · 5 G
    //   Total: 427 kcal · 21 P · 51 C · 18 G
    baseKcal: 427, p: 21, c: 51, g: 18,
    porcionFija: true,
    foto: '/img/recetas/unsplash_1679844784189-3883de9550fe.webp',
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
  carne_arroz_clasico: {
    label: 'Carne con arroz + ensalada (porción cena)',
    items: [
      '120g carne magra (posta, lomo o filete)',
      '100g arroz blanco cocido',
      'Ensalada de lechuga, tomate y pepino',
      '1 cdta aceite de oliva',
      '💡 Cambia el arroz por: 80g fideos cocidos · 150g papas cocidas · 100g quinoa cocida · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Macros base por porción cena (más liviana):
    // 120g carne magra (180 kcal · 31 P · 0 C · 6 G)
    // + 100g arroz blanco cocido (130 kcal · 2.7 P · 28 C · 0.3 G)
    // + ensalada simple (30 kcal · 1 P · 6 C · 0 G)
    // + 1 cdta aceite (45 kcal · 0 P · 0 C · 5 G)
    // Total ≈ 385 kcal · 35 P · 34 C · 11 G
    baseKcal: 385, p: 35, c: 34, g: 11,
    porcionFija: true,
    foto: IMG + '100GRSDEARROZ_150GRSDEALBONDIGAS.jpg',
    tendencia: ['omnivoro'],
    contiene: ['cebolla_ajo'],
    tieneCarne: true, carneTipo: 'carne_roja', carneGramosBase: 120,
    tieneCarboPrincipal: true, carboTipo: 'arroz_blanco', carboGramosBase: 100,
    tiempo: '25 min',
    pasos: [
      'Arroz: lavar y cocer 100g de arroz blanco en agua con sal 12-15 min. Versión cena con porción reducida vs almuerzo.',
      'Carne: sazonar y cocinar en plancha 3-4 min por lado. Reposar 2 min antes de cortar.',
      'Ensalada: aliñar con aceite, sal y limón.',
      'Armado: servir todo junto. Porción moderada para cena — el profesional puede ajustar gramaje de carne o arroz desde el selector según objetivo.',
    ],
  },
  pure_huevo: {
    label: 'Puré de papas + huevo + ensalada (porción cena)',
    items: [
      '180g papas cocidas (puré)',
      '30ml leche descremada',
      '5g mantequilla',
      '1 huevo entero (pochado o duro)',
      'Ensalada de hojas verdes',
      '💡 Cambia el puré por: 120g arroz cocido · 100g fideos cocidos · 120g quinoa cocida · 120g fideos de arroz cocidos · 60g pan integral',
    ],
    // Macros base por porción cena:
    // 180g papas cocidas (157 kcal · 3.6 P · 36 C · 0.2 G)
    // + 30ml leche descremada (11 kcal · 1 P · 1.5 C · 0.1 G)
    // + 5g mantequilla (35 kcal · 0 P · 0 C · 4 G)
    // + 1 huevo (78 kcal · 6 P · 0.6 C · 5 G)
    // + ensalada simple (30 kcal · 1 P · 6 C · 0 G)
    // Total ≈ 311 kcal · 12 P · 44 C · 9 G
    baseKcal: 311, p: 12, c: 44, g: 9, tieneHuevo: true, eggsDefault: 1,
    porcionFija: true,
    // foto: plato con pure y verduras al lado (Unsplash) - distinta a la
    // version almuerzo para diferenciar visualmente porcion reducida cena.
    foto: '/img/recetas/unsplash_1707578365462-07f741c24c8f.webp',
    tendencia: ['omnivoro', 'vegetariano'],
    contiene: ['huevo', 'lactosa'],
    tieneCarboPrincipal: true, carboTipo: 'papas', carboGramosBase: 180,
    tiempo: '25 min',
    pasos: [
      'Papas: pelar y cocer 180g en agua con sal 12-15 min hasta blandas. Escurrir bien.',
      'Puré: machacar con tenedor, agregar 30ml leche tibia + 5g mantequilla. Mezclar hasta cremoso. Sal y nuez moscada.',
      'Huevo: cocinar 1 huevo pochado (3 min en agua con vinagre) o duro (9 min). Versión liviana de cena con 1 solo huevo.',
      'Ensalada: hojas verdes aliñadas con aceite y limón.',
      'Armado: puré como base, huevo encima y ensalada al lado. Porción moderada para cena.',
    ],
  },
  arroz_huevo: {
    label: 'Arroz con huevo + verduras (porción cena)',
    items: [
      '100g arroz blanco cocido',
      '1 huevo entero',
      '1 cdta aceite vegetal',
      'Verduras salteadas (zapallo italiano, cebollín)',
      'Limón y sal a gusto',
      '💡 Cambia el arroz por: 80g fideos cocidos · 150g papas cocidas · 100g quinoa cocida · 100g fideos de arroz cocidos · 50g pan integral (1 rebanada)',
    ],
    // Macros base por porción cena:
    // 100g arroz blanco cocido (130 kcal · 2.7 P · 28 C · 0.3 G)
    // + 1 huevo (78 kcal · 6 P · 0.6 C · 5 G)
    // + 1 cdta aceite (45 kcal · 0 P · 0 C · 5 G)
    // + verduras (50 kcal · 2 P · 10 C · 0 G)
    // Total ≈ 303 kcal · 11 P · 39 C · 10 G
    baseKcal: 303, p: 11, c: 39, g: 10, tieneHuevo: true, eggsDefault: 1,
    porcionFija: true,
    foto: IMG + 'arroz_con_huevo_app.webp',
    tendencia: ['omnivoro', 'vegetariano'],
    contiene: ['huevo', 'cebolla_ajo'],
    tieneCarboPrincipal: true, carboTipo: 'arroz_blanco', carboGramosBase: 100,
    tiempo: '15 min',
    pasos: [
      'Arroz: cocer 100g de arroz en agua con sal 12-15 min. Versión cena con porción reducida.',
      'Verduras: cortar zapallo italiano y cebollín. Saltear en sartén con 1 cdta de aceite 3-4 min.',
      'Huevo: hacer un hueco en el centro de la sartén, agregar 1 huevo batido y revolver hasta cuajar. Integrar con las verduras.',
      'Mezcla: incorporar el arroz tibio y saltear todo junto 1-2 min. Sazonar con limón y sal.',
      'Servir caliente. Cena reconfortante baja en grasa, ideal cuando el paciente busca algo simple post-entreno PM.',
    ],
  },
  pollo_limon_palta: {
    label: 'Pollo al limón con palta y tomate',
    items: [
      '120g pechuga de pollo a la plancha',
      '½ palta (60g) en láminas',
      '100g tomate en rodajas',
      'Cilantro fresco picado',
      'Jugo de medio limón, sal, pimienta',
      '1 cdta aceite de oliva',
    ],
    // Auditoría INTA Chile (2026-06):
    //   120g pollo plancha:                115 kcal · 23.5 P · 0 C · 2 G
    //   60g palta:                          96 kcal · 1.2 P · 5.1 C · 8.8 G
    //   100g tomate:                        18 kcal · 0.9 P · 3.9 C · 0.2 G
    //   1 cdta aceite oliva:                45 kcal · 0 P · 0 C · 5 G
    //   Cilantro + limón + sal:              0 kcal
    //   Total: ~310 kcal · 30 P · 8 C · 18 G (cena sin carbo, política clínica)
    baseKcal: 310, p: 30, c: 8, g: 18,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: [] as string[],
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 120,
    tiempo: '10 min',
    pasos: [
      'Pollo: sazonar con sal, pimienta y jugo de medio limón. Cocinar en plancha o sartén con un toque de aceite 4-5 min por lado.',
      'Reposo: retirar el pollo y dejar reposar 1 min antes de cortar en tiras.',
      'Verduras: cortar tomate en rodajas y palta en láminas (con unas gotas de limón evita oxidación).',
      'Armado: disponer las tiras de pollo en plato, agregar tomate y palta al lado.',
      'Finalizar con cilantro fresco picado, sal, pimienta y un hilo de aceite de oliva.',
    ],
  },
  tortilla_zapallo_italiano: {
    label: 'Tortilla chilena de zapallo italiano',
    items: [
      '2 huevos enteros',
      '150g zapallo italiano rallado',
      '30g cebolla picada finamente',
      '1 cdta aceite de oliva',
      'Sal, pimienta, orégano',
    ],
    // Auditoría INTA Chile (2026-06):
    //   2 huevos enteros:                  156 kcal · 12.4 P · 1.2 C · 10 G
    //   150g zapallo italiano:              26 kcal · 1.8 P · 5 C · 0.5 G
    //   30g cebolla:                        12 kcal · 0.3 P · 2.8 C · 0 G
    //   1 cdta aceite oliva:                45 kcal · 0 P · 0 C · 5 G
    //   Total: ~250 kcal · 16 P · 8 C · 18 G (cena vegetariana liviana)
    baseKcal: 250, p: 16, c: 8, g: 18, tieneHuevo: true, eggsDefault: 2,
    porcionFija: true,
    tendencia: ['vegetariano'],
    contiene: ['huevo', 'cebolla_ajo'] as string[],
    tiempo: '15 min',
    pasos: [
      'Verduras: rallar el zapallo italiano (con cáscara), apretar suavemente con las manos para eliminar exceso de agua.',
      'Sofrito: saltear cebolla picada y el zapallo rallado en sartén con aceite 4 min hasta que pierdan agua.',
      'Mezcla: batir los 2 huevos con sal, pimienta y orégano. Incorporar a la sartén sobre las verduras.',
      'Cocción: cocinar 4 min a fuego bajo hasta que cuaje por debajo. Voltear con plato y cocinar 2 min más.',
      'Servir tibia. Apta vegetariana. Buena con ensalada verde al lado si se quiere más volumen.',
    ],
  },
  merluza_ensalada_chilena: {
    label: 'Merluza al sartén + ensalada chilena',
    items: [
      '150g filete de merluza (fresca o congelada)',
      '100g tomate en cubos',
      '50g cebolla en pluma',
      'Cilantro fresco picado',
      '1 cdta aceite de oliva',
      'Jugo de limón, sal',
    ],
    // Auditoría INTA Chile (2026-06):
    //   150g merluza al sartén:            132 kcal · 27 P · 0 C · 2 G
    //   100g tomate:                        18 kcal · 0.9 P · 3.9 C · 0.2 G
    //   50g cebolla:                        20 kcal · 0.5 P · 4.7 C · 0 G
    //   1 cdta aceite oliva:                45 kcal · 0 P · 0 C · 5 G
    //   Cilantro + limón + sal:              0 kcal
    //   Total: ~245 kcal · 32 P · 10 C · 9 G (cena más liviana del set)
    baseKcal: 245, p: 32, c: 10, g: 9,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['pescados', 'cebolla_ajo'] as string[],
    estacional: 'calor',
    tieneCarne: true, carneTipo: 'pescado_blanco', carneGramosBase: 150,
    tiempo: '15 min',
    pasos: [
      'Merluza: si está congelada, descongelar en agua fría 15 min. Secar bien con papel absorbente.',
      'Cocción: sazonar con sal y limón. Sellar en sartén con poco aceite 3 min por lado a fuego medio-alto.',
      'Ensalada chilena: remojar cebolla en pluma en agua fría 5 min para suavizar el picor. Escurrir.',
      'Mezclar tomate en cubos, cebolla escurrida, cilantro picado, aceite y limón. Sal a gusto.',
      'Servir la merluza con la ensalada chilena al lado. Cena fresca y ligera ideal verano.',
    ],
  },
  causeo_pollo: {
    label: 'Causeo de pollo (ensalada chilena tibia)',
    items: [
      '120g pechuga de pollo a la plancha en tiras',
      '100g cebolla en pluma (remojada en agua fría)',
      '150g tomate en cubos',
      '1 huevo duro (opcional, encima)',
      'Cilantro fresco picado',
      '1 cdta aceite de oliva',
      'Jugo de limón, sal, ají verde a gusto',
    ],
    // Auditoría INTA Chile (2026-06):
    //   120g pollo plancha:                115 kcal · 23.5 P · 0 C · 2 G
    //   100g cebolla:                       40 kcal · 1.1 P · 9.3 C · 0.1 G
    //   150g tomate:                        27 kcal · 1.4 P · 5.8 C · 0.3 G
    //   1 huevo duro:                       78 kcal · 6.2 P · 0.6 C · 5 G
    //   1 cdta aceite oliva:                45 kcal · 0 P · 0 C · 5 G
    //   Total: ~305 kcal · 32 P · 12 C · 13 G
    baseKcal: 300, p: 32, c: 12, g: 13, tieneHuevo: true, eggsDefault: 1,
    porcionFija: true,
    tendencia: ['omnivoro'],
    contiene: ['huevo', 'cebolla_ajo'] as string[],
    estacional: 'calor',
    tieneCarne: true, carneTipo: 'pollo', carneGramosBase: 120,
    tiempo: '15 min',
    pasos: [
      'Pollo: sazonar con sal y pimienta. Cocinar en plancha 4 min por lado. Cortar en tiras delgadas.',
      'Cebolla: remojar la cebolla en pluma en agua fría con sal 5 min, escurrir. Esto suaviza el picor.',
      'Huevo: hervir el huevo 10 min para que quede duro. Enfriar en agua fría, pelar y cortar en cuartos.',
      'Mezcla: en un bowl combinar el pollo tibio en tiras, la cebolla y el tomate cortado en cubos.',
      'Aliñar con aceite de oliva, limón, sal, ají verde picado fino y cilantro. Servir el huevo en cuartos por encima.',
    ],
  },
  crema_zapallo_huevo: {
    label: 'Crema de zapallo + huevo pochado',
    items: [
      '250g zapallo butternut o camote pelado',
      '100ml leche descremada',
      '2 huevos enteros pochados (encima)',
      '1 cdta aceite de oliva',
      'Sal, nuez moscada, comino',
    ],
    // Auditoría INTA Chile (2026-06):
    //   250g zapallo butternut:           113 kcal · 2.5 P · 28 C · 0.3 G
    //   100ml leche descremada:            33 kcal · 3.1 P · 4.8 C · 0.1 G
    //   2 huevos pochados:                156 kcal · 12.4 P · 1.2 C · 10 G
    //   1 cdta aceite oliva:               45 kcal · 0 P · 0 C · 5 G
    //   Total: ~360 kcal · 18 P · 35 C · 17 G (sopa estacional frío)
    baseKcal: 360, p: 18, c: 35, g: 17, tieneHuevo: true, eggsDefault: 2,
    porcionFija: true,
    tendencia: ['vegetariano'],
    contiene: ['huevo', 'lacteos'] as string[],
    estacional: 'frio',
    tiempo: '20 min',
    pasos: [
      'Zapallo: cortar en cubos. Si tienes pre-cortado de supermercado, listo. Microondas 8 min cubierto con tapa o hervir 12 min.',
      'Licuar: pasar el zapallo cocido a la licuadora con la leche descremada, aceite, sal, comino y nuez moscada. Procesar hasta cremosa.',
      'Calentar: volver a la olla, ajustar consistencia con un poco más de leche si es necesaria. Mantener tibia.',
      'Huevos pochados: hervir agua con un chorrito de vinagre. Formar remolino, romper cada huevo dentro. Cocinar 3 min para yema líquida.',
      'Servir la crema en plato hondo y colocar los 2 huevos pochados encima. La yema rompe y se integra a la crema.',
    ],
  },
}

// ─── ULTRA PROCESADOS ─────────────────────────────────────────────────────────
export const ultraProcOpts: Record<string, UltraOption> = {
  chips_papas: {
    label: '🍟 Papas fritas snack',
    porcion: '1 paquete pequeño (28g)',
    // Auditoría INTA (2026-05): los valores eran por 100g (536/7/53/34).
    // Escalados a la porción real de 28g (Lays/Marco Polo paquete individual).
    kcal: 150, p: 2, c: 15, g: 9.5,
    sellos: ['Alto en grasas saturadas', 'Alto en sodio'],
    marca: 'Genérico',
    categoriaProducto: 'snack_salado',
  },
  rolls_crocante_costa: {
    label: '🍫 Rolls Crocante Costa',
    porcion: '1 porción (26g) · 4 porciones por envase de 100g',
    // Datos validados contra ficha nutricional jumbo.cl (2026-06):
    //   Por porción 26g: 132 kcal · 1.1 P · 18.4 C (14.2g azúcar) · 6 G (3.7 sat) · 30.8 mg sodio
    //   Por 100g equivalente: 507 kcal · 4.2 P · 70.8 C (54.6g azúcar) · 23.1 G (14.2 sat)
    //   Triple sello chileno: azúcares + grasas saturadas + calorías superan los thresholds INTA.
    //   Foto: jumbocl.vtexassets.com/arquivos/ids/380460-900-900 (cuadrada 900x900, 72KB webp).
    kcal: 132, p: 1, c: 18, g: 6,
    sellos: ['Alto en azúcares (14.2g)', 'Alto en grasas saturadas (3.7g)', 'Alto en calorías'],
    alergenos: ['Gluten', 'Leche', 'Soya', 'Almendras', 'Maní', 'Avellanas', 'Puede contener trazas de huevo, sésamo, sulfitos'],
    foto: IMG + 'rolls_crocante_costa.webp',
    marca: 'Costa',
    categoriaProducto: 'chocolate',
  },
  galletas_dulces: {
    label: '🍪 Galletitas Mini Costa Limón',
    porcion: '1 bolsa (35g)',
    kcal: 173, p: 1.8, c: 25.8, g: 6.9,
    sellos: ['Alto en azúcares (8.8g)', 'Alto en grasas saturadas (3.8g)', 'Alto en calorías', 'Contiene grasas trans (0.1g)', 'Alto en sodio (137.6mg)'],
    foto: '/img/productos/costa_mini_limon.webp',
    marca: 'Costa',
    categoriaProducto: 'galleta_dulce',
  },
  chocolate_leche: {
    label: '🍫 Chocolate Trencito Nestlé',
    porcion: '6 cuadritos (25g) · 6 porciones por envase',
    kcal: 137, p: 2.1, c: 15, g: 7.6,
    sellos: ['Alto en azúcares (13.1g)', 'Alto en grasas saturadas (4.8g)', 'Contiene grasas trans (0.15g)'],
    alergenos: ['Leche', 'Soya', 'Puede contener nueces y derivados'],
    foto: '/img/productos/chocolate_trencito.webp',
    marca: 'Nestlé',
    categoriaProducto: 'chocolate',
  },
  bebida_cola: {
    label: '🥤 Bebida cola/gaseosa',
    porcion: '1 lata (355ml)',
    kcal: 150, p: 0, c: 40, g: 0,
    sellos: ['Alto en azúcares'],
    marca: 'Genérico',
    categoriaProducto: 'gaseosa',
  },
  helado: {
    label: '🍦 Sandwich Helado Vainilla (Great Value)',
    porcion: '1 sándwich (68ml) · 16 unidades por caja',
    kcal: 100, p: 2, c: 17, g: 3.5,
    sellos: ['Alto en azúcares (8g)', 'Alto en sodio (70mg)', 'Alto en calorías'],
    alergenos: ['Leche'],
    foto: '/img/productos/helado_great_value.webp',
    marca: 'Great Value',
    categoriaProducto: 'helado',
  },
  doritos: {
    label: '🌽 Doritos Sabor Queso',
    porcion: '1 porción (25g) · 6 porciones por envase (150g)',
    kcal: 128, p: 1.5, c: 16, g: 6.3,
    sellos: ['Alto en sodio (197mg por porción)', 'Alto en carbohidratos (16g)', 'Grasas saturadas (0.7g)'],
    alergenos: ['Leche (queso, sólidos de leche)'],
    foto: '/img/productos/doritos_queso.webp',
    marca: 'Frito-Lay (PepsiCo)',
    categoriaProducto: 'snack_salado',
  },
  kuchen: {
    label: '🎂 Kuchen/Pastel',
    porcion: '1 trozo (80g)',
    kcal: 350, p: 5, c: 40, g: 19,
    sellos: ['Alto en azúcares', 'Alto en grasas saturadas'],
    alergenos: ['Gluten', 'Huevo', 'Leche'],
    marca: 'Genérico',
    categoriaProducto: 'panaderia',
  },
  gomitas: {
    label: '🍬 Gomitas/Dulces',
    porcion: '1 porción (30g)',
    // Auditoría INTA (2026-05): los valores eran por 100g (340/5/77/0).
    // Escalados a porción real de 30g (puñado ~10 gomitas).
    kcal: 102, p: 1.5, c: 23, g: 0,
    sellos: ['Alto en azúcares'],
    marca: 'Genérico',
    categoriaProducto: 'golosina',
  },
  barra_cereal_azucar: {
    label: '🍫 Barra de cereal azucarada',
    porcion: '1 barra (35g)',
    // Auditoría INTA (2026-05): los valores eran por 100g (400/4/65/14).
    // Escalados a porción real de 35g (barra individual tipo Quaker/Nutry).
    kcal: 140, p: 1.4, c: 23, g: 5,
    sellos: ['Alto en azúcares'],
    marca: 'Genérico',
    categoriaProducto: 'cereal',
  },
  nuggets: {
    label: '🍗 Nuggets fritos',
    porcion: '6 unidades (100g)',
    kcal: 297, p: 15, c: 17, g: 18,
    sellos: ['Alto en sodio', 'Alto en grasas saturadas'],
    marca: 'Genérico',
    categoriaProducto: 'frito',
  },
  chocolate_sahne_nuss: {
    label: '🍫 Chocolate Sahne-Nuss con Almendras',
    porcion: '2 cuadritos (31g) · 5 porciones por envase',
    kcal: 173, p: 3.5, c: 14.5, g: 11.2,
    sellos: ['Alto en azúcares (13.6g)', 'Alto en grasas saturadas (4.8g)', 'Contiene colesterol (5mg)'],
    alergenos: ['Almendras', 'Soya (lecitina)', 'Leche'],
    foto: '/img/productos/chocolate_sahne_nuss.webp',
    marca: 'Nestlé',
    categoriaProducto: 'chocolate',
  },
  donuts: {
    label: '🍩 Mini donuts de chocolate',
    porcion: '5 mini donuts (36g)',
    // Auditoría INTA (2026-05): los valores eran por 100g (522/5/66/27).
    // Escalados a porción real de 36g (5 mini donuts tipo Bauducco/Doña Carlota).
    // Si se desea representar 5 donuts NORMALES (~250g), crear plato aparte.
    kcal: 188, p: 1.8, c: 24, g: 9.7,
    sellos: ['Alto en azúcares', 'Alto en grasas saturadas', 'Alto en calorías'],
    alergenos: ['Gluten', 'Leche', 'Soya', 'Huevo'],
    marca: 'Genérico',
    categoriaProducto: 'panaderia',
  },
  chomp_bombon: {
    label: '🍦 Bombón Helado Chomp Frambuesa (Savory)',
    porcion: '5 bombones (75ml) · 3 porciones por envase (225ml)',
    kcal: 213, p: 0.8, c: 18.8, g: 15,
    sellos: ['Alto en azúcares (16.5g)', 'Alto en grasas saturadas (11.3g)', 'Alto en calorías', 'Contiene grasas trans (0.1g)'],
    alergenos: ['Leche'],
    foto: '/img/productos/chomp_frambuesa.webp',
    marca: 'Savory',
    categoriaProducto: 'helado',
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
