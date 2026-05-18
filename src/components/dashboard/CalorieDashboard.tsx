'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Sparkline, Ring } from '@/components/ui/Sparkline'
import type { Macros, FormData } from '@/lib/nutrition'
import { generarPlan } from '@/lib/planGenerator'
import { TrendingUp, TrendingDown, Minus, Scale, CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, Trophy } from 'lucide-react'

interface DayLog {
  fecha: string
  kcal_consumida: number
  macroP: number
  macroC: number
  macroG: number
  peso?: number
  comidas_completadas: number
  comidas_total: number
  hambre?: number
  energia?: number
  digestivo?: string
  animo?: string
}

interface Props {
  userId: string
  targetKcal?: number
  macros?: Macros
  /** Form completo del paciente — si está presente, los slots de adherencia
   *  se sincronizan con el plan generado (comidasPorDia dinámico, nombres reales). */
  form?: FormData
}

/** Slot de adherencia — puede ser dinámico (desde plan) o fallback estático */
interface MealSlot {
  id: string          // key estable para persistir en meals_json
  label: string       // texto mostrado (nombre real del plato o genérico)
  icon: string        // emoji
  kcal: number        // kcal real del slot, no porcentaje teórico
  foto?: string       // foto del plato si viene del plan
}

/** Fallback estático cuando no hay plan generado — 5 comidas genéricas */
const FALLBACK_MEALS: MealSlot[] = [
  { id: 'desayuno',        label: 'Desayuno',        icon: '🌅', kcal: 500 },
  { id: 'colacion_manana', label: 'Colación mañana', icon: '☕', kcal: 200 },
  { id: 'almuerzo',        label: 'Almuerzo',        icon: '🍽️', kcal: 700 },
  { id: 'once',            label: 'Once',            icon: '🫖', kcal: 300 },
  { id: 'cena',            label: 'Cena',            icon: '🌙', kcal: 300 },
]

/** Migración legacy: registros antiguos usaban 'col_manana' en meals_json.
 *  Si el nuevo plan usa 'colacion_manana', leemos también el valor legacy. */
const LEGACY_KEY_MAP: Record<string, string> = {
  colacion_manana: 'col_manana',
}

/** Tipo → emoji icon (consistente con planGenerator MEAL_ICONS) */
const TIPO_ICONS: Record<string, string> = {
  desayuno: '🌅',
  colacion_manana: '☕',
  almuerzo: '🍽️',
  once: '🫖',
  cena: '🌙',
  ultra_extra: '🍎',
  ultra: '🚨',
}

const HUNGER_LABELS = ['', 'Sin hambre', 'Poca hambre', 'Hambre normal', 'Bastante hambre', 'Mucha hambre']
const ENERGY_LABELS = ['', 'Sin energía', 'Poca energía', 'Energía normal', 'Buena energía', 'Excelente energía']

const DIGESTIVO_OPTS = [
  { value: 'sin_molestias', label: 'Sin molestias', emoji: '✅', color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'leve',          label: 'Leve',           emoji: '🟡', color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'moderado',      label: 'Moderado',       emoji: '🟠', color: 'border-orange-300 bg-orange-50 text-orange-700' },
  { value: 'severo',        label: 'Severo',         emoji: '🔴', color: 'border-red-300 bg-red-50 text-red-700' },
]

const ANIMO_OPTS = [
  { value: 'excelente', label: 'Excelente', emoji: '😄', color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 'bueno',     label: 'Bueno',     emoji: '🙂', color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'regular',   label: 'Regular',   emoji: '😐', color: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'malo',      label: 'Malo',      emoji: '😔', color: 'border-red-300 bg-red-50 text-red-700' },
]

