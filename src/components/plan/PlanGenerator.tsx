'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcularNutricion, OBJETIVO_LABELS, SEXO_LABELS, EJERCICIO_LABELS } from '@/lib/nutrition'
import type { FormData, NutritionResult, Objetivo, Sexo, TipoEjercicio } from '@/lib/nutrition'
import type { MealOption, UltraOption } from '@/lib/foods'
import { desayunosOpts, colacionesOpts, almuerzosOpts, cenasOpts, ultraProcOpts } from '@/lib/foods'
import { cn } from '@/lib/utils'

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
        {Object.entries(pool).map(([key, opt]) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={cn(
              'px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
              selected.includes(key)
                ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2] hover:text-[#0C3547]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
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
    setStep(s => s + 1)
  }

  function handleGenerate() {
    const f = form as FormData
    const result = calcularNutricion(f)
    onResult(result, f)
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

              {/* Desayunos */}
              <MealChips
                label="🌅 Desayunos"
                pool={desayunosOpts}
                selected={form.desayunos ?? []}
                onChange={v => set('desayunos', v)}
              />

              {/* Colación mañana */}
              <MealChips
                label="☕ Colación de mañana"
                pool={colacionesOpts}
                selected={form.colacionManana ?? []}
                onChange={v => set('colacionManana', v)}
              />

              {/* Almuerzos */}
              <MealChips
                label="🍽️ Almuerzos"
                pool={almuerzosOpts}
                selected={form.almuerzos ?? []}
                onChange={v => set('almuerzos', v)}
              />

              {/* Once */}
              <MealChips
                label="🫖 Once"
                pool={colacionesOpts}
                selected={form.once ?? []}
                onChange={v => set('once', v)}
              />

              {/* Cenas */}
              <MealChips
                label="🌙 Cenas"
                pool={cenasOpts}
                selected={form.cenas ?? []}
                onChange={v => set('cenas', v)}
              />

              {/* Disclaimer barras proteicas */}
              {(
                (form.colacionManana ?? []).some(k => ['wild_protein_col','moroketo_col','alfajor_keto_col'].includes(k)) ||
                (form.once ?? []).some(k => ['wild_protein_col','moroketo_col','alfajor_keto_col'].includes(k))
              ) && (
                <div className="space-y-2">
                  {(form.colacionManana ?? []).concat(form.once ?? []).includes('wild_protein_col') && (
                    <div className="flex gap-2 bg-amber-50 border border-amber-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800"><strong>Wild Protein · Alérgenos:</strong> Contiene maní, leche, soya. Elaborado en líneas que también procesan gluten, nueces, sulfitos.</p>
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
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-[#D6E3ED] text-[#6B7C93] font-bold rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
          >
            ← Atrás
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#0C3547] to-[#145272] text-white font-bold rounded-xl hover:opacity-90 transition"
          >
            Siguiente →
          </button>
        ) : (
          <button
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
