'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { WeekPlan, DayPlan, DayMeal } from '@/lib/planGenerator'

interface Props {
  plan: WeekPlan
}

const MEAL_COLORS: Record<DayMeal['tipo'], { bg: string; border: string; text: string; dot: string }> = {
  desayuno:        { bg: 'bg-amber-50',  border: 'border-amber-300',  text: 'text-amber-700',  dot: 'bg-amber-400'  },
  colacion_manana: { bg: 'bg-sky-50',    border: 'border-sky-300',    text: 'text-sky-700',    dot: 'bg-sky-400'    },
  almuerzo:        { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  dot: 'bg-green-500'  },
  once:            { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-400' },
  cena:            { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  ultra:           { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700',    dot: 'bg-red-500'    },
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ plan }: { plan: WeekPlan }) {
  const totalDays = plan.dias.length
  const avgKcal = Math.round(plan.dias.reduce((s, d) => s + d.totalKcal, 0) / totalDays)
  const avgP    = Math.round(plan.dias.reduce((s, d) => s + d.totalP,    0) / totalDays)
  const avgC    = Math.round(plan.dias.reduce((s, d) => s + d.totalC,    0) / totalDays)
  const avgG    = Math.round(plan.dias.reduce((s, d) => s + d.totalG,    0) / totalDays)

  return (
    <div className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-extrabold">🗓️ Plan semanal detallado</h3>
          <p className="text-[#9EC8E0] text-xs mt-0.5">
            {plan.semanas} semana{plan.semanas > 1 ? 's' : ''} · {totalDays} días · Meta: {plan.targetKcal} kcal/día
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Promedio kcal', value: avgKcal.toLocaleString(), unit: 'kcal', color: 'text-[#29ABE2]' },
          { label: 'Proteína',     value: avgP,  unit: 'g', color: 'text-green-400' },
          { label: 'Carbos',       value: avgC,  unit: 'g', color: 'text-blue-300'  },
          { label: 'Grasas',       value: avgG,  unit: 'g', color: 'text-amber-400' },
        ].map(m => (
          <div key={m.label} className="bg-white/10 rounded-xl p-3 text-center">
            <span className="text-xs text-[#9EC8E0] font-semibold uppercase tracking-wide block truncate">{m.label}</span>
            <span className={`text-xl font-black ${m.color}`}>{m.value}</span>
            <span className="text-xs text-[#9EC8E0] ml-1">{m.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Ultra disclaimer banner ──────────────────────────────────────────────────
function UltraBanner({ meal }: { meal: DayMeal }) {
  return (
    <div className="mt-3 space-y-2">
      {/* Warning principal */}
      <div className="flex gap-2 bg-red-100 border border-red-300 rounded-xl p-3">
        <span className="text-lg flex-shrink-0">⚠️</span>
        <div className="text-xs text-red-800">
          <p className="font-bold mb-0.5">Advertencia nutricional</p>
          <p>Este alimento ultra procesado contiene altos niveles de sodio, azúcares añadidos, grasas saturadas y aditivos artificiales. Su consumo debe ser <strong>medido y ajustado a la porción indicada.</strong></p>
        </div>
      </div>

      {/* Sellos */}
      {meal.sellos && meal.sellos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {meal.sellos.map((s, i) => (
            <span key={i} className="text-xs bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg">
              🚫 {s}
            </span>
          ))}
        </div>
      )}

      {/* Alérgenos */}
      {meal.alergenos && meal.alergenos.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-800">
            <strong>Alérgenos:</strong> {meal.alergenos.join(' · ')}
          </p>
        </div>
      )}

      {/* Porción */}
      {meal.porcion && (
        <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
          📏 Porción controlada: {meal.porcion} — no exceder
        </p>
      )}
    </div>
  )
}

// ─── Item renderer — resalta gramos al inicio del texto ──────────────────────
function renderItem(item: string) {
  // Detect gram/ml amounts at the start: "200g", "80-100g", "150ml", "1.5kg"
  const match = item.match(/^(\d+(?:[.,]\d+)?(?:-\d+)?(?:g|ml|kg))\s+(.+)/i)
  if (match) {
    return (
      <>
        <span className="inline-flex items-center bg-[#EAF4FB] border border-[#29ABE2]/30 text-[#0C3547] text-[10px] font-black px-1.5 py-0.5 rounded mr-1.5 leading-none align-middle flex-shrink-0">
          {match[1]}
        </span>
        <span>{match[2]}</span>
      </>
    )
  }
  return <>{item}</>
}

// ─── Single meal row ──────────────────────────────────────────────────────────
function MealRow({ meal }: { meal: DayMeal }) {
  const c = MEAL_COLORS[meal.tipo]
  const tipoLabel =
    meal.tipo === 'colacion_manana' ? 'Colación mañana' :
    meal.tipo === 'once'            ? 'Once' :
    meal.tipo === 'ultra'           ? 'Antojo controlado' :
    meal.tipo.charAt(0).toUpperCase() + meal.tipo.slice(1)

  return (
    <div className={cn('rounded-xl border-l-4 p-4', c.bg, c.border)}>
      {meal.foto && (
        <div className="w-full aspect-[3/2] rounded-xl overflow-hidden mb-3 bg-[#EAF4FB]">
          <img
            src={meal.foto}
            alt={meal.label}
            className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meal.icon}</span>
          <div>
            <span className={cn('text-xs font-bold uppercase tracking-wide', c.text)}>
              {tipoLabel}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#1E2D3D] leading-tight">{meal.label}</p>
              {meal.timingEntreno && (
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                  meal.timingEntreno === 'pre_entreno'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                )}>
                  {meal.timingEntreno === 'pre_entreno' ? '🏋️ Pre-entreno' : '💪 Post-entreno'}
                </span>
              )}
              {meal.tiempo && !meal.esUltra && (
                <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full text-[#0C3547] font-semibold">
                  ⏱ {meal.tiempo}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <span className={cn('text-base font-black', c.text)}>{meal.kcal}</span>
          <span className="text-xs text-[#6B7C93] ml-1">kcal</span>
          <p className="text-xs text-[#6B7C93]">P:{meal.p}g · C:{meal.c}g · G:{meal.g}g</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {meal.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#1E2D3D] leading-relaxed">
            <span className={cn('w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0', c.dot)} />
            <span className="flex-1">{renderItem(item)}</span>
          </li>
        ))}
      </ul>

      {/* Disclaimer ultra procesado */}
      {meal.esUltra && <UltraBanner meal={meal} />}

      {/* Sellos nutricionales (comidas regulares con advertencia, p.ej. Beyond Burger) */}
      {!meal.esUltra && meal.sellos && meal.sellos.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {meal.sellos.map((s, i) => (
              <span key={i} className="text-xs bg-[#7B2020] text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                🚫 {s}
              </span>
            ))}
          </div>
          <div className="flex gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-800">
              <strong>Sello de advertencia nutricional (Ley 20.606).</strong>{' '}
              Consumir con moderación y ajustado a la porción indicada. Este alimento puede incluirse en el plan dentro del contexto de una dieta equilibrada.
            </p>
          </div>
        </div>
      )}

      {/* Ingredientes / alérgenos (solo si el sello está presente o hay nota) */}
      {!meal.esUltra && meal.alergenosNota && (
        <div className="mt-2 flex items-start gap-2 bg-[#F7FBFE] border border-[#D6E3ED] rounded-xl p-3">
          <span className="text-base flex-shrink-0">🧾</span>
          <p className="text-xs text-[#4A6174] leading-relaxed">
            <strong>Ingredientes / alérgenos:</strong> {meal.alergenosNota}
          </p>
        </div>
      )}

      {/* Pasos de preparación (solo comidas regulares) */}
      {!meal.esUltra && meal.pasos && meal.pasos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <p className="text-xs font-bold uppercase tracking-wide mb-2 opacity-70">📋 Preparación</p>
          <ol className="space-y-1.5">
            {meal.pasos.map((paso, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#1E2D3D]">
                <span className={cn('w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5', c.dot, 'text-white')}>
                  {i + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ─── Day card (collapsible) ───────────────────────────────────────────────────
function DayCard({ day, targetKcal, defaultOpen }: { day: DayPlan; targetKcal: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const pct = Math.min(Math.round((day.totalKcal / targetKcal) * 100), 100)
  const diff = day.totalKcal - targetKcal
  const onTarget = Math.abs(diff) <= targetKcal * 0.05

  return (
    <div className="bg-white rounded-2xl border border-[#D6E3ED] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#F8FBFD] transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex flex-col items-center justify-center text-xs font-bold flex-shrink-0',
            open ? 'bg-[#0C3547] text-white' : 'bg-[#EAF4FB] text-[#0C3547]'
          )}>
            <span>{day.nombre.slice(0, 3)}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#0C3547]">{day.nombre}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 h-1.5 bg-[#EAF4FB] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', onTarget ? 'bg-green-400' : 'bg-[#29ABE2]')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-[#6B7C93]">{day.totalKcal} kcal</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-3 text-xs text-[#6B7C93]">
            <span className="text-green-700 font-semibold">P:{day.totalP}g</span>
            <span className="text-blue-700 font-semibold">C:{day.totalC}g</span>
            <span className="text-amber-700 font-semibold">G:{day.totalG}g</span>
          </div>
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', onTarget ? 'bg-green-100 text-green-700' : 'bg-[#EAF4FB] text-[#29ABE2]')}>
            {pct}%
          </span>
          <span className={cn('text-[#6B7C93] transition-transform', open && 'rotate-180')}>▾</span>
        </div>
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
            <div className="px-4 pb-4 space-y-3">
              {day.meals.map((meal, i) => (
                <MealRow key={i} meal={meal} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Week tabs ────────────────────────────────────────────────────────────────
function WeekTabs({ semanas, active, onChange }: { semanas: number; active: number; onChange: (w: number) => void }) {
  if (semanas <= 1) return null
  return (
    <div className="flex gap-1 bg-[#EAF4FB] p-1 rounded-xl">
      {Array.from({ length: semanas }, (_, i) => i + 1).map(w => (
        <button
          key={w}
          onClick={() => onChange(w)}
          className={cn(
            'flex-1 py-2 text-sm font-bold rounded-lg transition-all',
            active === w
              ? 'bg-white text-[#0C3547] shadow-sm'
              : 'text-[#6B7C93] hover:text-[#0C3547]'
          )}
        >
          Semana {w}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WeeklyPlan({ plan }: Props) {
  const [activeWeek, setActiveWeek] = useState(1)

  const weekDays = plan.dias.filter(d => d.semana === activeWeek)

  return (
    <div className="space-y-4">
      <SummaryCard plan={plan} />

      {plan.semanas > 1 && (
        <WeekTabs semanas={plan.semanas} active={activeWeek} onChange={setActiveWeek} />
      )}

      <div className="space-y-3">
        {weekDays.map((day, i) => (
          <DayCard
            key={`${day.semana}-${day.dia}`}
            day={day}
            targetKcal={plan.targetKcal}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </div>
  )
}
