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

  // Vista activa: 'dia' (resumen por grupo), 'tiempos' (5 tiempos de comida)
  // o 'piramide' (Pirámide Alimentaria Chilena · 13 grupos · INTA/Sochinut)
  const [vista, setVista] = useState<'dia' | 'tiempos' | 'piramide'>('dia')

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

      {/* Toggle vista: día (resumen) ↔ tiempos (por comida) ↔ pirámide (13 grupos) */}
      <div className="bg-white border border-[#D6E3ED] rounded-xl p-1 flex gap-1">
        {(['dia', 'tiempos', 'piramide'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={cn(
              'flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition',
              vista === v
                ? 'bg-[#0C3547] text-white shadow-sm'
                : 'text-[#6B7C93] hover:bg-[#F8FBFD]',
            )}
          >
            {v === 'dia'      ? '📊 Resumen del día' :
             v === 'tiempos'  ? '🕐 Por tiempo de comida' :
                                 '🇨🇱 Pirámide chilena'}
          </button>
        ))}
      </div>

      {/* Vista 'día': cards por grupo */}
      {vista === 'dia' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {grupos.map(grupo => (
            <GrupoCard key={grupo} grupo={grupo} porciones={distribucion[grupo]} />
          ))}
        </div>
      )}

      {/* Vista 'piramide': tabla editable de 13 grupos con adecuación */}
      {vista === 'piramide' && (
        <PiramidePlan result={result} form={form} />
      )}

      {/* Vista 'tiempos': 5 cards (desayuno, AM, almuerzo, once, cena) */}
      {vista === 'tiempos' && (
        <div className="space-y-3">
          {porTiempo.map(t => (
            <TiempoCard key={t.tiempo} dist={t} />
          ))}
        </div>
      )}

      {/* Cómo usar este plan */}
      <div className="bg-[#EAF4FB] border border-[#29ABE2] rounded-xl p-4">
        <p className="text-sm font-bold text-[#0C3547] mb-2">📘 Cómo usar tu plan por porciones</p>
        <ul className="text-xs text-[#4a6b80] space-y-1.5 leading-relaxed">
          <li>• Cumple el <strong>número total de porciones</strong> de cada grupo al día.</li>
          <li>• Dentro de un grupo podés <strong>intercambiar libremente</strong> entre los alimentos listados — todos aportan macros similares.</li>
          <li>• Repartí las porciones entre tus tiempos de comida según tu rutina.</li>
          <li>• Las <strong>verduras se consideran libres</strong>: la cifra es referencial, podés sumar más sin afectar el plan.</li>
          <li>• Si una porción te suena chica (ej. 30g de pollo), recordá que una comida real lleva varias porciones del mismo grupo (4-6 de proteína es lo habitual).</li>
        </ul>
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
