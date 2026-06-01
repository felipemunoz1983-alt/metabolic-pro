/**
 * yogurMatcher.ts — Recomendación personalizada de yogur según perfil del paciente.
 *
 * Función principal: rankYoguresParaPaciente(form) → array ordenado por idoneidad
 * para el objetivo + restricciones digestivas + tendencia (omnívoro/vegetariano/vegano).
 *
 * También devuelve "tags" educativos por yogur (alto en proteína, ideal pre-entreno,
 * bajo en lactosa, etc.) basados en su composición nutricional.
 *
 * Reglas clínicas implementadas:
 *  - Déficit / pérdida grasa: priorizar alta proteína + baja kcal + baja grasa
 *    (saciedad sin agregar mucho al pool calórico).
 *  - Hipertrofia / superávit: priorizar alta proteína absoluta (≥15g) + densidad
 *    calórica suficiente para no llenarse antes de hora.
 *  - Pre-entreno: necesita ≥10g CH disponible para reservas de glucógeno.
 *  - Post-entreno: priorizar absorción rápida (sin lactosa = digestión más rápida)
 *    + ≥10g proteína para síntesis miofibrilar (ventana anabólica).
 *  - Vegano: solo Loncoleche Vegetal Soya.
 *  - SIBO/SII: evitar lactosa (alto FODMAP).
 */

import { YOGUR_TIPOS, type YogurTipo } from './foods'
import type { FormData } from './nutrition'

export type YogurUso =
  | 'pre_entreno'
  | 'post_entreno'
  | 'colacion_general'
  | 'desayuno'
  | 'cena_ligera'
  | 'snack_proteico'
  | 'apto_vegano'
  | 'sin_lactosa'
  | 'hipoalergenico'
  | 'clasico'

export const USO_LABELS: Record<YogurUso, { label: string; emoji: string; tono: 'amber' | 'cyan' | 'green' | 'rose' | 'violet' }> = {
  pre_entreno:      { label: 'Pre-entreno',         emoji: '⚡', tono: 'amber' },
  post_entreno:     { label: 'Post-entreno',        emoji: '🏋️', tono: 'violet' },
  colacion_general: { label: 'Colación equilibrada', emoji: '☕', tono: 'cyan' },
  desayuno:         { label: 'Desayuno',            emoji: '☀️', tono: 'amber' },
  cena_ligera:      { label: 'Cena ligera',         emoji: '🌙', tono: 'cyan' },
  snack_proteico:   { label: 'Snack proteico',      emoji: '💪', tono: 'violet' },
  apto_vegano:      { label: 'Apto vegano',         emoji: '🌱', tono: 'green' },
  sin_lactosa:      { label: 'Sin lactosa',         emoji: '✅', tono: 'green' },
  hipoalergenico:   { label: 'Hipoalergénico',      emoji: '🛡️', tono: 'green' },
  clasico:          { label: 'Clásico endulzado',   emoji: '🥄', tono: 'rose' },
}

/** Devuelve los usos recomendados de un yogur según su composición nutricional.
 *  Heurísticas basadas en macros por porción + alérgenos declarados. */
export function tagsDeYogur(tipo: YogurTipo): YogurUso[] {
  const y = YOGUR_TIPOS[tipo]
  const tags: YogurUso[] = []

  // Sin lactosa: badge explícito en la mayoría de los protein
  const sinLactosa = !y.contiene.includes('lactosa')
  if (sinLactosa) tags.push('sin_lactosa')

  // Vegano
  if (y.vegano) tags.push('apto_vegano')

  // Hipoalergénico: ningún alérgeno declarado
  if (y.contiene.length === 0) tags.push('hipoalergenico')

  // Pre-entreno: ≥10g CH disponibles
  if (y.c >= 10) tags.push('pre_entreno')

  // Post-entreno: ≥10g proteína + idealmente sin lactosa (absorción más rápida)
  if (y.p >= 10) tags.push('post_entreno')

  // Snack proteico (alta proteína absoluta)
  if (y.p >= 15) tags.push('snack_proteico')

  // Cena ligera: alta proteína (saciedad) + baja densidad calórica + baja grasa
  if (y.p >= 10 && y.kcal <= 115 && y.g <= 3) tags.push('cena_ligera')

  // Desayuno: equilibrio CH + proteína (≥8g prot, ≥8g CH)
  if (y.p >= 8 && y.c >= 8) tags.push('desayuno')

  // Colación general (cae bien casi todos los protein)
  if (y.p >= 5) tags.push('colacion_general')

  // Clásico: si tiene perfil low-protein-but-balanced (Danone Oikos endulzado)
  if (y.p < 8 && y.g >= 3 && !y.vegano) tags.push('clasico')

  return tags
}

