'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcularNutricion, OBJETIVO_LABELS, SEXO_LABELS, EJERCICIO_LABELS, usaraCunningham } from '@/lib/nutrition'
import type { FormData, NutritionResult, Objetivo, Sexo, TipoEjercicio } from '@/lib/nutrition'
import type { MealOption, UltraOption, YogurTipo } from '@/lib/foods'
import { desayunosOpts, colacionesOpts, almuerzosOpts, cenasOpts, ultraProcOpts, YOGUR_TIPOS } from '@/lib/foods'
import { cn } from '@/lib/utils'
import { SupIAPanel } from '@/components/plan/SupIAPanel'

const STEPS = ['Datos personales', 'Ejercicio', 'Objetivo', 'Digestivo', 'Suplementación', 'Alimentación', 'Antojos']

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
  eggsQtyDesayuno: 2,
  eggsQty: 2,
  eggsQtyCena: 3,
  eggsQtyOnce: 2,
  sandwichQty: 1,
  sandwichQtyOnce: 1,
  semanas: 1,
  desayunos: ['avena_platano'],
  wheyIndicado: false,
  yogurtTipo: 'griego' as YogurTipo,
  colacionManana: ['yogur_frutossecos_am'],
  almuerzos: ['pollo_arroz'],
  cenas: ['pollo_verduras'],
  once: ['yogur_frutossecos_am'],
  ultraProcesados: [],
  ultraDias: 2,
  digHinchazon: 'nunca',
  digReflujo: 'nunca',
  digRitmo: 'normal',
  digIntolerancias: [],
  digDiag: 'no',
  digHorario: [],
  supEmbarazo: 'no',
  supCronicas: [],
  supMedic: 'no',
  supMedicDetalle: '',
  supActuales: '',
}

// ─── Radio chip selector ──────────────────────────────────────────────────────
function RadioChips<T extends string>({
  label, hint, options, value, onChange,
}: {
  label: string; hint?: string
  options: { value: T; label: string }[]
  value: T; onChange: (v: T) => void
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0C3547] mb-2">{label}</label>
      {hint && <p className="text-xs text-[#6B7C93] mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={cn('px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
              value === o.value
                ? 'bg-[#0C3547] border-[#0C3547] text-white'
                : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#0C3547]'
            )}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Checkbox chip selector ───────────────────────────────────────────────────
