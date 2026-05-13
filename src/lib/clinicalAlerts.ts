// ── Módulo de alertas clínicas · Centro Metabólico Pro ──
// Referencias: Monash low-FODMAP, ESPEN SII/SIBO, NICE NG61, KDIGO 2024,
// ACOG embarazo, ESC HTA, AND/ADA diabetes, Child-Pugh + EASL hepático.

import type { FormData } from './nutrition'

export interface ClinicalAlert {
  nivel: 'alta' | 'media' | 'baja' | 'info'
  origen: 'digestivo' | 'suplementacion'
  texto: string
}

export interface ClinicalProfile {
  alertasProfesional: ClinicalAlert[]
  notaPaciente: string
  severidadDigestiva: 'ninguna' | 'leve' | 'moderada' | 'severa'
  riesgoSupl: 'ninguno' | 'medio' | 'alto'
  ajustesAplicados: string[]
}

// ─── Módulo digestivo ──────────────────────────────────────────────────────────
function calcSeveridadDigestiva(form: Partial<FormData>): ClinicalProfile['severidadDigestiva'] {
  const { digHinchazon, digDiag, digIntolerancias = [], digReflujo, digRitmo } = form
  if (digDiag === 'si_sibo' || digDiag === 'sospecha' || digHinchazon === 'diaria' || digIntolerancias.length >= 3)
    return 'severa'
  if (digDiag === 'si_sii' || digHinchazon === 'frecuente' || digIntolerancias.length >= 1)
    return 'moderada'
  if (digHinchazon === 'ocasional' || (digReflujo && digReflujo !== 'nunca') || (digRitmo && digRitmo !== 'normal'))
    return 'leve'
  return 'ninguna'
}

function alertasDigestivas(form: Partial<FormData>): ClinicalAlert[] {
  const alertas: ClinicalAlert[] = []
  const { digHinchazon, digReflujo, digRitmo, digDiag, digIntolerancias = [] } = form

  if (digDiag === 'si_sibo')
    alertas.push({ nivel: 'alta', origen: 'digestivo', texto: 'Paciente refiere SIBO diagnosticado. Plan generado en low-FODMAP (Monash). Evaluar test de hidrógeno espirado si no fue realizado.' })
  if (digDiag === 'sospecha')
    alertas.push({ nivel: 'media', origen: 'digestivo', texto: 'Sospecha de SIBO no confirmada. Plan precautorio low-FODMAP. Sugerir test de hidrógeno espirado.' })
  if (digDiag === 'si_sii')
    alertas.push({ nivel: 'media', origen: 'digestivo', texto: 'SII / colon irritable declarado. Plan ajustado con baja carga fermentable. Revisar tolerancia individual.' })
  if (digHinchazon === 'diaria')
    alertas.push({ nivel: 'alta', origen: 'digestivo', texto: 'Hinchazón abdominal diaria reportada. Evaluar derivación a gastroenterología. Posible disbiosis, SIBO o intolerancia no declarada.' })
  if (digReflujo === 'frecuente')
    alertas.push({ nivel: 'media', origen: 'digestivo', texto: 'Reflujo frecuente. Plan excluye irritantes (grasas, chocolate, cítricos nocturnos). Revisar timing de cena: mínimo 3h antes de dormir.' })
  if (digRitmo === 'diarrea')
    alertas.push({ nivel: 'alta', origen: 'digestivo', texto: 'Diarrea habitual reportada. Plan bajo en fibra insoluble. Revisar hidratación y electrolitos. Descartar causa infecciosa o inflamatoria.' })
  if (digRitmo === 'alternado')
    alertas.push({ nivel: 'media', origen: 'digestivo', texto: 'Ritmo intestinal alternado (constipación/diarrea). Compatible con SII. Plan moderado en fibra soluble.' })
  if (digIntolerancias.includes('lactosa'))
    alertas.push({ nivel: 'info', origen: 'digestivo', texto: 'Intolerancia a lactosa declarada. Plan evita ricotta, cottage y queso laminado. Verificar tolerancia a yogur fermentado (menor contenido de lactosa).' })
  if (digIntolerancias.includes('gluten'))
    alertas.push({ nivel: 'info', origen: 'digestivo', texto: 'Intolerancia a gluten/trigo declarada. Plan excluye pan molde, pasta y avena. Verificar si hay celiaquía confirmada para mayor rigurosidad.' })
  if (digIntolerancias.includes('fodmap'))
    alertas.push({ nivel: 'info', origen: 'digestivo', texto: 'Sensibilidad a FODMAPs declarada. Plan evita miel, frutos secos en exceso, manzana y pera. Aplicar protocolo Monash de reintroducción gradual.' })
  if (digIntolerancias.length >= 3)
    alertas.push({ nivel: 'media', origen: 'digestivo', texto: `Múltiples intolerancias percibidas (${digIntolerancias.length}). Confirmar si son clínicamente verificadas o restrictivas. El exceso de exclusiones puede comprometer la adherencia y la nutrición.` })

  return alertas
}

