'use client'

/**
 * PorcionesEditor — editor de porciones por grupo en el wizard del PlanGenerator
 * (Step 5, cuando modalidadPlan === 'porciones').
 *
 * Feedback Felipe: cuando elige planificar por porciones, debe poder ajustar
 * las porciones de cada grupo ANTES de generar el plan (no solo después).
 *
 * Cada cambio se guarda en form.porcionesOverride y prevalece sobre la
 * distribucion automatica de distribuirEnPorciones() al renderizar el resultado.
 */

import { useMemo } from 'react'
import {
  calcularNutricion,
  type FormData,
} from '@/lib/nutrition'
import {
  distribuirEnPorciones,
  aplicarOverridePorciones,
  GRUPO_PORCION_LABELS,
  MACROS_POR_GRUPO,
  type GrupoPorcion,
  type DistribucionPorciones,
} from '@/lib/porciones'
import { cn } from '@/lib/utils'

interface Props {
  form: Partial<FormData>
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}

const GRUPOS: GrupoPorcion[] = ['lacteos', 'frutas', 'verduras', 'cereales', 'proteinas', 'grasas']

export function PorcionesEditor({ form, set }: Props) {
  // 1. Preview de requerimientos en vivo (depende de los datos del wizard)
  const preview = useMemo(() => {
    try {
      return calcularNutricion(form as Parameters<typeof calcularNutricion>[0])
    } catch {
      return null
    }
  }, [form])

  // 2. Distribucion sugerida + aplicar override actual del profesional
  const distribucion = useMemo<DistribucionPorciones | null>(() => {
    if (!preview) return null
    const auto = distribuirEnPorciones(
      preview.kcal,
      preview.macros.p,
      preview.macros.c,
      preview.macros.g,
      form.objetivo ?? 'mantenimiento',
    )
    return aplicarOverridePorciones(auto, form.porcionesOverride, {
      kcal: preview.kcal,
      p:    preview.macros.p,
      c:    preview.macros.c,
      g:    preview.macros.g,
    })
  }, [preview, form.objetivo, form.porcionesOverride])

  if (!preview || !distribucion) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-amber-900 mb-1">⚠ Faltan datos del paciente</p>
        <p className="text-xs text-amber-800">
          Volvé a los pasos anteriores y completá peso, talla, edad, sexo y objetivo para que se calculen las porciones sugeridas.
        </p>
      </div>
    )
  }

  function setPorciones(grupo: GrupoPorcion, valor: number) {
    const v = Math.max(0, Math.round(valor * 2) / 2)  // pasos de 0.5
    set('porcionesOverride', { ...(form.porcionesOverride ?? {}), [grupo]: v })
  }

  function reset() {
    set('porcionesOverride', undefined)
  }

  const hayOverride = !!form.porcionesOverride && Object.keys(form.porcionesOverride).length > 0
  const deltaKcal   = distribucion.totales.kcal - preview.kcal
  const deltaPct    = preview.kcal ? Math.round((deltaKcal / preview.kcal) * 100) : 0
  const absPct      = Math.abs(deltaPct)
  const estado      = absPct <= 5 ? 'ok' : absPct <= 10 ? 'warn' : 'bad'

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-[#F0F9FF] border-2 border-emerald-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">⚖️</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0C3547] mb-1">Editor de porciones por grupo</p>
          <p className="text-[11px] text-[#4a6b80] leading-relaxed">
            Ajustá las porciones de cada grupo según el perfil del paciente. El balance abajo te avisa si te falta o sobra para cuadrar con el GET calculado.
          </p>
        </div>
      </div>

      {/* Target del paciente */}
      <div className="bg-white border border-emerald-200 rounded-xl px-3 py-2 grid grid-cols-4 gap-2 text-center text-[10px]">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-[#8BA5BE] font-bold">GET objetivo</p>
          <p className="text-sm font-black text-[#0C3547] mt-0.5">{preview.kcal} <span className="text-[9px] font-normal text-[#6B7C93]">kcal</span></p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-violet-700 font-bold">Proteína</p>
          <p className="text-sm font-black text-violet-700 mt-0.5">{preview.macros.p}<span className="text-[9px] font-normal">g</span></p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-amber-700 font-bold">CHO</p>
          <p className="text-sm font-black text-amber-700 mt-0.5">{preview.macros.c}<span className="text-[9px] font-normal">g</span></p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-rose-700 font-bold">Grasa</p>
          <p className="text-sm font-black text-rose-700 mt-0.5">{preview.macros.g}<span className="text-[9px] font-normal">g</span></p>
        </div>
      </div>

      {/* 6 inputs editables */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {GRUPOS.map(g => {
          const meta    = GRUPO_PORCION_LABELS[g]
          const macros  = MACROS_POR_GRUPO[g]
          const valor   = distribucion[g]
          const isOver  = form.porcionesOverride?.[g] !== undefined
          return (
            <div key={g} className={cn(
              'bg-white rounded-xl p-2.5 border-2 transition',
              isOver ? 'border-emerald-400' : 'border-[#E2ECF4]',
            )}>
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-bold text-[#0C3547] truncate" title={meta.label}>
                  {meta.emoji} {meta.label.split(' ')[0]}
                </p>
                {isOver && <span className="text-[8px] text-emerald-600 font-bold uppercase">edit</span>}
              </div>
              <input
                type="number"
                min={0}
                step={0.5}
                value={valor}
                onChange={e => setPorciones(g, Number(e.target.value) || 0)}
                className={cn(
                  'w-full text-center font-black text-base rounded-lg border py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-emerald-300',
                  valor > 0 ? 'bg-white border-emerald-300 text-[#0C3547]' : 'bg-[#F8FBFD] border-[#E2ECF4] text-[#8BA5BE]',
                )}
              />
              <p className="text-[9px] text-[#8BA5BE] mt-1 text-center">
                ~{Math.round(macros.kcal * valor)} kcal
              </p>
            </div>
          )
        })}
      </div>

      {/* Balance */}
      <div className={cn(
        'rounded-xl border-2 px-3 py-2 flex items-baseline gap-2',
        estado === 'ok'   ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
        estado === 'warn' ? 'bg-amber-50   border-amber-300   text-amber-800'   :
                            'bg-rose-50    border-rose-300    text-rose-800',
      )}>
        <span className="text-base">{estado === 'ok' ? '✓' : estado === 'warn' ? '⚠' : '🚨'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-wide">
            {estado === 'ok'   ? `Balance OK (Δ ${deltaPct >= 0 ? '+' : ''}${deltaPct}%)` :
             estado === 'warn' ? `Cerca del límite (Δ ${deltaPct >= 0 ? '+' : ''}${deltaPct}%) — revisar` :
                                 `Fuera de rango (Δ ${deltaPct >= 0 ? '+' : ''}${deltaPct}%) — ajustar porciones`}
          </p>
          <p className="text-[10px] mt-0.5">
            Aportan {distribucion.totales.kcal} kcal · {distribucion.totales.p}P · {distribucion.totales.c}C · {distribucion.totales.g}G
            {' · target: '}{preview.kcal}/{preview.macros.p}/{preview.macros.c}/{preview.macros.g}
          </p>
        </div>
      </div>

      {/* Reset */}
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <p className="text-[#6B7C93] italic">
          Estas porciones se aplicarán automáticamente al plan generado. Después podrás distribuirlas por tiempos de comida en el Paso 3 del resultado.
        </p>
        {hayOverride && (
          <button
            type="button"
            onClick={reset}
            className="flex-shrink-0 text-emerald-700 font-bold hover:underline uppercase tracking-wider"
          >
            ↻ Restaurar sugerido
          </button>
        )}
      </div>
    </div>
  )
}
