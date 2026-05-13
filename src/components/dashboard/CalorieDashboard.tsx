'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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
}

const MEALS = [
  { id: 'desayuno',    label: 'Desayuno',              icon: '🌅', pct: 0.25 },
  { id: 'col_manana',  label: 'Colación mañana',       icon: '☕', pct: 0.10 },
  { id: 'almuerzo',    label: 'Almuerzo',              icon: '🍽️', pct: 0.35 },
  { id: 'once',        label: 'Once',                  icon: '🫖', pct: 0.15 },
  { id: 'cena',        label: 'Cena',                  icon: '🌙', pct: 0.15 },
]

export function CalorieDashboard({ userId, targetKcal = 2000 }: Props) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [log, setLog] = useState<DayLog>({
    fecha: today,
    actualKcal: 0,
    macroP: 0,
    macroC: 0,
    macroG: 0,
    completed: 0,
    total: MEALS.length,
  })
  const [peso, setPeso] = useState('')
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weekLogs, setWeekLogs] = useState<DayLog[]>([])

  useEffect(() => {
    loadToday()
    loadWeek()
  }, [])

  async function loadToday() {
    const { data } = await supabase
      .from('registros_diarios')
      .select('*')
      .eq('user_id', userId)
      .eq('fecha', today)
      .single()

    if (data) {
      setLog(data)
      setPeso(data.peso?.toString() || '')
      try {
        const meals = JSON.parse(data.meals_json || '{}')
        setCheckedMeals(meals)
      } catch { /* noop */ }
    }
  }

  async function loadWeek() {
    const desde = new Date()
    desde.setDate(desde.getDate() - 6)
    const { data } = await supabase
      .from('registros_diarios')
      .select('*')
      .eq('user_id', userId)
      .gte('fecha', desde.toISOString().split('T')[0])
      .order('fecha', { ascending: true })

    if (data) setWeekLogs(data)
  }

  function toggleMeal(id: string) {
    setCheckedMeals(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const completedCount = Object.values(checkedMeals).filter(Boolean).length
  const adherencia = Math.round((completedCount / MEALS.length) * 100)
  const kcalEstimada = MEALS.reduce((sum, m) =>
    checkedMeals[m.id] ? sum + Math.round(targetKcal * m.pct) : sum, 0)

  async function handleSave() {
    setSaving(true)
    const payload = {
      user_id: userId,
      fecha: today,
      actualKcal: kcalEstimada,
      completed: completedCount,
      total: MEALS.length,
      peso: peso ? Number(peso) : null,
      meals_json: JSON.stringify(checkedMeals),
    }
    await supabase
      .from('registros_diarios')
      .upsert(payload, { onConflict: 'user_id,fecha' })

    setSaving(false)
    setSaved(true)
    loadWeek()
    setTimeout(() => setSaved(false), 2000)
  }

  const deficit = targetKcal - kcalEstimada
  const progressPct = Math.min((kcalEstimada / targetKcal) * 100, 100)

  return (
    <div className="space-y-5">
      {/* Header fecha */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#0C3547]">
          📊 Dashboard calórico
        </h2>
        <span className="text-sm text-[#6B7C93] font-medium">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Métricas del día */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Meta', value: targetKcal.toLocaleString(), unit: 'kcal', color: 'text-[#0C3547]' },
          { label: 'Consumido', value: kcalEstimada.toLocaleString(), unit: 'kcal', color: 'text-[#29ABE2]' },
          { label: deficit >= 0 ? 'Faltan' : 'Exceso', value: Math.abs(deficit).toLocaleString(), unit: 'kcal', color: deficit >= 0 ? 'text-green-600' : 'text-red-500' },
          { label: 'Adherencia', value: `${adherencia}`, unit: '%', color: adherencia >= 80 ? 'text-green-600' : 'text-amber-500' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-2xl border border-[#D6E3ED] p-4 text-center">
            <span className="text-xs text-[#6B7C93] font-semibold uppercase tracking-wide block">{m.label}</span>
            <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
            <span className="text-xs text-[#6B7C93]"> {m.unit}</span>
          </div>
        ))}
      </div>

      {/* Barra de progreso calórico */}
      <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
        <div className="flex justify-between text-sm text-[#6B7C93] mb-2">
          <span className="font-semibold">Progreso calórico del día</span>
          <span>{kcalEstimada} / {targetKcal} kcal</span>
        </div>
        <div className="h-4 bg-[#EAF4FB] rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6 }}
            className={cn(
              'h-full rounded-full',
              progressPct > 100 ? 'bg-red-400' : progressPct >= 80 ? 'bg-green-400' : 'bg-[#29ABE2]'
            )}
          />
        </div>
      </div>

      {/* Checklist de comidas */}
      <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
        <h3 className="text-sm font-bold text-[#0C3547] mb-4 uppercase tracking-wide">✅ Registro de comidas</h3>
        <div className="space-y-2">
          {MEALS.map((meal, i) => (
            <motion.button
              key={meal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleMeal(meal.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                checkedMeals[meal.id]
                  ? 'bg-green-50 border-green-300'
                  : 'border-[#D6E3ED] hover:border-[#29ABE2]'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                checkedMeals[meal.id]
                  ? 'bg-green-500 border-green-500'
                  : 'border-[#D6E3ED]'
              )}>
                {checkedMeals[meal.id] && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className="text-lg">{meal.icon}</span>
              <span className={cn(
                'flex-1 text-sm font-semibold',
                checkedMeals[meal.id] ? 'text-green-700 line-through' : 'text-[#0C3547]'
              )}>
                {meal.label}
              </span>
              <span className="text-xs text-[#6B7C93]">
                ~{Math.round(targetKcal * meal.pct)} kcal
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Peso del día */}
      <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
        <h3 className="text-sm font-bold text-[#0C3547] mb-3 uppercase tracking-wide">⚖️ Peso corporal</h3>
        <div className="flex gap-3">
          <input
            type="number"
            step="0.1"
            value={peso}
            onChange={e => setPeso(e.target.value)}
            placeholder="Ej: 72.5"
            className="flex-1 px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2]"
          />
          <span className="flex items-center text-sm text-[#6B7C93] font-semibold">kg</span>
        </div>
      </div>

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full py-3.5 font-bold rounded-xl transition-all text-white',
          saved
            ? 'bg-green-500'
            : 'bg-gradient-to-r from-[#0C3547] to-[#145272] hover:opacity-90'
        )}
      >
        {saved ? '✅ ¡Guardado!' : saving ? 'Guardando...' : '💾 Guardar registro del día'}
      </button>

      {/* Historial semana */}
      {weekLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
          <h3 className="text-sm font-bold text-[#0C3547] mb-4 uppercase tracking-wide">📅 Últimos 7 días</h3>
          <div className="space-y-2">
            {weekLogs.map(d => {
              const adh = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
              const isToday = d.fecha === today
              return (
                <div key={d.fecha} className={cn(
                  'flex items-center justify-between p-3 rounded-xl',
                  isToday ? 'bg-[#EAF4FB] border border-[#c4dff0]' : 'bg-[#F0F4F8]'
                )}>
                  <span className="text-sm font-semibold text-[#0C3547]">
                    {isToday ? 'Hoy' : new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#6B7C93]">{d.actualKcal || 0} kcal</span>
                    <span className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
                      adh >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {adh}%
                    </span>
                    {d.peso && <span className="text-xs text-[#6B7C93]">{d.peso}kg</span>}
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
