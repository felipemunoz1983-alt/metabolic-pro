'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { OBJETIVO_LABELS, formulaLabel } from '@/lib/nutrition'
import { generarPlan } from '@/lib/planGenerator'
import { generarPerfilClinico, type ClinicalAlert } from '@/lib/clinicalAlerts'
import { WeeklyPlan } from './WeeklyPlan'
import { MenuHoy } from './MenuHoy'
import { ShoppingList } from './ShoppingList'
import { NutrievoPanel } from '@/components/nutrevo/NutrievoPanel'
import { cn } from '@/lib/utils'

interface Props {
  result: NutritionResult
  form: FormData
  onReset: () => void
}

const ALERT_STYLES: Record<ClinicalAlert['nivel'], { bg: string; border: string; text: string; icon: string }> = {
  alta:  { bg: 'bg-red-50',   border: 'border-red-400',   text: 'text-red-800',   icon: '🚨' },
  media: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', icon: '⚠️' },
  baja:  { bg: 'bg-blue-50',  border: 'border-blue-300',  text: 'text-blue-800',  icon: '💡' },
  info:  { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-700', icon: 'ℹ️' },
}

// ─── Panel de alertas clínicas ────────────────────────────────────────────────
function ClinicalPanel({ form }: { form: FormData }) {
  const [open, setOpen] = useState(false)
  const perfil = useMemo(() => generarPerfilClinico(form), [form])

  if (perfil.alertasProfesional.length === 0 && !perfil.notaPaciente) return null

  const altasCount = perfil.alertasProfesional.filter(a => a.nivel === 'alta').length
  const mediasCount = perfil.alertasProfesional.filter(a => a.nivel === 'media').length

  return (
    <div className="bg-white rounded-2xl border border-[#D6E3ED] overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#F8FBFD] transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🩺</span>
          <div>
            <p className="text-sm font-bold text-[#0C3547]">Perfil clínico del paciente</p>
            <div className="flex gap-2 mt-0.5 flex-wrap">
              {altasCount > 0 && (
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  🚨 {altasCount} alerta{altasCount > 1 ? 's' : ''} alta{altasCount > 1 ? 's' : ''}
                </span>
              )}
              {mediasCount > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                  ⚠️ {mediasCount} media{mediasCount > 1 ? 's' : ''}
                </span>
              )}
              {perfil.ajustesAplicados.length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                  ✅ {perfil.ajustesAplicados.length} ajuste{perfil.ajustesAplicados.length > 1 ? 's' : ''} aplicado{perfil.ajustesAplicados.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={cn('text-[#6B7C93] transition-transform text-lg', open && 'rotate-180')}>▾</span>
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
            <div className="px-5 pb-5 space-y-4">
              {/* Ajustes aplicados */}
              {perfil.ajustesAplicados.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-800 mb-2 uppercase tracking-wide">✅ Ajustes aplicados al plan</p>
                  <div className="flex flex-wrap gap-2">
                    {perfil.ajustesAplicados.map((a, i) => (
                      <span key={i} className="text-xs bg-green-700 text-white font-semibold px-2.5 py-1 rounded-lg">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertas profesional */}
              {perfil.alertasProfesional.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-[#0C3547] mb-2 uppercase tracking-wide">🔔 Alertas para el profesional</p>
                  <div className="space-y-2">
                    {perfil.alertasProfesional.map((alerta, i) => {
                      const s = ALERT_STYLES[alerta.nivel]
                      return (
                        <div key={i} className={cn('flex gap-3 rounded-xl border p-3', s.bg, s.border)}>
                          <span className="text-base flex-shrink-0">{s.icon}</span>
                          <div>
                            <span className={cn('text-xs font-bold uppercase tracking-wide', s.text)}>
                              {alerta.origen === 'digestivo' ? '🧬 Digestivo' : '💊 Suplementación'}
                              {' · '}{alerta.nivel.charAt(0).toUpperCase() + alerta.nivel.slice(1)}
                            </span>
                            <p className={cn('text-xs mt-0.5', s.text)}>{alerta.texto}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Nota para el paciente */}
              {perfil.notaPaciente && (
                <div className="bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl p-4">
                  <p className="text-xs font-bold text-[#0C3547] mb-1">📋 Nota para el paciente</p>
                  <p className="text-xs text-[#0C3547]">{perfil.notaPaciente}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function PlanResult({ result, form, onReset }: Props) {
  const { kcal, macros, bmr, tdee, pal } = result

  const weekPlan = useMemo(
    () => generarPlan(form, Math.round(kcal)),
    [form, kcal]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header resultado */}
      <div className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-extrabold truncate">{form.nombre}</h2>
            <p className="text-[#9EC8E0] text-xs sm:text-sm mt-0.5">{OBJETIVO_LABELS[form.objetivo]}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => {
                sessionStorage.setItem('plan_para_imprimir', JSON.stringify({ result, form }))
                window.open('/paciente/imprimir', '_blank')
              }}
              className="text-xs text-white bg-[#29ABE2] px-3 py-1.5 rounded-lg hover:bg-[#1a8fc0] transition font-semibold"
            >
              🖨️ PDF
            </button>
            <button
              onClick={onReset}
              className="text-xs text-[#9EC8E0] border border-[#9EC8E0]/30 px-3 py-1.5 rounded-lg hover:bg-white/10 transition"
            >
              ← Nuevo plan
            </button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 gap-3">
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

      {/* Menú de hoy */}
      <MenuHoy plan={weekPlan} nombre={form.nombre} />

      {/* Datos clínicos */}
      <div className="bg-white rounded-2xl border border-[#D6E3ED] p-5">
        <h3 className="text-sm font-bold text-[#0C3547] mb-3 uppercase tracking-wide">📊 Datos clínicos</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] sm:text-xs text-[#6B7C93] block leading-tight">
              TMB · {formulaLabel(result.formulaUsada)}
            </span>
            <span className="text-base sm:text-lg font-bold text-[#0C3547]">{bmr.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-[#6B7C93]"> kcal</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-[#6B7C93] block leading-tight">TDEE (GET)</span>
            <span className="text-base sm:text-lg font-bold text-[#0C3547]">{tdee.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-[#6B7C93]"> kcal</span>
          </div>
          <div>
            <span className="text-[10px] sm:text-xs text-[#6B7C93] block leading-tight">Factor PAL</span>
            <span className="text-base sm:text-lg font-bold text-[#0C3547]">{pal}</span>
          </div>
        </div>
      </div>

      {/* Panel clínico — digestivo + suplementación */}
      <ClinicalPanel form={form} />

      {/* Distribución de macros */}
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
                <div className="flex justify-between text-xs sm:text-sm mb-1 gap-2">
                  <span className={`font-semibold ${m.textColor} flex-shrink-0`}>{m.name}</span>
                  <span className="text-[#6B7C93] text-right">{m.g}g · {pct}%</span>
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

      {/* Plan semanal detallado */}
      <WeeklyPlan plan={weekPlan} />

      {/* Lista de supermercado generada automáticamente */}
      <ShoppingList plan={weekPlan} />

      {/* Productos Nutrevo recomendados según objetivo */}
      <NutrievoPanel objetivo={form.objetivo} />
    </motion.div>
  )
}
