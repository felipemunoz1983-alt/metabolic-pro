'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  distribuirEnPorciones,
  distribuirPiramidePorTiempos,
  aplicarOverridePorciones,
  mapearPiramideAGruposBasicos,
  INTERCAMBIOS,
  GRUPO_PORCION_LABELS,
  PIRAMIDE_INFO,
  GRUPOS_PIRAMIDE_ORDEN,
  MACROS_POR_GRUPO,
  TIEMPO_COMIDA_PORCION_LABELS,
  type GrupoPorcion,
  type GrupoPiramide,
  type MetaGrupoPiramide,
  type DistribucionPorciones,
  type DistribucionPiramide,
  type TiempoComidaPorcion,
} from '@/lib/porciones'
import type { FormData, NutritionResult } from '@/lib/nutrition'
import { cn } from '@/lib/utils'
import { PiramidePlan } from './PiramidePlan'
import { GuiaIntercambiosClinica } from './GuiaIntercambiosClinica'

interface Props {
  result: NutritionResult
  form: FormData
}

/**
 * Plan por porciones (intercambios alimentarios chilenos).
 * Renderizado alternativo al plan por menús — muestra la distribución
 * en # de porciones por grupo + la lista de intercambios para cada uno.
 *
 * El paciente puede armar su propia comida intercambiando libremente
 * dentro de cada grupo.
 */
