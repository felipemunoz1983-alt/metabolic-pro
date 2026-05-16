'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Flame, Beef } from 'lucide-react'
import type { WeekPlan } from '@/lib/planGenerator'
import { cn } from '@/lib/utils'

// Mapeo día JS → nombre del plan
const JS_TO_NOMBRE: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}

// Config visual por tipo de comida
const MEAL_CONFIG = {
  desayuno:        { icon: '🌅', label: 'Desayuno',     bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-700'   },
  colacion_manana: { icon: '☕', label: 'Colación AM',  bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-800',     badge: 'bg-sky-100 text-sky-700'       },
  almuerzo:        { icon: '🍽️', label: 'Almuerzo',    bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-800',   badge: 'bg-green-100 text-green-700'   },
  once:            { icon: '🫖', label: 'Once',         bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-800',  badge: 'bg-purple-100 text-purple-700' },
  cena:            { icon: '🌙', label: 'Cena',         bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-800',  badge: 'bg-indigo-100 text-indigo-700' },
  ultra:           { icon: '🚨', label: 'Extra',        bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-100 text-red-700'       },
} as const

// Fecha en español chileno
function fechaHoy(): string {
  return new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

interface Props {
  plan: WeekPlan
  nombre?: string
}

export function MenuHoy({ plan, nombre }: Props) {
  const hoy = useMemo(() => {
    const dayIndex = new Date().getDay()
    const nombreHoy = JS_TO_NOMBRE[dayIndex]
    // Busca el día de hoy en el plan (semana 1 primero, luego cualquier otra)
    return (
      plan.dias.find(d => d.nombre === nombreHoy && d.semana === 1) ??
      plan.dias.find(d => d.nombre === nombreHoy) ??
      plan.dias[0]
    )
  }, [plan])

  if (!hoy) return null

  // Filtrar ultra para el resumen principal (se muestra aparte)
  const comidasPrincipales = hoy.meals.filter(m => m.tipo !== 'ultra')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-2xl border border-[#D6E3ED] overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={15} className="text-[#7EC8E8]" />
              <p className="text-[#9EC8E0] text-xs font-semibold capitalize">{fechaHoy()}</p>
            </div>
            <h2 className="text-white text-base font-black leading-tight">
              {nombre ? `${nombre.split(' ')[0]}, tu menú de hoy` : 'Tu menú de hoy'}
            </h2>
          </div>
          {/* Totales del día */}
          <div className="flex gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Flame size={12} className="text-[#29ABE2]" />
                <span className="text-[#29ABE2] text-lg font-black">{hoy.totalKcal.toLocaleString('es-CL')}</span>
              </div>
              <p className="text-[#7EC8E8] text-[10px] font-semibold">kcal</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Beef size={12} className="text-green-400" />
                <span className="text-green-400 text-lg font-black">{hoy.totalP}</span>
              </div>
              <p className="text-[#7EC8E8] text-[10px] font-semibold">g prot</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comidas */}
      <div className="divide-y divide-[#EEF4F8]">
        {comidasPrincipales.map((meal, i) => {
          const cfg = MEAL_CONFIG[meal.tipo] ?? MEAL_CONFIG.desayuno
          return (
            <motion.div
              key={meal.tipo}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={cn('px-5 py-3.5', cfg.bg)}
            >
              <div className="flex items-start gap-3">
                {/* Icono comida */}
                <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>

                <div className="flex-1 min-w-0">
                  {/* Label + macros */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn('text-xs font-black uppercase tracking-wide', cfg.text)}>
                      {cfg.label}
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
                        {meal.kcal} kcal
                      </span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.badge)}>
                        {meal.p}g prot
                      </span>
                    </div>
                  </div>

                  {/* Nombre del plato */}
                  <p className="text-sm font-semibold text-[#0C1F2C] leading-snug mb-1">
                    {meal.label}
                  </p>

                  {/* Ingredientes (primeros 2-3) */}
                  {meal.items.length > 0 && (
                    <p className="text-xs text-[#6B7C93] leading-relaxed line-clamp-2">
                      {meal.items.slice(0, 3).join(' · ')}
                      {meal.items.length > 3 && (
                        <span className="text-[#29ABE2] font-medium"> +{meal.items.length - 3} más</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Footer — macros carbos + grasas */}
      <div className="px-5 py-3 bg-[#F8FBFD] border-t border-[#EEF4F8]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#8BA5BE] font-medium">
            {hoy.nombre} · Semana {hoy.semana} de tu plan
          </p>
          <div className="flex gap-4">
            <span className="text-[11px] text-[#4A6070]">
              <span className="font-black text-blue-500">{hoy.totalC}g</span>
              <span className="text-[#8BA5BE] ml-1">carbos</span>
            </span>
            <span className="text-[11px] text-[#4A6070]">
              <span className="font-black text-amber-500">{hoy.totalG}g</span>
              <span className="text-[#8BA5BE] ml-1">grasas</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
