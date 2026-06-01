'use client'

/**
 * YogurComparativo — Tabla educativa de yogures para el paciente.
 *
 * Muestra los 6 yogures del catálogo con foto + macros por porción + tags de uso
 * (pre-entreno, post-entreno, cena ligera, etc.) calculados desde su composición.
 *
 * Encabeza con una RECOMENDACIÓN personalizada: el "top pick" para SU perfil
 * (objetivo + tendencia + restricciones digestivas), con la razón explicada.
 *
 * Diseño:
 *   - Mobile: cards apiladas verticales, foto pequeña + macros compactos
 *   - Desktop: grid 2 columnas (3 filas), más aire visual
 *   - Top pick marcado con borde cyan + badge "Recomendado para ti"
 *   - Tags como chips de colores semánticos
 */

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { YOGUR_TIPOS, type YogurTipo } from '@/lib/foods'
import type { FormData } from '@/lib/nutrition'
import {
  rankYoguresParaPaciente,
  razonTopPick,
  USO_LABELS,
} from '@/lib/yogurMatcher'

const TONO_BG: Record<string, string> = {
  amber:  'bg-amber-50 text-amber-800 border-amber-200',
  cyan:   'bg-[#EAF4FB] text-[#0C3547] border-[#29ABE2]/30',
  green:  'bg-emerald-50 text-emerald-800 border-emerald-200',
  rose:   'bg-rose-50 text-rose-800 border-rose-200',
  violet: 'bg-violet-50 text-violet-800 border-violet-200',
}

interface Props {
  /** Perfil del paciente para personalizar la recomendación. Si no hay form
   *  (paciente sin plan generado), se muestra ranking neutral. */
  form?: Partial<FormData>
}

export function YogurComparativo({ form = {} }: Props) {
  const [open, setOpen] = useState(false)

  const ranking = useMemo(() => rankYoguresParaPaciente(form), [form])
  const topPick = ranking[0]
  const razon   = useMemo(() => topPick ? razonTopPick(topPick.tipo, form) : '', [topPick, form])

  return (
    <section className="bg-white rounded-2xl border border-[#E2ECF4] overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#F8FBFD] transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4FB] flex items-center justify-center text-xl flex-shrink-0">
            🥛
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-[#0C3547]">Comparador de yogures</p>
            <p className="text-[11px] text-[#8BA5BE] leading-tight">
              {ranking.length} opciones · recomendación personalizada
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
              {/* Top pick — recomendación personalizada */}
              {topPick && topPick.score >= 50 && (
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">Recomendado para ti</span>
                  </div>
                  <p className="text-base font-black leading-tight mb-1">
                    {YOGUR_TIPOS[topPick.tipo].emoji} {YOGUR_TIPOS[topPick.tipo].label}
                  </p>
                  <p className="text-xs opacity-95 leading-relaxed">
                    {razon}
                  </p>
                </div>
              )}

              {/* Leyenda compacta de tags */}
              <div className="mb-4 text-[10px] text-[#8BA5BE] leading-relaxed">
                Los <strong className="text-[#0C3547]">badges</strong> indican el mejor uso de cada yogur según
                tu objetivo y contenido nutricional. Toca un yogur para ver detalle.
              </div>

              {/* Grid de yogures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ranking.map(({ tipo, tags, topPick: isTop, score }) => (
                  <YogurCard
                    key={tipo}
                    tipo={tipo}
                    tags={tags}
                    isTop={isTop && score >= 50}
                    score={score}
                  />
                ))}
              </div>

              {/* Disclaimer clínico */}
              <p className="mt-4 text-[10px] text-[#8BA5BE] leading-relaxed italic">
                Las sugerencias se calculan desde tu objetivo + restricciones digestivas + tendencia
                alimentaria. Conversa con tu nutricionista si tienes condiciones médicas específicas
                (diabetes, insuficiencia renal, etc.).
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Card individual ──────────────────────────────────────────────────────────
function YogurCard({
  tipo,
  tags,
  isTop,
  score,
}: {
  tipo: YogurTipo
  tags: ReturnType<typeof rankYoguresParaPaciente>[number]['tags']
  isTop: boolean
  score: number
}) {
  const y = YOGUR_TIPOS[tipo]
  const [expanded, setExpanded] = useState(false)

  // Mostrar máx 4 tags en la card colapsada para no saturar visual.
  const visibleTags = expanded ? tags : tags.slice(0, 4)

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden transition',
        isTop ? 'border-[#29ABE2] bg-[#F8FBFD] shadow-sm' : 'border-[#E2ECF4] bg-white hover:border-[#29ABE2]/40',
        score === 0 && 'opacity-60'
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Foto producto */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#EAF4FB] to-[#D6E3ED] relative">
          <div className="absolute inset-0 flex items-center justify-center text-[#29ABE2] text-xl font-bold pointer-events-none">
            {y.emoji}
          </div>
          {y.foto && (
            <img
              src={y.foto}
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[13px] font-black text-[#0C3547] leading-tight line-clamp-2">
              {y.label}
            </p>
            {isTop && (
              <span className="flex-shrink-0 text-[9px] font-bold bg-[#29ABE2] text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                ⭐ Top
              </span>
            )}
          </div>

          {/* Macros compactos */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] mb-2">
            <span className="font-bold text-[#0C3547]">{y.kcal} kcal</span>
            <span className="text-[#8BA5BE]">·</span>
            <span><span className="font-bold text-violet-700">{y.p}g</span> <span className="text-[#8BA5BE]">prot</span></span>
            <span className="text-[#8BA5BE]">·</span>
            <span><span className="font-bold text-amber-700">{y.c}g</span> <span className="text-[#8BA5BE]">CH</span></span>
            <span className="text-[#8BA5BE]">·</span>
            <span><span className="font-bold text-rose-700">{y.g}g</span> <span className="text-[#8BA5BE]">grasa</span></span>
          </div>

          {/* Tags de uso */}
          <div className="flex flex-wrap gap-1">
            {visibleTags.map(t => {
              const meta = USO_LABELS[t]
              return (
                <span
                  key={t}
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border',
                    TONO_BG[meta.tono]
                  )}
                  title={meta.label}
                >
                  <span>{meta.emoji}</span>
                  <span className="hidden sm:inline">{meta.label}</span>
                </span>
              )
            })}
            {!expanded && tags.length > 4 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-[9px] font-bold text-[#29ABE2] px-1.5"
              >
                +{tags.length - 4}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Porción + alérgenos (expandible) */}
      {expanded && (
        <div className="border-t border-[#E2ECF4] px-3 py-2 bg-[#F8FBFD] text-[10px] text-[#4a6b80] space-y-1">
          <p><strong className="text-[#0C3547]">Porción:</strong> {y.item.replace(/^Yogur\s+/i, '')}</p>
          {y.alergenosNota && (
            <p className="italic">{y.alergenosNota.replace(/^⚠️\s*/, '')}</p>
          )}
        </div>
      )}

      {/* Toggle expand */}
      {tags.length > 0 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full py-1.5 text-[10px] font-bold text-[#29ABE2] hover:bg-[#EAF4FB] border-t border-[#E2ECF4]"
        >
          {expanded ? 'Ocultar detalle' : 'Ver detalle'}
        </button>
      )}
    </div>
  )
}