function CheckChips({
  label, hint, options, selected, onChange,
}: {
  label: string; hint?: string
  options: { value: string; label: string }[]
  selected: string[]; onChange: (v: string[]) => void
}) {
  function toggle(val: string) {
    selected.includes(val)
      ? onChange(selected.filter(v => v !== val))
      : onChange([...selected, val])
  }
  return (
    <div>
      <label className="block text-sm font-semibold text-[#0C3547] mb-2">{label}
        <span className="text-xs font-normal text-[#6B7C93] ml-1">(marca todas las que apliquen)</span>
      </label>
      {hint && <p className="text-xs text-[#6B7C93] mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.value} onClick={() => toggle(o.value)}
            className={cn('px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
              selected.includes(o.value)
                ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
            )}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Ultra-processed chip selector (multi-toggle, min 0) ─────────────────────
function UltraChips({
  pool,
  selected,
  onChange,
}: {
  pool: Record<string, UltraOption>
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter(k => k !== key))
    } else {
      onChange([...selected, key])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(pool).map(([key, opt]) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={cn(
            'px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
            selected.includes(key)
              ? 'bg-red-500 border-red-500 text-white'
              : 'border-[#D6E3ED] text-[#6B7C93] hover:border-red-400 hover:text-red-600'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Meal chip multi-selector ─────────────────────────────────────────────────
function MealChips({
  label,
  pool,
  selected,
  onChange,
}: {
  label: string
  pool: Record<string, MealOption>
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      if (selected.length === 1) return // keep at least 1
      onChange(selected.filter(k => k !== key))
    } else {
      onChange([...selected, key])
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-[#0C3547] mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(pool).map(([key, opt]) => {
          const active = selected.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                'flex items-center gap-1.5 pr-3 rounded-full border-2 text-xs font-semibold transition-all overflow-hidden',
                opt.foto ? 'pl-0 py-0' : 'px-3 py-1.5',
                active
                  ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                  : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2] hover:text-[#0C3547]'
              )}
            >
              {opt.foto && (
                <span className="w-8 h-8 flex-shrink-0 overflow-hidden rounded-full">
                  <img
                    src={opt.foto}
                    alt=""
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </span>
              )}
              <span className={opt.foto ? '' : ''}>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Selector de cantidad de huevos ──────────────────────────────────────────
function EggsQtyPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center gap-2 mt-2 pl-1">
      <span className="text-xs text-[#6B7C93] font-semibold">🥚 Cantidad de huevos:</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'w-8 h-8 rounded-full text-xs font-bold border-2 transition-all',
              value === n
                ? 'bg-amber-400 border-amber-400 text-white'
                : 'border-[#D6E3ED] text-[#6B7C93] hover:border-amber-400 hover:text-amber-600'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Yogurt Type Picker ───────────────────────────────────────────────────────
function YogurtTypePicker({
  value,
  onChange,
}: {
  value: YogurTipo
  onChange: (t: YogurTipo) => void
}) {
  return (
    <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
      <p className="text-xs font-bold text-sky-800">🥛 Tipo de yogur</p>
      <div className="flex gap-2">
        {(Object.entries(YOGUR_TIPOS) as [YogurTipo, typeof YOGUR_TIPOS[YogurTipo]][]).map(([key, info]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex-1 py-2 px-3 rounded-xl border-2 text-left transition-all',
              value === key
                ? 'bg-sky-500 border-sky-500 text-white'
                : 'border-sky-200 text-sky-800 hover:border-sky-400 bg-white'
            )}
          >
            <div className="text-sm font-bold">{info.emoji} {info.label}</div>
            <div className={cn('text-[10px] mt-0.5 font-semibold', value === key ? 'text-sky-100' : 'text-sky-600')}>
              {info.badge}
            </div>
          </button>
        ))}
      </div>
      {value === 'fullpro' && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800">
            <strong>FullPro Loncoleche · Sin lactosa · Alérgenos:</strong> Puede contener trazas de almendra, pasas, nuez, soya y gluten (avena).
          </p>
        </div>
      )}
      {value === 'soprole_power' && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800">
            <strong>Soprole Protein+ Power · Sin lactosa · Con Magnesio · Libre de sellos · Alérgenos:</strong> Elaborado en líneas que también procesan nueces.
          </p>
        </div>
      )}
    </div>
  )
}

interface Props {
  onResult: (result: NutritionResult, form: FormData) => void
  initialData?: Partial<FormData>
}

export function PlanGenerator({ onResult, initialData }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Partial<FormData>>({ ...defaultForm, ...initialData })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const [errors, setErrors] = useState<string[]>([])

  // ── Sincronizar pasos con historial del navegador ──
  // Cada vez que el usuario avanza un paso, se hace pushState.
  // El botón "atrás" del navegador/móvil dispara popstate y retrocede un paso
  // en lugar de salir de la página.
  useEffect(() => {
    function onPopState() {
      setStep(s => (s > 0 ? s - 1 : s))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function validateStep0() {
    const errs: string[] = []
    if (!form.nombre?.trim())          errs.push('Ingresa el nombre')
    if (!form.edad  || form.edad <= 0) errs.push('Ingresa la edad')
    if (!form.peso  || form.peso <= 0) errs.push('Ingresa el peso')
    if (!form.talla || form.talla <= 0) errs.push('Ingresa la talla')
    setErrors(errs)
    return errs.length === 0
  }

  function handleNext() {
    if (step === 0 && !validateStep0()) return
    setErrors([])
    // Empujar entrada al historial para que el "back" del navegador retroceda un paso
    window.history.pushState({ planStep: step + 1 }, '')
    setStep(s => s + 1)
  }

  function handleGenerate() {
    const f = form as FormData
    const result = calcularNutricion(f)
    onResult(result, f)
  }

  // ── Filtrado por whey ──
  const wheyActivo = form.wheyIndicado ?? false
  const filteredDesayunos = wheyActivo
    ? desayunosOpts
    : Object.fromEntries(Object.entries(desayunosOpts).filter(([, opt]) => !opt.requiereWhey))

  // ── Filtrado por tendencia ──
  const tendenciaActual = form.tendencia ?? 'omnivoro'
  const filteredAlmuerzos = (() => {
    if (tendenciaActual === 'vegano')
      return Object.fromEntries(Object.entries(almuerzosOpts).filter(([, opt]) => !opt.tendencia || opt.tendencia.includes('vegano')))
    if (tendenciaActual === 'vegetariano')
      return Object.fromEntries(Object.entries(almuerzosOpts).filter(([, opt]) => !opt.tendencia || opt.tendencia.includes('vegetariano') || opt.tendencia.includes('vegano')))
    return almuerzosOpts
  })()
  const filteredCenas = (() => {
    if (tendenciaActual === 'vegano')
      return Object.fromEntries(Object.entries(cenasOpts).filter(([, opt]) => !opt.tendencia || opt.tendencia.includes('vegano')))
    if (tendenciaActual === 'vegetariano')
      return Object.fromEntries(Object.entries(cenasOpts).filter(([, opt]) => !opt.tendencia || opt.tendencia.includes('vegetariano') || opt.tendencia.includes('vegano')))
    return cenasOpts
  })()

  function handleWheyChange(enabled: boolean) {
    if (!enabled) {
      // Remover del desayuno las opciones que requieren whey
      const validDes = (form.desayunos ?? []).filter(k => !desayunosOpts[k]?.requiereWhey)
      setForm(prev => ({
        ...prev,
        wheyIndicado: false,
        desayunos: validDes.length > 0 ? validDes : ['avena_platano'],
      }))
    } else {
      set('wheyIndicado', true)
    }
  }

  function handleTendenciaChange(t: string) {
    if (t === 'vegetariano' || t === 'vegano') {
      const isVegano = t === 'vegano'
      const vegAlmKeys = Object.keys(almuerzosOpts).filter(k => {
        const opt = almuerzosOpts[k]
        if (!opt.tendencia) return true
        return isVegano ? opt.tendencia.includes('vegano') : (opt.tendencia.includes('vegetariano') || opt.tendencia.includes('vegano'))
      })
      const vegCenKeys = Object.keys(cenasOpts).filter(k => {
        const opt = cenasOpts[k]
        if (!opt.tendencia) return true
        return isVegano ? opt.tendencia.includes('vegano') : (opt.tendencia.includes('vegetariano') || opt.tendencia.includes('vegano'))
      })
      const validAlm = (form.almuerzos ?? []).filter(k => vegAlmKeys.includes(k))
      const validCen = (form.cenas ?? []).filter(k => vegCenKeys.includes(k))
      setForm(prev => ({
        ...prev,
        tendencia: t,
        almuerzos: validAlm.length > 0 ? validAlm : [vegAlmKeys[0]],
        cenas: validCen.length > 0 ? validCen : [vegCenKeys[0]],
      }))
    } else {
      set('tendencia', t)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-4 sm:p-6 pb-6">
      {/* Progress */}
      <div className="mb-5 sm:mb-6">
        {/* Circles row */}
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < step && setStep(i)}
                title={s}
                className={cn(
                  'w-5 h-5 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center transition-all flex-shrink-0',
                  i === step
                    ? 'bg-[#0C3547] text-white ring-2 ring-[#0C3547]/20 scale-110'
                    : i < step
                    ? 'bg-[#29ABE2] text-white cursor-pointer hover:opacity-80'
                    : 'bg-[#EAF4FB] text-[#6B7C93]'
                )}
              >
                {i < step ? '✓' : i + 1}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-1 sm:mx-1.5', i < step ? 'bg-[#29ABE2]' : 'bg-[#D6E3ED]')} />
              )}
            </div>
          ))}
        </div>
        {/* Active step label */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-bold text-[#0C3547]">
            Paso {step + 1} de {STEPS.length}:
          </span>
          <span className="text-xs font-semibold text-[#29ABE2]">{STEPS[step]}</span>
        </div>
        {/* Mobile compact progress bar */}
        <div className="mt-2 h-1 bg-[#EAF4FB] rounded-full sm:hidden">
          <div
            className="h-1 bg-gradient-to-r from-[#29ABE2] to-[#0C3547] rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
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
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">👤 Datos del paciente</h3>
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
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">🏋️ Actividad física</h3>
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

              {/* 📊 Composición corporal — BIA / InBody / ISAK */}
              <div className="border border-[#D6E3ED] rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547]">
                    📊 Composición corporal
                    <span className="ml-2 text-xs font-normal text-[#6B7C93]">opcional · BIA / InBody / ISAK</span>
                  </label>
                  <p className="text-xs text-[#6B7C93] mt-0.5">
                    Con estos datos el sistema personaliza las noticias y alertas clínicas según tu estado nutricional real.
                    El % de grasa activa la fórmula Cunningham si cumple los criterios.
                  </p>
                </div>

                {/* Fila: % grasa + badge Cunningham */}
                <div>
                  <p className="text-xs font-semibold text-[#4A6070] mb-1.5">% Grasa corporal</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="number"
                      min={3}
                      max={60}
                      step={0.1}
                      value={form.porcentajeGrasa ?? ''}
                      onChange={e => {
                        const v = e.target.value === '' ? undefined : Number(e.target.value)
                        set('porcentajeGrasa', v as number)
                      }}
                      className="w-28 px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                      placeholder="Ej: 22.5"
                    />
                    <span className="text-sm text-[#6B7C93]">%</span>
                    {usaraCunningham(form.sexo ?? 'masculino', form.diasEjercicio ?? 0, form.porcentajeGrasa) && (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Cunningham activado
                      </span>
                    )}
                  </div>
                  {form.porcentajeGrasa != null && !usaraCunningham(form.sexo ?? 'masculino', form.diasEjercicio ?? 0, form.porcentajeGrasa) && (
                    <p className="text-xs text-[#6B7C93] mt-1">
                      Cunningham requiere ≥5 días de ejercicio y
                      {form.sexo === 'femenino' ? ' ≤22%' : ' ≤15%'} de grasa.
                      Se usará Mifflin-St Jeor.
                    </p>
                  )}
                </div>

                {/* Fila: masa muscular + grasa kg */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#4A6070] mb-1.5">💪 Masa muscular</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={80}
                        step={0.1}
                        value={form.masaMuscularKg ?? ''}
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : Number(e.target.value)
                          set('masaMuscularKg', v as number)
                        }}
                        className="w-full px-3 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] text-sm focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                        placeholder="Ej: 28.4"
                      />
                      <span className="text-xs text-[#6B7C93] flex-shrink-0">kg</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#4A6070] mb-1.5">🔥 Grasa corporal</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={80}
                        step={0.1}
                        value={form.grasaCorporalKg ?? ''}
                        onChange={e => {
                          const v = e.target.value === '' ? undefined : Number(e.target.value)
                          set('grasaCorporalKg', v as number)
                        }}
                        className="w-full px-3 py-2.5 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] text-sm focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
                        placeholder="Ej: 18.2"
                      />
                      <span className="text-xs text-[#6B7C93] flex-shrink-0">kg</span>
                    </div>
                  </div>
                </div>

                {/* Alert clínica en tiempo real según valores ingresados */}
                {(() => {
                  const isMale = form.sexo === 'masculino'
                  const masa = form.masaMuscularKg
                  const cutoffMasa = isMale ? 28 : 20
                  const grasaKg = form.grasaCorporalKg
                    ?? (form.porcentajeGrasa && form.peso ? form.peso * form.porcentajeGrasa / 100 : undefined)
                  const pctGrasa = grasaKg && form.peso ? grasaKg / form.peso : undefined
                  const cutoffGrasa = isMale ? 0.25 : 0.32
                  const masaBaja = masa !== undefined && masa < cutoffMasa
                  const grasaAlta = pctGrasa !== undefined && pctGrasa > cutoffGrasa
                  if (!masaBaja && !grasaAlta) return null
                  return (
                    <div className="space-y-2">
                      {masaBaja && (
                        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <span className="text-sm flex-shrink-0">⚠️</span>
                          <p className="text-xs text-amber-800">
                            <strong>Masa muscular bajo el umbral de referencia</strong> (EWGSOP2: {isMale ? '28' : '20'} kg).
                            Se priorizarán noticias sobre sarcopenia, síntesis proteica y entrenamiento de fuerza.
                          </p>
                        </div>
                      )}
                      {grasaAlta && (
                        <div className="flex gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                          <span className="text-sm flex-shrink-0">📊</span>
                          <p className="text-xs text-rose-800">
                            <strong>Grasa corporal elevada</strong> (&gt;{isMale ? '25' : '32'}%).
                            Se priorizarán noticias sobre déficit calórico, grasa visceral y adherencia.
                          </p>
                        </div>
                      )}
                      {masaBaja && grasaAlta && (
                        <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <span className="text-sm flex-shrink-0">🎯</span>
                          <p className="text-xs text-blue-800">
                            <strong>Perfil de recomposición corporal:</strong> alta grasa + baja masa muscular.
                            Plan enfocado en déficit moderado con alta proteína y entrenamiento de fuerza.
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Step 2: Objetivo */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">🎯 Objetivo nutricional</h3>
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

          {/* Step 5: Alimentación */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">🥗 Preferencias alimentarias</h3>
              <p className="text-xs text-[#6B7C93]">Selecciona una o más opciones por tiempo de comida. El plan rotará entre tus elecciones.</p>

              {/* Selector tipo yogur — siempre visible, antes de tendencia */}
              <YogurtTypePicker
                value={(form.yogurtTipo ?? 'griego') as YogurTipo}
                onChange={t => set('yogurtTipo', t)}
              />

              {/* Tendencia alimentaria */}
              <div className="border border-[#D6E3ED] rounded-xl p-4">
                <label className="block text-sm font-semibold text-[#0C3547] mb-1">🌿 Tendencia alimentaria</label>
                <p className="text-xs text-[#6B7C93] mb-3">
                  Selecciona <strong>Vegetariano</strong> para adaptar las fuentes proteicas a opciones de origen vegetal (legumbres, tofu, huevo).
                </p>
                <div className="flex gap-2">
                  {([
                    { value: 'omnivoro',    label: '🥩 Omnívoro',    desc: 'Incluye carnes, pescado y pollo' },
                    { value: 'vegetariano', label: '🌿 Vegetariano', desc: 'Legumbres, tofu, huevo y lácteos' },
                    { value: 'vegano',      label: '🌱 Vegano',      desc: 'Solo origen vegetal, sin huevo ni lácteos' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleTendenciaChange(opt.value)}
                      className={cn(
                        'flex-1 py-3 px-4 rounded-xl border-2 text-left transition-all',
                        tendenciaActual === opt.value
                          ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                          : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                      )}
                    >
                      <div className="text-sm font-bold">{opt.label}</div>
                      <div className="text-xs font-normal mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proteína en polvo */}
              <div className="border border-[#D6E3ED] rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0C3547]">💊 Proteína en polvo (Whey)</p>
                    <p className="text-xs text-[#6B7C93] mt-0.5">
                      Activa solo si el profesional la ha indicado. Habilita opciones de desayuno con scoop de proteína.
                    </p>
                  </div>
                  <button
                    onClick={() => handleWheyChange(!wheyActivo)}
                    className={cn(
                      'relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200',
                      wheyActivo ? 'bg-[#29ABE2]' : 'bg-[#D6E3ED]'
                    )}
                    aria-label="Activar proteína en polvo"
                  >
                    <span className={cn(
                      'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
                      wheyActivo ? 'left-7' : 'left-1'
                    )} />
                  </button>
                </div>
                {wheyActivo && (
                  <div className="mt-3 flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                    <span className="text-sm flex-shrink-0">ℹ️</span>
                    <p className="text-xs text-blue-800">
                      Opciones con proteína en polvo activadas. Asegúrate de tener el producto disponible antes de incluirlas en el plan.
                    </p>
                  </div>
                )}
              </div>

              {/* Desayunos */}
              <div>
                <MealChips
                  label="🌅 Desayunos"
                  pool={filteredDesayunos}
                  selected={form.desayunos ?? []}
                  onChange={v => set('desayunos', v)}
                />
                {(form.desayunos ?? []).some(k => desayunosOpts[k]?.tieneHuevo) && (
                  <EggsQtyPicker
                    value={form.eggsQtyDesayuno ?? 2}
                    onChange={n => set('eggsQtyDesayuno', n)}
                  />
                )}
              </div>

              {/* Colación mañana */}
              <div>
                <MealChips
                  label="☕ Colación de mañana"
                  pool={colacionesOpts}
                  selected={form.colacionManana ?? []}
                  onChange={v => set('colacionManana', v)}
                />
              </div>

              {/* Almuerzos */}
              <div>
                <MealChips
                  label="🍽️ Almuerzos"
                  pool={filteredAlmuerzos}
                  selected={form.almuerzos ?? []}
                  onChange={v => set('almuerzos', v)}
                />
                {(form.almuerzos ?? []).some(k => almuerzosOpts[k]?.tieneHuevo) && (
                  <EggsQtyPicker
                    value={form.eggsQty ?? 2}
                    onChange={n => set('eggsQty', n)}
                  />
                )}
              </div>

              {/* Once */}
              <div>
                <MealChips
                  label="🫖 Once"
                  pool={colacionesOpts}
                  selected={form.once ?? []}
                  onChange={v => set('once', v)}
                />
              </div>

              {/* Cenas */}
              <div>
                <MealChips
                  label="🌙 Cenas"
                  pool={filteredCenas}
                  selected={form.cenas ?? []}
                  onChange={v => set('cenas', v)}
                />
                {(form.cenas ?? []).some(k => cenasOpts[k]?.tieneHuevo) && (
                  <EggsQtyPicker
                    value={form.eggsQtyCena ?? 3}
                    onChange={n => set('eggsQtyCena', n)}
                  />
                )}
              </div>

              {/* Disclaimer Vegetal Burger Abuelo */}
              {(form.almuerzos ?? []).includes('vegetal_burger_abuelo') && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start bg-green-50 border border-green-300 rounded-xl p-3">
                    <span className="text-lg flex-shrink-0">🌿</span>
                    <div className="text-xs text-green-900 space-y-1">
                      <p className="font-bold">Vegetal Burger Porotos Negros — sin sellos de advertencia</p>
                      <p>Proteína vegetal de porotos negros · Sin colesterol · Bajo en grasas saturadas (1,3 g/porción). Buena opción para dietas plant-based de bajo presupuesto.</p>
                      <p className="text-[#4A6174]"><strong>Contiene gluten</strong> (harina de trigo) — no apto para celíacos ni intolerancia al gluten. Trazas de huevo, leche y alimentos cárnicos por línea compartida.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer Beyond Burger */}
              {(form.almuerzos ?? []).includes('beyond_burger') && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-start bg-[#FFF8F0] border border-orange-300 rounded-xl p-3">
                    <span className="text-lg flex-shrink-0">🌱</span>
                    <div className="text-xs text-orange-900 space-y-1">
                      <p className="font-bold">Beyond Burger — proteína vegetal de origen industrial</p>
                      <p>Sello <strong>Alto en Grasas Saturadas</strong> (5,1 g/porción, principalmente aceite de coco). Para pacientes con triglicéridos elevados o riesgo cardiovascular, consultar con el profesional antes de incluirlo.</p>
                      <p className="text-[#4A6174]">100% vegetal · Sin gluten declarado · Sin lactosa · Sin huevo · Sin carnes. Puede contener trazas de soya y gluten por línea de producción compartida.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer barras proteicas */}
              {(
                (form.colacionManana ?? []).some(k => ['wild_protein_col','moroketo_col','alfajor_keto_col','protein_bite_bw_col','twentys_hazelnut_col'].includes(k)) ||
                (form.once ?? []).some(k => ['wild_protein_col','moroketo_col','alfajor_keto_col','protein_bite_bw_col','twentys_hazelnut_col'].includes(k))
              ) && (
                <div className="space-y-2">
                  {(form.colacionManana ?? []).concat(form.once ?? []).includes('wild_protein_col') && (
                    <div className="flex gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800"><strong>Wild Protein · Alérgenos:</strong> Contiene maní, leche, soya. Elaborado en líneas que también procesan gluten, nueces, sulfitos.</p>
                    </div>
                  )}
                  {(form.colacionManana ?? []).concat(form.once ?? []).includes('protein_bite_bw_col') && (
                    <div className="flex gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800"><strong>Protein Bite Black &amp; White · Alérgenos:</strong> Contiene leche y soya. Elaborado en líneas que procesan huevo y maní. Fenilcetonúricos: contiene fenilalanina.</p>
                    </div>
                  )}
                  {(form.colacionManana ?? []).concat(form.once ?? []).includes('twentys_hazelnut_col') && (
                    <div className="flex gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800"><strong>Twenty&apos;s Hazelnut Praline · Alérgenos:</strong> Contiene leche, soya (lecitinas) y avellana. Elaborado en líneas que procesan huevo, maní, nueces y sulfitos.</p>
                    </div>
                  )}
                  {(form.colacionManana ?? []).concat(form.once ?? []).includes('moroketo_col') && (
                    <div className="flex gap-2 bg-green-50 border border-green-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">✅</span>
                      <p className="text-xs text-green-800"><strong>Moroketo Proteína:</strong> Sin gluten · Chocolate 85% cacao · Sin azúcar añadida.</p>
                    </div>
                  )}
                  {(form.colacionManana ?? []).concat(form.once ?? []).includes('alfajor_keto_col') && (
                    <div className="flex gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800"><strong>Alfajor Keto Nutrevo · Alérgenos:</strong> Contiene leche, soya, huevo. Revisar etiqueta si hay alergias.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Semanas */}
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-2">📅 Semanas del plan</label>
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
          {/* Step 3: Salud digestiva */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">🧬 Salud digestiva</h3>
              <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-lg flex-shrink-0">💡</span>
                <p className="text-xs text-blue-800">Estas preguntas ajustan automáticamente las preparaciones del plan. Un mismo objetivo puede llevar a planes distintos según la tolerancia digestiva del paciente.</p>
              </div>

              <RadioChips
                label="🎈 Hinchazón abdominal"
                value={(form.digHinchazon ?? 'nunca') as 'nunca'|'ocasional'|'frecuente'|'diaria'}
                onChange={v => set('digHinchazon', v)}
                options={[
                  { value: 'nunca', label: 'Nunca' },
                  { value: 'ocasional', label: 'Ocasional' },
                  { value: 'frecuente', label: 'Frecuente' },
                  { value: 'diaria', label: 'Diaria' },
                ]}
              />

              <RadioChips
                label="🔥 Reflujo o acidez"
                value={(form.digReflujo ?? 'nunca') as 'nunca'|'ocasional'|'frecuente'}
                onChange={v => set('digReflujo', v)}
                options={[
                  { value: 'nunca', label: 'Nunca' },
                  { value: 'ocasional', label: 'Ocasional' },
                  { value: 'frecuente', label: 'Frecuente' },
                ]}
              />

              <RadioChips
                label="🌀 Ritmo intestinal habitual"
                value={(form.digRitmo ?? 'normal') as 'normal'|'constipacion'|'diarrea'|'alternado'}
                onChange={v => set('digRitmo', v)}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'constipacion', label: 'Constipación' },
                  { value: 'diarrea', label: 'Diarrea' },
                  { value: 'alternado', label: 'Alternado' },
                ]}
              />

              <CheckChips
                label="⚠️ Intolerancias percibidas"
                selected={form.digIntolerancias ?? []}
                onChange={v => set('digIntolerancias', v)}
                options={[
                  { value: 'lactosa',      label: '🥛 Lácteos / lactosa' },
                  { value: 'gluten',       label: '🌾 Gluten / trigo' },
                  { value: 'legumbres',    label: '🫘 Legumbres' },
                  { value: 'cruciferas',   label: '🥦 Crucíferas (brócoli, coliflor)' },
                  { value: 'cebolla_ajo',  label: '🧅 Cebolla / ajo crudos' },
                  { value: 'fodmap',       label: '🍎 FODMAPs (manzana, pera, miel)' },
                  { value: 'huevo',        label: '🥚 Huevo' },
                  { value: 'frutos_secos', label: '🥜 Frutos secos' },
                ]}
              />

              <RadioChips
                label="🩺 Diagnóstico previo"
                value={(form.digDiag ?? 'no') as 'no'|'si_sibo'|'si_sii'|'sospecha'}
                onChange={v => set('digDiag', v)}
                options={[
                  { value: 'no',       label: 'No' },
                  { value: 'si_sibo',  label: 'Sí — SIBO' },
                  { value: 'si_sii',   label: 'Sí — SII / colon irritable' },
                  { value: 'sospecha', label: 'No, pero sospecha' },
                ]}
              />

              <CheckChips
                label="⏰ Horario en que aparecen las molestias"
                selected={form.digHorario ?? []}
                onChange={v => set('digHorario', v)}
                options={[
                  { value: 'manana',        label: 'Mañana / ayunas' },
                  { value: 'post_almuerzo', label: 'Después del almuerzo' },
                  { value: 'tarde',         label: 'Tarde' },
                  { value: 'noche',         label: 'Noche / al acostarse' },
                  { value: 'no_aplica',     label: '✅ No tengo molestias' },
                ]}
              />
            </div>
          )}

          {/* Step 4: Suplementación segura */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">💊 Suplementación segura</h3>
              <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-lg flex-shrink-0">🩺</span>
                <p className="text-xs text-blue-800">Estas preguntas evitan sugerir suplementos contraindicados (whey con disfunción renal, termogénicos en embarazo, etc.). El profesional siempre tiene la última palabra; la app solo aplica filtros precautorios.</p>
              </div>

              <RadioChips
                label="🤱 ¿Embarazo o lactancia actual?"
                value={(form.supEmbarazo ?? 'no') as 'no'|'embarazo'|'lactancia'|'planificando'}
                onChange={v => set('supEmbarazo', v)}
                options={[
                  { value: 'no',          label: 'No' },
                  { value: 'embarazo',    label: 'Embarazo' },
                  { value: 'lactancia',   label: 'Lactancia' },
                  { value: 'planificando',label: 'Planificando embarazo' },
                ]}
              />

              <CheckChips
                label="⚠️ Condiciones médicas crónicas"
                selected={form.supCronicas ?? []}
                onChange={v => set('supCronicas', v)}
                options={[
                  { value: 'renal',          label: '🫘 Insuficiencia renal / ERC' },
                  { value: 'hepatica',       label: '🫀 Insuficiencia hepática' },
                  { value: 'cardiovascular', label: '❤️ Cardiovascular (HTA, ICC, post-IAM)' },
                  { value: 'diabetes',       label: '🩸 Diabetes tipo 1 o 2' },
                  { value: 'hipertiroidismo',label: '🦋 Hipertiroidismo' },
                  { value: 'ninguna',        label: '✅ Ninguna' },
                ]}
              />

              <div className="space-y-3">
                <RadioChips
                  label="💊 ¿Toma medicamentos a diario?"
                  value={(form.supMedic ?? 'no') as 'no'|'si'}
                  onChange={v => set('supMedic', v)}
                  options={[
                    { value: 'no', label: 'No' },
                    { value: 'si', label: 'Sí' },
                  ]}
                />
                {form.supMedic === 'si' && (
                  <input
                    type="text"
                    value={form.supMedicDetalle || ''}
                    onChange={e => set('supMedicDetalle', e.target.value)}
                    placeholder="Ej: levotiroxina, losartán, metformina..."
                    className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-sm text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2]"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-1">
                  🍃 Suplementos actuales
                  <span className="text-xs font-normal text-[#6B7C93] ml-2">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={form.supActuales || ''}
                  onChange={e => set('supActuales', e.target.value)}
                  placeholder="Ej: whey 25g post-entreno, creatina 5g, omega-3, vitamina D..."
                  className="w-full px-4 py-2.5 border border-[#D6E3ED] rounded-xl text-sm text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2]"
                />
                <p className="text-xs text-[#6B7C93] mt-1">Sirve para evitar duplicar dosis y revisar interacciones.</p>
              </div>

              {/* Divisor */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-[#E2ECF4]" />
                <p className="text-xs font-black text-[#0C1F2C] px-2 whitespace-nowrap">🤖 Recomendación IA de suplementos</p>
                <div className="flex-1 h-px bg-[#E2ECF4]" />
              </div>

              {/* Módulo IA de suplementación */}
              <SupIAPanel form={form} />
            </div>
          )}

          {/* Step 6: Antojos ultra procesados */}
          {step === 6 && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">🚨 Antojos y control consciente</h3>

              {/* Disclaimer */}
              <div className="flex gap-3 bg-red-50 border border-red-300 rounded-xl p-3 sm:p-4">
                <span className="text-xl sm:text-2xl flex-shrink-0">⚠️</span>
                <div className="text-xs sm:text-sm text-red-800">
                  <p className="font-bold mb-1">Advertencia nutricional</p>
                  <p>Los alimentos ultra procesados contienen altos niveles de sodio, azúcares añadidos y grasas saturadas. Su consumo debe ser <strong>medido y ajustado a la porción indicada.</strong></p>
                  <p className="mt-1 font-semibold">Incluirlos tiene como objetivo el <strong>control consciente</strong>, no su promoción.</p>
                </div>
              </div>

              {/* Selector antojos */}
              <div>
                <label className="block text-sm font-semibold text-[#0C3547] mb-2">
                  Selecciona los antojos a incluir en el plan
                  <span className="text-xs font-normal text-[#6B7C93] ml-2">(opcional)</span>
                </label>
                <UltraChips
                  pool={ultraProcOpts}
                  selected={form.ultraProcesados ?? []}
                  onChange={v => set('ultraProcesados', v)}
                />
                <p className="text-xs text-[#6B7C93] mt-2">Si seleccionas, aparecerán rotando en el plan con su información nutricional real y sellos de advertencia.</p>
              </div>

              {/* Días por semana */}
              {(form.ultraProcesados ?? []).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-2">
                    ¿Cuántos días a la semana los incluyes?
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 7].map(d => (
                      <button
                        key={d}
                        onClick={() => set('ultraDias', d)}
                        className={cn(
                          'px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all',
                          form.ultraDias === d
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-red-400'
                        )}
                      >
                        {d === 7 ? 'Todos' : `${d} día${d > 1 ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#6B7C93] mt-2">El antojo aparecerá los primeros {form.ultraDias} día{(form.ultraDias ?? 2) > 1 ? 's' : ''} de cada semana del plan.</p>
                </div>
              )}

              {/* Confirmación vacío */}
              {(form.ultraProcesados ?? []).length === 0 && (
                <div className="flex gap-2 bg-green-50 border border-green-300 rounded-xl p-4">
                  <span className="text-xl">✅</span>
                  <p className="text-sm text-green-800 font-semibold">Sin antojos seleccionados. El plan será 100% saludable.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Errores de validación */}
      {errors.length > 0 && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          {errors.map(e => (
            <p key={e} className="text-sm text-red-600 font-semibold">⚠ {e}</p>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-4">
        {step > 0 && (
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#D6E3ED] text-[#6B7C93] font-bold rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
          >
            ← Atrás
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#0C3547] to-[#145272] text-white font-bold rounded-xl hover:opacity-90 transition"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#29ABE2] to-[#1a7fad] text-white font-bold rounded-xl hover:opacity-90 transition"
          >
            ⚡ Generar plan
          </button>
        )}
      </div>
    </div>
  )
}
