'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  distribuirEnPorciones,
  distribuirPorTiemposDeComida,
  INTERCAMBIOS,
  GRUPO_PORCION_LABELS,
  MACROS_POR_GRUPO,
  TIEMPO_COMIDA_PORCION_LABELS,
  type GrupoPorcion,
  type DistribucionPorciones,
  type DistribucionTiempo,
} from '@/lib/porciones'
import type { FormData, NutritionResult } from '@/lib/nutrition'
import { cn } from '@/lib/utils'
import { PiramidePlan } from './PiramidePlan'

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
  const distribucion = useMemo<DistribucionPorciones>(
    () => distribuirEnPorciones(
      result.kcal,
      result.macros.p,
      result.macros.c,
      result.macros.g,
      form.objetivo,
    ),
    [result, form.objetivo],
  )

  // Distribución por tiempos de comida (heurística Sochinut)
  const porTiempo = useMemo<DistribucionTiempo[]>(
    () => distribuirPorTiemposDeComida(distribucion),
    [distribucion],
  )

  // Wizard secuencial de 4 pasos (flujo clínico: del cálculo abstracto al plato real).
  // Reemplaza el toggle independiente de 3 vistas que existía antes.
  //  Paso 1 · Requerimientos          → kcal + macros del paciente (objetivo + método)
  //  Paso 2 · Porciones de alimentos  → # porciones por grupo (resumen simple + pirámide 13 grupos)
  //  Paso 3 · Distribución por tiempos → cómo se reparten esas porciones en el día
  //  Paso 4 · Alimentos reales         → tabla de intercambios INTA con gramajes y ejemplos
  type Paso = 1 | 2 | 3 | 4
  const [paso, setPaso] = useState<Paso>(1)
  const PASOS: { n: Paso; label: string; emoji: string }[] = [
    { n: 1, label: 'Requerimientos',            emoji: '🎯' },
    { n: 2, label: 'Porciones de alimentos',    emoji: '🥗' },
    { n: 3, label: 'Distribución por tiempos',  emoji: '🕐' },
    { n: 4, label: 'Alimentos reales',          emoji: '🍽️' },
  ]

  const grupos: GrupoPorcion[] = ['lacteos', 'frutas', 'verduras', 'cereales', 'proteinas', 'grasas']

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

              {/* Macros — cada tarjeta muestra g + g/kg + %kcal (los 3 números clínicos) */}
              <p className="text-[10px] uppercase tracking-wider text-[#6B7C93] font-bold mb-2">Distribución de macronutrientes</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-violet-50 rounded-xl p-3 border border-violet-200">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">Proteína</p>
                    <p className="text-[10px] font-bold text-violet-600">{pPct}% kcal</p>
                  </div>
                  <p className="text-2xl font-black text-violet-700 mt-1">{result.macros.p}<span className="text-sm">g</span></p>
                  {pesoKg > 0 && (
                    <p className="text-[11px] text-violet-700 font-semibold mt-0.5">{pGKg} <span className="text-[10px] font-normal">g/kg</span></p>
                  )}
                  <p className="text-[9px] text-violet-600 mt-0.5">{pKcal} kcal</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Carbohidratos</p>
                    <p className="text-[10px] font-bold text-amber-600">{cPct}% kcal</p>
                  </div>
                  <p className="text-2xl font-black text-amber-700 mt-1">{result.macros.c}<span className="text-sm">g</span></p>
                  {pesoKg > 0 && (
                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5">{cGKg} <span className="text-[10px] font-normal">g/kg</span></p>
                  )}
                  <p className="text-[9px] text-amber-600 mt-0.5">{cKcal} kcal</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 border border-rose-200">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Grasa</p>
                    <p className="text-[10px] font-bold text-rose-600">{gPct}% kcal</p>
                  </div>
                  <p className="text-2xl font-black text-rose-700 mt-1">{result.macros.g}<span className="text-sm">g</span></p>
                  {pesoKg > 0 && (
                    <p className="text-[11px] text-rose-700 font-semibold mt-0.5">{gGKg} <span className="text-[10px] font-normal">g/kg</span></p>
                  )}
                  <p className="text-[9px] text-rose-600 mt-0.5">{gKcal} kcal</p>
                </div>
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
            <PiramidePlan result={result} form={form} />
          </div>
        </div>
      )}

      {/* ─── PASO 3 · Distribución por tiempos de comida ─── */}
      {paso === 3 && (
        <div className="space-y-3">
          <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-3 text-xs text-[#4a6b80]">
            <p className="font-bold text-[#0C3547] mb-1">🕐 De porciones diarias a 5 tiempos</p>
            <p className="leading-relaxed">
              Las porciones del paso 2 se distribuyen entre los 5 tiempos de comida según la heurística clínica de Sochinut.
              Toca cada tarjeta para ver qué porciones (y ejemplos de alimentos) corresponden a ese tiempo.
            </p>
          </div>

          {porTiempo.map(t => (
            <TiempoCard key={t.tiempo} dist={t} />
          ))}
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

// ─── Card por tiempo de comida (desayuno / colación / etc) ───────────────────
function TiempoCard({ dist }: { dist: DistribucionTiempo }) {
  const [expandido, setExpandido] = useState(false)
  const info = TIEMPO_COMIDA_PORCION_LABELS[dist.tiempo]

  // Grupos con asignación > 0 — los demás no se muestran en este tiempo
  const grupos: GrupoPorcion[] = ['lacteos', 'frutas', 'verduras', 'cereales', 'proteinas', 'grasas']
  const conPorciones = grupos.filter(g => dist[g] > 0)

  if (conPorciones.length === 0) {
    return null  // Tiempo sin asignación (no debería pasar con SHARES actuales, pero defensivo)
  }

  return (
    <div className="rounded-xl border-2 border-[#E2ECF4] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FBFD] transition text-left"
        aria-expanded={expandido}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#EAF4FB] flex items-center justify-center text-xl flex-shrink-0">
            {info.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0C3547]">{info.label}</p>
            <p className="text-[10px] text-[#8BA5BE] mt-0.5">
              {info.horario} · {dist.totales.kcal} kcal · {dist.totales.p}g P · {dist.totales.c}g C · {dist.totales.g}g G
            </p>
          </div>
        </div>
        <svg
          className={cn('w-4 h-4 text-[#8BA5BE] transition-transform flex-shrink-0', expandido && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Chips compactas con # porciones por grupo (siempre visibles) */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {conPorciones.map(grupo => {
          const meta = GRUPO_PORCION_LABELS[grupo]
          return (
            <span
              key={grupo}
              className="inline-flex items-center gap-1 bg-[#F7FBFE] border border-[#D6E3ED] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#0C3547]"
            >
              <span>{meta.emoji}</span>
              <span className="text-[#29ABE2] font-black">{dist[grupo]}</span>
              <span className="text-[#6B7C93]">{meta.label.toLowerCase()}</span>
            </span>
          )
        })}
      </div>

      {/* Detalle expandido: ejemplos de alimentos del INTA por grupo */}
      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#E2ECF4] bg-[#F8FBFD]"
          >
            <div className="p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-[#8BA5BE] font-bold">
                Sugerencias de alimentos para este tiempo
              </p>
              {conPorciones.map(grupo => {
                const meta = GRUPO_PORCION_LABELS[grupo]
                // Tomar primeros 3 alimentos de cada grupo como sugerencia
                const sugerencias = INTERCAMBIOS[grupo].slice(0, 3)
                return (
                  <div key={grupo} className="bg-white border border-[#E2ECF4] rounded-lg p-2.5">
                    <p className="text-[11px] font-bold text-[#0C3547] mb-1.5">
                      {meta.emoji} {meta.label} — <span className="text-[#29ABE2]">{dist[grupo]} {dist[grupo] === 1 ? 'porción' : 'porciones'}</span>
                    </p>
                    <ul className="space-y-1">
                      {sugerencias.map((s, i) => (
                        <li key={i} className="text-[11px] text-[#4a6b80] leading-relaxed">
                          • {s.alimento}
                          {s.ejemploChileno && (
                            <span className="text-[10px] text-[#29ABE2] italic"> · 🇨🇱 {s.ejemploChileno}</span>
                          )}
                        </li>
                      ))}
                      {INTERCAMBIOS[grupo].length > 3 && (
                        <li className="text-[10px] text-[#8BA5BE] italic mt-1">
                          + {INTERCAMBIOS[grupo].length - 3} alternativas más en la vista resumen del día
                        </li>
                      )}
                    </ul>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