// ─── Módulo suplementación ─────────────────────────────────────────────────────
function calcRiesgoSupl(form: Partial<FormData>): ClinicalProfile['riesgoSupl'] {
  const { supCronicas = [], supEmbarazo, supMedic } = form
  if (supCronicas.includes('renal') || supCronicas.includes('hepatica') || supEmbarazo === 'embarazo')
    return 'alto'
  if (supCronicas.filter(c => c !== 'ninguna').length > 0 || supEmbarazo !== 'no' || supMedic === 'si')
    return 'medio'
  return 'ninguno'
}

function alertasSupl(form: Partial<FormData>): ClinicalAlert[] {
  const alertas: ClinicalAlert[] = []
  const { supEmbarazo, supCronicas = [], supMedic, supMedicDetalle, supActuales } = form
  const cronicas = supCronicas.filter(c => c !== 'ninguna')

  if (supEmbarazo === 'embarazo')
    alertas.push({ nivel: 'alta', origen: 'suplementacion', texto: 'Paciente embarazada. Plan precautorio: excluye whey concentrado + barras proteicas no validadas. Confirmar todo suplemento con obstetra. Verificar ácido fólico 400–800µg/día, hierro y yodo.' })
  if (supEmbarazo === 'lactancia')
    alertas.push({ nivel: 'media', origen: 'suplementacion', texto: 'Lactancia activa: cafeína máx 200mg/día. Whey con supervisión profesional. Considerar continuidad de prenatales con vitamina D y omega-3.' })
  if (supEmbarazo === 'planificando')
    alertas.push({ nivel: 'baja', origen: 'suplementacion', texto: 'Planificando embarazo: iniciar ácido fólico 400–800µg/día (CDC) al menos 1 mes antes de la concepción.' })
  if (cronicas.includes('renal'))
    alertas.push({ nivel: 'alta', origen: 'suplementacion', texto: 'Insuficiencia renal / ERC: plan excluye whey y barras de alta carga proteica. Definir ingesta según estadio KDIGO (0.6–1.0 g/kg habitual). Precaución con magnesio y potasio extra.' })
  if (cronicas.includes('hepatica'))
    alertas.push({ nivel: 'alta', origen: 'suplementacion', texto: 'Insuficiencia hepática: precaución con BCAA aislados (riesgo de encefalopatía si Child-Pugh B/C). Carga proteica modulada por estadio. Evitar megadosis de vitamina A.' })
  if (cronicas.includes('cardiovascular'))
    alertas.push({ nivel: 'media', origen: 'suplementacion', texto: 'Condición cardiovascular: evitar termogénicos y cafeína >200mg/día. Si toma anticoagulantes, coordinar omega-3 (efecto aditivo) y vitamina K (interacción warfarina).' })
  if (cronicas.includes('diabetes'))
    alertas.push({ nivel: 'media', origen: 'suplementacion', texto: 'Diabetes: revisar timing de carbohidratos y suplementos con azúcares ocultos. Coordinar con endocrinólogo si hay ajuste de hipoglicemiantes.' })
  if (cronicas.includes('hipertiroidismo'))
    alertas.push({ nivel: 'media', origen: 'suplementacion', texto: 'Hipertiroidismo: evitar yodo en dosis altas, termogénicos y cafeína >200mg/día.' })
  if (supMedic === 'si' && supMedicDetalle?.trim())
    alertas.push({ nivel: 'info', origen: 'suplementacion', texto: `Medicamentos declarados: "${supMedicDetalle}". Revisar interacciones antes de prescribir suplementos.` })
  if (supActuales?.trim())
    alertas.push({ nivel: 'info', origen: 'suplementacion', texto: `Suplementos actuales: "${supActuales}". Evaluar duplicidad de dosis y posibles combinaciones.` })

  return alertas
}

