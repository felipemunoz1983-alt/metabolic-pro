/**
 * wheyProtein.ts — Catálogo de proteínas en polvo con matching por condición.
 *
 * 4 tipos de whey/proteína cubren el espectro clínico completo:
 *   1. Whey CONCENTRADO  — el estándar, sabor + precio mejor, 3-5g lactosa
 *   2. Whey ISOLATE (ISO) — purificado, <1g lactosa, ideal intolerantes leves
 *   3. Whey HIDROLIZADO   — péptidos pre-digeridos, absorción rápida,
 *                            mejor tolerado por SIBO/SII
 *   4. PLANT-BASED        — arveja + arroz, sin lactosa, apto vegano/alergias
 *
 * REFERENCIAS BIBLIOGRÁFICAS:
 *
 *  - Jäger R et al. "International Society of Sports Nutrition Position Stand:
 *    Protein and exercise". J Int Soc Sports Nutr. 2017;14:20.
 *
 *  - Pasiakos SM et al. "The effects of protein supplements on muscle mass,
 *    strength, and aerobic and anaerobic power in healthy adults: a systematic
 *    review". Sports Med. 2015;45(1):111-31.
 *
 *  - Phillips SM. "A brief review of higher dietary protein diets in weight
 *    loss: a focus on athletes". Sports Med. 2014;44 Suppl 2:S149-53.
 *
 *  - Mathai JK et al. "Values for digestible indispensable amino acid scores
 *    (DIAAS) for some dairy and plant proteins may better describe protein
 *    quality than values calculated using the concept for protein digestibility-
 *    corrected amino acid scores (PDCAAS)". Br J Nutr. 2017;117(4):490-499.
 *    (DIAAS: whey isolate 1.09, concentrate 1.07, hydrolyzed similar; pea 0.82,
 *    rice 0.42, blend pea+rice cubre todos los EAA esenciales.)
 *
 * REGLA CLAVE: la elección depende MÁS de la TOLERANCIA DIGESTIVA del paciente
 * que del precio o las preferencias gustativas. Aplicar el matcher en este orden:
 *   1. Vegano → solo plant-based
 *   2. Intolerancia lactosa severa O SIBO/SII → hidrolizado o ISO o plant
 *   3. Intolerancia leve → ISO
 *   4. Sin restricción → concentrado (mejor relación calidad/precio)
 *
 * Datos de productos chilenos disponibles a 2026.
 */

export type WheyTipo = 'concentrado' | 'isolate' | 'hidrolizado' | 'vegana'

export interface WheyProductInfo {
  /** Slug interno usado en form.wheyProductoElegido (futuro) */
  id: WheyTipo
  /** Nombre comercial visible */
  label: string
  /** Emoji distintivo para tarjeta y chips */
  emoji: string
  /** Marca y formato típico chileno */
  marca: string
  /** Porción típica de UN scoop según etiqueta */
  porcionG: number
  /** Macros por scoop */
  kcal: number
  /** Proteína por scoop (g) */
  p: number
  /** Carbohidratos por scoop (g) */
  c: number
  /** Grasas por scoop (g) */
  g: number
  /** Lactosa residual por scoop (g) — clave clínica: 0 = ISO/hidrolizado/vegana */
  lactosaG: number
  /** DIAAS — Digestible Indispensable Amino Acid Score, Mathai 2017.
   *  1.0+ = proteína completa de alta calidad. Whey > caseína > soya > arveja > arroz. */
  diaas: number
  /** Velocidad de absorción aproximada en minutos */
  absorcionMin: number
  /** Precio aproximado por kg en CLP (2026, Wild Protein / mercado chileno) */
  precioCLP: number
  /** Badge corto que aparece en la card */
  badge: string
  /** Nota clínica + advertencias de alérgenos */
  nota: string
  /** URL/path de la foto del producto */
  foto: string
  /** Compatible con dieta vegana */
  vegano: boolean
  /** Lista de alérgenos declarados (lactosa, soya, frutos secos…) */
  contiene: string[]
}

