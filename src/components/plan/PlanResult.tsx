'use client'

import { motion } from 'framer-motion'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { OBJETIVO_LABELS } from '@/lib/nutrition'

interface Props {
  result: NutritionResult
  form: FormData
  onReset: () => void
}

export function PlanResult({ result, form, onReset }: Props) {
  const { kcal, macros, bmr, tdee, pal } = result

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header resultado */}
      <div className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-extrabold">{form.nombre}</h2>
            <p className="text-[#9EC8E0] text-sm mt-0.5">{OBJETIVO_LABELS[form.objetivo]}</p>
          </div>
          <button
            onClick={onReset}
            className="text-xs text-[#9EC8E0] border border-[#9EC8E0]/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            ← Nuevo plan
          </button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Kcal/día', value: Math.round(kcal).toLocaleString(), unit: 'kcal', color: 'text-[#29ABE2]' },
            { label: 'Proteína', value: macros.p, unit: 'g', color: 'text-green-400' },
            { label: 'Carbohidratos', value: macros.c, unit: 'g', color: 'text-blue-300' },
            { label: 'Grasas', value: macros.g, unit: 'g', color: 'text-amber-400' },
          ].map(m => (
            <div key={m.label} className="bg-white/10 rounded-xl p-3">
              <span className="text-xs text-[#9EC8E0] font-semibold uppercase tracking-wide block">{m.label}</span>
              <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
              <span className="text-xs text-[#9EC8E0] ml-1">{m.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detalles técnicos */}
      <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
        <h3 className="text-sm font-bold text-[#0C3547] mb-3 uppercase tracking-wide">📊 Datos clínicos</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <span className="text-xs text-[#6B7C93] block">TMB (Harris-Benedict)</span>
            <span className="text-lg font-bold text-[#0C3547]">{bmr.toLocaleString()}</span>
            <span className="text-xs text-[#6B7C93]"> kcal</span>
          </div>
          <div>
            <span className="text-xs text-[#6B7C93] block">TDEE (GET)</span>
            <span className="text-lg font-bold text-[#0C3547]">{tdee.toLocaleString()}</span>
            <span className="text-xs text-[#6B7C93]"> kcal</span>
          </div>
          <div>
            <span className="text-xs text-[#6B7C93] block">Factor PAL</span>
            <span className="text-lg font-bold text-[#0C3547]">{pal}</span>
          </div>
        </div>
      </div>

      {/* Distribución de macros visual */}
      <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
        <h3 className="text-sm font-bold text-[#0C3547] mb-4 uppercase tracking-wide">🥗 Distribución de macros</h3>
        <div className="space-y-3">
          {[
            { name: 'Proteína', g: macros.p, kcalPer: 4, color: 'bg-green-400', textColor: 'text-green-700' },
            { name: 'Carbohidratos', g: macros.c, kcalPer: 4, color: 'bg-blue-400', textColor: 'text-blue-700' },
            { name: 'Grasas', g: macros.g, kcalPer: 9, color: 'bg-amber-400', textColor: 'text-amber-700' },
          ].map(m => {
            const macroKcal = m.g * m.kcalPer
            const pct = Math.round((macroKcal / kcal) * 100)
            return (
              <div key={m.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-semibold ${m.textColor}`}>{m.name}</span>
                  <span className="text-[#6B7C93]">{m.g}g · {macroKcal} kcal · {pct}%</span>
                </div>
                <div className="h-2.5 bg-[#EAF4FB] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full ${m.color} rounded-full`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximo: plan semanal */}
      <div className="bg-[#EAF4FB] rounded-2xl border border-[#c4dff0] p-5 text-center">
        <p className="text-[#0C3547] font-semibold text-sm">
          🚧 Plan semanal detallado — próximamente en esta versión
        </p>
        <p className="text-[#6B7C93] text-xs mt-1">
          Mientras tanto usa la app HTML para ver el plan completo con comidas
        </p>
      </div>
    </motion.div>
  )
}
