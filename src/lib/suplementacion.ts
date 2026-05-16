// ── Motor de preguntas inteligentes para recomendación de suplementación ──────
// Centro Metabólico Pro — suplementación basada en síntomas y objetivos

import type { FormData } from './nutrition'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type RespuestaQ = 'si' | 'a_veces' | 'no' | 'mucho' | 'algo' | 'bien' | 'mal' | 'regular'

export interface PreguntaSup {
  id: string
  area: string              // título del área (ej. "Energía y Rendimiento")
  icono: string
  pregunta: string
  opciones: { value: RespuestaQ; label: string }[]
  fisioExplicacion: string  // qué causa el síntoma
}

export interface DefinicionSuplemento {
  id: string
  nombre: string
  icono: string
  dosis: string
  descripcionCorta: string
  fisiologia: string        // explicación para el profesional / paciente
  evidencia: 'A' | 'B' | 'C'   // nivel de evidencia ISSN/ACSM
  color: string             // clases Tailwind del badge
  contraIndicaEn: (keyof Pick<FormData,
    'supEmbarazo' | 'supCronicas' | 'supMedic'>)[]
  contraIndicaValores: Partial<Record<string, string[]>>
  // qué valor de qué pregunta lo recomienda
  recomendadoPor: Partial<Record<string, RespuestaQ[]>>
}

// ─── Preguntas ────────────────────────────────────────────────────────────────

export const PREGUNTAS_SUP: PreguntaSup[] = [
  {
    id: 'q_energia',
    area: 'Energía y Rendimiento',
    icono: '⚡',
    pregunta: '¿Sientes falta de energía o cansancio antes de entrenar?',
    opciones: [
      { value: 'si',      label: 'Sí, frecuentemente' },
      { value: 'a_veces', label: 'Solo algunos días' },
      { value: 'no',      label: 'No, entreno con buena energía' },
    ],
    fisioExplicacion:
      'La fatiga pre-entrenamiento puede deberse a bajo descanso, déficit calórico, baja ingesta de carbohidratos o baja estimulación del SNC. La cafeína actúa bloqueando receptores de adenosina y mejora la percepción del esfuerzo. La creatina apoya la resíntesis de ATP cuando hay fatiga acumulada.',
  },
  {
    id: 'q_recuperacion',
    area: 'Recuperación muscular',
    icono: '💪',
    pregunta: '¿Cómo te sientes en las 24-48h después de entrenar?',
    opciones: [
      { value: 'mucho',   label: 'Bastante dolor muscular (DOMS intenso)' },
      { value: 'algo',    label: 'Algo de molestia, recupero en 48h' },
      { value: 'bien',    label: 'Recupero bien, sin molestias' },
    ],
    fisioExplicacion:
      'El DOMS (dolor muscular de aparición tardía) refleja microroturas musculares y proceso inflamatorio normal. Una ingesta proteica insuficiente prolonga la recuperación. La creatina reduce el daño muscular inducido por ejercicio. El Omega-3 actúa como antiinflamatorio modulando eicosanoides.',
  },
  {
    id: 'q_sueno',
    area: 'Calidad del sueño',
    icono: '😴',
    pregunta: '¿Cómo describes tu calidad de sueño habitual?',
    opciones: [
      { value: 'mal',     label: 'Duermo poco o me cuesta dormir' },
      { value: 'regular', label: 'Regular — me despierto durante la noche' },
      { value: 'bien',    label: 'Duermo bien y me levanto descansado/a' },
    ],
    fisioExplicacion:
      'El sueño insuficiente eleva el cortisol, reduce la síntesis proteica y el rendimiento al día siguiente. El magnesio activa el GABA (neurotransmisor inhibidor), reduciendo el tiempo de conciliación. El L-triptófano es precursor de serotonina y melatonina. No generan dependencia ni habituación.',
  },
  {
    id: 'q_calambres',
    area: 'Calambres e hidratación',
    icono: '🦵',
    pregunta: '¿Sufres calambres o sensación de deshidratación durante el ejercicio?',
    opciones: [
      { value: 'si',      label: 'Sí, con frecuencia' },
      { value: 'a_veces', label: 'Ocasionalmente' },
      { value: 'no',      label: 'Rara vez o nunca' },
    ],
    fisioExplicacion:
      'Los calambres musculares en deportistas suelen relacionarse con déficit de electrolitos (sodio, potasio, magnesio) por pérdida sudoral, especialmente en sesiones de más de 60 min o alta temperatura. El magnesio participa en la relajación muscular. Los electrolitos reponen minerales perdidos en sudor.',
  },
  {
    id: 'q_articulaciones',
    area: 'Salud articular',
    icono: '🦴',
    pregunta: '¿Presentas dolor o molestias articulares al entrenar?',
    opciones: [
      { value: 'si',      label: 'Sí, frecuentemente' },
      { value: 'a_veces', label: 'Ocasionalmente' },
      { value: 'no',      label: 'No tengo molestias articulares' },
    ],
    fisioExplicacion:
      'El dolor articular recurrente en deportistas puede relacionarse con carga mecánica excesiva, inflamación crónica de bajo grado o desgaste del cartílago. El Omega-3 (EPA+DHA) modula la respuesta inflamatoria. El colágeno hidrolizado aporta aminoácidos precursores para la síntesis de tejido conectivo.',
  },
  {
    id: 'q_masa',
    area: 'Composición corporal',
    icono: '🎯',
    pregunta: '¿Tu objetivo principal es ganar masa muscular o mejorar la fuerza?',
    opciones: [
      { value: 'si',      label: 'Sí, es mi objetivo principal' },
      { value: 'a_veces', label: 'Es uno de mis objetivos, no el único' },
      { value: 'no',      label: 'No, me enfoco en otro objetivo' },
    ],
    fisioExplicacion:
      'La creatina es el suplemento deportivo con mayor evidencia para hipertrofia y fuerza: aumenta la reserva de fosfocreatina muscular, permite mayor volumen de trabajo y mejora la señalización de mTOR. La proteína en polvo complementa la ingesta dietaria cuando los requerimientos son altos (1.6-2.2 g/kg).',
  },
]