export function PorcionesPlan({ result, form }: Props) {
  // State local: cambios in-line del pro en la Piramide editable del Paso 2.
  // Se inicia en null = sin cambios in-line, usar overrides del form o auto.
  // Cuando PiramidePlan dispara onChange, queda aqui y se propaga al Paso 3
  // (feedback Maria Jose: del paso 2 al paso 3 no se reflejaban los cambios).
  const [piramideDistInline, setPiramideDistInline] = useState<DistribucionPiramide | null>(null)

  const distribucion = useMemo<DistribucionPorciones>(
    () => {
      // 1. Distribucion automatica desde target nutricional
      const auto = distribuirEnPorciones(
        result.kcal,
        result.macros.p,
        result.macros.c,
        result.macros.g,
        form.objetivo,
      )
      // 2. PRECEDENCIA de overrides (mayor a menor):
      //    a) piramideDistInline: cambios in-line del Paso 2 (PiramidePlan editable)
      //    b) form.porcionesOverridePiramide: 13 grupos del wizard pre-plan
      //    c) form.porcionesOverride: legacy 6 basicos
      //    d) auto: distribucion automatica desde target
      const inlineOverride = piramideDistInline ?? undefined
      const overrideEfectivo =
        mapearPiramideAGruposBasicos(inlineOverride)
        ?? mapearPiramideAGruposBasicos(form.porcionesOverridePiramide)
        ?? form.porcionesOverride
      return aplicarOverridePorciones(auto, overrideEfectivo, {
        kcal: result.kcal,
        p:    result.macros.p,
        c:    result.macros.c,
        g:    result.macros.g,
      })
    },
    [result, form.objetivo, form.porcionesOverride, form.porcionesOverridePiramide, piramideDistInline],
  )

  // Nota: distribuirPorTiemposDeComida(6 grupos) ya no se usa — el Paso 3
  // ahora distribuye los 13 grupos directamente con distribuirPiramidePorTiempos.

  const grupos: GrupoPorcion[] = ['lacteos', 'frutas', 'verduras', 'cereales', 'proteinas', 'grasas']

  // ── Matriz editable de distribución por tiempos · 13 grupos de Pirámide ──
  // Feedback Maria Jose (iteracion 2): el Paso 3 mostraba solo 6 meta-grupos.
  // Ahora indexa por los 13 subtipos de la Piramide Chilena para que el pro
  // pueda decidir, por ejemplo, "1 lácteo bajo grasa en desayuno + 0.5 alto
  // grasa en once" en lugar de un único "lácteos: 1.5".
  // Estado: matriz [tiempo][grupoPiramide] = # porciones (pasos de 0.5).
  type MatrizTiempos = Record<TiempoComidaPorcion, Record<GrupoPiramide, number>>

  // Distribución total por grupo de pirámide (suma desde piramideDistInline,
  // override del wizard, o derivación auto desde la distribución de 6 grupos).
  const distPiramideTotal: Partial<Record<GrupoPiramide, number>> = useMemo(() => {
    if (piramideDistInline) return piramideDistInline
    if (form.porcionesOverridePiramide) return form.porcionesOverridePiramide
    // Si no hay override pirámide, derivamos desde los 6 básicos repartiendo
    // proporcionalmente con heurística clínica chilena:
    //   - Lácteos: 50% bajo, 30% medio, 20% alto (recomendación Sochinut: priorizar bajo grasa)
    //   - Carnes/proteínas: 40% bajo grasa, 20% alto grasa, 40% leguminosas (vegetal recomendado)
    //   - Verduras: 40% general, 60% libre consumo (foliar = la mayoría)
    //   - Grasas: 70% aceites, 30% alimentos ricos en lípidos
    //   - Cereales: 100% al único grupo
    //   - Frutas: 100% al único grupo
    return {
      cereales_leguminosas_frescas: distribucion.cereales,
      frutas:                       distribucion.frutas,
      verduras_general:             Math.round(distribucion.verduras * 0.4 * 2) / 2,
      verduras_libre:               Math.round(distribucion.verduras * 0.6 * 2) / 2,
      carnes_bajo_grasa:            Math.round(distribucion.proteinas * 0.4 * 2) / 2,
      carnes_alto_grasa:            Math.round(distribucion.proteinas * 0.2 * 2) / 2,
      leguminosas:                  Math.round(distribucion.proteinas * 0.4 * 2) / 2,
      lacteos_bajo_grasa:           Math.round(distribucion.lacteos * 0.5 * 2) / 2,
      lacteos_medio_grasa:          Math.round(distribucion.lacteos * 0.3 * 2) / 2,
      lacteos_alto_grasa:           Math.round(distribucion.lacteos * 0.2 * 2) / 2,
      aceites_grasas:               Math.round(distribucion.grasas * 0.7 * 2) / 2,
      alimentos_ricos_lipidos:      Math.round(distribucion.grasas * 0.3 * 2) / 2,
      azucar:                       0,
    }
  }, [piramideDistInline, form.porcionesOverridePiramide, distribucion])

  const matrizInicial = useMemo<MatrizTiempos>(
    () => distribuirPiramidePorTiempos(distPiramideTotal),
    [distPiramideTotal],
  )

  // Derived state pattern: si cambia matrizInicial, reseteamos.
  const [matriz, setMatriz] = useState<MatrizTiempos>(matrizInicial)
  const [lastInit, setLastInit] = useState<MatrizTiempos>(matrizInicial)
  if (lastInit !== matrizInicial) {
    setLastInit(matrizInicial)
    setMatriz(matrizInicial)
  }

  function setCelda(tiempo: TiempoComidaPorcion, grupo: GrupoPiramide, valor: number) {
    const v = Math.max(0, Math.round(valor * 2) / 2)  // pasos de 0.5
    setMatriz(m => ({ ...m, [tiempo]: { ...m[tiempo], [grupo]: v } }))
  }
  function resetMatriz() { setMatriz(matrizInicial) }

  // Totales asignados por subgrupo (suma de columna) y por meta-grupo
  const asignadoPorGrupoPiramide = useMemo(() => {
    const tot = {} as Record<GrupoPiramide, number>
    for (const g of GRUPOS_PIRAMIDE_ORDEN) tot[g] = 0
    for (const t of Object.values(matriz)) {
      for (const g of GRUPOS_PIRAMIDE_ORDEN) tot[g] += t[g] ?? 0
    }
    return tot
  }, [matriz])

  // Macros aportados por un tiempo (suma fila × PIRAMIDE_INFO macros)
  function macrosDeTiempo(tiempo: TiempoComidaPorcion): { kcal: number; p: number; c: number; g: number } {
    const fila = matriz[tiempo]
    const acc = { kcal: 0, p: 0, c: 0, g: 0 }
    for (const g of GRUPOS_PIRAMIDE_ORDEN) {
      const m = PIRAMIDE_INFO[g].macros
      const v = fila[g] ?? 0
      acc.kcal += v * m.kcal
      acc.p    += v * m.p
      acc.c    += v * m.c
      acc.g    += v * m.g
    }
    return { kcal: Math.round(acc.kcal), p: Math.round(acc.p), c: Math.round(acc.c), g: Math.round(acc.g) }
  }

  // Agrupacion visual de los 13 subtipos por meta-grupo (mismo orden que PorcionesEditor)
  const META_GRUPOS_PASO3: { meta: MetaGrupoPiramide; emoji: string; label: string }[] = [
    { meta: 'cereales', emoji: '🌾', label: 'Cereales' },
    { meta: 'verduras', emoji: '🥗', label: 'Verduras' },
    { meta: 'frutas',   emoji: '🍎', label: 'Frutas' },
    { meta: 'carnes',   emoji: '🍗', label: 'Proteínas' },
    { meta: 'lacteos',  emoji: '🥛', label: 'Lácteos' },
    { meta: 'grasas',   emoji: '🥑', label: 'Grasas' },
    { meta: 'azucar',   emoji: '🍬', label: 'Azúcar' },
  ]

  // Wizard secuencial de 4 pasos (flujo clínico: del cálculo abstracto al plato real).
  // Reemplaza el toggle independiente de 3 vistas que existía antes.
  //  Paso 1 · Requerimientos          → kcal + macros del paciente (objetivo + método)
  //  Paso 2 · Porciones de alimentos  → # porciones por grupo (resumen simple + pirámide 13 grupos)
  //  Paso 3 · Distribución por tiempos → cómo se reparten esas porciones en el día
  //  Paso 4 · Alimentos reales         → tabla de intercambios INTA con gramajes y ejemplos
  type Paso = 1 | 2 | 3 | 4
  const [paso, setPaso] = useState<Paso>(1)

  // Toggle de vista del desglose de macros en el Paso 1 (feedback Maria Jose):
  // "ver si quiero desglosar en gramos por kilo de peso o de manera porcentual".
  // 'gkg' = g/kg de peso corporal como numero principal · 'pct' = % de kcal como principal.
  const [vistaMacro, setVistaMacro] = useState<'gkg' | 'pct'>('gkg')
  const PASOS: { n: Paso; label: string; emoji: string }[] = [
    { n: 1, label: 'Requerimientos',            emoji: '🎯' },
    { n: 2, label: 'Porciones de alimentos',    emoji: '🥗' },
    { n: 3, label: 'Distribución por tiempos',  emoji: '🕐' },
    { n: 4, label: 'Alimentos reales',          emoji: '🍽️' },
  ]

  return (
    <div className="space-y-5">
      {/* Header con totales */}
      <div className="bg-gradient-to-br from-[#0C3547] to-[#0F1419] text-white rounded-2xl p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold mb-1">
          Plan por porciones · Intercambios
        </p>
        <h2 className="text-2xl font-black mb-4">Tu día en grupos de alimentos</h2>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Kcal</p>
            <p className="text-lg font-black">{distribucion.totales.kcal}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Prot</p>
            <p className="text-lg font-black text-violet-300">{distribucion.totales.p}g</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">CHO</p>
            <p className="text-lg font-black text-amber-300">{distribucion.totales.c}g</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Grasa</p>
            <p className="text-lg font-black text-rose-300">{distribucion.totales.g}g</p>
          </div>
        </div>
        {(Math.abs(distribucion.delta.kcal) > 50 || Math.abs(distribucion.delta.p) > 10) && (
          <p className="text-[10px] text-white/50 mt-3 italic">
            Δ vs target: {distribucion.delta.kcal > 0 ? '+' : ''}{distribucion.delta.kcal} kcal ·
            {' '}{distribucion.delta.p > 0 ? '+' : ''}{distribucion.delta.p}g P ·
            {' '}{distribucion.delta.c > 0 ? '+' : ''}{distribucion.delta.c}g C ·
            {' '}{distribucion.delta.g > 0 ? '+' : ''}{distribucion.delta.g}g G
            {' '}(redondeo a 0.5 porciones)
          </p>
        )}
      </div>

      {/* Stepper visual: 4 pasos numerados con progress + label.
          Click directo permitido para volver atrás SOLO a pasos ya recorridos
          (no saltar adelante — fuerza recorrer el flujo clínico). */}
      <div className="bg-white border border-[#D6E3ED] rounded-xl p-3">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          {PASOS.map((p, i) => {
            const activo  = paso === p.n
            const visitado = p.n < paso
            const futuro   = p.n > paso
            return (
              <div key={p.n} className="flex items-center flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => { if (!futuro) setPaso(p.n) }}
                  disabled={futuro}
                  className={cn(
                    'flex flex-col items-center gap-1 flex-1 min-w-0 px-1 sm:px-2 py-2 rounded-lg transition',
                    activo   && 'bg-[#0C3547] text-white shadow-sm',
                    visitado && 'text-[#29ABE2] hover:bg-[#F0F6FA] cursor-pointer',
                    futuro   && 'text-[#C7D4DE] cursor-not-allowed',
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0',
                    activo   && 'bg-white text-[#0C3547]',
                    visitado && 'bg-[#29ABE2] text-white',
                    futuro   && 'bg-[#F0F6FA] text-[#C7D4DE]',
                  )}>
                    {visitado ? '✓' : p.n}
                  </div>
                  <span className={cn(
                    'text-[9px] sm:text-[10px] font-bold leading-tight text-center line-clamp-2',
                    activo ? 'text-white' : '',
                  )}>
                    <span className="hidden sm:inline">{p.emoji} </span>
                    {p.label}
                  </span>
                </button>
                {i < PASOS.length - 1 && (
                  <div className={cn(
                    'h-0.5 flex-shrink-0 w-2 sm:w-4',
                    p.n < paso ? 'bg-[#29ABE2]' : 'bg-[#E2ECF4]',
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── PASO 1 · Requerimientos del paciente ─── */}
      {paso === 1 && (() => {
        const pesoKg     = form.peso || 0
        const pKcal      = Math.round(result.macros.p * 4)
        const cKcal      = Math.round(result.macros.c * 4)
        const gKcal      = Math.round(result.macros.g * 9)
        const totalMacrosKcal = pKcal + cKcal + gKcal || 1
        const pPct       = Math.round((pKcal / totalMacrosKcal) * 100)
        const cPct       = Math.round((cKcal / totalMacrosKcal) * 100)
        const gPct       = Math.round((gKcal / totalMacrosKcal) * 100)
        const pGKg       = pesoKg ? +(result.macros.p / pesoKg).toFixed(1) : 0
        const cGKg       = pesoKg ? +(result.macros.c / pesoKg).toFixed(1) : 0
        const gGKg       = pesoKg ? +(result.macros.g / pesoKg).toFixed(1) : 0
        const kcalKg     = pesoKg ? +(result.kcal / pesoKg).toFixed(1) : 0
        const deltaTdee  = result.kcal - result.tdee
        const deltaPct   = result.tdee ? Math.round((deltaTdee / result.tdee) * 100) : 0
        const metodoLabel =
          result.metodoUsado === 'kcal_kg_pal'      ? 'kcal/kg × PAL'   :
          result.metodoUsado === 'macros_directos'  ? 'Macros directos (g/kg)' :
                                                       'BMR × PAL'
        const formulaLabel =
          result.formulaUsada === 'cunningham'        ? 'Cunningham 1980 (usa % grasa corporal)' :
          result.formulaUsada === 'mifflin_st_jeor'   ? 'Mifflin-St Jeor 1990' :
          result.formulaUsada === 'harris_benedict_legacy' ? 'Harris-Benedict 1919 (legacy)' :
                                                        '—'
        return (
          <div className="space-y-4">
            <div className="bg-white border border-[#D6E3ED] rounded-2xl p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8BA5BE] font-bold mb-1">
                Objetivo del paciente
              </p>
              <h3 className="text-xl font-black text-[#0C3547] mb-4 capitalize">
                {form.objetivo === 'perdida grasa'   ? '🔥 Pérdida de grasa (déficit calórico)' :
                 form.objetivo === 'mantenimiento'   ? '⚖️ Mantenimiento' :
                 form.objetivo === 'hipertrofia'     ? '💪 Hipertrofia (ganancia muscular)' :
                                                       form.objetivo}
              </h3>

              {/* Kcal objetivo destacado */}
              <div className="bg-gradient-to-br from-[#0C3547] to-[#0F1419] rounded-xl p-4 text-white mb-3">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Calorías objetivo</p>
                    <p className="text-4xl font-black leading-none mt-1">{result.kcal} <span className="text-base font-bold text-white/70">kcal/día</span></p>
                  </div>
                  {pesoKg > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Por kg</p>
                      <p className="text-2xl font-black text-[#29ABE2] mt-1">{kcalKg} <span className="text-xs font-bold text-white/70">kcal/kg</span></p>
                    </div>
                  )}
                </div>
                {Math.abs(deltaTdee) > 50 && (
                  <p className="text-[10px] text-white/60 mt-2 italic">
                    Δ vs mantenimiento: {deltaTdee > 0 ? '+' : ''}{deltaTdee} kcal ({deltaPct > 0 ? '+' : ''}{deltaPct}%)
                  </p>
                )}
              </div>

              {/* Bloque BMR · PAL · TDEE — números clínicos clave */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-[#F8FBFD] rounded-lg p-2.5 text-center border border-[#E2ECF4]">
                  <p className="text-[9px] uppercase tracking-wider text-[#6B7C93] font-bold">BMR / TMB</p>
                  <p className="text-base font-black text-[#0C3547] mt-0.5">{result.bmr}</p>
                  <p className="text-[9px] text-[#8BA5BE]">kcal en reposo</p>
                </div>
                <div className="bg-[#F8FBFD] rounded-lg p-2.5 text-center border border-[#E2ECF4]">
                  <p className="text-[9px] uppercase tracking-wider text-[#6B7C93] font-bold">PAL</p>
                  <p className="text-base font-black text-[#0C3547] mt-0.5">×{result.pal.toFixed(2)}</p>
                  <p className="text-[9px] text-[#8BA5BE]">factor actividad</p>
                </div>
                <div className="bg-[#F8FBFD] rounded-lg p-2.5 text-center border border-[#E2ECF4]">
                  <p className="text-[9px] uppercase tracking-wider text-[#6B7C93] font-bold">TDEE / GET</p>
                  <p className="text-base font-black text-[#0C3547] mt-0.5">{result.tdee}</p>
                  <p className="text-[9px] text-[#8BA5BE]">mantención</p>
                </div>
              </div>

              {/* Validador de coherencia macros vs GET (feedback Maria Jose):
                  "ver si los gr por kilo de peso totales se adecuan a la molecula
                  total para que no sobrepasen mas-menos 5-10%". */}
              {(() => {
                const deltaKcal = totalMacrosKcal - result.kcal
                const deltaCohPct  = result.kcal ? Math.round((deltaKcal / result.kcal) * 100) : 0
                const absPct    = Math.abs(deltaCohPct)
                const estado    = absPct <= 5 ? 'ok' : absPct <= 10 ? 'warn' : 'bad'
                const cls       = estado === 'ok'   ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : estado === 'warn' ? 'bg-amber-50   border-amber-300   text-amber-800'
                                :                     'bg-rose-50    border-rose-300    text-rose-800'
                const icon      = estado === 'ok' ? '✓' : estado === 'warn' ? '⚠' : '🚨'
                const label     = estado === 'ok'   ? `Coherente con GET (Δ ${deltaCohPct >= 0 ? '+' : ''}${deltaCohPct}%)`
                                : estado === 'warn' ? `Cerca del limite (Δ ${deltaCohPct >= 0 ? '+' : ''}${deltaCohPct}%) — revisar`
                                :                     `Macros NO cuadran con GET (Δ ${deltaCohPct >= 0 ? '+' : ''}${deltaCohPct}%) — ajustar`
                return (
                  <div className={`flex items-baseline gap-2 mb-3 rounded-xl border-2 px-3 py-2 ${cls}`}>
                    <span className="text-base">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide">Coherencia macros vs GET</p>
                      <p className="text-[10px] mt-0.5 leading-tight">
                        {label} · suma macros = {totalMacrosKcal} kcal vs GET = {result.kcal} kcal
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* Macros — toggle de vista (g/kg vs %) sobre el desglose */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">Distribución de macronutrientes</p>
                <div className="inline-flex bg-[#F0F6FA] border border-[#E2ECF4] rounded-lg p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setVistaMacro('gkg')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition',
                      vistaMacro === 'gkg' ? 'bg-[#0C3547] text-white shadow' : 'text-[#6B7C93] hover:text-[#0C3547]',
                    )}
                  >
                    g/kg
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaMacro('pct')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition',
                      vistaMacro === 'pct' ? 'bg-[#0C3547] text-white shadow' : 'text-[#6B7C93] hover:text-[#0C3547]',
                    )}
                  >
                    % kcal
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    { key: 'p', label: 'Proteína',       gramos: result.macros.p, gkg: pGKg, pct: pPct, kcal: pKcal, color: 'violet' },
                    { key: 'c', label: 'Carbohidratos',  gramos: result.macros.c, gkg: cGKg, pct: cPct, kcal: cKcal, color: 'amber'  },
                    { key: 'g', label: 'Grasa',          gramos: result.macros.g, gkg: gGKg, pct: gPct, kcal: gKcal, color: 'rose'   },
                  ] as const
                ).map(m => {
                  const colorBg     = m.color === 'violet' ? 'bg-violet-50 border-violet-200' : m.color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
                  const colorText   = m.color === 'violet' ? 'text-violet-700' : m.color === 'amber' ? 'text-amber-700' : 'text-rose-700'
                  const colorSub    = m.color === 'violet' ? 'text-violet-600' : m.color === 'amber' ? 'text-amber-600' : 'text-rose-600'
                  // Valor "principal" segun toggle
                  const principal   = vistaMacro === 'gkg'
                    ? { v: pesoKg > 0 ? `${m.gkg}` : `${m.gramos}`, u: pesoKg > 0 ? 'g/kg' : 'g' }
                    : { v: `${m.pct}`, u: '%' }
                  // Los otros 2 valores como secundarios
                  const sec1 = vistaMacro === 'gkg'
                    ? { v: `${m.pct}%`,    label: 'kcal' }
                    : pesoKg > 0
                      ? { v: `${m.gkg}`,   label: 'g/kg' }
                      : { v: `${m.gramos}`,label: 'g totales' }
                  const sec2 = { v: `${m.gramos}g totales`, label: `${m.kcal} kcal` }
                  return (
                    <div key={m.key} className={`rounded-xl p-3 border ${colorBg}`}>
                      <div className="flex items-baseline justify-between">
                        <p className={`text-[10px] uppercase tracking-wider font-bold ${colorText}`}>{m.label}</p>
                        <p className={`text-[10px] font-bold ${colorSub}`}>{sec1.v} {sec1.label}</p>
                      </div>
                      <p className={`text-2xl font-black mt-1 ${colorText}`}>
                        {principal.v}<span className="text-xs ml-1 font-bold">{principal.u}</span>
                      </p>
                      <p className={`text-[9px] mt-0.5 ${colorSub}`}>{sec2.v} · {sec2.label}</p>
                    </div>
                  )
                })}
              </div>

              {result.macros.nota && (
                <p className="text-[10px] text-[#6B7C93] italic mt-3 leading-relaxed">
                  💡 {result.macros.nota}
                </p>
              )}
            </div>

            {/* Método + fórmula usados */}
            <div className="bg-white border border-[#D6E3ED] rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#8BA5BE] font-bold mb-2">Método de cálculo aplicado</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-[#6B7C93] font-bold uppercase">Método</p>
                  <p className="text-sm font-black text-[#0C3547]">{metodoLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B7C93] font-bold uppercase">Fórmula BMR</p>
                  <p className="text-sm font-black text-[#0C3547]">{formulaLabel}</p>
                </div>
              </div>
              {pesoKg > 0 && (
                <p className="text-[10px] text-[#6B7C93] mt-2">
                  Peso de referencia del paciente: <strong>{pesoKg} kg</strong> · todos los g/kg se calculan sobre este valor.
                </p>
              )}
            </div>

            {/* Warnings clínicas (proteína fuera de techo, grasa cerca del floor, etc.) */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-900 mb-2 uppercase tracking-wider">⚠ Advertencias clínicas</p>
                <ul className="text-xs text-amber-800 space-y-1 leading-relaxed">
                  {result.warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-4 text-xs text-[#4a6b80] leading-relaxed">
              <p className="font-bold text-[#0C3547] mb-1.5">📘 ¿Y ahora qué?</p>
              <p>
                En el <strong>Paso 2</strong> convertimos estas {result.kcal} kcal y los gramos de macros en <strong>porciones concretas</strong> de los grupos de alimentos chilenos (lácteos, cereales, proteínas, frutas, verduras, grasas).
                Después se distribuyen por tiempos de comida (Paso 3) y se traducen a alimentos reales con gramaje (Paso 4).
              </p>
            </div>
          </div>
        )
      })()}

      {/* ─── PASO 2 · Porciones de alimentos (resumen + pirámide) ─── */}
      {paso === 2 && (
        <div className="space-y-5">
          <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-3 text-xs text-[#4a6b80]">
            <p className="font-bold text-[#0C3547] mb-1">🥗 De macros a porciones</p>
            <p className="leading-relaxed">
              Convertimos los {result.kcal} kcal y los macros del paso 1 en <strong>porciones de los 6 grupos de alimentos básicos</strong> (lácteos, frutas, verduras, cereales, proteínas, grasas).
              Más abajo, la <strong>Pirámide Chilena</strong> permite ajuste fino con 13 subgrupos (INTA / Sochinut).
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black text-[#0C3547] mb-2 uppercase tracking-wide">📊 Resumen rápido · 6 grupos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grupos.map(grupo => (
                <GrupoCard key={grupo} grupo={grupo} porciones={distribucion[grupo]} />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-black text-[#0C3547] mb-2 uppercase tracking-wide">🇨🇱 Pirámide chilena · 13 subgrupos (editable)</h3>
            <PiramidePlan result={result} form={form} onChange={setPiramideDistInline} />
          </div>
        </div>
      )}

      {/* ─── PASO 3 · Distribución por tiempos de comida (editable) ─── */}
      {paso === 3 && (
        <div className="space-y-4">
          <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-3 text-xs text-[#4a6b80]">
            <p className="font-bold text-[#0C3547] mb-1">🕐 De porciones diarias a 5 tiempos · Editable</p>
            <p className="leading-relaxed">
              La distribución inicial sigue la heurística clínica chilena (Sochinut).
              <strong> Puedes mover porciones libremente</strong> — por ejemplo, sacar cereales del almuerzo y agregarlos a la colación pre-entreno.
              El balance abajo te avisa si te falta o sobra alguna porción para cuadrar con el total del Paso 2.
            </p>
          </div>

          {/* Balance: asignado vs disponible por SUBGRUPO de la Pirámide.
              Feedback Maria Jose (iteracion 3): distinguir carnes alto/medio/bajo,
              lácteos alto/medio/bajo, tipos de verduras, etc. */}
          <div className="bg-white border border-[#D6E3ED] rounded-2xl p-3">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold">Balance por grupo · Pirámide chilena</p>
              <button
                type="button"
                onClick={resetMatriz}
                className="text-[10px] uppercase tracking-wider font-bold text-[#29ABE2] hover:text-[#0C3547] transition"
                title="Volver a la distribución sugerida por Sochinut"
              >
                ↻ Reiniciar
              </button>
            </div>
            <div className="space-y-2">
              {META_GRUPOS_PASO3.map(meta => {
                const sub = GRUPOS_PIRAMIDE_ORDEN.filter(g => PIRAMIDE_INFO[g].metaGrupo === meta.meta)
                return (
                  <div key={meta.meta} className="bg-[#F8FBFD] rounded-lg border border-[#E2ECF4] p-2">
                    <p className="text-[10px] font-black text-[#0C3547] uppercase tracking-wide mb-1.5">
                      {meta.emoji} {meta.label}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      {sub.map(g => {
                        const total     = distPiramideTotal[g] ?? 0
                        const asignado  = asignadoPorGrupoPiramide[g]
                        const delta     = +(asignado - total).toFixed(1)
                        const esLibre   = g === 'verduras_libre'
                        const ok        = Math.abs(delta) < 0.25 || esLibre
                        const sobra     = delta > 0.25
                        const info      = PIRAMIDE_INFO[g]
                        return (
                          <div
                            key={g}
                            className={cn(
                              'rounded-md border px-2 py-1 text-[10px] transition flex items-center justify-between gap-2',
                              ok    ? 'bg-emerald-50/70 border-emerald-200' :
                              sobra ? 'bg-rose-50/70 border-rose-200'       :
                                      'bg-amber-50/70 border-amber-200',
                            )}
                          >
                            <span className="font-semibold text-[#0C3547] truncate" title={info.label}>{info.label}</span>
                            <span className={cn(
                              'font-black flex-shrink-0',
                              ok    ? 'text-emerald-700' :
                              sobra ? 'text-rose-700'    :
                                      'text-amber-700',
                            )}>
                              {asignado}/{total}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-[#8BA5BE] italic mt-2 leading-relaxed">
              Verduras libre consumo no se valida (consumo flexible). Los demás subtipos buscan asignar lo definido en el Paso 2.
            </p>
          </div>

          {/* Editor: una card por tiempo de comida con secciones por meta-grupo */}
          {(['desayuno', 'colacion_manana', 'almuerzo', 'once', 'cena'] as TiempoComidaPorcion[]).map(tiempo => {
            const info  = TIEMPO_COMIDA_PORCION_LABELS[tiempo]
            const macros = macrosDeTiempo(tiempo)
            return (
              <div key={tiempo} className="bg-white border-2 border-[#E2ECF4] rounded-2xl overflow-hidden">
                <div className="bg-[#F8FBFD] border-b border-[#E2ECF4] px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{info.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0C3547]">{info.label}</p>
                      <p className="text-[10px] text-[#8BA5BE]">{info.horario}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black text-[#0C3547]">{macros.kcal} <span className="text-[10px] font-normal text-[#6B7C93]">kcal</span></p>
                    <p className="text-[10px] text-[#6B7C93]">
                      <span className="text-violet-700 font-bold">{macros.p}P</span> · <span className="text-amber-700 font-bold">{macros.c}C</span> · <span className="text-rose-700 font-bold">{macros.g}G</span>
                    </p>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {META_GRUPOS_PASO3.map(meta => {
                    const sub = GRUPOS_PIRAMIDE_ORDEN.filter(g => PIRAMIDE_INFO[g].metaGrupo === meta.meta)
                    return (
                      <div key={meta.meta} className="bg-[#F8FBFD] rounded-lg border border-[#E2ECF4] p-2">
                        <p className="text-[10px] font-black text-[#0C3547] uppercase tracking-wide mb-1.5">
                          {meta.emoji} {meta.label}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          {sub.map(g => {
                            const pi = PIRAMIDE_INFO[g]
                            const v  = matriz[tiempo][g] ?? 0
                            return (
                              <div key={g} className="flex items-center gap-1.5 bg-white border border-[#E2ECF4] rounded px-2 py-1">
                                <label className="text-[10px] font-semibold text-[#6B7C93] flex-1 truncate" title={pi.label}>
                                  {pi.label}
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={v}
                                  onChange={e => setCelda(tiempo, g, Number(e.target.value) || 0)}
                                  className={cn(
                                    'w-12 text-center font-bold text-sm rounded border py-0.5 focus:outline-none focus:ring-2 focus:ring-[#29ABE2]/40',
                                    v > 0
                                      ? 'bg-white border-[#29ABE2] text-[#0C3547]'
                                      : 'bg-[#F8FBFD] border-[#E2ECF4] text-[#8BA5BE]',
                                  )}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <p className="text-[10px] text-[#8BA5BE] text-center italic">
            Cada celda es editable · pasos de 0.5 porciones · totales se recalculan al instante.
          </p>
        </div>
      )}

      {/* ─── PASO 4 · Alimentos reales · Tabla de intercambios ─── */}
      {paso === 4 && (
        <div className="space-y-4">
          <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-3 text-xs text-[#4a6b80]">
            <p className="font-bold text-[#0C3547] mb-1">🍽️ Del grupo al plato</p>
            <p className="leading-relaxed">
              Cada porción de cada grupo equivale a un gramaje específico de alimento real.
              <strong> Dentro de un mismo grupo puedes intercambiar libremente</strong> — todos los alimentos listados aportan macros similares.
              Por ejemplo: 1 porción de cereal = ½ taza de arroz cocido = 1 rebanada de pan = 1 papa mediana.
            </p>
          </div>

          {grupos.map(grupo => {
            const meta  = GRUPO_PORCION_LABELS[grupo]
            const macros = MACROS_POR_GRUPO[grupo]
            const items = INTERCAMBIOS[grupo]
            return (
              <div key={grupo} className="bg-white border border-[#D6E3ED] rounded-2xl overflow-hidden">
                <div className="bg-[#F8FBFD] border-b border-[#D6E3ED] px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4FB] flex items-center justify-center text-xl">
                      {meta.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#0C3547]">{meta.label}</p>
                      <p className="text-[10px] text-[#8BA5BE]">
                        ~{macros.kcal} kcal · {macros.p}g P · {macros.c}g C · {macros.g}g G por porción
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#29ABE2]">{distribucion[grupo]}</p>
                    <p className="text-[9px] uppercase tracking-wider text-[#8BA5BE] font-bold">
                      {grupo === 'verduras' ? 'libres' : distribucion[grupo] === 1 ? 'porción' : 'porciones'}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-[#F0F6FA]">
                  {items.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-[#F8FBFD] transition">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold text-[#0C3547] text-sm">{item.alimento}</p>
                        <p className="text-[11px] font-bold text-[#29ABE2] flex-shrink-0">{item.gramos}g</p>
                      </div>
                      <p className="text-[10px] text-[#8BA5BE] mt-0.5">
                        {item.kcal} kcal · {item.p}g P · {item.c}g C · {item.g}g G
                      </p>
                      {item.ejemploChileno && (
                        <p className="text-[10px] text-[#29ABE2] mt-0.5 italic">🇨🇱 {item.ejemploChileno}</p>
                      )}
                      {item.notas && (
                        <p className="text-[10px] text-amber-700 mt-0.5">{item.notas}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-4">
            <p className="text-sm font-bold text-[#0C3547] mb-2">📘 Cómo usar tu plan por porciones</p>
            <ul className="text-xs text-[#4a6b80] space-y-1.5 leading-relaxed">
              <li>• Cumple el <strong>número total de porciones</strong> de cada grupo al día.</li>
              <li>• Dentro de un grupo puedes <strong>intercambiar libremente</strong> entre los alimentos listados — todos aportan macros similares.</li>
              <li>• Reparte las porciones entre tus tiempos de comida según tu rutina.</li>
              <li>• Las <strong>verduras se consideran libres</strong>: la cifra es referencial, puedes sumar más sin afectar el plan.</li>
              <li>• Si una porción te suena chica (ej. 30g de pollo), recuerda que una comida real lleva varias porciones del mismo grupo (4-6 de proteína es lo habitual).</li>
            </ul>
          </div>

          {/* Guía clínica oficial Centro Metabólico — tablas frutas + verduras
              A/B/C + 5 criterios clínicos. Colapsada por default. */}
          <GuiaIntercambiosClinica />
        </div>
      )}

      {/* Navegación wizard: Anterior / Siguiente · sticky-ish al final */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => setPaso(p => (p > 1 ? ((p - 1) as Paso) : p))}
          disabled={paso === 1}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition',
            paso === 1
              ? 'bg-[#F0F6FA] text-[#C7D4DE] cursor-not-allowed'
              : 'bg-white border border-[#D6E3ED] text-[#0C3547] hover:bg-[#F8FBFD]',
          )}
        >
          ← Anterior
        </button>
        <p className="text-[10px] uppercase tracking-wider text-[#8BA5BE] font-bold hidden sm:block">
          Paso {paso} de 4 · {PASOS[paso - 1].label}
        </p>
        <button
          type="button"
          onClick={() => setPaso(p => (p < 4 ? ((p + 1) as Paso) : p))}
          disabled={paso === 4}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition',
            paso === 4
              ? 'bg-[#F0F6FA] text-[#C7D4DE] cursor-not-allowed'
              : 'bg-[#29ABE2] text-white hover:bg-[#1a8fc2] shadow',
          )}
        >
          Siguiente →
        </button>
      </div>

      {/* Sello de origen */}
      <p className="text-[10px] text-[#8BA5BE] text-center italic">
        Tablas de intercambio basadas en INTA Chile + Sochinut + USDA FoodData Central.
      </p>
    </div>
  )
}

// ─── Card individual de grupo ────────────────────────────────────────────────
function GrupoCard({ grupo, porciones }: { grupo: GrupoPorcion; porciones: number }) {
  const [expandido, setExpandido] = useState(false)
  const info = GRUPO_PORCION_LABELS[grupo]
  const macros = MACROS_POR_GRUPO[grupo]
  const intercambios = INTERCAMBIOS[grupo]

  const tieneCantidad = porciones > 0
  const esLibre = grupo === 'verduras'

  return (
    <div className={cn(
      'rounded-xl border-2 overflow-hidden transition-all bg-white',
      tieneCantidad ? 'border-[#29ABE2]' : 'border-[#E2ECF4] opacity-60',
    )}>
      <button
        type="button"
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FBFD] transition text-left"
        aria-expanded={expandido}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[#EAF4FB] flex items-center justify-center text-2xl flex-shrink-0">
            {info.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0C3547]">{info.label}</p>
            <p className="text-[11px] text-[#8BA5BE] mt-0.5">
              ~{macros.kcal} kcal · {macros.p}g P · {macros.c}g C · {macros.g}g G por porción
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-2xl font-black text-[#29ABE2] leading-none">
              {porciones}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-[#8BA5BE] font-bold mt-0.5">
              {esLibre ? 'libres' : porciones === 1 ? 'porción' : 'porciones'}
            </p>
          </div>
          <svg
            className={cn('w-4 h-4 text-[#8BA5BE] transition-transform', expandido && 'rotate-180')}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#E2ECF4] bg-[#F8FBFD]"
          >
            <div className="p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-[#8BA5BE] font-bold">
                Intercambios disponibles ({intercambios.length})
              </p>
              <div className="space-y-1.5">
                {intercambios.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[#E2ECF4] rounded-lg px-3 py-2 text-xs"
                  >
                    <p className="font-semibold text-[#0C3547]">{item.alimento}</p>
                    <p className="text-[10px] text-[#8BA5BE] mt-0.5">
                      {item.gramos}g · {item.kcal} kcal · {item.p}g P · {item.c}g C · {item.g}g G
                    </p>
                    {item.ejemploChileno && (
                      <p className="text-[10px] text-[#29ABE2] mt-0.5 italic">
                        🇨🇱 {item.ejemploChileno}
                      </p>
                    )}
                    {item.notas && (
                      <p className="text-[10px] text-amber-700 mt-0.5">{item.notas}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