// ── Streak helpers ────────────────────────────────────────────────────────────
function computeStreak(logs: DayLog[], today: string): { current: number; best: number } {
  const loggedDates = new Set(
    logs.filter(l => l.comidas_completadas > 0).map(l => l.fecha)
  )
  // Current streak: walk back from today
  let current = 0
  const d = new Date(today + 'T12:00:00')
  while (loggedDates.has(d.toISOString().split('T')[0])) {
    current++
    d.setDate(d.getDate() - 1)
  }
  // Best streak over loaded period
  const sorted = [...loggedDates].sort()
  let best = 0, run = 0, prev: string | null = null
  for (const date of sorted) {
    if (prev === null) { run = 1 } else {
      const diff = Math.round(
        (new Date(date + 'T12:00:00').getTime() - new Date(prev + 'T12:00:00').getTime()) / 86_400_000
      )
      run = diff === 1 ? run + 1 : 1
    }
    best = Math.max(best, run)
    prev = date
  }
  return { current, best }
}

function getMilestone(streak: number): string | null {
  if (streak === 3)  return '¡Llevas 3 días seguidos! Estás construyendo un hábito 💪'
  if (streak === 7)  return '¡Una semana completa! La consistencia es la clave 🌟'
  if (streak === 14) return '¡Dos semanas sin parar! Tu cuerpo te lo agradece 🏆'
  if (streak === 21) return '¡21 días — el hábito ya está formado! Increíble disciplina 🎯'
  if (streak === 30) return '¡Un mes completo! Eres imparable 🚀'
  if (streak > 30)   return `¡${streak} días seguidos! Rendimiento de élite 🔥`
  return null
}