/** Score de idoneidad 0-100 para el perfil del paciente. Mayor = más recomendado.
 *  No es ranking absoluto — es match con SUS condiciones. */
export function scoreYogur(tipo: YogurTipo, form: Partial<FormData>): number {
  const y = YOGUR_TIPOS[tipo]
  let score = 50  // baseline

  // ── Objetivo del paciente ──
  if (form.objetivo === 'perdida grasa') {
    // Premia: alta proteína + baja kcal + baja grasa
    score += Math.min(y.p * 2, 30)                    // hasta +30 por proteína
    score -= Math.max(0, (y.kcal - 100) * 0.3)        // penaliza kcal sobre 100
    score -= Math.max(0, (y.g - 2) * 3)               // penaliza grasa sobre 2g
  } else if (form.objetivo === 'hipertrofia') {
    // Premia: proteína absoluta alta + densidad calórica decente
    score += Math.min(y.p * 2.5, 40)
    score += Math.min((y.kcal - 80) * 0.2, 15)        // hasta +15 si tiene kcal suficientes
  } else {
    // Mantenimiento: equilibrio (no penaliza tanto la grasa)
    score += Math.min(y.p * 1.8, 25)
  }

  // ── Tendencia alimentaria ──
  const tendencia = form.tendencia ?? 'omnivoro'
  if (tendencia === 'vegano') {
    // Si paciente vegano, solo el vegano es válido — el resto a la basura
    return y.vegano ? 100 : 0
  }
  if (tendencia === 'vegetariano' && !y.vegetariano) {
    return 0
  }

  // ── Restricciones digestivas ──
  const intol = form.digIntolerancias ?? []
  if (intol.some(i => y.contiene.includes(i))) {
    score -= 40  // intolerancia directa: hundir el score (no eliminar — el paciente decide)
  }

  // SIBO/SII: penalizar fuerte cualquier yogur con lactosa
  const sibo = form.digDiag === 'si_sibo' || form.digDiag === 'si_sii'
  if (sibo && y.contiene.includes('lactosa')) score -= 25

  // ── Hipoalergénico bonus ──
  if (y.contiene.length === 0) score += 10

  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Devuelve los yogures ordenados por score descendente para el perfil del paciente.
 *  Cada item incluye su score + tags + flag "topPick". */
export function rankYoguresParaPaciente(form: Partial<FormData>): Array<{
  tipo: YogurTipo
  score: number
  tags: YogurUso[]
  topPick: boolean
}> {
  const ranked = (Object.keys(YOGUR_TIPOS) as YogurTipo[])
    .map(tipo => ({
      tipo,
      score: scoreYogur(tipo, form),
      tags:  tagsDeYogur(tipo),
      topPick: false,
    }))
    .sort((a, b) => b.score - a.score)

  // Marcar como topPick los que tengan score >= max - 5 (rango de empate técnico)
  if (ranked.length > 0) {
    const maxScore = ranked[0].score
    ranked.forEach(r => { r.topPick = r.score >= maxScore - 5 && r.score >= 50 })
  }
  return ranked
}

/** Razón humana corta para el top pick — qué pesó más en la decisión.
 *  Usado en la UI para que el paciente entienda POR QUÉ se lo sugerimos. */
export function razonTopPick(tipo: YogurTipo, form: Partial<FormData>): string {
  const y = YOGUR_TIPOS[tipo]
  const partes: string[] = []
  if (form.objetivo === 'perdida grasa' && y.p >= 10 && y.kcal <= 120) {
    partes.push(`alta proteína (${y.p}g) con solo ${y.kcal} kcal — saciedad sin sumar grasa`)
  } else if (form.objetivo === 'hipertrofia' && y.p >= 15) {
    partes.push(`${y.p}g de proteína por porción — la más alta del catálogo para tu objetivo`)
  }
  if (form.tendencia === 'vegano' && y.vegano) {
    partes.push('única opción vegana del catálogo')
  }
  const intol = form.digIntolerancias ?? []
  const sibo  = form.digDiag === 'si_sibo' || form.digDiag === 'si_sii'
  if ((sibo || intol.includes('lactosa')) && !y.contiene.includes('lactosa')) {
    partes.push('sin lactosa, mejor tolerancia digestiva')
  }
  if (y.contiene.length === 0) {
    partes.push('hipoalergénico (libre de 9 alérgenos comunes)')
  }
  if (partes.length === 0) {
    return `${y.p}g proteína · ${y.kcal} kcal por porción`
  }
  return partes.join(' · ')
}
