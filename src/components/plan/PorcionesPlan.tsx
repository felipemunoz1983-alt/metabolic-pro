'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  distribuirEnPorciones,
  INTERCAMBIOS,
  GRUPO_PORCION_LABELS,
  MACROS_POR_GRUPO,
  type GrupoPorcion,
  type DistribucionPorciones,
} from '@/lib/porciones'
import type { FormData, NutritionResult } from '@/lib/nutrition'
import { cn } from '@/lib/utils'

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

      {/* Distribución por grupos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {grupos.map(grupo => (
          <GrupoCard key={grupo} grupo={grupo} porciones={distribucion[grupo]} />
        ))}
      </div>

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
