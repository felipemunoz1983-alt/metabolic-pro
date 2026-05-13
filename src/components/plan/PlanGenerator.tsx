'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcularNutricion, OBJETIVO_LABELS, SEXO_LABELS, EJERCICIO_LABELS } from '@/lib/nutrition'
import type { FormData, NutritionResult, Objetivo, Sexo, TipoEjercicio } from '@/lib/nutrition'
import { cn } from '@/lib/utils'

const STEPS = ['Datos personales', 'Ejercicio', 'Objetivo', 'Alimentación']

const defaultForm: Partial<FormData> = {
  sexo: 'masculino',
  objetivo: 'mantenimiento',
  tipoEjercicio: 'fuerza',
  diasEjercicio: 3,
  duracionSesion: 60,
  crono: 'neutro',
  tendencia: 'omnivoro',
  rechazos: '',
  protGramos: 200,
  protGramosCena: 200,
  eggsQty: 2,
  eggsQtyOnce: 2,
  sandwichQty: 1,
  sandwichQtyOnce: 1,
  semanas: 1,
  desayunos: ['avena_proteica'],
  colacionManana: ['yogur_frutossecos_am'],
  almuerzos: ['pollo_arroz'],
  cenas: ['pollo_verduras'],
  once: ['yogur_frutossecos_am'],
}

interface Props {
  onResult: (result: NutritionResult, form: FormData) => void
}

export function PlanGenerator({ onResult }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Partial<FormData>>(defaultForm)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleGenerate() {
    const f = form as FormData
    const result = calcularNutricion(f)
    onResult(result, f)
  }

  const isValid = form.nombre && form.edad && form.peso && form.talla

  return (
    <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-6">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                'w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-all',
                i === step
                  ? 'bg-[#0C3547] text-white scale-110'
                  : i < step
                  ? 'bg-[#29ABE2] text-white cursor-pointer'
                  : 'bg-[#EAF4FB] text-[#6B7C93]'
              )}
            >
              {i < step ? '✓' : i + 1}
            </button>
            <span className={cn(
              'text-xs font-semibold hidden sm:block',
              i === step ? 'text-[#0C3547]' : 'text-[#6B7C93]'
            )}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-1', i < step ? 'bg-[#29ABE2]' : 'bg-[#D6E3ED]')} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 0: Datos personales */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#0C3547]">👤 Datos del paciente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">Nombre completo</label>
                  <input
                    type="text"
                    value={form.nombre || ''}
                    onChange={e => set('nombre', e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                    placeholder="Ej: María González"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">Edad</label>
                  <input
                    type="number"
                    value={form.edad || ''}
                    onChange={e => set('edad', Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                    placeholder="años"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={form.peso || ''}
                    onChange={e => set('peso', Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                    placeholder="kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">Talla (cm)</label>
                  <input
                    type="number"
                    value={form.talla || ''}
                    onChange={e => set('talla', Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                    placeholder="cm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-2">Sexo biológico</label>
                <div className="flex gap-3">
                  {(['masculino', 'femenino'] as Sexo[]).map(s => (
                    <button
                      key={s}
                      onClick={() => set('sexo', s)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all',
                        form.sexo === s
                          ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                          : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                      )}
                    >
                      {SEXO_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Ejercicio */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-[#0C3547]">🏋️ Actividad física</h3>
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-2">
                  Días de ejercicio por semana: <span className="text-[#29ABE2]">{form.diasEjercicio}</span>
                </label>
                <input
                  type="range" min={0} max={7}
                  value={form.diasEjercicio || 0}
                  onChange={e => set('diasEjercicio', Number(e.target.value))}
                  className="w-full accent-[#29ABE2]"
                />
                <div className="flex justify-between text-xs text-[#6B7C93] mt-1">
                  <span>Sedentario</span><span>Diario</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-2">
                  Duración de sesión: <span className="text-[#29ABE2]">{form.duracionSesion} min</span>
                </label>
                <input
                  type="range" min={20} max={120} step={10}
                  value={form.duracionSesion || 60}
                  onChange={e => set('duracionSesion', Number(e.target.value))}
                  className="w-full accent-[#29ABE2]"
                />
                <div className="flex justify-between text-xs text-[#6B7C93] mt-1">
                  <span>20 min</span><span>120 min</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-2">Tipo de ejercicio</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['fuerza', 'cardio', 'mixto', 'ninguno'] as TipoEjercicio[]).map(t => (
                    <button
                      key={t}
                      onClick={() => set('tipoEjercicio', t)}
                      className={cn(
                        'py-2.5 rounded-xl border-2 font-semibold text-sm transition-all',
                        form.tipoEjercicio === t
                          ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                          : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                      )}
                    >
                      {EJERCICIO_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Objetivo */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-[#0C3547]">🎯 Objetivo nutricional</h3>
              <div className="grid grid-cols-1 gap-3">
                {(['perdida grasa', 'mantenimiento', 'hipertrofia'] as Objetivo[]).map(o => (
                  <button
                    key={o}
                    onClick={() => set('objetivo', o)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left font-semibold transition-all',
                      form.objetivo === o
                        ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                        : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                    )}
                  >
                    <div className="text-base">{OBJETIVO_LABELS[o]}</div>
                    <div className="text-xs font-normal mt-0.5">
                      {o === 'perdida grasa' && 'Déficit calórico del 20% · Alta proteína'}
                      {o === 'mantenimiento' && 'Equilibrio calórico · Composición corporal estable'}
                      {o === 'hipertrofia' && 'Superávit calórico del 10% · Máxima síntesis proteica'}
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-1">Alimentos rechazados / alergias</label>
                <input
                  type="text"
                  value={form.rechazos || ''}
                  onChange={e => set('rechazos', e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2]"
                  placeholder="Ej: mariscos, lácteos, nueces..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Alimentación */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-[#0C3547]">🥗 Preferencias alimentarias</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">Porción proteína almuerzo</label>
                  <div className="flex gap-2">
                    {[150, 200, 250, 300].map(g => (
                      <button
                        key={g}
                        onClick={() => set('protGramos', g)}
                        className={cn(
                          'flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all',
                          form.protGramos === g
                            ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">Huevos por preparación</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => set('eggsQty', n)}
                        className={cn(
                          'flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all',
                          form.eggsQty === n
                            ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-1">Semanas del plan</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => set('semanas', s)}
                      className={cn(
                        'flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all',
                        form.semanas === s
                          ? 'bg-[#0C3547] border-[#0C3547] text-white'
                          : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#0C3547]'
                      )}
                    >
                      {s} sem
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 border-2 border-[#D6E3ED] text-[#6B7C93] font-bold rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
          >
            ← Atrás
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && !isValid}
            className="flex-1 py-3 bg-gradient-to-r from-[#0C3547] to-[#145272] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-40"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            className="flex-1 py-3 bg-gradient-to-r from-[#29ABE2] to-[#1a7fad] text-white font-bold rounded-xl hover:opacity-90 transition"
          >
            ⚡ Generar Plan Nutricional
          </button>
        )}
      </div>
    </div>
  )
}
