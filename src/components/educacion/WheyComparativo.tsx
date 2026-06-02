'use client'

/**
 * WheyComparativo — Comparador de 4 tipos de whey/proteína en polvo:
 *   1. Concentrado (estándar mercado)
 *   2. Isolate / ISO (intolerancia leve a lactosa)
 *   3. Hidrolizado (SIBO/SII, post-entreno rápido, premium)
 *   4. Plant-based vegana (sin lactosa, vegano, alergia leche)
 *
 * El matcher rankea por perfil del paciente: tendencia + intolerancias +
 * SIBO/SII + horario entreno + presupuesto. Muestra top pick con razón clínica.
 *
 * Vive dentro del EducacionHub (tab 📚 Educación) junto al comparador de
 * yogures. Mismo patrón visual.
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormData } from '@/lib/nutrition'
import {
  WHEY_TIPOS,
  WHEY_USO_LABELS,
  rankWheyParaPaciente,
  razonTopWhey,
  type WheyTipo,
} from '@/lib/wheyProtein'

interface Props {
  /** Form del paciente para personalizar. Si vacío → ranking neutral. */
  form?: Partial<FormData>
  /** Si true, la sección viene abierta al renderizarse. */
  defaultOpen?: boolean
}

export function WheyComparativo({ form = {}, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const ranking = useMemo(() => rankWheyParaPaciente({
    tendencia:            form.tendencia,
    digIntolerancias:     form.digIntolerancias,
    digDiag:              form.digDiag,
    horarioEntrenamiento: form.horarioEntrenamiento,
    presupuestoSemanal:   form.presupuestoSemanal,
  }), [form])

  const topPick = ranking[0]
  const razon = useMemo(
    () => topPick && topPick.score >= 60 ? razonTopWhey(topPick.tipo, {
      tendencia:            form.tendencia,
      digIntolerancias:     form.digIntolerancias,
      digDiag:              form.digDiag,
      horarioEntrenamiento: form.horarioEntrenamiento,
      presupuestoSemanal:   form.presupuestoSemanal,
    }) : '',
    [topPick, form],
  )

  return (
    <section className="bg-white rounded-2xl border border-[#E2ECF4] overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#F8FBFD] transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xl flex-shrink-0">
            💪
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-[#0C3547]">Comparador de proteínas en polvo</p>
            <p className="text-[11px] text-[#8BA5BE] leading-tight">
              4 tipos · matcheo por condición digestiva + objetivo
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn('text-[#8BA5BE] flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {/* Top pick */}
              {topPick && topPick.score >= 60 && (
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">
                      Recomendado para tu perfil
                    </span>
                  </div>
                  <p className="text-base font-black leading-tight mb-1">
                    {WHEY_TIPOS[topPick.tipo].emoji} {WHEY_TIPOS[topPick.tipo].label}
                  </p>
                  <p className="text-xs opacity-95 leading-relaxed">{razon}</p>
                </div>
              )}

              {/* Leyenda compacta */}
              <p className="mb-4 text-[10px] text-[#8BA5BE] leading-relaxed">
                Los <strong className="text-[#0C3547]">badges</strong> indican el mejor uso de cada
                tipo según tu objetivo + restricciones digestivas. Toca un producto para ver detalle.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ranking.map(({ tipo, tags, topPick: isTop, score }) => (
                  <WheyCard
                    key={tipo}
                    tipo={tipo}
                    tags={tags}
                    isTop={isTop && score >= 60}
                    score={score}
                  />
                ))}
              </div>

              {/* Tabla comparativa rápida (densa, scroll horizontal en mobile) */}
              <div className="mt-5 overflow-x-auto -mx-1 px-1">
                <p className="text-[11px] font-bold text-[#0C3547] mb-2 uppercase tracking-wide">
                  Tabla comparativa rápida
                </p>
                <table className="w-full min-w-[440px] text-[10px]">
                  <thead>
                    <tr className="border-b border-[#E2ECF4] text-[#8BA5BE] font-bold uppercase tracking-wide">
                      <th className="text-left py-1.5 pr-2">Tipo</th>
                      <th className="text-right py-1.5 px-2">Prot</th>
                      <th className="text-right py-1.5 px-2">Lactosa</th>
                      <th className="text-right py-1.5 px-2">DIAAS</th>
                      <th className="text-right py-1.5 px-2">Absorción</th>
                      <th className="text-right py-1.5 pl-2">$/kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map(({ tipo }) => {
                      const w = WHEY_TIPOS[tipo]
                      return (
                        <tr key={tipo} className="border-b border-[#F0F6FA] last:border-0">
                          <td className="py-1.5 pr-2">
                            <span className="text-[10px]">{w.emoji}</span>{' '}
                            <span className="font-bold text-[#0C3547]">{w.label}</span>
                          </td>
                          <td className="text-right py-1.5 px-2 font-bold text-violet-700">{w.p}g</td>
                          <td className={cn(
                            'text-right py-1.5 px-2 font-bold',
                            w.lactosaG < 1 ? 'text-emerald-700' : 'text-amber-700',
                          )}>
                            {w.lactosaG < 1 ? '<1g' : `${w.lactosaG}g`}
                          </td>
                          <td className="text-right py-1.5 px-2 text-[#4a6b80]">{w.diaas.toFixed(2)}</td>
                          <td className="text-right py-1.5 px-2 text-[#4a6b80]">{w.absorcionMin}min</td>
                          <td className="text-right py-1.5 pl-2 text-[#4a6b80]">
                            ${(w.precioCLP / 1000).toFixed(0)}k
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-[10px] text-[#8BA5BE] leading-relaxed italic">
                DIAAS = Digestible Indispensable Amino Acid Score (Mathai 2017). 1.0+ = proteína
                completa de alta calidad. Conversa con tu nutricionista antes de iniciar
                suplementación si tienes condiciones renales o hepáticas previas.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Card individual ──────────────────────────────────────────────────────────
function WheyCard({
  tipo,
  tags,
  isTop,
  score,
}: {
  tipo: WheyTipo
  tags: ReturnType<typeof rankWheyParaPaciente>[number]['tags']
  isTop: boolean
  score: number
}) {
  const w = WHEY_TIPOS[tipo]
  const [expanded, setExpanded] = useState(false)
  const visibleTags = expanded ? tags : tags.slice(0, 3)

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition',
        isTop ? 'border-violet-500 bg-violet-50/40 shadow-sm' : 'border-[#E2ECF4] bg-white hover:border-violet-300',
        score === 0 && 'opacity-50',
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Imagen / placeholder */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-100 to-violet-50 relative">
          <div className="absolute inset-0 flex items-center justify-center text-violet-600 text-3xl font-bold pointer-events-none">
            {w.emoji}
          </div>
          {w.foto && (
            <img
              src={w.foto}
              alt=""
              className="relative w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-[13px] font-black text-[#0C3547] leading-tight line-clamp-2">
              {w.label}
            </p>
            {isTop && (
              <span className="flex-shrink-0 text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                ⭐ Top
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#8BA5BE] mb-2 line-clamp-1">{w.marca}</p>

          {/* Macros compactos */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] mb-2">
            <span className="font-bold text-[#0C3547]">{w.kcal} kcal</span>
            <span className="text-[#8BA5BE]">·</span>
            <span><span className="font-bold text-violet-700">{w.p}g</span> <span className="text-[#8BA5BE]">prot</span></span>
            <span className="text-[#8BA5BE]">·</span>
            <span className={cn(
              'font-bold',
              w.lactosaG < 1 ? 'text-emerald-700' : 'text-amber-700',
            )}>
              {w.lactosaG < 1 ? '<1g lactosa' : `${w.lactosaG}g lactosa`}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {visibleTags.map(t => {
              const meta = WHEY_USO_LABELS[t]
              return (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-violet-200 bg-violet-50 text-violet-800"
                  title={meta.label}
                >
                  <span>{meta.emoji}</span>
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
              )
            })}
            {!expanded && tags.length > 3 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[9px] font-bold text-violet-600 px-1.5"
              >
                +{tags.length - 3}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detalle expandido: nota clínica + producto + precio */}
      {expanded && (
        <div className="border-t border-violet-100 px-3 py-2.5 bg-violet-50/30 text-[10px] text-[#4a6b80] space-y-1.5">
          <p>
            <strong className="text-[#0C3547]">Producto:</strong> {w.marca}
          </p>
          <p>
            <strong className="text-[#0C3547]">Precio aprox:</strong>{' '}
            ${w.precioCLP.toLocaleString('es-CL')} CLP · ~$
            {Math.round(w.precioCLP / (1000 / w.porcionG)).toLocaleString('es-CL')} por scoop
          </p>
          <p>
            <strong className="text-[#0C3547]">DIAAS:</strong> {w.diaas.toFixed(2)} ·{' '}
            <strong className="text-[#0C3547]">Absorción:</strong> ~{w.absorcionMin} min
          </p>
          <p className="italic leading-relaxed">{w.nota}</p>
        </div>
      )}

      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full py-1.5 text-[10px] font-bold text-violet-600 hover:bg-violet-50 border-t border-[#E2ECF4]"
      >
        {expanded ? 'Ocultar detalle' : 'Ver detalle clínico'}
      </button>
    </div>
  )
}