export const WHEY_TIPOS: Record<WheyTipo, WheyProductInfo> = {
  concentrado: {
    id: 'concentrado',
    label: 'Whey Concentrado',
    emoji: '🥛',
    marca: 'Wild Protein Standard Whey · 1 kg',
    porcionG: 30,
    kcal: 120,
    p: 24,
    c: 3,
    g: 1.5,
    lactosaG: 3.5,
    diaas: 1.07,
    absorcionMin: 45,
    precioCLP: 22990,
    badge: '24g prot · Mejor precio · Sabor superior',
    nota:
      '⚠️ Contiene lactosa (3-5g/scoop) — NO apto para intolerantes a la lactosa, SIBO o SII. Estándar del mercado: mejor sabor + relación calidad/precio. Apto omnívoro/vegetariano.',
    foto: '/img/whey_concentrado.jpg',
    vegano: false,
    contiene: ['lactosa', 'soya'],
  },
  isolate: {
    id: 'isolate',
    label: 'Whey Isolate (ISO)',
    emoji: '⚡',
    marca: 'Wild Protein ISO 100% Whey Isolate · 900 g',
    porcionG: 30,
    kcal: 110,
    p: 26,
    c: 0.5,
    g: 0.5,
    lactosaG: 0.5,
    diaas: 1.09,
    absorcionMin: 30,
    precioCLP: 29990,
    badge: '26g prot · <1g lactosa · Bajo en grasa',
    nota:
      '✅ Casi sin lactosa (<1g/scoop) — ideal para intolerantes leves a moderados. Filtrado por microfiltración o intercambio iónico. Menor grasa y CH que el concentrado. Apto omnívoro/vegetariano.',
    foto: '/img/whey_isolate.jpg',
    vegano: false,
    contiene: ['soya'],
  },
  hidrolizado: {
    id: 'hidrolizado',
    label: 'Whey Hidrolizado',
    emoji: '🛡️',
    marca: 'Optimum Nutrition Platinum HydroWhey · 1.6 kg',
    porcionG: 39,
    kcal: 140,
    p: 30,
    c: 2,
    g: 1,
    lactosaG: 0,
    diaas: 1.09,
    absorcionMin: 20,
    precioCLP: 64990,
    badge: '30g prot · Pre-digerido · Absorción 20min',
    nota:
      '🏥 Péptidos pre-digeridos por hidrólisis enzimática — tolerado por la mayoría de SIBO/SII y alergia leve a leche. Absorción más rápida (~20 min). Sabor más amargo, precio más alto. Apto omnívoro/vegetariano.',
    foto: '/img/whey_hidrolizado.jpg',
    vegano: false,
    contiene: ['soya'],
  },
  vegana: {
    id: 'vegana',
    label: 'Proteína Vegana (Blend)',
    emoji: '🌱',
    marca: 'Wild Protein Vegan · Arveja + Arroz · 900 g',
    porcionG: 30,
    kcal: 110,
    p: 22,
    c: 4,
    g: 1.5,
    lactosaG: 0,
    diaas: 0.92, // blend pea+rice eleva el DIAAS vs pea solo (0.82)
    absorcionMin: 60,
    precioCLP: 27990,
    badge: '22g prot · 100% vegetal · Sin lactosa',
    nota:
      '🌿 Combinación de proteína de arveja (rica en lisina) + arroz (rica en metionina) cubre todos los aminoácidos esenciales. Cero lactosa, cero derivados animales. Apto vegano, alergia a leche, SIBO severo. Sabor más herbal.',
    foto: '/img/whey_vegana.jpg',
    vegano: true,
    contiene: [],
  },
}

// ─── Matcher por perfil del paciente ─────────────────────────────────────────

export type WheyUso =
  | 'sin_lactosa'
  | 'apto_vegano'
  | 'apta_sibo'
  | 'post_entreno_rapido'
  | 'mejor_precio'
  | 'premium'
  | 'mejor_sabor'

export const WHEY_USO_LABELS: Record<WheyUso, { label: string; emoji: string }> = {
  sin_lactosa:         { label: 'Sin lactosa',         emoji: '✅' },
  apto_vegano:         { label: 'Apto vegano',         emoji: '🌱' },
  apta_sibo:           { label: 'Tolera SIBO/SII',     emoji: '🛡️' },
  post_entreno_rapido: { label: 'Post-entreno rápido', emoji: '⚡' },
  mejor_precio:        { label: 'Mejor precio/g',      emoji: '💰' },
  premium:             { label: 'Premium',             emoji: '👑' },
  mejor_sabor:         { label: 'Mejor sabor',         emoji: '😋' },
}

