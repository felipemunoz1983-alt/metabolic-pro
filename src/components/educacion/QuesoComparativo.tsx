'use client'

/**
 * QuesoComparativo — Comparador educativo de los 7 quesos del catálogo.
 *
 * Muestra cada queso con foto + macros + sodio + tags clínicos (sin lactosa,
 * bajo en sodio, déficit, alta proteína, sabor tradicional, premium).
 *
 * Top pick personalizado por perfil del paciente: intolerancia a lactosa,
 * objetivo (déficit / hipertrofia), diagnóstico digestivo (SIBO/SII).
 *
 * Sigue el mismo patrón visual que YogurComparativo y WheyComparativo
 * (consistencia en el tab Educación).
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QUESO_TIPOS, type QuesoTipo } from '@/lib/foods'
import type { FormData } from '@/lib/nutrition'
import {
  rankQuesosParaPaciente,
  razonTopQueso,
  QUESO_USO_LABELS,
} from '@/lib/quesoMatcher'

interface Props {
  /** Perfil del paciente para personalizar la recomendación. */
  form?: Partial<FormData>
  /** Default abierto en el primer render. */
  defaultOpen?: boolean
}

export function QuesoComparativo({ form = {}, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const ranking = useMemo(() => rankQuesosParaPaciente(form), [form])
  const topPick = ranking[0]
  const razon   = useMemo(
    () => topPick && topPick.score >= 55 ? razonTopQueso(topPick.tipo, form) : '',
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-xl flex-shrink-0">
            🧀
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-[#0C3547]">Comparador de quesos</p>
            <p className="text-[11px] text-[#8BA5BE] leading-tight">
              7 opciones · matcheo por intolerancia + objetivo
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
              {topPick && topPick.score >= 55 && (
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">
                      Recomendado para tu perfil
                    </span>
                  </div>
                  <p className="text-base font-black leading-tight mb-1">
                    {QUESO_TIPOS[topPick.tipo].emoji} {QUESO_TIPOS[topPick.tipo].label}
                  </p>
                  <p className="text-xs opacity-95 leading-relaxed">{razon}</p>
                </div>
              )}

              {/* Leyenda */}
              <p className="mb-4 text-[10px] text-[#8BA5BE] leading-relaxed">
                Los <strong className="text-[#0C3547]">badges</strong> indican el mejor uso de cada queso
                según objetivo + restricciones digestivas. Toca un producto para ver detalle clínico.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ranking.map(({ tipo, tags, topPick: isTop, score }) => (
                  <QuesoCard
                    key={tipo}
                    tipo={tipo}
                    tags={tags}
                    isTop={isTop && score >= 55}
                    score={score}
                  />
                ))}
              </div>

              {/* Tabla comparativa rápida */}
              <div className="mt-5 overflow-x-auto -mx-1 px-1">
                <p className="text-[11px] font-bold text-[#0C3547] mb-2 uppercase tracking-wide">
                  Tabla comparativa (por 30g)
                </p>
                <table className="w-full min-w-[440px] text-[10px]">
                  <thead>
                    <tr className="border-b border-[#E2ECF4] text-[#8BA5BE] font-bold uppercase tracking-wide">
                      <th className="text-left py-1.5 pr-2">Queso</th>
                      <th className="text-right py-1.5 px-2">Kcal</th>
                      <th className="text-right py-1.5 px-2">Prot</th>
                      <th className="text-right py-1.5 px-2">Grasa</th>
                      <th className="text-right py-1.5 px-2">Sodio</th>
                      <th className="text-center py-1.5 pl-2">Lactosa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map(({ tipo }) => {
                      const q = QUESO_TIPOS[tipo]
                      const conLactosa = q.contiene.includes('lactosa')
                      return (
                        <tr key={tipo} className="border-b border-[#F0F6FA] last:border-0">
                          <td className="py-1.5 pr-2">
                            <span className="text-[10px]">{q.emoji}</span>{' '}
                            <span className="font-bold text-[#0C3547]">{q.label}</span>
                          </td>
                          <td className="text-right py-1.5 px-2 font-bold text-[#0C3547]">{q.kcal}</td>
                          <td className="text-right py-1.5 px-2 font-bold text-violet-700">{q.p}g</td>
                          <td className="text-right py-1.5 px-2 text-[#4a6b80]">{q.g}g</td>
                          <td className={cn(
                            'text-right py-1.5 px-2 font-bold',
                            q.sodioMg <= 100 ? 'text-emerald-700'
                              : q.sodioMg <= 150 ? 'text-amber-700'
                              : 'text-rose-700',
                          )}>
                            {q.sodioMg}mg
                          </td>
                          <td className="text-center py-1.5 pl-2">
                            {conLactosa
                              ? <span className="text-rose-600">⚠️</span>
                              : <span className="text-emerald-600 font-bold">✓</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-[10px] text-[#8BA5BE] leading-relaxed italic">
                Todos los quesos del catálogo son aptos para vegetarianos (lácteos). Los marcados sin
                lactosa son aptos para intolerantes leves a moderados. Conversa con tu nutricionista
                si tienes hipertensión, dislipidemia o insuficiencia renal.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Card individual ──────────────────────────────────────────────────────────
function QuesoCard({
  tipo,
  tags,
  isTop,
  score,
}: {
  tipo: QuesoTipo
  tags: ReturnType<typeof rankQuesosParaPaciente>[number]['tags']
  isTop: boolean
  score: number
}) {
  const q = QUESO_TIPOS[tipo]
  const [expanded, setExpanded] = useState(false)
  const visibleTags = expanded ? tags : tags.slice(0, 3)
  const fotoStr = (q as { foto?: string }).foto

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition',
        isTop ? 'border-yellow-500 bg-yellow-50/40 shadow-sm' : 'border-[#E2ECF4] bg-white hover:border-yellow-300',
        score === 0 && 'opacity-50',
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Imagen / placeholder */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-yellow-100 to-yellow-50 relative">
          <div className="absolute inset-0 flex items-center justify-center text-yellow-600 text-3xl font-bold pointer-events-none">
            {q.emoji}
          </div>
          {fotoStr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoStr}
              alt=""
              className="relative w-full h-full object-contain p-1"
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
              {q.label}
            </p>
            {isTop && (
              <span className="flex-shrink-0 text-[9px] font-bold bg-yellow-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                ⭐ Top
              </span>
            )}
          </div>

          {/* Macros compactos */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] mb-2">
            <span className="font-bold text-[#0C3547]">{q.kcal} kcal</span>
            <span className="text-[#8BA5BE]">·</span>
            <span><span className="font-bold text-violet-700">{q.p}g</span> <span className="text-[#8BA5BE]">prot</span></span>
            <span className="text-[#8BA5BE]">·</span>
            <span className={cn(
              'font-bold',
              q.sodioMg <= 100 ? 'text-emerald-700'
                : q.sodioMg <= 150 ? 'text-amber-700'
                : 'text-rose-700',
            )}>
              {q.sodioMg}mg sodio
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {visibleTags.map(t => {
              const meta = QUESO_USO_LABELS[t]
              return (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800"
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
                className="text-[9px] font-bold text-yellow-600 px-1.5"
              >
                +{tags.length - 3}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Detalle expandido: descripción clínica */}
      {expanded && (
        <div className="border-t border-yellow-100 px-3 py-2.5 bg-yellow-50/30 text-[10px] text-[#4a6b80] space-y-1.5">
          <p className="italic leading-relaxed">{q.descripcion}</p>
        </div>
      )}

      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full py-1.5 text-[10px] font-bold text-yellow-600 hover:bg-yellow-50 border-t border-[#E2ECF4]"
      >
        {expanded ? 'Ocultar detalle' : 'Ver detalle clínico'}
      </button>
    </div>
  )
}
