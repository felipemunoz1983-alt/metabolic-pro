/**
 * quesoMatcher.ts — Ranking de quesos según perfil clínico del paciente.
 *
 * 8 opciones del catálogo QUESO_TIPOS — ranking basado en:
 *   - Intolerancia a lactosa (3 quesos sin lactosa: surlat, chanco, quesillo_zerolacto)
 *   - Objetivo (déficit → bajo en kcal · hipertrofia → alta proteína)
 *   - Sodio (HTA inferida desde reflujo frecuente o SIBO)
 *   - Tendencia vegetariana (todos los quesos son lacto-vegetarianos)
 *
 * Patrón idéntico a yogurMatcher.ts + wheyMatcher (consistencia).
 */

import { QUESO_TIPOS, type QuesoTipo } from './foods'
import type { FormData } from './nutrition'

export type QuesoUso =
  | 'sin_lactosa'
  | 'apto_hta'
  | 'deficit'
  | 'alta_proteina'
  | 'sabor_tradicional'
  | 'premium'

export const QUESO_USO_LABELS: Record<QuesoUso, { label: string; emoji: string }> = {
  sin_lactosa:        { label: 'Sin lactosa',        emoji: '✅' },
  apto_hta:           { label: 'Bajo en sodio',      emoji: '💚' },
  deficit:            { label: 'Bajo en kcal',       emoji: '🥬' },
  alta_proteina:      { label: 'Alta proteína',      emoji: '💪' },
  sabor_tradicional:  { label: 'Sabor tradicional',  emoji: '🇨🇱' },
  premium:            { label: 'Premium',            emoji: '👑' },
}

/** Devuelve los tags relevantes para un queso según su perfil nutricional. */
export function tagsDeQueso(tipo: QuesoTipo): QuesoUso[] {
  const q = QUESO_TIPOS[tipo]
  const tags: QuesoUso[] = []
  if (!q.contiene.includes('lactosa')) tags.push('sin_lactosa')
  if (q.sodioMg <= 150) tags.push('apto_hta')
  if (q.kcal <= 65)     tags.push('deficit')
  if (q.p >= 8)         tags.push('alta_proteina')
  if (tipo === 'gauda' || tipo === 'mantecoso' || tipo === 'parcelas_chanco') {
    tags.push('sabor_tradicional')
  }
  if (tipo === 'parcelas_chanco') tags.push('premium')
  return tags
}

/** Score 0-100 de idoneidad por queso según perfil clínico. >=50 = recomendable. */
export function scoreQueso(tipo: QuesoTipo, form: Partial<FormData>): number {
  const q = QUESO_TIPOS[tipo]
  let s = 50

  // Tendencia vegana: todos los quesos del catálogo son lácteos (no veganos)
  if (form.tendencia === 'vegano') {
    return 0
  }

  const intol = form.digIntolerancias ?? []
  const tieneLactosa = intol.includes('lactosa')
  const sibo = form.digDiag === 'si_sibo' || form.digDiag === 'si_sii'

  // Reglas duras
  if (tieneLactosa && q.contiene.includes('lactosa')) s -= 50  // hunde con lactosa
  if (sibo && q.contiene.includes('lactosa'))         s -= 25  // SIBO + lactosa = mal

  // Bonificaciones por objetivo
  if (form.objetivo === 'perdida grasa') {
    // Premia bajo kcal + bajo grasa, sin penalizar proteína
    if (q.kcal <= 65) s += 25
    else if (q.kcal <= 85) s += 10
    else if (q.kcal > 100) s -= 10
  }
  if (form.objetivo === 'hipertrofia') {
    // Premia alta proteína sin importar grasa
    if (q.p >= 8) s += 20
    else if (q.p < 5) s -= 15
  }

  // Bonificaciones por restricciones
  if (tieneLactosa && !q.contiene.includes('lactosa')) s += 25
  if (sibo && !q.contiene.includes('lactosa'))         s += 15

  // Sodio (proxy HTA): bonifica los bajos en sodio si hay diagnóstico digestivo
  if ((sibo || tieneLactosa) && q.sodioMg <= 150) s += 8

  return Math.max(0, Math.min(100, Math.round(s)))
}

/** Ranking ordenado por score descendente. `topPick: true` para el ganador
 *  cuando el score es >=55 (empate técnico). */
export function rankQuesosParaPaciente(form: Partial<FormData>): Array<{
  tipo: QuesoTipo
  score: number
  tags: QuesoUso[]
  topPick: boolean
}> {
  const ranked = (Object.keys(QUESO_TIPOS) as QuesoTipo[])
    .map(tipo => ({
      tipo,
      score:   scoreQueso(tipo, form),
      tags:    tagsDeQueso(tipo),
      topPick: false,
    }))
    .sort((a, b) => b.score - a.score)
  if (ranked.length > 0) {
    const max = ranked[0].score
    ranked.forEach(r => { r.topPick = r.score >= max - 5 && r.score >= 55 })
  }
  return ranked
}

/** Razón humana corta para el top pick — qué pesó más en la decisión. */
export function razonTopQueso(tipo: QuesoTipo, form: Partial<FormData>): string {
  const q = QUESO_TIPOS[tipo]
  const partes: string[] = []
  const intol = form.digIntolerancias ?? []
  const sibo  = form.digDiag === 'si_sibo' || form.digDiag === 'si_sii'

  if ((intol.includes('lactosa') || sibo) && !q.contiene.includes('lactosa')) {
    partes.push('sin lactosa — apto para tu intolerancia')
  }
  if (form.objetivo === 'perdida grasa' && q.kcal <= 65) {
    partes.push(`solo ${q.kcal} kcal/30g — ideal déficit estricto`)
  }
  if (form.objetivo === 'hipertrofia' && q.p >= 8) {
    partes.push(`${q.p}g de proteína por 30g — el más proteico de tu perfil`)
  }
  if (q.sodioMg <= 100) {
    partes.push(`solo ${q.sodioMg}mg sodio (-71% vs gauda)`)
  }
  if (partes.length === 0) {
    return `${q.kcal} kcal · ${q.p}g prot · ${q.sodioMg}mg sodio por 30g`
  }
  return partes.join(' · ')
}