// ─── Definición de suplementos ────────────────────────────────────────────────

export const SUPLEMENTOS: Record<string, DefinicionSuplemento> = {
  cafeina: {
    id: 'cafeina',
    nombre: 'Cafeína',
    icono: '☕',
    dosis: '3–6 mg/kg de peso · 30-60 min antes del entreno',
    descripcionCorta: 'Mejora alerta, concentración y percepción del esfuerzo.',
    fisiologia:
      'Antagonista competitivo de los receptores de adenosina. Reduce la percepción de fatiga central y mejora la activación del SNC. Útil en entrenamientos de alta demanda. No reemplaza sueño ni alimentación adecuada.',
    evidencia: 'A',
    color: 'bg-amber-50 border-amber-300 text-amber-900',
    contraIndicaEn: ['supEmbarazo', 'supCronicas'],
    contraIndicaValores: {
      supEmbarazo: ['embarazo', 'lactancia'],
      supCronicas: ['hipertiroidismo', 'cardiovascular'],
    },
    recomendadoPor: {
      q_energia: ['si', 'a_veces'],
    },
  },

  creatina: {
    id: 'creatina',
    nombre: 'Creatina Monohidratada',
    icono: '💪',
    dosis: '3–5 g/día · toma continua, cualquier horario',
    descripcionCorta: 'El suplemento con mayor evidencia para fuerza, hipertrofia y recuperación.',
    fisiologia:
      'Aumenta las reservas de fosfocreatina intramuscular. Permite mayor resíntesis de ATP en esfuerzos explosivos cortos. Reduce el daño muscular inducido por ejercicio y mejora la señalización anabólica.',
    evidencia: 'A',
    color: 'bg-blue-50 border-blue-300 text-blue-900',
    contraIndicaEn: ['supCronicas'],
    contraIndicaValores: {
      supCronicas: ['renal'],
    },
    recomendadoPor: {
      q_energia:      ['si'],
      q_recuperacion: ['mucho'],
      q_masa:         ['si', 'a_veces'],
    },
  },

  proteina_polvo: {
    id: 'proteina_polvo',
    nombre: 'Proteína en polvo (Whey)',
    icono: '🥛',
    dosis: '20–40 g post-entreno · según déficit dietario',
    descripcionCorta: 'Apoya síntesis proteica y recuperación muscular cuando la dieta no alcanza el requerimiento.',
    fisiologia:
      'La proteína de suero (whey) tiene alto score de aminoácidos esenciales (DIAAS) y absorción rápida. Estimula mTOR y la síntesis proteica miofibrilar. Solo indicada cuando la ingesta dietaria no cubre 1.6-2.2 g/kg/día.',
    evidencia: 'A',
    color: 'bg-purple-50 border-purple-300 text-purple-900',
    contraIndicaEn: ['supCronicas'],
    contraIndicaValores: {
      supCronicas: ['renal', 'hepatica'],
    },
    recomendadoPor: {
      q_recuperacion: ['mucho', 'algo'],
      q_masa:         ['si', 'a_veces'],
    },
  },

  magnesio_triptofano: {
    id: 'magnesio_triptofano',
    nombre: 'Magnesio + L-Triptófano',
    icono: '😴',
    dosis: '300 mg magnesio + 500 mg triptófano · antes de dormir',
    descripcionCorta: 'Mejora la calidad del sueño sin generar dependencia ni habituación.',
    fisiologia:
      'El magnesio activa receptores GABA reduciendo la excitabilidad neuronal. El triptófano es precursor de serotonina y melatonina, regulando el ciclo circadiano. La combinación es especialmente eficaz en deportistas con alta carga de entrenamiento.',
    evidencia: 'B',
    color: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    contraIndicaEn: ['supMedic'],
    contraIndicaValores: {
      supMedic: ['si'],  // posible interacción con ISRS/IMAO — nota precautoria
    },
    recomendadoPor: {
      q_sueno: ['mal', 'regular'],
    },
  },

  magnesio: {
    id: 'magnesio',
    nombre: 'Magnesio (glicinato o citrato)',
    icono: '⚡',
    dosis: '300–400 mg/día · preferir glicinato o citrato',
    descripcionCorta: 'Reduce calambres y apoya la función muscular y neuromuscular.',
    fisiologia:
      'Cofactor de más de 300 enzimas, incluyendo las de producción de ATP. Regula la contracción muscular (antagonista del calcio a nivel de canal). El déficit subclínico es frecuente en deportistas que sudan mucho.',
    evidencia: 'B',
    color: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    contraIndicaEn: [],
    contraIndicaValores: {},
    recomendadoPor: {
      q_calambres:    ['si', 'a_veces'],
      q_recuperacion: ['mucho'],
    },
  },

  omega3: {
    id: 'omega3',
    nombre: 'Omega-3 EPA + DHA',
    icono: '🐟',
    dosis: '2–4 g EPA+DHA/día · con comidas principales',
    descripcionCorta: 'Antiinflamatorio natural. Reduce daño muscular y apoya la salud articular.',
    fisiologia:
      'EPA y DHA compiten con el ácido araquidónico en la cascada inflamatoria, produciendo resolvinas y protectinas con menor potencia inflamatoria. Reduce marcadores de DOMS y apoya la función articular en deportistas.',
    evidencia: 'B',
    color: 'bg-cyan-50 border-cyan-300 text-cyan-900',
    contraIndicaEn: ['supCronicas', 'supMedic'],
    contraIndicaValores: {
      supCronicas: ['cardiovascular'],  // anticoagulante — nota precautoria
    },
    recomendadoPor: {
      q_recuperacion:  ['mucho'],
      q_articulaciones: ['si', 'a_veces'],
    },
  },

  colageno: {
    id: 'colageno',
    nombre: 'Colágeno hidrolizado',
    icono: '🦴',
    dosis: '10–15 g/día · con vitamina C · 30-60 min antes de actividad',
    descripcionCorta: 'Apoya la síntesis de tejido conectivo y puede reducir el dolor articular.',
    fisiologia:
      'El colágeno hidrolizado aporta prolina, hidroxiprolina y glicina, aminoácidos clave para la síntesis de colágeno en tendones y cartílagos. La vitamina C es cofactor indispensable en la hidroxilación del colágeno.',
    evidencia: 'B',
    color: 'bg-orange-50 border-orange-300 text-orange-900',
    contraIndicaEn: [],
    contraIndicaValores: {},
    recomendadoPor: {
      q_articulaciones: ['si'],
    },
  },

  probiotico: {
    id: 'probiotico',
    nombre: 'Probióticos',
    icono: '🦠',
    dosis: '≥10⁹ UFC/día · cepas Lactobacillus + Bifidobacterium',
    descripcionCorta: 'Modulan la microbiota intestinal y mejoran el tránsito digestivo.',
    fisiologia:
      'Los probióticos compiten con bacterias patógenas y refuerzan la barrera intestinal. Producen ácidos grasos de cadena corta que nutren el epitelio colónico. La evidencia es cepa-específica; las más estudiadas son L. rhamnosus GG y B. longum.',
    evidencia: 'B',
    color: 'bg-teal-50 border-teal-300 text-teal-900',
    contraIndicaEn: [],
    contraIndicaValores: {},
    recomendadoPor: {
      q_digestivo_externo: ['si', 'a_veces'],  // viene del step 3 digHinchazon
    },
  },
}

