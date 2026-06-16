'use client'

/**
 * PorcionesEditor — editor de porciones por grupo en el wizard del PlanGenerator
 * (Step 5, cuando modalidadPlan === 'porciones').
 *
 * Feedback Maria Jose Serrano (iteracion 2): el editor debe mostrar los 13
 * grupos de la Piramide Chilena INTA/Sochinut (no los 6 basicos), agrupados
 * visualmente por meta-grupo para que se vea la jerarquia:
 *   - Cereales (1 grupo + leguminosas frescas)
 *   - Verduras (general + libre consumo)
 *   - Frutas
 *   - Carnes (alto/bajo grasa + leguminosas)
 *   - Lacteos (alto/medio/bajo grasa)
 *   - Grasas (aceites + ricos en lipidos)
 *   - Azucar (consumo discrecional)
 *
 * El override se guarda en form.porcionesOverridePiramide. Al renderizar el
 * plan, PorcionesPlan mapea esos 13 grupos a los 6 basicos (sumando subtipos)
 * para la distribucion por tiempos de comida.
 */

import { useMemo } from 'react'
import {
  calcularNutricion,
  type FormData,
} from '@/lib/nutrition'
import {
  PIRAMIDE_INFO,
  GRUPOS_PIRAMIDE_ORDEN,
  type GrupoPiramide,
  type MetaGrupoPiramide,
} from '@/lib/porciones'
import { cn } from '@/lib/utils'

interface Props {
  form: Partial<FormData>
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}

// Agrupacion visual de los 13 grupos por meta-grupo
const META_GRUPOS_VISUALES: { meta: MetaGrupoPiramide; emoji: string; label: string }[] = [
  { meta: 'cereales', emoji: '🌾', label: 'Cereales' },
  { meta: 'verduras', emoji: '🥗', label: 'Verduras' },
  { meta: 'frutas',   emoji: '🍎', label: 'Frutas' },
  { meta: 'carnes',   emoji: '🍗', label: 'Proteínas (carnes + leguminosas)' },
  { meta: 'lacteos',  emoji: '🥛', label: 'Lácteos' },
  { meta: 'grasas',   emoji: '🥑', label: 'Grasas y lípidos' },
  { meta: 'azucar',   emoji: '🍬', label: 'Azúcar (discrecional)' },
]

// Helper: sugerencia inicial de porciones por grupo basada en target del paciente.
// No es un algoritmo exhaustivo — usa heuristica clinica chilena promedio.
function sugerenciaInicial(): Partial<Record<GrupoPiramide, number>> {
  return {
    cereales_leguminosas_frescas: 5,
    verduras_general:             2,
    verduras_libre:               3,
    frutas:                       3,
    carnes_alto_grasa:            0,
    carnes_bajo_grasa:            2,
    leguminosas:                  1,
    lacteos_alto_grasa:           0,
    lacteos_medio_grasa:          1,
    lacteos_bajo_grasa:           1,
    aceites_grasas:               2,
    alimentos_ricos_lipidos:      1,
    azucar:                       0,
  }
}