// ─── Nota para el paciente ─────────────────────────────────────────────────────
function buildNotaPaciente(form: Partial<FormData>): string {
  const ajustes: string[] = []
  const { digIntolerancias = [], digDiag, digReflujo, digRitmo,
          supEmbarazo, supCronicas = [] } = form
  const cronicas = supCronicas.filter(c => c !== 'ninguna')

  if (digIntolerancias.includes('lactosa'))    ajustes.push('sin lácteos altos en lactosa')
  if (digIntolerancias.includes('gluten'))     ajustes.push('sin gluten')
  if (digIntolerancias.includes('legumbres'))  ajustes.push('sin legumbres')
  if (digDiag === 'si_sibo' || digDiag === 'sospecha') ajustes.push('bajo en FODMAPs')
  if (digReflujo === 'frecuente')              ajustes.push('apto para reflujo')
  if (digRitmo === 'diarrea')                  ajustes.push('bajo en fibra insoluble')
  if (supEmbarazo === 'embarazo')              ajustes.push('apto para embarazo')
  if (supEmbarazo === 'lactancia')             ajustes.push('apto para lactancia')
  if (cronicas.includes('renal'))              ajustes.push('apto para condición renal')
  if (cronicas.includes('cardiovascular'))     ajustes.push('sin estimulantes cardiovasculares')

  if (ajustes.length === 0) return ''
  return `Tu plan se ajustó automáticamente: ${ajustes.join(' · ')}. Cualquier suplemento adicional debe ser revisado por tu profesional tratante.`
}

// ─── Función principal exportada ───────────────────────────────────────────────
export function generarPerfilClinico(form: Partial<FormData>): ClinicalProfile {
  const alertasD = alertasDigestivas(form)
  const alertasS = alertasSupl(form)
  const severidadDigestiva = calcSeveridadDigestiva(form)
  const riesgoSupl = calcRiesgoSupl(form)

  const ajustesAplicados: string[] = []
  const { digIntolerancias = [], digDiag, digReflujo, digRitmo } = form
  if (digIntolerancias.includes('lactosa'))   ajustesAplicados.push('Sin lácteos altos en lactosa')
  if (digIntolerancias.includes('gluten'))    ajustesAplicados.push('Sin gluten')
  if (digIntolerancias.includes('legumbres')) ajustesAplicados.push('Sin legumbres')
  if (digDiag === 'si_sibo' || digDiag === 'sospecha') ajustesAplicados.push('Low-FODMAP')
  if (digReflujo === 'frecuente')             ajustesAplicados.push('Apto reflujo')
  if (digRitmo === 'diarrea')                 ajustesAplicados.push('Bajo en fibra insoluble')

  return {
    alertasProfesional: [...alertasD, ...alertasS],
    notaPaciente: buildNotaPaciente(form),
    severidadDigestiva,
    riesgoSupl,
    ajustesAplicados,
  }
}