// ── Resumen semanal (replaces simple StreakBanner) ────────────────────────────
function ResumenSemanal({
  weekLogs,
  streak,
  today,
}: {
  weekLogs: DayLog[]
  streak: { current: number; best: number }
  today: string
}) {
  // Generate last 7 calendar days (oldest → newest, today last)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today + 'T12:00:00')
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const logByDate = Object.fromEntries(weekLogs.map(l => [l.fecha, l]))

  const shortDay = (dateStr: string) => {
    const raw = new Date(dateStr + 'T12:00:00')
      .toLocaleDateString('es-CL', { weekday: 'short' })
      .replace('.', '')
    return raw.charAt(0).toUpperCase() + raw.slice(1, 3)
  }

  const daysLogged = days.filter(d => {
    const log = logByDate[d]
    return log && log.comidas_completadas > 0
  }).length

  const logsWithMeals = weekLogs.filter(l => l.comidas_total > 0)
  const weekAdh = logsWithMeals.length > 0
    ? Math.round(logsWithMeals.reduce((s, l) => s + (l.comidas_completadas / l.comidas_total) * 100, 0) / logsWithMeals.length)
    : 0

  const milestone = getMilestone(streak.current)
  const flameColor = streak.current >= 7 ? 'text-amber-400' : streak.current >= 3 ? 'text-orange-400' : 'text-[#29ABE2]'
  const flameBg    = streak.current >= 7 ? 'bg-amber-500/20' : streak.current >= 3 ? 'bg-orange-500/20' : 'bg-[#29ABE2]/20'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#081F2D] via-[#0C3547] to-[#0e4f6a] rounded-2xl p-5 text-white"
    >
      {/* ── Top row: streak + weekly stats ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        {/* Current streak */}
        <div className="flex items-center gap-3">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', flameBg)}>
            <Flame size={22} className={flameColor} />
          </div>
          <div>
            <p className="text-2xl font-black leading-none">
              {streak.current}
              <span className="text-sm font-semibold text-[#9EC8E0] ml-1">días</span>
            </p>
            <p className="text-[10px] text-[#4A7A94] font-medium">Racha actual</p>
          </div>
        </div>

        {/* Right stats cluster */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Days this week */}
          <div className="text-right">
            <p className="text-xl font-black text-[#29ABE2] leading-none">{daysLogged}<span className="text-sm font-semibold text-[#9EC8E0]">/7</span></p>
            <p className="text-[10px] text-[#4A7A94]">esta semana</p>
          </div>

          {weekAdh > 0 && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <p className={cn('text-xl font-black leading-none', weekAdh >= 80 ? 'text-green-400' : 'text-amber-400')}>
                  {weekAdh}<span className="text-sm font-semibold text-[#9EC8E0]">%</span>
                </p>
                <p className="text-[10px] text-[#4A7A94]">adherencia</p>
              </div>
            </>
          )}

          {streak.best > 0 && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Trophy size={12} className="text-[#29ABE2]" />
                  <p className="text-xl font-black leading-none">{streak.best}</p>
                </div>
                <p className="text-[10px] text-[#4A7A94]">mejor racha</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 7-day dot grid ── */}
      <div className="flex gap-1.5">
        {days.map(date => {
          const log = logByDate[date]
          const logged = !!(log && log.comidas_completadas > 0)
          const isToday = date === today
          const adh = log && log.comidas_total > 0
            ? Math.round((log.comidas_completadas / log.comidas_total) * 100)
            : 0

          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
              {/* Top bar indicator */}
              <div className={cn(
                'w-full h-1.5 rounded-full',
                logged
                  ? adh >= 80 ? 'bg-green-400' : 'bg-amber-400'
                  : isToday ? 'bg-[#29ABE2]/40' : 'bg-white/10'
              )} />
              {/* Circle */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-sm',
                logged
                  ? adh >= 80 ? 'bg-green-400/20' : 'bg-amber-400/20'
                  : isToday ? 'bg-[#29ABE2]/20 ring-1 ring-[#29ABE2]/50' : 'bg-white/5'
              )}>
                <span className="text-sm leading-none">
                  {logged ? (adh >= 80 ? '✅' : '🟡') : isToday ? '📍' : '○'}
                </span>
              </div>
              {/* Day label */}
              <span className={cn(
                'text-[9px] font-semibold',
                isToday ? 'text-[#29ABE2]' : logged ? 'text-[#9EC8E0]' : 'text-[#4A7A94]'
              )}>
                {shortDay(date)}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Milestone or motivation ── */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-xs text-[#9EC8E0] leading-snug">
          {milestone ?? (streak.current >= 7
            ? `¡Racha increíble! Sigue para llegar a ${streak.current < 14 ? 14 : streak.current < 21 ? 21 : 30} días.`
            : streak.current >= 1
            ? `¡Vas bien! Llega a 3 días seguidos para tu primer hito. 💪`
            : `Registra hoy para empezar tu racha 🔥`
          )}
        </p>
      </div>
    </motion.div>
  )
}

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

// ── Star / number scale ────────────────────────────────────────────────────────
function ScaleSelector({
  value, onChange, labels, colorFn
}: {
  value: number
  onChange: (v: number) => void
  labels: string[]
  colorFn: (v: number) => string
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'flex-1 h-9 rounded-xl border-2 text-sm font-black transition-all',
            value === v
              ? `${colorFn(v)} border-current`
              : 'border-[#E2ECF4] text-[#C8D8E4] hover:border-[#29ABE2]/40'
          )}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function CalorieDashboard({ userId, targetKcal = 2000, macros, form }: Props) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // ── Slots dinámicos según plan del paciente ───────────────────────────────
  // Si hay form persistido, generamos el plan del día actual y extraemos los
  // meals reales. Si no, fallback a 5 comidas genéricas (paciente sin plan aún).
  const MEALS: MealSlot[] = useMemo(() => {
    if (!form) return FALLBACK_MEALS
    try {
      const plan = generarPlan(form, targetKcal)
      // Día actual: 0=Lunes ... 6=Domingo según locale; JS getDay() devuelve 0=Domingo
      // Plan usa 0=Lunes. Mapeamos: (getDay()+6)%7
      const todayIdx = (new Date().getDay() + 6) % 7
      const dia = plan.dias[todayIdx]
      if (!dia || dia.meals.length === 0) return FALLBACK_MEALS
      // Trackeamos solo las comidas regulares (no ultras planificados puntuales).
      // Si comidasPorDia=6, planGenerator emite 2 'once' con tipo='once' — usamos
      // posición para evitar colisión de keys en meals_json.
      const regulares = dia.meals.filter(m => m.tipo !== 'ultra')
      const tipoCount: Record<string, number> = {}
      return regulares.map(m => {
        const seen = tipoCount[m.tipo] ?? 0
        tipoCount[m.tipo] = seen + 1
        const id = seen === 0 ? m.tipo : `${m.tipo}_${seen + 1}`
        return {
          id,
          label: m.label,
          icon: TIPO_ICONS[m.tipo] ?? m.icon ?? '🍴',
          kcal: m.kcal,
          foto: m.foto,
        }
      })
    } catch (e) {
      console.error('[CalorieDashboard] error generando plan del día:', e)
      return FALLBACK_MEALS
    }
  }, [form, targetKcal])

  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({})
  const [peso, setPeso] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [monthLogs, setMonthLogs] = useState<DayLog[]>([])   // last 30 days
  const [wellbeingOpen, setWellbeingOpen] = useState(false)
  const [streak, setStreak] = useState({ current: 0, best: 0 })

  // Subjective fields
  const [hambre, setHambre] = useState(0)
  const [energia, setEnergia] = useState(0)
  const [digestivo, setDigestivo] = useState('')
  const [animo, setAnimo] = useState('')
  const [nota, setNota] = useState('')

  // ── Loaders (declarados antes del useEffect que los llama: evita TDZ) ─────
  async function loadToday() {
    const { data, error } = await supabase
      .from('registros_diarios').select('*')
      .eq('user_id', userId).eq('fecha', today).maybeSingle()
    if (error) { console.error('[CalorieDashboard] loadToday:', error); return }
    if (data) {
      setPeso(data.peso?.toString() || '')
      try {
        const raw: Record<string, boolean> = JSON.parse(data.meals_json || '{}')
        // Migración legacy: si el registro antiguo tiene 'col_manana', leemos su valor
        // como 'colacion_manana' (key actual del planGenerator) sin perder histórico.
        const migrated: Record<string, boolean> = { ...raw }
        for (const [newKey, legacyKey] of Object.entries(LEGACY_KEY_MAP)) {
          if (raw[legacyKey] !== undefined && migrated[newKey] === undefined) {
            migrated[newKey] = raw[legacyKey]
          }
        }
        setCheckedMeals(migrated)
      } catch { /* noop */ }
      if (data.hambre)    setHambre(data.hambre)
      if (data.energia)   setEnergia(data.energia)
      if (data.digestivo) setDigestivo(data.digestivo)
      if (data.animo)     setAnimo(data.animo)
      if (data.nota)      setNota(data.nota)
    }
  }

  async function loadMonth() {
    const desde = new Date()
    desde.setDate(desde.getDate() - 29)
    const { data, error } = await supabase
      .from('registros_diarios').select('*')
      .eq('user_id', userId)
      .gte('fecha', desde.toISOString().split('T')[0])
      .order('fecha', { ascending: true })
    if (error) { console.error('[CalorieDashboard] loadMonth:', error); return }
    if (data) {
      setMonthLogs(data)
      setStreak(computeStreak(data, today))
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch on mount sets state when ready
    loadToday().catch(console.error)
    loadMonth().catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Solo contamos comidas REALES del plan (no las claves legacy que ya migramos)
  const completedCount = MEALS.reduce((n, m) => n + (checkedMeals[m.id] ? 1 : 0), 0)
  const adherencia = MEALS.length > 0 ? Math.round((completedCount / MEALS.length) * 100) : 0
  // kcalEstimada usa las kcal REALES de cada slot del plan, no porcentajes teóricos
  const kcalEstimada = MEALS.reduce((s, m) => checkedMeals[m.id] ? s + m.kcal : s, 0)
  const deficit = targetKcal - kcalEstimada
  const progressPct = Math.min((kcalEstimada / targetKcal) * 100, 100)

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('registros_diarios').upsert({
      user_id: userId, fecha: today,
      kcal_consumida: kcalEstimada,
      comidas_completadas: completedCount,
      comidas_total: MEALS.length,
      peso: peso ? Number(peso) : null,
      meals_json: JSON.stringify(checkedMeals),
      hambre:    hambre    || null,
      energia:   energia   || null,
      digestivo: digestivo || null,
      animo:     animo     || null,
      nota:      nota      || null,
    }, { onConflict: 'user_id,fecha' })
    setSaving(false)
    if (error) {
      console.error('[CalorieDashboard] save error:', error)
      setSaveError('Error al guardar. Intenta de nuevo.')
      return
    }
    setSaved(true)
    loadMonth().catch(console.error)
    setTimeout(() => setSaved(false), 2500)
  }

  // Last 7 days for weekly chart (slice from monthLogs)
  const weekLogs = monthLogs.slice(-7)

  // Chart data
  const kcalHistory = weekLogs.map(d => d.kcal_consumida || 0)
  const adherenciaHistory = weekLogs.map(d => d.comidas_total > 0 ? Math.round((d.comidas_completadas / d.comidas_total) * 100) : 0)

  // Weight evolution last 30d
  const weightEntries = monthLogs.filter(d => d.peso).map(d => ({ fecha: d.fecha, peso: d.peso! }))
  const weightDiff = weightEntries.length >= 2
    ? +(weightEntries[weightEntries.length - 1].peso - weightEntries[0].peso).toFixed(1)
    : null

  // Wellbeing completeness
  const wellbeingFilled = [hambre > 0, energia > 0, digestivo !== '', animo !== ''].filter(Boolean).length
  const wellbeingComplete = wellbeingFilled === 4

  return (
    <div className="space-y-5">
      {/* ── Resumen semanal ── */}
      <ResumenSemanal weekLogs={weekLogs} streak={streak} today={today} />

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

      {/* ── Main grid: checklist + ring + macros ── */}
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
            <div className="flex justify-between text-[10px] sm:text-xs text-[#8BA5BE] mb-1.5">
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
                  {/* Foto del plato (si viene del plan) — fallback a emoji */}
                  {meal.foto ? (
                    <span className="w-9 h-9 flex-shrink-0 overflow-hidden rounded-lg bg-[#F0F6FA]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meal.foto}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </span>
                  ) : (
                    <span className="text-lg flex-shrink-0">{meal.icon}</span>
                  )}
                  <span className={cn('flex-1 text-sm font-semibold leading-tight', checked ? 'text-green-700 line-through' : 'text-[#0C1F2C]')}>
                    {meal.label}
                  </span>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-[#29ABE2]">{meal.kcal}</span>
                    <span className="text-xs text-[#8BA5BE]"> kcal</span>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Peso + save */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
            <div className="flex items-center gap-2 flex-1 border border-[#E2ECF4] rounded-xl px-3 py-2.5 bg-white">
              <Scale size={14} className="text-[#8BA5BE] flex-shrink-0" />
              <input
                type="number" step="0.1" value={peso}
                onChange={e => setPeso(e.target.value)}
                placeholder="Peso (kg)"
                className="flex-1 min-w-0 text-sm text-[#0C1F2C] bg-transparent outline-none placeholder:text-[#C8D8E4]"
              />
            </div>
            <button
              onClick={handleSave} disabled={saving}
              className={cn(
                'w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all text-center',
                saved ? 'bg-green-500' : 'bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] hover:opacity-90 disabled:opacity-50'
              )}
            >
              {saved ? '✅ Guardado' : saving ? 'Guardando...' : 'Guardar día'}
            </button>
          </div>
        </div>

        {/* ── Right: Adherencia ring + macros ── */}
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
                  { name: 'Carboh.',  g: macros.c, kcalPer: 4, color: '#3b82f6', bg: 'bg-blue-50',  text: 'text-blue-700' },
                  { name: 'Grasas',   g: macros.g, kcalPer: 9, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
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

      {/* ── Bienestar del día ── */}
      <div className="bg-white rounded-2xl border border-[#E2ECF4] shadow-sm overflow-hidden">
        <button
          onClick={() => setWellbeingOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FBFD] transition"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">💬</span>
            <div className="text-left">
              <p className="text-sm font-bold text-[#0C1F2C]">Bienestar del día</p>
              <p className="text-[10px] text-[#8BA5BE]">
                {wellbeingComplete
                  ? 'Completado · gracias por tu registro'
                  : `${wellbeingFilled}/4 campos completados`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wellbeingComplete && (
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓</span>
            )}
            {wellbeingOpen
              ? <ChevronUp size={16} className="text-[#8BA5BE]" />
              : <ChevronDown size={16} className="text-[#8BA5BE]" />}
          </div>
        </button>

        {wellbeingOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-5 space-y-5 border-t border-[#F0F6FA]"
          >
            {/* Hambre */}
            <div className="pt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-[#0C1F2C]">🍽️ Nivel de hambre</p>
                {hambre > 0 && (
                  <span className="text-xs text-[#8BA5BE]">{HUNGER_LABELS[hambre]}</span>
                )}
              </div>
              <ScaleSelector
                value={hambre}
                onChange={setHambre}
                labels={HUNGER_LABELS}
                colorFn={v => v <= 2 ? 'text-green-600 border-green-400 bg-green-50'
                  : v === 3 ? 'text-blue-600 border-blue-400 bg-blue-50'
                  : 'text-amber-600 border-amber-400 bg-amber-50'}
              />
              <div className="flex justify-between text-[9px] text-[#C8D8E4] mt-1 px-0.5">
                <span>Sin hambre</span><span>Mucha hambre</span>
              </div>
            </div>

            {/* Energía */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-[#0C1F2C]">⚡ Nivel de energía</p>
                {energia > 0 && (
                  <span className="text-xs text-[#8BA5BE]">{ENERGY_LABELS[energia]}</span>
                )}
              </div>
              <ScaleSelector
                value={energia}
                onChange={setEnergia}
                labels={ENERGY_LABELS}
                colorFn={v => v <= 2 ? 'text-red-500 border-red-400 bg-red-50'
                  : v === 3 ? 'text-amber-600 border-amber-400 bg-amber-50'
                  : 'text-green-600 border-green-400 bg-green-50'}
              />
              <div className="flex justify-between text-[9px] text-[#C8D8E4] mt-1 px-0.5">
                <span>Sin energía</span><span>Excelente</span>
              </div>
            </div>

            {/* Digestivo */}
            <div>
              <p className="text-xs font-bold text-[#0C1F2C] mb-2">🫁 Molestias digestivas</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIGESTIVO_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDigestivo(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                      digestivo === opt.value ? opt.color : 'border-[#E2ECF4] text-[#8BA5BE] hover:border-[#29ABE2]/40'
                    )}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ánimo */}
            <div>
              <p className="text-xs font-bold text-[#0C1F2C] mb-2">😊 Estado de ánimo</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ANIMO_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAnimo(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                      animo === opt.value ? opt.color : 'border-[#E2ECF4] text-[#8BA5BE] hover:border-[#29ABE2]/40'
                    )}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Nota libre */}
            <div>
              <p className="text-xs font-bold text-[#0C1F2C] mb-2">📝 Nota del día <span className="font-normal text-[#8BA5BE]">(opcional)</span></p>
              <textarea
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ej: hice doble entrenamiento, comí fuera, tuve mucho estrés..."
                rows={2}
                className="w-full text-sm text-[#0C1F2C] border border-[#E2ECF4] rounded-xl px-3 py-2.5 resize-none outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 placeholder:text-[#C8D8E4] transition"
              />
            </div>

            {saveError && (
              <p className="text-xs text-red-500 font-medium mb-1">{saveError}</p>
            )}
            <button
              onClick={handleSave} disabled={saving}
              className={cn(
                'w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all',
                saved ? 'bg-green-500' : 'bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] hover:opacity-90'
              )}
            >
              {saved ? '✅ Guardado' : saving ? 'Guardando...' : 'Guardar bienestar'}
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Evolución de peso 30d ── */}
      {weightEntries.length >= 2 && (
        <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#0C1F2C]">Evolución de peso · 30 días</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[#0C3547]">
                {weightEntries[weightEntries.length - 1].peso} kg
              </span>
              {weightDiff !== null && weightDiff !== 0 && (
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  weightDiff < 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                )}>
                  {weightDiff > 0 ? '+' : ''}{weightDiff} kg
                </span>
              )}
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-16">
            {weightEntries.slice(-20).map((e, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso))
              const max = Math.max(...arr.map(x => x.peso))
              const range = max - min || 1
              const pct = ((e.peso - min) / range) * 65 + 20
              const isLast = i === arr.length - 1
              return (
                <div key={e.fecha} className="flex-1 flex flex-col items-center gap-1">
                  {isLast && (
                    <span className="text-[8px] font-bold text-[#29ABE2]">{e.peso}</span>
                  )}
                  {!isLast && i % Math.max(1, Math.floor(arr.length / 5)) === 0 && (
                    <span className="text-[8px] text-[#C8D8E4]">{e.peso}</span>
                  )}
                  {!isLast && i % Math.max(1, Math.floor(arr.length / 5)) !== 0 && (
                    <span className="text-[8px] text-transparent">0</span>
                  )}
                  <div className="w-full bg-[#F0F6FA] rounded-sm relative" style={{ height: 44 }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.02 }}
                      className={cn(
                        'absolute bottom-0 left-0 right-0 rounded-sm',
                        isLast ? 'bg-[#29ABE2]' : 'bg-[#29ABE2]/35'
                      )}
                    />
                  </div>
                  {isLast && (
                    <span className="text-[8px] text-[#29ABE2] font-bold">Hoy</span>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-[#8BA5BE] mt-3">
            {weightEntries.length} registro{weightEntries.length !== 1 ? 's' : ''} de peso en los últimos 30 días
            {weightDiff !== null && weightDiff < 0 && ` · ${Math.abs(weightDiff)} kg menos desde el inicio 🎯`}
            {weightDiff !== null && weightDiff > 0 && ` · ${weightDiff} kg más desde el inicio`}
          </p>
        </div>
      )}

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
              const isToday = d.fecha === today
              const kcalPct = Math.min(((d.kcal_consumida || 0) / targetKcal) * 100, 100)
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
                    {isToday ? 'Hoy' : new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short' }).slice(0, 3)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Table */}
          <div className="mt-4 space-y-1.5">
            {weekLogs.slice(-4).reverse().map(d => {
              const adh = d.comidas_total > 0 ? Math.round((d.comidas_completadas / d.comidas_total) * 100) : 0
              const isToday = d.fecha === today
              return (
                <div key={d.fecha} className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-xl text-xs',
                  isToday ? 'bg-[#EAF4FB]' : 'bg-[#F8FBFD]'
                )}>
                  <span className={cn('font-semibold', isToday ? 'text-[#0C3547]' : 'text-[#6B7C93]')}>
                    {isToday ? 'Hoy' : new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric' })}
                  </span>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                    <span className="text-[#6B7C93]">{d.kcal_consumida || 0} kcal</span>
                    <span className={cn('font-bold px-2 py-0.5 rounded-full', adh >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {adh}%
                    </span>
                    {d.hambre && (
                      <span title={`Hambre: ${d.hambre}/5`} className="text-[#8BA5BE]">
                        🍽️{d.hambre}
                      </span>
                    )}
                    {d.energia && (
                      <span title={`Energía: ${d.energia}/5`} className="text-[#8BA5BE]">
                        ⚡{d.energia}
                      </span>
                    )}
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