export function tagsDeWhey(tipo: WheyTipo): WheyUso[] {
  const w = WHEY_TIPOS[tipo]
  const tags: WheyUso[] = []
  if (w.lactosaG < 1) tags.push('sin_lactosa')
  if (w.vegano) tags.push('apto_vegano')
  if (tipo === 'hidrolizado' || tipo === 'vegana') tags.push('apta_sibo')
  if (w.absorcionMin <= 30) tags.push('post_entreno_rapido')
  if (tipo === 'concentrado') tags.push('mejor_precio', 'mejor_sabor')
  if (tipo === 'hidrolizado') tags.push('premium')
  return tags
}

interface PerfilParaWhey {
  /** 'omnivoro' | 'vegetariano' | 'vegano' */
  tendencia?: string
  /** Intolerancias declaradas (incluye 'lactosa') */
  digIntolerancias?: string[]
  /** 'no' | 'si_sibo' | 'si_sii' | 'sospecha' */
  digDiag?: string
  /** Horario de entrenamiento — si es PM, post_entreno_rapido cobra peso */
  horarioEntrenamiento?: string
  /** Presupuesto declarado por el paciente */
  presupuestoSemanal?: 'bajo' | 'medio' | 'alto'
}

/** Score 0-100 de idoneidad por whey según perfil. >=50 = recomendable. */
export function scoreWhey(tipo: WheyTipo, p: PerfilParaWhey): number {
  const w = WHEY_TIPOS[tipo]
  let s = 50

  // Vegano: solo plant califica, resto a 0
  if (p.tendencia === 'vegano') {
    return w.vegano ? 100 : 0
  }

  const intol = p.digIntolerancias ?? []
  const tieneLactosa = intol.includes('lactosa')
  const sibo = p.digDiag === 'si_sibo' || p.digDiag === 'si_sii'

  // Reglas duras
  if (tieneLactosa && w.lactosaG > 1) s -= 50   // hunde concentrado
  if (sibo && tipo === 'concentrado') s -= 35   // SIBO + concentrado = mala combo
  if (sibo && tipo === 'isolate')     s -= 10   // ISO mejor que concentrado pero hidrolizado/plant gana

  // Bonificaciones
  if (sibo && (tipo === 'hidrolizado' || tipo === 'vegana')) s += 30
  if (tieneLactosa && w.lactosaG < 1) s += 15
  if (p.horarioEntrenamiento === 'PM' && w.absorcionMin <= 30) s += 10

  // Presupuesto
  if (p.presupuestoSemanal === 'bajo' && tipo === 'concentrado') s += 15
  if (p.presupuestoSemanal === 'bajo' && tipo === 'hidrolizado') s -= 20
  if (p.presupuestoSemanal === 'alto' && tipo === 'hidrolizado') s += 10

  return Math.max(0, Math.min(100, Math.round(s)))
}

export function rankWheyParaPaciente(p: PerfilParaWhey): Array<{
  tipo: WheyTipo
  score: number
  tags: WheyUso[]
  topPick: boolean
}> {
  const ranked = (Object.keys(WHEY_TIPOS) as WheyTipo[])
    .map(tipo => ({
      tipo,
      score: scoreWhey(tipo, p),
      tags:  tagsDeWhey(tipo),
      topPick: false,
    }))
    .sort((a, b) => b.score - a.score)
  if (ranked.length > 0) {
    const max = ranked[0].score
    ranked.forEach(r => { r.topPick = r.score >= max - 5 && r.score >= 60 })
  }
  return ranked
}

export function razonTopWhey(tipo: WheyTipo, p: PerfilParaWhey): string {
  const w = WHEY_TIPOS[tipo]
  const partes: string[] = []
  const intol = p.digIntolerancias ?? []
  const sibo = p.digDiag === 'si_sibo' || p.digDiag === 'si_sii'

  if (p.tendencia === 'vegano' && w.vegano) {
    partes.push('única opción compatible con tu dieta vegana')
  }
  if (sibo && (tipo === 'hidrolizado' || tipo === 'vegana')) {
    partes.push('péptidos pre-digeridos / cero lactosa — apto para tu SIBO/SII')
  }
  if (intol.includes('lactosa') && w.lactosaG < 1) {
    partes.push(`menos de 1g lactosa por scoop — tolerable con tu intolerancia`)
  }
  if (p.horarioEntrenamiento === 'PM' && w.absorcionMin <= 30) {
    partes.push(`absorción ${w.absorcionMin} min — ideal post-entreno PM`)
  }
  if (partes.length === 0) {
    return `${w.p}g de proteína · DIAAS ${w.diaas} · $${(w.precioCLP / 1000).toFixed(1)}k por kg`
  }
  return partes.join(' · ')
}
