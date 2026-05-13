'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Sparkline, MiniBar, Ring } from '@/components/ui/Sparkline'
import type { Macros } from '@/lib/nutrition'
import { TrendingUp, TrendingDown, Minus, Scale, CheckCircle2, Circle } from 'lucide-react'

interface DayLog {
  fecha: string
  actualKcal: number
  macroP: number
  macroC: number
  macroG: number
  peso?: number
  completed: number
  total: number
}

interface Props {
  userId: string
  targetKcal?: number
  macros?: Macros
}

const MEALS = [
  { id: 'desayuno',   label: 'Desayuno',        icon: '🌅', pct: 0.25 },
  { id: 'col_manana', label: 'Colación mañana',  icon: '☕', pct: 0.10 },
  { id: 'almuerzo',   label: 'Almuerzo',         icon: '🍽️', pct: 0.35 },
  { id: 'once',       label: 'Once',             icon: '🫖', pct: 0.15 },
  { id: 'cena',       label: 'Cena',             icon: '🌙', pct: 0.15 },
]

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({
  label, value, unit, sub, color, chart, trend
}: {
  label: string
  value: string
  unit?: string
  sub?: string
  color: string
  chart?: number[]
  trend?: 'up' | 'down' | 'flat'
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-400' : 'text-[#8BA5BE]'

  return (
    <div className="bg-white rounded-2xl border border-[#E2ECF4] p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-widest">{label}</p>
        {trend && <TrendIcon size={14} className={trendColor} />}
      </div>
      <div>
        <span className={cn('text-3xl font-black leading-none', color)}>{value}</span>
        {unit && <span className="text-xs text-[#8BA5BE] ml-1 font-medium">{unit}</span>}
        {sub && <p className="text-[10px] text-[#8BA5BE] mt-1">{sub}</p>}
      </div>
      {chart && chart.length > 1 && (
        <Sparkline data={chart} width={110} height={32} color={color.replace('text-', '')} fill={`${color.replace('text-', '')}18`} />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function CalorieDashboard({ userId, targetKcal = 2000, macros }: Props) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({})
  const [peso, setPeso] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weekLogs, setWeekLogs] = useState<DayLog[]>([])

  useEffect(() => { loadToday(); loadWeek() }, [])

  async function loadToday() {
    const { data } = await supabase
      .from('registros_diarios').select('*')
      .eq('user_id', userId).eq('fecha', today).single()
    if (data) {
      setPeso(data.peso?.toString() || '')
      try { setCheckedMeals(JSON.parse(data.meals_json || '{}')) } catch { /* noop */ }
    }
  }

  async function loadWeek() {
    const desde = new Date()
    desde.setDate(desde.getDate() - 6)
    const { data } = await supabase
      .from('registros_diarios').select('*')
      .eq('user_id', userId)
      .gte('fecha', desde.toISOString().split('T')[0])
      .order('fecha', { ascending: true })
    if (data) setWeekLogs(data)
  }

  const completedCount = Object.values(checkedMeals).filter(Boolean).length
  const adherencia = Math.round((completedCount / MEALS.length) * 100)
  const kcalEstimada = MEALS.reduce((s, m) =>
    checkedMeals[m.id] ? s + Math.round(targetKcal * m.pct) : s, 0)
  const deficit = targetKcal - kcalEstimada
  const progressPct = Math.min((kcalEstimada / targetKcal) * 100, 100)

  async function handleSave() {
    setSaving(true)
    await supabase.from('registros_diarios').upsert({
      user_id: userId, fecha: today,
      actualKcal: kcalEstimada, completed: completedCount,
      total: MEALS.length, peso: peso ? Number(peso) : null,
      meals_json: JSON.stringify(checkedMeals),
    }, { onConflict: 'user_id,fecha' })
    setSaving(false); setSaved(true); loadWeek()
    setTimeout(() => setSaved(false), 2000)
  }

  // Chart data from week logs
  const kcalHistory = weekLogs.map(d => d.actualKcal || 0)
  const pesoHistory = weekLogs.filter(d => d.peso).map(d => d.peso as number)
  const adherenciaHistory = weekLogs.map(d => d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0)

  return (
    <div className="space-y-5">
      {/* ── Metric cards row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Meta calórica"
          value={targetKcal.toLocaleString()}
          unit="kcal"
          color="text-[#0C3547]"
          trend="flat"
        />
        <MetricCard
          label="Consumido hoy"
          value={kcalEstimada.toLocaleString()}
          unit="kcal"
          sub={`${Math.round(progressPct)}% del objetivo`}
          color="text-[#29ABE2]"
          chart={kcalHistory.length > 0 ? [...kcalHistory, kcalEstimada] : undefined}
          trend={kcalEstimada > targetKcal ? 'up' : 'flat'}
        />
        <MetricCard
          label={deficit >= 0 ? 'Diferencia' : 'Exceso'}
          value={Math.abs(deficit).toLocaleString()}
          unit="kcal"
          color={deficit >= 0 ? 'text-green-600' : 'text-red-500'}
          trend={deficit >= 0 ? 'down' : 'up'}
        />
        <MetricCard
          label="Adherencia"
          value={`${adherencia}`}
          unit="%"
          sub={`${completedCount}/${MEALS.length} comidas`}
          color={adherencia >= 80 ? 'text-green-600' : 'text-amber-500'}
          chart={adherenciaHistory.length > 0 ? [...adherenciaHistory, adherencia] : undefined}
          trend={adherencia >= 80 ? 'up' : 'flat'}
        />
      </div>

      {/* ── Main grid: progress + checklist + macros ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Checklist de comidas ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0C1F2C]">Registro de comidas del día</h3>
            <span className="text-xs text-[#8BA5BE] font-medium bg-[#F0F6FA] px-2 py-1 rounded-lg">
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-[#8BA5BE] mb-1.5">
              <span>{kcalEstimada} kcal consumidas</span>
              <span>Meta: {targetKcal.toLocaleString()} kcal</span>
            </div>
            <div className="h-2 bg-[#F0F6FA] rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6 }}
                className={cn('h-full rounded-full', progressPct > 100 ? 'bg-red-400' : progressPct >= 80 ? 'bg-green-400' : 'bg-[#29ABE2]')}
              />
            </div>
          </div>

          <div className="space-y-2">
            {MEALS.map((meal, i) => {
              const checked = !!checkedMeals[meal.id]
              const mealKcal = Math.round(targetKcal * meal.pct)
              return (
                <motion.button
                  key={meal.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setCheckedMeals(p => ({ ...p, [meal.id]: !p[meal.id] }))}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    checked ? 'bg-green-50 border-green-200' : 'border-[#E2ECF4] hover:border-[#29ABE2]/40'
                  )}
                >
                  {checked
                    ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                    : <Circle size={18} className="text-[#C8D8E4] flex-shrink-0" />
                  }
                  <span className="text-lg flex-shrink-0">{meal.icon}</span>
                  <span className={cn('flex-1 text-sm font-semibold', checked ? 'text-green-700 line-through' : 'text-[#0C1F2C]')}>
                    {meal.label}
                  </span>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-[#29ABE2]">{mealKcal}</span>
                    <span className="text-xs text-[#8BA5BE]"> kcal</span>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Peso + save */}
          <div className="flex gap-3 mt-4">
            <div className="flex items-center gap-2 flex-1 border border-[#E2ECF4] rounded-xl px-3 py-2.5">
              <Scale size={14} className="text-[#8BA5BE] flex-shrink-0" />
              <input
                type="number" step="0.1" value={peso}
                onChange={e => setPeso(e.target.value)}
                placeholder="Peso corporal (kg)"
                className="flex-1 text-sm text-[#0C1F2C] bg-transparent outline-none placeholder:text-[#C8D8E4]"
              />
            </div>
            <button
              onClick={handleSave} disabled={saving}
              className={cn(
                'px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all flex-shrink-0',
                saved ? 'bg-green-500' : 'bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] hover:opacity-90'
              )}
            >
              {saved ? '✅ Guardado' : saving ? '...' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* ── Right: Macros + adherencia ring ── */}
        <div className="space-y-4">
          {/* Adherencia ring */}
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm flex flex-col items-center gap-3">
            <p className="text-xs font-bold text-[#8BA5BE] uppercase tracking-widest w-full">Adherencia del día</p>
            <Ring
              pct={adherencia}
              size={100}
              strokeWidth={10}
              color={adherencia >= 80 ? '#22c55e' : '#f59e0b'}
              label={`${adherencia}%`}
              sublabel="completado"
            />
            <p className="text-xs text-[#8BA5BE]">{completedCount} de {MEALS.length} comidas</p>
          </div>

          {/* Macros del plan */}
          {macros && (
            <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
              <p className="text-xs font-bold text-[#8BA5BE] uppercase tracking-widest mb-3">Macros del plan</p>
              <div className="space-y-3">
                {[
                  { name: 'Proteína', g: macros.p, kcalPer: 4, color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700' },
                  { name: 'Carboh.', g: macros.c, kcalPer: 4, color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
                  { name: 'Grasas', g: macros.g, kcalPer: 9, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
                ].map(m => {
                  const kcalMacro = m.g * m.kcalPer
                  const totalKcal = (macros.p * 4) + (macros.c * 4) + (macros.g * 9)
                  const pct = Math.round((kcalMacro / totalKcal) * 100)
                  return (
                    <div key={m.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={cn('font-semibold', m.text)}>{m.name}</span>
                        <span className="text-[#8BA5BE]">{m.g}g · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F0F6FA] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Historial semana ── */}
      {weekLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0C1F2C]">Tendencia semanal · Calorías</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#29ABE2]" />
              <span className="text-[10px] text-[#8BA5BE] font-medium">Calorías consumidas</span>
            </div>
          </div>

          {/* Mini bar chart */}
          <div className="flex items-end gap-2 h-16">
            {weekLogs.map((d, i) => {
              const adh = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
              const isToday = d.fecha === today
              const kcalPct = Math.min((d.actualKcal / targetKcal) * 100, 100)
              return (
                <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-[#F0F6FA] rounded-lg relative" style={{ height: '52px' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${kcalPct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.04 }}
                      className={cn('absolute bottom-0 left-0 right-0 rounded-lg', isToday ? 'bg-[#29ABE2]' : 'bg-[#29ABE2]/30')}
                    />
                  </div>
                  <span className="text-[9px] text-[#8BA5BE] font-medium">
                    {isToday ? 'Hoy' : new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short' }).slice(0,3)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Table */}
          <div className="mt-4 space-y-1.5">
            {weekLogs.slice(-4).reverse().map(d => {
              const adh = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
              const isToday = d.fecha === today
              return (
                <div key={d.fecha} className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs',
                  isToday ? 'bg-[#EAF4FB]' : 'bg-[#F8FBFD]'
                )}>
                  <span className={cn('font-semibold', isToday ? 'text-[#0C3547]' : 'text-[#6B7C93]')}>
                    {isToday ? 'Hoy' : new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[#6B7C93]">{d.actualKcal || 0} kcal</span>
                    <span className={cn('font-bold px-2 py-0.5 rounded-full', adh >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {adh}%
                    </span>
                    {d.peso && <span className="text-[#8BA5BE]">{d.peso} kg</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
