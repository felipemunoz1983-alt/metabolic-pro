'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { PlanResult } from '@/components/plan/PlanResult'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { OBJETIVO_LABELS } from '@/lib/nutrition'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, RefreshCw, Target, Flame,
  Beef, Wheat, Droplets, Calendar, ChevronRight,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PlanRow {
  id: string
  user_id: string
  objetivo: string
  kcal: number
  proteina: number
  carbohidrato: number
  grasa: number
  plan_json: { form: FormData; result: NutritionResult }
  created_at: string
}

// ─── Objetivo badge ─────────────────────────────────────────────────────────
const OBJ_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  'perdida grasa': { bg: 'bg-red-50',   text: 'text-red-600',   dot: 'bg-red-400' },
  'mantenimiento': { bg: 'bg-blue-50',  text: 'text-blue-600',  dot: 'bg-blue-400' },
  'hipertrofia':   { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400' },
}

function ObjetivoBadge({ objetivo }: { objetivo: string }) {
  const s = OBJ_STYLE[objetivo] ?? { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' }
  const label = OBJETIVO_LABELS[objetivo as keyof typeof OBJETIVO_LABELS] ?? objetivo
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', s.dot)} />
      {label}
    </span>
  )
}

// ─── Plan card ──────────────────────────────────────────────────────────────
function PlanCard({ plan, index, onClick }: { plan: PlanRow; index: number; onClick: () => void }) {
  const date = new Date(plan.created_at)
  const dateLabel = date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

  const macros = [
    { label: 'Prot', value: plan.proteina,    unit: 'g', icon: Beef,     color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Carb', value: plan.carbohidrato, unit: 'g', icon: Wheat,    color: 'text-blue-600',  bg: 'bg-blue-50' },
    { label: 'Gras', value: plan.grasa,        unit: 'g', icon: Droplets, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="w-full text-left bg-white border border-[#E2ECF4] rounded-2xl p-5 hover:border-[#29ABE2]/40 hover:shadow-md transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <ObjetivoBadge objetivo={plan.objetivo} />
          </div>
          <p className="text-base font-black text-[#0C1F2C] truncate">
            {plan.plan_json?.form?.nombre || 'Plan sin nombre'}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[#8BA5BE]">
            <Calendar size={11} />
            <span className="text-[11px]">{dateLabel} · {timeLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <Flame size={13} className="text-[#29ABE2]" />
              <span className="text-xl font-black text-[#0C1F2C]">{plan.kcal.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-[#8BA5BE] font-medium">kcal/día</span>
          </div>
          <ChevronRight size={16} className="text-[#C8D8E4] group-hover:text-[#29ABE2] transition-colors" />
        </div>
      </div>

      {/* Macros row */}
      <div className="grid grid-cols-3 gap-2">
        {macros.map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} className={cn('flex items-center gap-2 rounded-xl px-3 py-2', m.bg)}>
              <Icon size={13} className={m.color} />
              <div>
                <p className="text-[9px] text-[#8BA5BE] font-medium leading-none">{m.label}</p>
                <p className={cn('text-sm font-black leading-tight', m.color)}>{m.value}<span className="text-[10px] font-semibold ml-0.5">{m.unit}</span></p>
              </div>
            </div>
          )
        })}
      </div>
    </motion.button>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────
function EmptyHistorial() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-[400px] text-center px-8"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#EAF4FB] to-[#D6E8F5] flex items-center justify-center mb-5 shadow-sm">
        <span className="text-4xl">🗂️</span>
      </div>
      <h3 className="text-lg font-black text-[#0C3547] mb-2">Sin planes aún</h3>
      <p className="text-sm text-[#8BA5BE] max-w-xs leading-relaxed">
        Cuando generes un plan nutricional desde la pestaña <span className="font-semibold text-[#29ABE2]">Nutrición</span>, aparecerá aquí con todos sus detalles.
      </p>
      <div className="mt-6 flex gap-2 text-[10px] font-bold text-[#8BA5BE] items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-[#29ABE2]" />
        <span>Los planes se guardan automáticamente al generarlos</span>
      </div>
    </motion.div>
  )
}

// ─── Main Historial ──────────────────────────────────────────────────────────
export function Historial({ userId }: { userId: string }) {
  const supabase = createClient()
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selected, setSelected] = useState<PlanRow | null>(null)
  const [filter, setFilter] = useState<'todos' | 'perdida grasa' | 'mantenimiento' | 'hipertrofia'>('todos')

  useEffect(() => {
    loadPlans().catch(console.error)
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPlans() {
    setLoading(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('planes_nutricionales')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[Historial] loadPlans:', error)
      setLoadError('No se pudo cargar el historial. Intenta de nuevo.')
    }
    setPlans((data as PlanRow[]) || [])
    setLoading(false)
  }

  const filtered = filter === 'todos'
    ? plans
    : plans.filter(p => p.objetivo === filter)

  // ── Plan detail view ──
  if (selected) {
    const { form, result } = selected.plan_json
    return (
      <div className="px-4 py-4 md:px-8 md:py-6 max-w-3xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Volver al historial
        </button>
        <PlanResult
          result={result}
          form={form}
          onReset={() => setSelected(null)}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-extrabold text-[#0C1F2C]">Historial de Planes</h2>
          <p className="text-xs text-[#8BA5BE] mt-0.5">
            {loading ? 'Cargando...' : `${plans.length} plan${plans.length !== 1 ? 'es' : ''} generado${plans.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={loadPlans}
          className="flex items-center gap-2 text-xs text-[#8BA5BE] border border-[#E2ECF4] px-3 py-2 rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {/* Stats summary */}
      {!loading && plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Pérdida de grasa', key: 'perdida grasa', icon: '🔥', color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
            { label: 'Mantenimiento',    key: 'mantenimiento', icon: '⚖️',  color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: 'Hipertrofia',      key: 'hipertrofia',   icon: '💪',  color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          ].map(s => {
            const count = plans.filter(p => p.objetivo === s.key).length
            return (
              <button
                key={s.key}
                onClick={() => setFilter(filter === s.key ? 'todos' : s.key as typeof filter)}
                className={cn(
                  'flex items-center gap-3 bg-white rounded-2xl border p-4 transition-all hover:shadow-sm',
                  filter === s.key ? 'border-[#29ABE2] ring-2 ring-[#29ABE2]/20' : 'border-[#E2ECF4]'
                )}
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', s.bg)}>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <div className="text-left">
                  <p className={cn('text-xl font-black', s.color)}>{count}</p>
                  <p className="text-[10px] text-[#8BA5BE] font-medium leading-tight">{s.label}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filter pill active */}
      {filter !== 'todos' && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-[#8BA5BE]">Filtrando por:</span>
          <button
            onClick={() => setFilter('todos')}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#EAF4FB] text-[#29ABE2] px-3 py-1 rounded-full hover:bg-[#29ABE2]/20 transition"
          >
            <ObjetivoBadge objetivo={filter} />
            <span className="ml-1">✕</span>
          </button>
        </div>
      )}

      {/* Error state */}
      {loadError && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-5 py-4 mb-4 flex items-center gap-3">
          <span>{loadError}</span>
          <button onClick={() => loadPlans().catch(console.error)} className="ml-auto text-xs font-bold underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2ECF4] p-5 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-4 bg-[#F0F6FA] rounded-full w-24 mb-2" />
                  <div className="h-5 bg-[#F0F6FA] rounded-full w-48 mb-1.5" />
                  <div className="h-3 bg-[#F0F6FA] rounded-full w-36" />
                </div>
                <div className="h-8 w-20 bg-[#F0F6FA] rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(j => <div key={j} className="h-10 bg-[#F0F6FA] rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && plans.length === 0 && <EmptyHistorial />}

      {/* No results for filter */}
      {!loading && plans.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm font-bold text-[#0C3547] mb-1">Sin planes con ese objetivo</p>
          <button onClick={() => setFilter('todos')} className="text-xs text-[#29ABE2] font-semibold hover:underline">
            Ver todos los planes
          </button>
        </div>
      )}

      {/* Plans grid */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={i}
                onClick={() => setSelected(plan)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