export function PorcionesEditor({ form, set }: Props) {
  // 1. Preview de requerimientos en vivo (depende de los datos del wizard)
  const preview = useMemo(() => {
    try {
      return calcularNutricion(form as Parameters<typeof calcularNutricion>[0])
    } catch {
      return null
    }
  }, [form])

  // 2. Valores efectivos = override si esta, sino sugerencia inicial
  const valores: Record<GrupoPiramide, number> = useMemo(() => {
    const sug = sugerenciaInicial()
    const acc = {} as Record<GrupoPiramide, number>
    for (const g of GRUPOS_PIRAMIDE_ORDEN) {
      acc[g] = form.porcionesOverridePiramide?.[g] ?? sug[g] ?? 0
    }
    return acc
  }, [form.porcionesOverridePiramide])

  // 3. Totales calculados sobre los valores efectivos
  const totales = useMemo(() => {
    const t = { kcal: 0, p: 0, c: 0, g: 0 }
    for (const g of GRUPOS_PIRAMIDE_ORDEN) {
      const v = valores[g]
      const m = PIRAMIDE_INFO[g].macros
      t.kcal += v * m.kcal
      t.p    += v * m.p
      t.c    += v * m.c
      t.g    += v * m.g
    }
    return { kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), g: Math.round(t.g) }
  }, [valores])

  if (!preview) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-amber-900 mb-1">⚠ Faltan datos del paciente</p>
        <p className="text-xs text-amber-800">
          Volvé a los pasos anteriores y completá peso, talla, edad, sexo y objetivo para que se calculen las porciones sugeridas.
        </p>
      </div>
    )
  }

  function setPorciones(grupo: GrupoPiramide, valor: number) {
    const v = Math.max(0, Math.round(valor * 2) / 2)  // pasos de 0.5
    set('porcionesOverridePiramide', { ...(form.porcionesOverridePiramide ?? {}), [grupo]: v })
  }

  function reset() {
    set('porcionesOverridePiramide', undefined)
  }

  const hayOverride = !!form.porcionesOverridePiramide && Object.keys(form.porcionesOverridePiramide).length > 0
  const deltaKcal   = totales.kcal - preview.kcal
  const deltaPct    = preview.kcal ? Math.round((deltaKcal / preview.kcal) * 100) : 0
  const absPct      = Math.abs(deltaPct)
  const estado      = absPct <= 5 ? 'ok' : absPct <= 10 ? 'warn' : 'bad'

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-[#F0F9FF] border-2 border-emerald-200 rounded-2xl p-4 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">⚖️</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#0C3547] mb-1">Editor de porciones por grupo</p>
          <p className="text-[11px] text-[#4a6b80] leading-relaxed">
            Ajustá las porciones de cada grupo según el perfil del paciente. El balance abajo te avisa si te falta o sobra para cuadrar con el GET calculado.
            Pirámide Chilena INTA/Sochinut · 13 grupos con sus subtipos clínicos.
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

      {/* 7 meta-grupos visuales con sus subtipos */}
      <div className="space-y-2">
        {META_GRUPOS_VISUALES.map(meta => {
          const sub = GRUPOS_PIRAMIDE_ORDEN.filter(g => PIRAMIDE_INFO[g].metaGrupo === meta.meta)
          return (
            <div key={meta.meta} className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
              <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <span className="text-base">{meta.emoji}</span>
                <p className="text-[11px] font-black text-[#0C3547] uppercase tracking-wide">{meta.label}</p>
              </div>
              <div className="p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {sub.map(g => {
                  const info   = PIRAMIDE_INFO[g]
                  const valor  = valores[g]
                  const isOver = form.porcionesOverridePiramide?.[g] !== undefined
                  return (
                    <div key={g} className={cn(
                      'rounded-lg p-2 border-2 transition',
                      isOver ? 'border-emerald-400 bg-emerald-50/50' : 'border-[#E2ECF4]',
                    )}>
                      <div className="flex items-baseline justify-between gap-1">
                        <p className="text-[10px] font-bold text-[#0C3547] truncate" title={info.label}>
                          {info.label}
                        </p>
                        {isOver && <span className="text-[8px] text-emerald-600 font-bold uppercase flex-shrink-0">edit</span>}
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
                      <p className="text-[9px] text-[#8BA5BE] mt-1 text-center leading-tight">
                        {info.macros.kcal} kcal · {info.macros.p}P · {info.macros.c}C · {info.macros.g}G por porción
                      </p>
                    </div>
                  )
                })}
              </div>
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
            Aportan {totales.kcal} kcal · {totales.p}P · {totales.c}C · {totales.g}G
            {' · target: '}{preview.kcal}/{preview.macros.p}/{preview.macros.c}/{preview.macros.g}
          </p>
        </div>
      </div>

      {/* Reset */}
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <p className="text-[#6B7C93] italic">
          Estas porciones se aplican al plan generado. Subtipos se suman al meta-grupo correspondiente para la distribución por tiempos (Paso 3 del resultado).
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