// ─── Evidencia labels ─────────────────────────────────────────────────────────

export const EVIDENCIA_LABELS: Record<'A' | 'B' | 'C', string> = {
  A: 'Evidencia Nivel A — muy sólida',
  B: 'Evidencia Nivel B — moderada-buena',
  C: 'Evidencia Nivel C — preliminar',
}

export const EVIDENCIA_COLORS: Record<'A' | 'B' | 'C', string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-yellow-100 text-yellow-800',
  C: 'bg-gray-100 text-gray-600',
}

// ─── Motor de recomendación ───────────────────────────────────────────────────

export interface SuplemRecomendacion {
  suplemento: DefinicionSuplemento
  razon: string[]                    // por qué está indicado
  contraindicado: boolean
  notaSeguridad?: string             // si hay contraindicación
}

export function calcularRecomendaciones(
  respuestas: Record<string, RespuestaQ>,
  form: Partial<FormData>
): SuplemRecomendacion[] {
  const recomendados = new Map<string, string[]>()

  // Incluir hinchazón del step 3 como señal para probiótico
  if (form.digHinchazon === 'frecuente' || form.digHinchazon === 'diaria') {
    respuestas = { ...respuestas, q_digestivo_externo: 'si' }
  } else if (form.digHinchazon === 'ocasional') {
    respuestas = { ...respuestas, q_digestivo_externo: 'a_veces' }
  }

  // Recorrer cada suplemento y ver si alguna pregunta lo recomienda
  for (const [supId, supDef] of Object.entries(SUPLEMENTOS)) {
    const razonesEsteSupl: string[] = []

    for (const [pregId, valoresRecomendados] of Object.entries(supDef.recomendadoPor)) {
      const respuestaUsuario = respuestas[pregId]
      if (respuestaUsuario && (valoresRecomendados as string[]).includes(respuestaUsuario)) {
        const pregunta = PREGUNTAS_SUP.find(p => p.id === pregId)
        if (pregunta) {
          razonesEsteSupl.push(pregunta.area)
        } else if (pregId === 'q_digestivo_externo') {
          razonesEsteSupl.push('Salud digestiva')
        }
      }
    }

    if (razonesEsteSupl.length > 0) {
      recomendados.set(supId, razonesEsteSupl)
    }
  }

  // Construir resultados con check de contraindicaciones
  const resultado: SuplemRecomendacion[] = []

  for (const [supId, razones] of recomendados.entries()) {
    const sup = SUPLEMENTOS[supId]
    let contraindicado = false
    let notaSeguridad: string | undefined

    // Verificar contraindicaciones contra datos del formulario
    for (const campo of sup.contraIndicaEn) {
      const valoresContra = sup.contraIndicaValores[campo] ?? []
      const valorForm = form[campo as keyof FormData]

      if (campo === 'supCronicas') {
        const cronicas = (form.supCronicas ?? []) as string[]
        const conflicto = valoresContra.filter(v => cronicas.includes(v))
        if (conflicto.length > 0) {
          contraindicado = true
          notaSeguridad = `Posible contraindicación: ${conflicto.join(', ')}. Consultar con médico antes de indicar.`
        }
      } else if (campo === 'supEmbarazo' && valoresContra.includes(valorForm as string)) {
        contraindicado = true
        notaSeguridad = `No recomendado en ${valorForm}. Requiere evaluación médica.`
      } else if (campo === 'supMedic' && valorForm === 'si') {
        if (sup.id === 'magnesio_triptofano') {
          notaSeguridad = 'Verificar interacción si usa ISRS, IMAO u otros psicotrópicos.'
        } else if (sup.id === 'omega3') {
          notaSeguridad = 'Verificar interacción con anticoagulantes (acenocoumarol, heparina).'
        }
      }
    }

    resultado.push({ suplemento: sup, razon: razones, contraindicado, notaSeguridad })
  }

  // Orden: contraindicados al final, luego por evidencia A > B > C
  const evidenciaOrder = { A: 0, B: 1, C: 2 }
  resultado.sort((a, b) => {
    if (a.contraindicado !== b.contraindicado) return a.contraindicado ? 1 : -1
    return evidenciaOrder[a.suplemento.evidencia] - evidenciaOrder[b.suplemento.evidencia]
  })

  return resultado
}
