'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcularNutricion, OBJETIVO_LABELS, SEXO_LABELS, EJERCICIO_LABELS, usaraCunningham, WHEY_MOMENTO_LABELS, METODO_CALCULO_LABELS, sugerirCho, sugerirProteina, sugerirGrasa, PAL_NIVELES_FAO } from '@/lib/nutrition'
import type { FormData, NutritionResult, Objetivo, Sexo, TipoEjercicio, WheyMomento, MetodoCalculo } from '@/lib/nutrition'
import { MODALIDAD_PLAN_LABELS, type ModalidadPlan } from '@/lib/porciones'
import {
  CIRUGIA_BARIATRICA_LABELS,
  FASE_POST_LABELS,
  VOLUMEN_MAX_POR_COMIDA_ML,
  PROTEINA_OBJETIVO_G_DIA,
  faseAceptaCatalogoEstandar,
  type CirugiaBariatricaTipo,
  type FasePostBariatrica,
} from '@/lib/bariatrica'
import type { MealOption, UltraOption, YogurTipo, PanTipo, QuesoTipo, SnackNutrevoTipo, BarraProteinaTipo } from '@/lib/foods'
import { desayunosOpts, colacionesOpts, almuerzosOpts, cenasOpts, ultraProcOpts, YOGUR_TIPOS, PAN_TIPOS, QUESO_TIPOS, SNACK_NUTREVO_TIPOS, BARRA_PROTEINA_TIPOS } from '@/lib/foods'
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
  carneGramosAlmuerzo: 150,
  carneGramosCena: 150,
  sandwichQty: 1,
  sandwichQtyOnce: 1,
  semanas: 1,
  desayunos: ['avena_platano'],
  wheyIndicado: false,
  yogurtTipo: 'griego' as YogurTipo,
  panTipo: 'integral' as PanTipo,
  quesoTipo: 'gauda' as QuesoTipo,
  snackNutrevoTipo: 'alfajor_activa2' as SnackNutrevoTipo,
  barraProteinaTipo: 'wild_protein' as BarraProteinaTipo,
  incluirSnackEnPlan: false,      // opt-in: el paciente decide explícitamente
  incluirBarraEnPlan: false,      // opt-in: el paciente decide explícitamente
  horarioEntrenamiento: 'PM' as 'AM' | 'PM' | 'noche' | 'sin_entreno',
  comidasPorDia: 5 as 3 | 4 | 5 | 6,
  presupuestoSemanal: 'medio' as 'bajo' | 'medio' | 'alto',
  tiempoCocinar: '15_30' as 'menos_15' | '15_30' | '30_60' | 'mas_60',
  habilidadCulinaria: 'intermedio' as 'principiante' | 'intermedio' | 'avanzado',
  lugarAlmuerzo: 'casa' as 'casa' | 'oficina' | 'restaurant' | 'colegio',
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
// Identidad visual por marca: emoji-logo + gradiente del botón colapsable.
// El gradiente se usa solo en el bloque cuando está cerrado/peek para diferenciar
// la marca de un vistazo. Si una marca nueva aparece en el catálogo sin entrada
// aquí, cae al default neutral (sin romper la UI).
// Estetica Dymatize-style: cards en fondo oscuro premium, acento de color
// por marca via stripe lateral y hex puro (no gradiente). Tipografia
// uppercase con tracking marcado, border-radius bajo, sombras definidas.
//
// `accent`  -> color hex del stripe lateral y de los chips seleccionados.
// `chip`    -> clase tailwind del hover de los chips no seleccionados.
// `selected`-> clase tailwind del fondo del chip seleccionado.
const MARCA_INFO: Record<string, {
  emoji: string
  logo?: string
  accent: string
  chipHover: string
  chipSelected: string
}> = {
  'Costa':              { emoji: '🍪', logo: '/img/marcas/costa.webp',       accent: '#E11D2A', chipHover: 'hover:border-red-500 hover:text-red-300',         chipSelected: 'bg-red-600 border-red-600' },
  'Frito-Lay (PepsiCo)':{ emoji: '🌶️',                                       accent: '#F97316', chipHover: 'hover:border-orange-500 hover:text-orange-300',   chipSelected: 'bg-orange-600 border-orange-600' },
  'Great Value':        { emoji: '🛒', logo: '/img/marcas/great_value.webp', accent: '#1D4ED8', chipHover: 'hover:border-blue-500 hover:text-blue-300',       chipSelected: 'bg-blue-600 border-blue-600' },
  'Nestlé':             { emoji: '🍫', logo: '/img/marcas/nestle.webp',      accent: '#D97706', chipHover: 'hover:border-amber-500 hover:text-amber-300',     chipSelected: 'bg-amber-600 border-amber-600' },
  'Savory':             { emoji: '🍦', logo: '/img/marcas/savory.webp',      accent: '#DB2777', chipHover: 'hover:border-pink-500 hover:text-pink-300',       chipSelected: 'bg-pink-600 border-pink-600' },
  'Soprole':            { emoji: '🥛', logo: '/img/marcas/soprole.webp',     accent: '#0891B2', chipHover: 'hover:border-cyan-500 hover:text-cyan-300',       chipSelected: 'bg-cyan-600 border-cyan-600' },
  'Genérico':           { emoji: '🏷️',                                       accent: '#64748B', chipHover: 'hover:border-slate-400 hover:text-slate-200',     chipSelected: 'bg-slate-500 border-slate-500' },
  'Sin marca':          { emoji: '🏷️',                                       accent: '#64748B', chipHover: 'hover:border-slate-400 hover:text-slate-200',     chipSelected: 'bg-slate-500 border-slate-500' },
}
const MARCA_DEFAULT = MARCA_INFO['Sin marca']

// ─── Selector de modalidad del plan (menús vs porciones) ────────────────────
// Toggle simple de 2 cards. Default 'menus' (retrocompat). El profesional
// decide por paciente si entregar el plan con preparaciones específicas o
// con la lista de intercambios alimentarios chilena (INTA/Sochinut).
function ModalidadPlanSelector({
  form,
  set,
}: {
  form: Partial<FormData>
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}) {
  const modalidad: ModalidadPlan = form.modalidadPlan ?? 'menus'
  return (
    <div className="border border-[#D6E3ED] rounded-xl p-4 space-y-3 bg-[#F8FBFD]">
      <p className="text-sm font-semibold text-[#0C3547]">📋 Modalidad del plan</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(['menus', 'porciones'] as ModalidadPlan[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => set('modalidadPlan', m)}
            className={cn(
              'p-3 rounded-lg border-2 text-left transition-all',
              modalidad === m
                ? 'bg-[#EAF4FB] border-[#29ABE2]'
                : 'border-[#D6E3ED] bg-white hover:border-[#29ABE2]',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{MODALIDAD_PLAN_LABELS[m].emoji}</span>
              <p className="text-sm font-bold text-[#0C3547]">{MODALIDAD_PLAN_LABELS[m].label}</p>
            </div>
            <p className="text-[11px] text-[#4a6b80] leading-relaxed">
              {MODALIDAD_PLAN_LABELS[m].desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Selector de método de cálculo (Opciones A/B/C + overrides para mezclas) ─
// Selector colapsable que va al final del step "Objetivo". Default colapsado
// con bmr_pal — mantiene flow estándar para profesionales que no quieran
// cambiar nada. Al expandir, permite:
//   • Elegir entre los 3 métodos
//   • Si elige B: ingresar kcalPorKg (20-50)
//   • Si elige C: ingresar 3 g/kg (proteína Phillips, grasa ACSM, CHO Burke)
//   • Sección "Overrides" para forzar un macro específico en cualquier método
//   • Preview en vivo de los macros + kcal resultantes
function MetodoCalculoSelector({
  form,
  set,
}: {
  form: Partial<FormData>
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const [showOverrides, setShowOverrides] = useState(false)
  const metodo: MetodoCalculo = form.metodoCalculo ?? 'bmr_pal'

  // Sugerencias para mostrar al pro (no auto-llenan)
  const sugP = sugerirProteina(form.objetivo ?? 'mantenimiento', form.tipoEjercicio ?? 'fuerza')
  const sugG = sugerirGrasa(form.objetivo ?? 'mantenimiento')
  const sugC = sugerirCho(form.diasEjercicio ?? 0, form.duracionSesion ?? 0)

  // Preview en vivo
  const preview = (() => {
    try {
      return calcularNutricion(form as Parameters<typeof calcularNutricion>[0])
    } catch {
      return null
    }
  })()

  const isOverrideActive = form.proteinaGKgOverride != null || form.grasaGKgOverride != null || form.choGKgOverride != null
  const summary =
    metodo === 'bmr_pal'         ? 'Mifflin-St Jeor × actividad (default)' :
    metodo === 'kcal_kg_pal'     ? `${form.kcalPorKg ?? 30} kcal/kg × actividad` :
                                   'Macros directos (g/kg)'

  return (
    <div className="border border-[#D6E3ED] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido(e => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#F8FBFD] transition text-left"
        aria-expanded={expandido}
      >
        <div>
          <p className="text-sm font-semibold text-[#0C3547]">⚙️ Método de cálculo</p>
          <p className="text-[11px] text-[#8BA5BE] mt-0.5">
            {summary}{isOverrideActive && ' · con overrides'}
          </p>
        </div>
        <svg
          className={cn('w-4 h-4 flex-shrink-0 transition-transform text-[#8BA5BE]', expandido && 'rotate-180')}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#D6E3ED] bg-[#F8FBFD]"
          >
            <div className="p-4 space-y-4">
              {/* 3 cards de método */}
              <div className="grid grid-cols-1 gap-2">
                {(['bmr_pal', 'kcal_kg_pal', 'macros_directos'] as MetodoCalculo[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set('metodoCalculo', m)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      metodo === m
                        ? 'bg-[#EAF4FB] border-[#29ABE2]'
                        : 'border-[#D6E3ED] bg-white hover:border-[#29ABE2]',
                    )}
                  >
                    <p className="text-sm font-bold text-[#0C3547]">{METODO_CALCULO_LABELS[m].label}</p>
                    <p className="text-[11px] text-[#4a6b80] mt-0.5 leading-relaxed">{METODO_CALCULO_LABELS[m].desc}</p>
                    <p className="text-[10px] text-[#8BA5BE] mt-1 italic">{METODO_CALCULO_LABELS[m].refs}</p>
                  </button>
                ))}
              </div>

              {/* Inputs específicos por método */}
              {metodo === 'kcal_kg_pal' && (
                <div className="bg-white border border-[#D6E3ED] rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0C3547] uppercase tracking-wide mb-2">
                      Kcal por kg de peso
                    </label>
                    <input
                      type="number"
                      min={15} max={60} step={1}
                      value={form.kcalPorKg ?? ''}
                      onChange={e => set('kcalPorKg', e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="ej. 30 (mantenimiento sedentario)"
                      className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
                    />
                    <p className="text-[10px] text-[#8BA5BE] mt-1.5 leading-relaxed">
                      Referencias: 20=déficit profundo · 25-30=déficit/mantenimiento sedentario · 35-40=activo · 45-50=hipertrofia · 50+=ultra-endurance
                    </p>
                  </div>

                  {/* Selector de PAL (factor de actividad) — niveles FAO/WHO 2001 */}
                  <div className="border-t border-[#E2ECF4] pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-[#0C3547] uppercase tracking-wide">
                        Factor de actividad (PAL)
                      </label>
                      {form.palOverride != null && (
                        <button
                          type="button"
                          onClick={() => set('palOverride', undefined)}
                          className="text-[10px] text-[#29ABE2] font-semibold hover:underline"
                        >
                          Volver a automático
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {PAL_NIVELES_FAO.map(n => (
                        <button
                          key={n.value}
                          type="button"
                          onClick={() => set('palOverride', n.value)}
                          className={cn(
                            'flex flex-col items-center justify-center py-2 px-1 rounded border transition text-center',
                            form.palOverride === n.value
                              ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                              : 'bg-white border-[#D6E3ED] text-[#0C3547] hover:border-[#29ABE2]'
                          )}
                        >
                          <span className="text-[10px] font-bold">{n.value.toFixed(3)}</span>
                          <span className="text-[9px] mt-0.5 leading-tight">{n.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#8BA5BE] mt-1.5 leading-relaxed">
                      {form.palOverride != null
                        ? PAL_NIVELES_FAO.find(n => n.value === form.palOverride)?.desc ?? 'Personalizado'
                        : 'Sin selección — se usa el PAL derivado desde días/duración/tipo de ejercicio (FAO/WHO 2001).'}
                    </p>
                  </div>
                </div>
              )}

              {metodo === 'macros_directos' && (
                <div className="bg-white border border-[#D6E3ED] rounded-lg p-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#0C3547] uppercase tracking-wide">
                        Proteína (g/kg)
                      </label>
                      <span className="text-[10px] text-[#29ABE2] font-semibold">
                        Sugerido: {sugP.min}-{sugP.max}
                      </span>
                    </div>
                    <input
                      type="number" min={0.5} max={3.5} step={0.1}
                      value={form.proteinaGKgOverride ?? ''}
                      onChange={e => set('proteinaGKgOverride', e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="Ej. 2.0 (Phillips/Morton 2018)"
                      className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#0C3547] uppercase tracking-wide">
                        Grasa (g/kg)
                      </label>
                      <span className="text-[10px] text-[#29ABE2] font-semibold">
                        Sugerido: {sugG.min}-{sugG.max}
                      </span>
                    </div>
                    <input
                      type="number" min={0.4} max={2.0} step={0.1}
                      value={form.grasaGKgOverride ?? ''}
                      onChange={e => set('grasaGKgOverride', e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="Ej. 1.0 (ACSM consensus)"
                      className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
                    />
                    <p className="text-[10px] text-rose-600 mt-1">⚠️ Floor crítico 0.5 g/kg — bloquea por riesgo hormonal</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#0C3547] uppercase tracking-wide">
                        CHO (g/kg)
                      </label>
                      <span className="text-[10px] text-[#29ABE2] font-semibold">
                        Sugerido: {sugC.min}-{sugC.max} ({sugC.carga})
                      </span>
                    </div>
                    <input
                      type="number" min={1} max={15} step={0.5}
                      value={form.choGKgOverride ?? ''}
                      onChange={e => set('choGKgOverride', e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="Ej. 5 (Burke 2011 moderate)"
                      className="w-full px-3 py-2 border border-[#D6E3ED] rounded-lg text-sm focus:outline-none focus:border-[#29ABE2]"
                    />
                  </div>
                </div>
              )}

              {/* Overrides avanzados (mezclas en bmr_pal o kcal_kg_pal) */}
              {metodo !== 'macros_directos' && (
                <div className="bg-white border border-[#D6E3ED] rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowOverrides(s => !s)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F8FBFD] text-left"
                  >
                    <span className="text-xs font-bold text-[#0C3547]">
                      🔧 Overrides avanzados (mezclas)
                    </span>
                    <svg className={cn('w-3 h-3 text-[#8BA5BE] transition-transform', showOverrides && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showOverrides && (
                    <div className="px-3 pb-3 space-y-3 border-t border-[#D6E3ED]">
                      <p className="text-[10px] text-[#4a6b80] italic mt-2">
                        Forzá un macro específico sin cambiar el método base. Dejar vacío para usar el cálculo automático.
                      </p>

                      {/* PAL override — niveles FAO/WHO 2001 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-[#0C3547]">Factor de actividad (PAL)</label>
                          {form.palOverride != null && (
                            <button
                              type="button"
                              onClick={() => set('palOverride', undefined)}
                              className="text-[10px] text-[#29ABE2] font-semibold hover:underline"
                            >
                              Automático
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {PAL_NIVELES_FAO.map(n => (
                            <button
                              key={n.value}
                              type="button"
                              onClick={() => set('palOverride', n.value)}
                              title={n.desc}
                              className={cn(
                                'flex flex-col items-center py-1 px-0.5 rounded border transition',
                                form.palOverride === n.value
                                  ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                                  : 'bg-white border-[#D6E3ED] text-[#0C3547] hover:border-[#29ABE2]'
                              )}
                            >
                              <span className="text-[10px] font-bold">{n.value.toFixed(3)}</span>
                              <span className="text-[8px] mt-0.5 leading-none">{n.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {([
                        { key: 'proteinaGKgOverride' as const, label: 'Proteína (g/kg)', sug: sugP, ref: 'Phillips 2018' },
                        { key: 'grasaGKgOverride' as const,    label: 'Grasa (g/kg)',    sug: sugG, ref: 'ACSM' },
                        { key: 'choGKgOverride' as const,      label: 'CHO (g/kg)',      sug: { min: sugC.min, max: sugC.max }, ref: 'Burke 2011' },
                      ]).map(o => (
                        <div key={o.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-bold text-[#0C3547]">{o.label}</label>
                            <span className="text-[10px] text-[#8BA5BE]">
                              Sug: {o.sug.min}-{o.sug.max} ({o.ref})
                            </span>
                          </div>
                          <input
                            type="number" min={0} max={15} step={0.1}
                            value={form[o.key] ?? ''}
                            onChange={e => set(o.key, e.target.value === '' ? undefined : Number(e.target.value))}
                            placeholder="(automático)"
                            className="w-full px-2.5 py-1.5 border border-[#D6E3ED] rounded text-xs focus:outline-none focus:border-[#29ABE2]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview en vivo + warnings */}
              {preview && (
                <div className="bg-[#0F1419] text-white rounded-lg p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Resultado calculado</p>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="text-2xl font-black">{preview.kcal} <span className="text-xs font-normal text-zinc-400">kcal/día</span></p>
                    <p className="text-xs text-zinc-300">
                      <span className="text-violet-300 font-bold">{preview.macros.p}g P</span> ·{' '}
                      <span className="text-amber-300 font-bold">{preview.macros.c}g C</span> ·{' '}
                      <span className="text-rose-300 font-bold">{preview.macros.g}g G</span>
                    </p>
                  </div>
                  {preview.warnings && preview.warnings.length > 0 && (
                    <div className="border-t border-white/10 pt-2 space-y-1">
                      {preview.warnings.map((w, i) => (
                        <p key={i} className={cn('text-[10px] leading-relaxed', w.startsWith('🚨') ? 'text-red-300 font-bold' : 'text-amber-300')}>
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Agrupado por marca (feedback Felipe): el selector se organiza en BLOQUES
// colapsables por fabricante (Nestlé, Costa, Savory, etc.) con 'Genérico' al
// final como catch-all. Cada bloque arranca con un botón grande con el logo
// de la marca; el click expande los productos. Bloques con items ya
// seleccionados se abren automaticamente al montar.
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

  // Agrupar entries por marca. Productos sin campo marca van a 'Sin marca'.
  const grupos = new Map<string, [string, UltraOption][]>()
  for (const [key, opt] of Object.entries(pool)) {
    const m = opt.marca ?? 'Sin marca'
    if (!grupos.has(m)) grupos.set(m, [])
    grupos.get(m)!.push([key, opt])
  }
  // Orden: marcas reales en orden alfabético, 'Genérico' y 'Sin marca' al final
  const marcasOrdenadas = Array.from(grupos.keys()).sort((a, b) => {
    const aEsGenerico = a === 'Genérico' || a === 'Sin marca'
    const bEsGenerico = b === 'Genérico' || b === 'Sin marca'
    if (aEsGenerico && !bEsGenerico) return 1
    if (!aEsGenerico && bEsGenerico) return -1
    return a.localeCompare(b, 'es')
  })

  // Estado de bloques abiertos. Auto-incluye marcas con items ya seleccionados
  // al primer render para que el profesional vea de un vistazo qué ya picó.
  const [abiertas, setAbiertas] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const [marca, items] of grupos) {
      if (items.some(([k]) => selected.includes(k))) initial.add(marca)
    }
    return initial
  })

  function toggleMarca(m: string) {
    setAbiertas(prev => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {marcasOrdenadas.map(marca => {
        const items = grupos.get(marca)!
        const seleccionadosEnGrupo = items.filter(([k]) => selected.includes(k)).length
        const isOpen = abiertas.has(marca)
        const info = MARCA_INFO[marca] ?? MARCA_DEFAULT
        return (
          <div
            key={marca}
            className={cn(
              'group relative rounded-lg overflow-hidden transition-all',
              info.logo ? 'bg-white ring-1 ring-zinc-200' : 'bg-[#0F141A] ring-1 ring-white/5',
              'shadow-[0_6px_20px_-12px_rgba(0,0,0,0.45)]',
              'hover:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.55)] hover:-translate-y-[1px]',
              isOpen && 'sm:col-span-2 -translate-y-[1px]',
              isOpen && (info.logo ? 'ring-zinc-300' : 'ring-white/10'),
            )}
            style={{ borderLeft: `4px solid ${info.accent}` }}
          >
            {/* Botón-bloque de la marca:
                - Con logo: card blanca con logo grande centrado + footer
                  oscuro delgado con contador y chevron (la marca se ve
                  COMPLETA, no recortada con panel negro al lado).
                - Sin logo: card oscura con emoji + nombre + contador
                  (fallback para marcas sin imagen). */}
            <button
              type="button"
              onClick={() => toggleMarca(marca)}
              aria-expanded={isOpen}
              aria-label={`${marca} — ${items.length} ${items.length === 1 ? 'opción' : 'opciones'}`}
              className="w-full flex flex-col text-left"
            >
              {info.logo ? (
                <>
                  {/* Zona del logo: card blanca completa, logo grande
                      y centrado con padding generoso. */}
                  <div className="flex items-center justify-center w-full px-6 py-6 min-h-[112px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={info.logo}
                      alt={marca}
                      className="max-h-16 w-auto object-contain"
                      loading="lazy"
                      onError={e => {
                        const target = e.currentTarget as HTMLImageElement
                        target.style.display = 'none'
                        const fb = target.nextElementSibling as HTMLElement | null
                        if (fb) fb.style.display = 'flex'
                      }}
                    />
                    <span className="hidden text-4xl items-center justify-center" aria-hidden>
                      {info.emoji}
                    </span>
                  </div>
                  {/* Footer slim oscuro: contador + chevron */}
                  <div className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-[#0F141A]">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-black leading-tight">
                        {items.length} {items.length === 1 ? 'opción' : 'opciones'}
                      </p>
                      {seleccionadosEnGrupo > 0 && (
                        <span
                          className="inline-flex items-center text-white px-1.5 py-0.5 rounded-sm text-[9px] font-black tracking-wider"
                          style={{ backgroundColor: info.accent }}
                        >
                          {seleccionadosEnGrupo} ✓
                        </span>
                      )}
                    </div>
                    <svg
                      className={cn('w-4 h-4 flex-shrink-0 transition-transform text-zinc-400 group-hover:text-white', isOpen && 'rotate-180')}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </>
              ) : (
                /* Fallback sin logo: card oscura con emoji + nombre + contador */
                <div className="flex-1 w-full flex items-center gap-3.5 px-4 py-3.5">
                  <div className="w-14 h-14 rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md text-3xl">
                    {info.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] font-black uppercase tracking-[0.14em] leading-tight truncate text-white"
                      style={{ textShadow: '0 1px 0 rgba(0,0,0,0.4)' }}
                    >
                      {marca}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold leading-tight mt-1 flex items-center gap-1.5">
                      <span>
                        {items.length} {items.length === 1 ? 'opción' : 'opciones'}
                      </span>
                      {seleccionadosEnGrupo > 0 && (
                        <span
                          className="inline-flex items-center text-white px-1.5 py-0.5 rounded-sm text-[9px] font-black tracking-wider"
                          style={{ backgroundColor: info.accent }}
                        >
                          {seleccionadosEnGrupo} ✓
                        </span>
                      )}
                    </p>
                  </div>
                  <svg
                    className={cn('w-4 h-4 flex-shrink-0 transition-transform text-zinc-400 group-hover:text-white', isOpen && 'rotate-180')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Chips de productos — solo cuando el bloque está abierto */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-[#0A0E13] border-t border-white/5"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4">
                    {items.map(([key, opt]) => {
                      const isSelected = selected.includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggle(key)}
                          className={cn(
                            'group/chip flex flex-col items-stretch rounded-md border-2 overflow-hidden transition-all text-left',
                            isSelected
                              ? cn('text-white shadow-md ring-2 ring-white/20', info.chipSelected)
                              : cn('border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900', info.chipHover),
                          )}
                        >
                          {/* Zona de foto: card blanca si hay foto, banda
                              alternativa con emoji grande si no la hay. */}
                          {opt.foto ? (
                            <div className="bg-white aspect-square flex items-center justify-center p-2 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={opt.foto}
                                alt={opt.label}
                                className="max-w-full max-h-full object-contain"
                                loading="lazy"
                                onError={e => {
                                  const t = e.currentTarget as HTMLImageElement
                                  t.style.display = 'none'
                                }}
                              />
                            </div>
                          ) : (
                            <div className="bg-zinc-950/60 aspect-square flex items-center justify-center text-4xl">
                              {opt.label.match(/^[\p{Emoji}]+/u)?.[0] ?? '📦'}
                            </div>
                          )}
                          {/* Footer con label */}
                          <span
                            className={cn(
                              'block px-2.5 py-2 text-[10px] font-bold leading-tight',
                              isSelected ? 'text-white' : 'text-zinc-200',
                            )}
                          >
                            {opt.label.replace(/^[\p{Emoji}]+\s*/u, '')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ─── Meal chip multi-selector ─────────────────────────────────────────────────
function MealChips({
  label,
  pool,
  selected,
  onChange,
  intolerancias = [],
  bloquearSIBO = false,
  bloquearAltaGrasa = false,
}: {
  label: string
  pool: Record<string, MealOption>
  selected: string[]
  onChange: (v: string[]) => void
  /** Lista de intolerancias del paciente — oculta opciones con `contiene` que matchee */
  intolerancias?: string[]
  /** Si el paciente declaró SIBO o SII — oculta opciones con altoFODMAP */
  bloquearSIBO?: boolean
  /** Si el paciente tiene reflujo frecuente — oculta opciones con altaGrasa (solo aplica a cenas) */
  bloquearAltaGrasa?: boolean
}) {
  function toggle(key: string) {
    if (selected.includes(key)) {
      if (selected.length === 1) return // keep at least 1
      onChange(selected.filter(k => k !== key))
    } else {
      onChange([...selected, key])
    }
  }

  // Filtrar pool aplicando reglas clínicas declaradas por el paciente
  const filteredEntries = Object.entries(pool).filter(([, opt]) => {
    if (intolerancias.length > 0 && opt.contiene) {
      if (opt.contiene.some(c => intolerancias.includes(c))) return false
    }
    if (bloquearSIBO && opt.altoFODMAP) return false
    if (bloquearAltaGrasa && opt.altaGrasa) return false
    return true
  })

  // Auto-fallback si la selección actual quedó vacía tras filtrar
  useEffect(() => {
    const validKeys = filteredEntries.map(([k]) => k)
    const intersection = selected.filter(k => validKeys.includes(k))
    if (intersection.length === 0 && validKeys.length > 0) {
      onChange([validKeys[0]])
    } else if (intersection.length !== selected.length) {
      onChange(intersection)
    }
  }, [intolerancias.join(','), bloquearSIBO, bloquearAltaGrasa])  // eslint-disable-line react-hooks/exhaustive-deps

  // Ref al contenedor scrollable para que los botones "←/→" puedan
  // disparar scrollBy programáticamente. Imprescindible en desktop
  // (sin swipe táctil) y útil en mobile como CTA descubrible.
  // IMPORTANTE: estos hooks DEBEN ir antes del early return de abajo
  // (filteredEntries.length === 0) para respetar la regla de orden de hooks.
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd]     = useState(false)

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 4)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    // Inicializar edges tras el primer paint y al cambiar el set de opciones.
    updateEdges()
  }, [filteredEntries.length, updateEdges])

  if (filteredEntries.length === 0) {
    return (
      <div>
        <label className="block text-sm font-semibold text-[#0C3547] mb-2">{label}</label>
        <p className="text-xs text-[#6B7C93] italic">No hay opciones compatibles con tus restricciones. Conversa con tu profesional para alternativas personalizadas.</p>
      </div>
    )
  }

  const selectedCount = selected.length

  function scrollByCards(direction: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    // Avanza ~3 cards de ancho. 128px card + 10px gap ≈ 138px × 3 ≈ 414px.
    el.scrollBy({ left: direction * 414, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-semibold text-[#0C3547]">{label}</label>
        <button
          type="button"
          onClick={() => scrollByCards(1)}
          disabled={atEnd}
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide transition-colors',
            atEnd ? 'text-[#B8C7D4] cursor-default' : 'text-[#29ABE2] hover:text-[#1a6fa0]'
          )}
          aria-label="Avanzar opciones"
        >
          {selectedCount} {selectedCount === 1 ? 'opción' : 'opciones'} · {atEnd ? 'fin' : 'desliza →'}
        </button>
      </div>

      {/* Carrusel horizontal con flechas laterales para desktop.
          - Container relativo para anclar las flechas absolutas a los costados.
          - El padding negativo -mx-4 px-4 hace que el carrusel sangre hasta el
            borde del viewport mobile sin romper la grid del formulario.
          - Snap-mandatory ancla cada card al hacer swipe.
          - Las flechas solo aparecen cuando hay scroll disponible en esa
            dirección (atStart/atEnd controlan visibilidad). */}
      <div className="relative">
        {/* Flecha izquierda — visible cuando NO estamos al inicio */}
        {!atStart && (
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 backdrop-blur border border-[#D6E3ED] shadow-md items-center justify-center text-[#29ABE2] hover:bg-[#29ABE2] hover:text-white transition-all"
            aria-label="Opciones anteriores"
          >
            <span className="text-lg leading-none">‹</span>
          </button>
        )}
        {/* Flecha derecha — visible cuando NO estamos al final */}
        {!atEnd && (
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/95 backdrop-blur border border-[#D6E3ED] shadow-md items-center justify-center text-[#29ABE2] hover:bg-[#29ABE2] hover:text-white transition-all"
            aria-label="Más opciones"
          >
            <span className="text-lg leading-none">›</span>
          </button>
        )}
        <div
          ref={scrollerRef}
          onScroll={updateEdges}
          className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#D6E3ED transparent' }}
        >
        {filteredEntries.map(([key, opt]) => {
          const active = selected.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              aria-pressed={active}
              className={cn(
                // Ampliada de 112px a 128px para que textos largos quepan en menos
                // líneas (ej. "Carne magra + papas salteadas..." ya no se parte feo).
                'snap-start flex-shrink-0 w-[128px] rounded-2xl border-2 overflow-hidden text-left transition-all',
                'flex flex-col bg-white',
                active
                  ? 'border-[#29ABE2] ring-2 ring-[#29ABE2]/30 shadow-md scale-[1.02]'
                  : 'border-[#D6E3ED] hover:border-[#29ABE2]/60 active:scale-[0.98]'
              )}
            >
              {/* Imagen cuadrada arriba (o placeholder con inicial).
                  onError: si la URL falla (ej. archivo aún no subido a /public/img/),
                  ocultamos la <img> y cae el placeholder de fondo (gradiente + inicial). */}
              <div className="relative w-full aspect-square bg-gradient-to-br from-[#E5F4FB] to-[#D6E3ED] overflow-hidden">
                {/* Placeholder con inicial — siempre presente como capa de fondo */}
                <div className="absolute inset-0 flex items-center justify-center text-[#29ABE2] text-2xl font-bold pointer-events-none">
                  {opt.label.replace(/^[^\p{L}]+/u, '').charAt(0).toUpperCase() || '?'}
                </div>
                {opt.foto && (
                  <img
                    src={opt.foto}
                    alt=""
                    className="relative w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={e => {
                      // Falla de carga → ocultamos la img para que se vea el placeholder.
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                {/* Check overlay cuando seleccionado */}
                {active && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#29ABE2] text-white flex items-center justify-center text-[11px] font-bold shadow z-10">
                    ✓
                  </div>
                )}
              </div>
              {/* Label abajo. Ajustes de legibilidad (feedback Felipe):
                  - text-[11px] → text-[12px]: bumpear fuente 1pt = mucho más legible
                    en mobile sin reventar el layout.
                  - leading-snug → leading-[1.25]: aire suficiente entre líneas a 12px.
                  - min-h-[48px] → min-h-[58px]: 3 líneas a 12px necesitan ~58px;
                    antes con 48px el texto se cortaba con "..." en mitad de palabra.
                  - QUITAR break-words: era la causa principal del feo "salteada... s con"
                    porque partía palabras dentro de la línea. Sin esto, las palabras
                    enteras saltan a la siguiente línea (overflow-wrap normal).
                  - hyphens-none: refuerza que NO se separen palabras con guión.
                  - font-bold (antes semibold): mejor contraste a tamaños chicos.
                  - line-clamp-3: tope si el plato tiene 4+ líneas, agrega "..." al final. */}
              <div
                className={cn(
                  'px-2.5 py-2 text-[12px] font-bold leading-[1.25] line-clamp-3 min-h-[58px]',
                  '[hyphens:none] [overflow-wrap:normal]',
                  active ? 'text-[#0C3547] bg-[#29ABE2]/8' : 'text-[#4a6b80]'
                )}
              >
                {opt.label}
              </div>
            </button>
          )
        })}
        </div>
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

// ─── Selector de slot para snack/barra opt-in ────────────────────────────────
// Decide en qué colación aparece el producto que el paciente activó:
// 'am' (colación mañana), 'pm' (once), o 'ambas'.
function SlotPicker({
  label,
  value,
  onChange,
  accent = 'cyan',
}: {
  label: string
  value: 'am' | 'pm' | 'ambas'
  onChange: (v: 'am' | 'pm' | 'ambas') => void
  accent?: 'cyan' | 'rose' | 'violet'
}) {
  const accentClasses: Record<typeof accent, { bg: string; border: string; text: string }> = {
    cyan:   { bg: 'bg-[#29ABE2]', border: 'border-[#29ABE2]', text: 'text-[#29ABE2]' },
    rose:   { bg: 'bg-rose-500',  border: 'border-rose-500',  text: 'text-rose-600' },
    violet: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-600' },
  }
  const a = accentClasses[accent]
  const opts: { key: 'am' | 'pm' | 'ambas'; label: string; emoji: string }[] = [
    { key: 'am',    label: 'Colación mañana', emoji: '☕' },
    { key: 'pm',    label: 'Once',            emoji: '🫖' },
    { key: 'ambas', label: 'Ambas',           emoji: '🔄' },
  ]
  return (
    <div className="mt-2 mb-2 pl-3 border-l-2 border-[#E2ECF4]">
      <p className="text-xs font-semibold text-[#0C3547] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {opts.map(o => {
          const active = value === o.key
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all',
                active
                  ? `${a.bg} ${a.border} text-white`
                  : `bg-white border-[#D6E3ED] text-[#6B7C93] hover:${a.border} hover:${a.text}`,
              )}
            >
              <span>{o.emoji}</span>
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Selector de gramaje de carne / pescado por tiempo de comida ─────────────
function CarneQtyPicker({
  label,
  value,
  onChange,
  emoji = '🥩',
}: {
  label: string
  value: number
  onChange: (n: number) => void
  emoji?: string
}) {
  const opciones = [100, 125, 150, 175, 200, 225, 250]
  return (
    <div className="mt-2 pl-1">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-[#6B7C93] font-semibold">{emoji} {label}:</span>
        <span className="text-xs font-bold text-[#0C3547]">{value}g</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'min-w-[44px] h-9 px-2 rounded-lg text-xs font-bold border-2 transition-all',
              value === n
                ? 'bg-[#E11D48] border-[#E11D48] text-white'
                : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#E11D48] hover:text-[#E11D48]'
            )}
          >
            {n}g
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Selector de gramaje de carbo principal (arroz / papas / quinoa / fideos) ─
// El profesional ajusta la cantidad de carbohidratos según el target del paciente:
//   - Déficit: 100-130g          (objetivo pérdida de grasa)
//   - Mantenimiento: 150-200g    (peso estable)
//   - Superávit: 200-280g        (hipertrofia, deportistas de resistencia)
function CarboQtyPicker({
  label,
  value,
  onChange,
  emoji = '🍚',
}: {
  label: string
  value: number
  onChange: (n: number) => void
  emoji?: string
}) {
  const opciones = [80, 100, 130, 150, 180, 220, 280]
  return (
    <div className="mt-2 pl-1">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-[#6B7C93] font-semibold">{emoji} {label}:</span>
        <span className="text-xs font-bold text-[#0C3547]">{value}g</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'min-w-[44px] h-9 px-2 rounded-lg text-xs font-bold border-2 transition-all',
              value === n
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'border-[#D6E3ED] text-[#6B7C93] hover:border-amber-500 hover:text-amber-600'
            )}
          >
            {n}g
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[#8BA5BE] mt-1.5">
        Déficit: 80-130g · Mantenimiento: 150-180g · Superávit: 220-280g
      </p>
    </div>
  )
}

// ─── Yogurt Type Picker ───────────────────────────────────────────────────────
function YogurtTypePicker({
  value,
  onChange,
  tendencia,
  intolerancias = [],
}: {
  value: YogurTipo
  onChange: (t: YogurTipo) => void
  tendencia?: 'omnivoro' | 'vegetariano' | 'vegano'
  intolerancias?: string[]
}) {
  // Filtrar por tendencia + intolerancias
  const allEntries = Object.entries(YOGUR_TIPOS) as [YogurTipo, typeof YOGUR_TIPOS[YogurTipo]][]
  const entries = allEntries.filter(([, info]) => {
    if (tendencia === 'vegano' && info.vegano === false) return false
    if (intolerancias.length > 0) {
      const hasIntol = info.contiene.some(c => intolerancias.includes(c))
      if (hasIntol) return false
    }
    return true
  })

  // Auto-fallback al primero válido si el seleccionado fue filtrado
  useEffect(() => {
    if (entries.length > 0 && !entries.find(([k]) => k === value)) {
      onChange(entries[0][0])
    }
  }, [tendencia, intolerancias.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  if (entries.length === 0) {
    return (
      <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl">
        <p className="text-xs font-bold text-sky-800 mb-1">🥛 Tipo de yogur</p>
        <p className="text-[11px] text-[#6B7C93]">
          No hay yogures compatibles con tu tendencia/intolerancias. Las recetas que requieran yogur se ajustarán manualmente con el profesional.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-2">
      <p className="text-xs font-bold text-sky-800">🥛 Tipo de yogur</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {entries.map(([key, info]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex flex-col items-center rounded-xl border-2 overflow-hidden transition-all',
              value === key
                ? 'bg-sky-500 border-sky-500 text-white shadow-md scale-[1.02]'
                : 'border-sky-200 text-sky-800 hover:border-sky-400 bg-white'
            )}
          >
            {(info as { foto?: string }).foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(info as { foto?: string }).foto}
                alt={info.label}
                className="w-full h-20 sm:h-24 object-cover bg-white"
              />
            )}
            <div className="w-full px-2 py-2 text-left">
              <div className="text-xs sm:text-sm font-bold leading-tight">{info.emoji} {info.label}</div>
              <div className={cn('text-[10px] mt-0.5 font-semibold leading-tight', value === key ? 'text-sky-100' : 'text-sky-600')}>
                {info.badge}
              </div>
            </div>
          </button>
        ))}
      </div>
      {value === 'griego' && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800">
            <strong>Danone Oikos Griego Endulzado · Yogur griego clásico · Alérgenos:</strong> Puede contener trazas de almendra, pasas, nuez, soya y gluten (avena). Endulzado con estevia y sucralosa. 5.3g proteína por porción 110g.
          </p>
        </div>
      )}
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
      {value === 'soprole_protein' && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800">
            <strong>Soprole Protein+ · Sin lactosa · Libre de gluten · Libre de sellos:</strong> Endulzado con sucralosa (18.5 mg/porción) y estevia (7.6 mg/porción). 10g proteína por porción de 155g.
          </p>
        </div>
      )}
      {value === 'colun_protein' && (
        <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className="text-[10px] text-amber-800">
            <strong>Colun Protein Plus Vainilla · 11g proteína · 0% grasa · Sin lactosa · Libre de gluten:</strong> Formato squeeze 150g. Libre de soya, huevo, mariscos, maní, frutos secos, nueces, sulfitos y trigo. Ideal para personas con alergias múltiples.
          </p>
        </div>
      )}
      {value === 'loncoleche_vegetal' && (
        <div className="flex gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
          <span className="text-xs flex-shrink-0">🌱</span>
          <p className="text-[10px] text-emerald-800">
            <strong>Loncoleche Vegetal Soya Mango-Maracuyá · 100% vegetal · Vegano · Sin lactosa:</strong> Base soya con trozos de fruta. Solo 3.4g proteína por porción 130g — <strong>combinar con otra fuente proteica</strong> (huevo, tofu, semillas, proteína vegetal) para alcanzar el aporte del plan.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Pan Type Picker ──────────────────────────────────────────────────────────
// Aplica a TODAS las comidas con `tienePan: true` (sándwiches, tostadas, sopa con pan).
// Filtra automáticamente panes con gluten si el paciente declaró intolerancia.
function PanTypePicker({
  value,
  onChange,
  intolerancias = [],
}: {
  value: PanTipo
  onChange: (t: PanTipo) => void
  intolerancias?: string[]
}) {
  const allEntries = Object.entries(PAN_TIPOS) as [PanTipo, typeof PAN_TIPOS[PanTipo]][]
  const entries = allEntries.filter(([, info]) => {
    if (intolerancias.length > 0 && info.contiene) {
      const hasIntol = (info.contiene as readonly string[]).some(c => intolerancias.includes(c))
      if (hasIntol) return false
    }
    return true
  })

  // Auto-fallback si el seleccionado fue filtrado
  useEffect(() => {
    if (entries.length > 0 && !entries.find(([k]) => k === value)) {
      onChange(entries[0][0])
    }
  }, [intolerancias.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  if (entries.length === 0) {
    return (
      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs font-bold text-amber-800 mb-1">🍞 Tipo de pan</p>
        <p className="text-[11px] text-[#6B7C93]">
          Por tus intolerancias declaradas (gluten u otras), no hay panes compatibles. Las recetas con pan se ajustarán manualmente con el profesional.
        </p>
      </div>
    )
  }

  const selected = PAN_TIPOS[value]
  const igColor =
    selected.indiceGlicemico === 'bajo'  ? 'text-green-600' :
    selected.indiceGlicemico === 'medio' ? 'text-amber-600' :
                                            'text-red-600'

  return (
    <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-amber-900">🍞 Tipo de pan favorito</p>
        <p className="text-[10px] text-amber-700">
          Aplica a TODAS las preparaciones con pan (sándwiches, tostadas, sopa)
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {entries.map(([key, info]) => {
          const isSelected = value === key
          const infoFoto = (info as { foto?: string }).foto
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                'flex flex-col items-center rounded-xl border-2 overflow-hidden text-left transition-all',
                isSelected
                  ? 'bg-amber-500 border-amber-500 text-white shadow-md scale-[1.02]'
                  : 'border-amber-200 text-amber-900 hover:border-amber-400 bg-white'
              )}
            >
              {infoFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={infoFoto}
                  alt={info.label}
                  className="w-full h-16 sm:h-20 object-cover bg-white"
                />
              ) : (
                <div className="w-full h-16 sm:h-20 flex items-center justify-center bg-amber-50/40">
                  <span className="text-3xl">{info.emoji}</span>
                </div>
              )}
              <div className="w-full px-2 py-1.5 text-center">
                <div className="text-[10px] sm:text-xs font-bold leading-tight">{info.label}</div>
                <div className={cn('text-[9px] mt-0.5 font-semibold leading-tight', isSelected ? 'text-amber-50' : 'text-amber-600')}>
                  {info.kcal} kcal · {info.gramos}g
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Detalle del pan seleccionado */}
      <div className="bg-white border border-amber-200 rounded-lg p-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        <span className="text-amber-900"><strong>{selected.label}:</strong></span>
        <span className="text-[#6B7C93]">{selected.kcal} kcal</span>
        <span className="text-[#6B7C93]">{selected.p}g P</span>
        <span className="text-[#6B7C93]">{selected.c}g C</span>
        <span className="text-[#6B7C93]">{selected.g}g G</span>
        <span className={cn('font-bold', igColor)}>IG {selected.indiceGlicemico}</span>
        <span className="text-[#6B7C93] w-full mt-0.5">{selected.alergenosNota}</span>
      </div>
    </div>
  )
}

// ─── Queso Type Picker (4 opciones: gauda · mantecoso · light · quesillo) ────
// Aplica a TODAS las preparaciones con tieneQueso=true (sándwiches con queso,
// marraqueta jamón queso, tostadas con queso). Selector visual con badge y
// detalle clínico bajo cada tarjeta.
function QuesoTypePicker({
  value,
  onChange,
}: {
  value: QuesoTipo
  onChange: (t: QuesoTipo) => void
}) {
  const entries = Object.entries(QUESO_TIPOS) as [QuesoTipo, typeof QUESO_TIPOS[QuesoTipo]][]
  const selected = QUESO_TIPOS[value]

  return (
    <div className="mt-3 p-3 bg-yellow-50/60 border border-yellow-200 rounded-xl space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-yellow-900">🧀 Tipo de queso favorito</p>
        <p className="text-[10px] text-yellow-700">
          Aplica a sándwich de jamón queso, marraqueta y otros con queso
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {entries.map(([key, info]) => {
          const isSelected = value === key
          const infoFoto = (info as { foto?: string }).foto
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={cn(
                'flex flex-col items-center rounded-xl border-2 overflow-hidden text-left transition-all',
                isSelected
                  ? 'bg-yellow-500 border-yellow-500 text-white shadow-md scale-[1.02]'
                  : 'border-yellow-200 text-yellow-900 hover:border-yellow-400 bg-white'
              )}
            >
              {infoFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={infoFoto}
                  alt={info.label}
                  className="w-full h-16 sm:h-20 object-contain bg-white p-1"
                />
              ) : (
                <div className="w-full h-16 sm:h-20 flex items-center justify-center bg-yellow-50/40">
                  <span className="text-3xl">{info.emoji}</span>
                </div>
              )}
              <div className="w-full px-2 py-1.5 text-center">
                <div className="text-[10px] sm:text-xs font-bold leading-tight">{info.label}</div>
                <div className={cn('text-[9px] mt-0.5 font-semibold leading-tight', isSelected ? 'text-yellow-50' : 'text-yellow-700')}>
                  {info.kcal} kcal · 30g
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Detalle del queso seleccionado */}
      <div className="bg-white border border-yellow-200 rounded-lg p-2.5 text-[10px] space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <span className="text-yellow-900"><strong>{selected.label}:</strong></span>
          <span className="text-[#6B7C93]">{selected.kcal} kcal</span>
          <span className="text-[#6B7C93]">{selected.p}g P</span>
          <span className="text-[#6B7C93]">{selected.g}g G</span>
          <span className={cn('font-bold', selected.sodioMg > 200 ? 'text-red-600' : 'text-green-600')}>
            {selected.sodioMg}mg sodio
          </span>
        </div>
        <p className="text-[#6B7C93] italic leading-relaxed">{selected.descripcion}</p>
      </div>
    </div>
  )
}

// ─── Catalog Picker genérico (snacks + barras) ────────────────────────────────
type CatalogItem = {
  label: string
  emoji: string
  badge: string
  alergenosNota?: string
  foto?: string
  kcal?: number
  p?: number
  c?: number
  g?: number
  vegano?: boolean
  vegetariano?: boolean
  contiene?: readonly string[] | string[]
}

function CatalogPicker<K extends string>({
  title,
  catalog,
  value,
  onChange,
  tendencia,
  intolerancias = [],
  includeInPlan,
  onIncludeChange,
  includeLabel,
  headerColor = 'text-emerald-800',
  bgColor = 'bg-emerald-50',
  borderColor = 'border-emerald-200',
  selectedBg = 'bg-emerald-500',
  selectedBorder = 'border-emerald-500',
  noteBg = 'bg-amber-50',
  noteBorder = 'border-amber-200',
  noteText = 'text-amber-800',
}: {
  title: string
  catalog: Record<K, CatalogItem>
  value: K
  onChange: (key: K) => void
  /** Tendencia activa — filtra opciones incompatibles */
  tendencia?: 'omnivoro' | 'vegetariano' | 'vegano'
  /** Lista de intolerancias declaradas — filtra productos que las contienen */
  intolerancias?: string[]
  /** Si se provee, muestra toggle "incluir en plan" arriba del catálogo */
  includeInPlan?: boolean
  onIncludeChange?: (v: boolean) => void
  includeLabel?: string
  headerColor?: string
  bgColor?: string
  borderColor?: string
  selectedBg?: string
  selectedBorder?: string
  noteBg?: string
  noteBorder?: string
  noteText?: string
}) {
  // Filtrar catálogo por tendencia + intolerancias
  const allEntries = Object.entries(catalog) as [K, CatalogItem][]
  const entries = allEntries.filter(([, info]) => {
    if (tendencia === 'vegano' && info.vegano === false) return false
    if (tendencia === 'vegetariano' && info.vegetariano === false) return false
    if (intolerancias.length > 0 && info.contiene) {
      const hasIntolerance = info.contiene.some(c => intolerancias.includes(c))
      if (hasIntolerance) return false
    }
    return true
  })

  // Si el value actual fue filtrado, autoseleccionar el primero válido
  useEffect(() => {
    if (entries.length > 0 && !entries.find(([k]) => k === value)) {
      onChange(entries[0][0])
    }
  }, [tendencia, intolerancias.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  if (entries.length === 0) {
    return (
      <div className={cn('mt-3 p-3 border rounded-xl', bgColor, borderColor)}>
        <p className={cn('text-xs font-bold mb-1', headerColor)}>{title}</p>
        <p className="text-[11px] text-[#6B7C93]">
          No hay opciones compatibles con tu tendencia/intolerancias declaradas. Conversa con tu profesional para alternativas.
        </p>
      </div>
    )
  }

  const cols = entries.length === 2 ? 'lg:grid-cols-2' : entries.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
  const current = catalog[value] ?? catalog[entries[0][0]]
  return (
    <div className={cn('mt-3 p-3 border rounded-xl space-y-2', bgColor, borderColor)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-xs font-bold', headerColor)}>{title}</p>
        {onIncludeChange !== undefined && (
          <label className={cn('flex items-center gap-1.5 text-[10px] font-semibold cursor-pointer', headerColor)}>
            <input
              type="checkbox"
              checked={includeInPlan ?? false}
              onChange={e => onIncludeChange(e.target.checked)}
              className="w-3.5 h-3.5 accent-current"
            />
            {includeLabel ?? 'Incluir en plan'}
          </label>
        )}
      </div>
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-2', cols)}>
        {entries.map(([key, info]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex flex-col items-center rounded-xl border-2 overflow-hidden transition-all',
              value === key
                ? cn(selectedBg, selectedBorder, 'text-white shadow-md scale-[1.02]')
                : cn(borderColor, headerColor, 'hover:opacity-80 bg-white')
            )}
          >
            {info.foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={info.foto}
                alt={info.label}
                className="w-full h-20 sm:h-24 object-cover bg-white"
              />
            )}
            <div className="w-full px-2 py-2 text-left">
              <div className="text-xs sm:text-sm font-bold leading-tight">{info.emoji} {info.label}</div>
              <div className={cn('text-[10px] mt-0.5 font-semibold leading-tight', value === key ? 'text-white/85' : 'opacity-70')}>
                {info.badge}
              </div>
              {(info.kcal != null && info.p != null) && (
                <div className={cn('text-[10px] mt-0.5 font-mono leading-tight', value === key ? 'text-white/80' : 'opacity-60')}>
                  {info.kcal}kcal · {info.p}p / {info.c}c / {info.g}g
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      {current?.alergenosNota && (
        <div className={cn('flex gap-2 border rounded-lg p-2', noteBg, noteBorder)}>
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className={cn('text-[10px]', noteText)}>{current.alergenosNota}</p>
        </div>
      )}
    </div>
  )
}

interface Props {
  onResult: (result: NutritionResult, form: FormData) => void
  initialData?: Partial<FormData>
  /** ID del paciente (cuando el profesional crea/edita plan para alguien).
   *  Se usa para namespacear el draft de sessionStorage y evitar contaminación
   *  cruzada entre pacientes. Si undefined → key 'self' (paciente individual).
   *  CRÍTICO clínicamente: sin esto, datos digestivos/suplementación de paciente A
   *  quedaban hidratados al abrir plan de paciente B. */
  patientId?: string
}

// Keys para persistir el form/step en sessionStorage. Sobreviven a remounts
// (cambios de tab o reroute App Router) y a refreshes accidentales.
// IMPORTANTE: namespaceadas por patientId para evitar contaminación cruzada.
// Bug previo: una key global hacía que datos clínicos de paciente A quedaran
// hidratados al abrir el wizard para paciente B (riesgo clínico real).
function formDraftKey(patientId?: string): string {
  return `plan-generator-draft-v1:${patientId ?? 'self'}`
}
function stepDraftKey(patientId?: string): string {
  return `plan-generator-step-v1:${patientId ?? 'self'}`
}

function readDraftForm(patientId?: string): Partial<FormData> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(formDraftKey(patientId))
    return raw ? (JSON.parse(raw) as Partial<FormData>) : null
  } catch { return null }
}
function readDraftStep(patientId?: string): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(stepDraftKey(patientId))
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) ? n : null
}

export function PlanGenerator({ onResult, initialData, patientId }: Props) {
  // Lazy initializer: si hay un draft previo en sessionStorage PARA ESTE PACIENTE,
  // lo restauramos antes de mezclar con initialData. Así NO se pierden los datos
  // del usuario, pero tampoco se cruzan entre pacientes distintos.
  const [step, setStep] = useState<number>(() => readDraftStep(patientId) ?? 0)
  const [form, setForm] = useState<Partial<FormData>>(() => {
    const draft = readDraftForm(patientId)
    return { ...defaultForm, ...initialData, ...(draft ?? {}) }
  })
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)

  // Persistir form a sessionStorage en cada cambio — red de seguridad
  // contra remounts inesperados y refreshes accidentales.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(formDraftKey(patientId), JSON.stringify(form))
    } catch { /* quota exceeded o storage deshabilitado: degradar silencioso */ }
  }, [form, patientId])

  // Persistir step también, para que un remount no devuelva al paciente
  // al paso 0 cuando ya iba avanzado.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.sessionStorage.setItem(stepDraftKey(patientId), String(step))
    } catch { /* idem */ }
  }, [step, patientId])

  // Mensajes humanos por campo para el toast de confirmación visual
  const TOAST_LABELS: Partial<Record<keyof FormData, (v: unknown) => string>> = {
    yogurtTipo: v => `Yogur: ${YOGUR_TIPOS[v as YogurTipo]?.label ?? v}`,
    panTipo:    v => `Pan: ${PAN_TIPOS[v as PanTipo]?.label ?? v}`,
    quesoTipo:  v => `Queso: ${QUESO_TIPOS[v as QuesoTipo]?.label ?? v}`,
    snackNutrevoTipo: v => `Snack Nutrevo: ${SNACK_NUTREVO_TIPOS[v as SnackNutrevoTipo]?.label ?? v}`,
    barraProteinaTipo: v => `Barra: ${BARRA_PROTEINA_TIPOS[v as BarraProteinaTipo]?.label ?? v}`,
    incluirSnackEnPlan: v => v ? 'Snack incluido en tu plan ✅' : 'Snack removido del plan',
    incluirBarraEnPlan: v => v ? 'Barra incluida en tu plan ✅' : 'Barra removida del plan',
    tendencia: v => `Tendencia: ${String(v)}`,
    wheyIndicado: v => v ? 'Proteína en polvo activada' : 'Proteína en polvo desactivada',
    horarioEntrenamiento: v => `Entreno: ${String(v).toUpperCase()}`,
    carneGramosAlmuerzo: v => `Carne almuerzo: ${v}g`,
    carneGramosCena: v => `Carne cena: ${v}g`,
  }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    const labeler = TOAST_LABELS[key]
    if (labeler) {
      // Date.now() en event handler (no en render) — patrón válido.
      // eslint-disable-next-line react-hooks/purity -- event handler, not render
      setToast({ msg: labeler(value), id: Date.now() })
    }
  }

  // Auto-ocultar el toast después de 2.2s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  const [errors, setErrors] = useState<string[]>([])

  // ── Sincronizar pasos con historial del navegador ──
  // Cada vez que el usuario avanza, hacemos pushState con el step destino.
  // El botón atrás del navegador/móvil dispara popstate y leemos el step
  // del event.state (no asumimos un decremento ciego). El form NO se toca
  // aquí — sigue en su propio estado + sessionStorage.
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const target = (e.state && typeof e.state === 'object' && 'planStep' in e.state)
        ? Number((e.state as { planStep: unknown }).planStep)
        : NaN
      if (Number.isFinite(target) && target >= 0) {
        setStep(target)
      } else {
        // Sin state.planStep: estamos en la entrada base de la página → step 0
        setStep(0)
      }
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
    // Plan generado con éxito → limpiar draft del wizard (ya no se necesita)
    try {
      window.sessionStorage.removeItem(formDraftKey(patientId))
      window.sessionStorage.removeItem(stepDraftKey(patientId))
    } catch { /* noop */ }
    onResult(result, f)
  }

  // Botón en pantalla "← Atrás": en vez de window.history.back() (que puede
  // causar re-render del route en Next.js App Router), decrementamos el step
  // directamente y empujamos al historial para mantener Android-back coherente.
  function handleBack() {
    setStep(s => {
      const next = Math.max(0, s - 1)
      try {
        window.history.replaceState({ planStep: next }, '')
      } catch { /* noop */ }
      return next
    })
  }

  // ── Filtrado por whey ──
  const wheyActivo = form.wheyIndicado ?? false
  const filteredDesayunos = wheyActivo
    ? desayunosOpts
    : Object.fromEntries(Object.entries(desayunosOpts).filter(([, opt]) => !opt.requiereWhey))

  // ── Filtrado por tendencia ──
  const tendenciaActual = (form.tendencia ?? 'omnivoro') as 'omnivoro' | 'vegetariano' | 'vegano'
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
        wheyMomentos: undefined,  // limpiar selección al desactivar
        desayunos: validDes.length > 0 ? validDes : ['avena_platano'],
      }))
    } else {
      // Al activar: default a los 3 momentos legacy (desayuno + ambas colaciones)
      // para que el paciente vea explicitamente cuales estan activos.
      setForm(prev => ({
        ...prev,
        wheyIndicado: true,
        wheyMomentos: prev.wheyMomentos ?? ['desayuno', 'colacion_am', 'colacion_pm'],
      }))
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
    <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-4 sm:p-6 pb-6 relative">
      {/* Toast de confirmación visual al cambiar preferencias — accesible para screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {toast?.msg}
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0C3547] text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 max-w-[90vw]"
            aria-hidden="true"   /* el contenido textual ya lo anuncia el sr-only de arriba */
          >
            <span className="text-emerald-400">●</span>
            <span className="truncate">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

              {/* Horario habitual de entrenamiento — define timing peri-entreno */}
              {(form.tipoEjercicio !== 'ninguno') && (
                <div>
                  <label className="block text-sm font-semibold text-[#0C3547] mb-1">⏰ Horario habitual de entrenamiento</label>
                  <p className="text-xs text-[#6B7C93] mb-2">
                    Define qué colación se prioriza como pre/post-entreno (snack o barra de proteína).
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {([
                      { value: 'AM',          label: '🌅 AM',     desc: '6 - 11h' },
                      { value: 'PM',          label: '☀️ PM',     desc: '12 - 18h' },
                      { value: 'noche',       label: '🌙 Noche',  desc: '19 - 22h' },
                      { value: 'sin_entreno', label: '🚫 Sin',    desc: 'No entreno fijo' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => set('horarioEntrenamiento', opt.value)}
                        className={cn(
                          'py-2.5 rounded-xl border-2 text-center transition-all',
                          (form.horarioEntrenamiento ?? 'PM') === opt.value
                            ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        <div className="text-sm font-bold">{opt.label}</div>
                        <div className="text-[10px] font-normal mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Método de cálculo (colapsable) - default bmr_pal mantiene flow estándar */}
              <MetodoCalculoSelector form={form} set={set} />

              {/* Modalidad de planificación: menús (actual) vs porciones (intercambios INTA/Sochinut) */}
              <ModalidadPlanSelector form={form} set={set} />
            </div>
          )}

          {/* Step 5: Alimentación */}
          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3547]">🥗 Preferencias alimentarias</h3>
              <p className="text-xs text-[#6B7C93]">Selecciona una o más opciones por tiempo de comida. El plan rotará entre tus elecciones.</p>

              {/* 1️⃣ Tendencia alimentaria — global, filtra todo lo siguiente */}
              <div className="border border-[#D6E3ED] rounded-xl p-4">
                <label className="block text-sm font-semibold text-[#0C3547] mb-1">🌿 Tendencia alimentaria</label>
                <p className="text-xs text-[#6B7C93] mb-3">
                  Filtra automáticamente desayunos, almuerzos, cenas, yogures, snacks y barras según tu tendencia.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'omnivoro',    label: '🥩 Omnívoro',    desc: 'Incluye carnes, pescado y pollo' },
                    { value: 'vegetariano', label: '🌿 Vegetariano', desc: 'Legumbres, tofu, huevo y lácteos' },
                    { value: 'vegano',      label: '🌱 Vegano',      desc: 'Solo origen vegetal, sin huevo ni lácteos' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleTendenciaChange(opt.value)}
                      className={cn(
                        'w-full py-3 px-4 rounded-xl border-2 text-left transition-all',
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

              {/* 2️⃣ Proteína en polvo (Whey) — gate de desayunos con scoop */}
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
                {wheyActivo && tendenciaActual !== 'vegano' && (
                  <>
                    {/* Multi-select de momentos donde incorporar el whey.
                        Si el paciente no marca ninguno, el motor defaultea a
                        ['desayuno', 'colacion_am', 'colacion_pm'] para mantener
                        compat con planes anteriores. Aviso si selected esta vacio. */}
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-[#0C3547] mb-2">
                        ¿En qué momentos lo incorporas?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(WHEY_MOMENTO_LABELS) as WheyMomento[]).map(m => {
                          const meta = WHEY_MOMENTO_LABELS[m]
                          // Por compat: si wheyMomentos undefined y whey activo, mostramos los 3 legacy "activos".
                          const currentList = form.wheyMomentos ?? (['desayuno', 'colacion_am', 'colacion_pm'] as WheyMomento[])
                          const active = currentList.includes(m)
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? currentList.filter(x => x !== m)
                                  : [...currentList, m]
                                set('wheyMomentos', next)
                              }}
                              aria-pressed={active}
                              title={meta.desc}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-semibold transition-all',
                                active
                                  ? 'bg-[#29ABE2] border-[#29ABE2] text-white shadow-sm'
                                  : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2] hover:text-[#0C3547]'
                              )}
                            >
                              <span>{meta.emoji}</span>
                              <span>{meta.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Aviso si el paciente desmarcó todos los momentos */}
                    {form.wheyMomentos && form.wheyMomentos.length === 0 && (
                      <div className="mt-2 flex gap-2 bg-amber-50 border border-amber-300 rounded-lg p-2.5">
                        <span className="text-sm flex-shrink-0">⚠️</span>
                        <p className="text-xs text-amber-900">
                          No marcaste ningún momento. Selecciona al menos uno o desactiva el toggle para que el plan use opciones sin whey.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <span className="text-sm flex-shrink-0">ℹ️</span>
                      <p className="text-xs text-blue-800">
                        Opciones con proteína en polvo activadas en los momentos seleccionados. Asegúrate de tener el producto disponible.
                      </p>
                    </div>
                  </>
                )}
                {wheyActivo && tendenciaActual === 'vegano' && (
                  <div className="mt-3 flex gap-2 bg-rose-50 border border-rose-300 rounded-lg p-2.5">
                    <span className="text-sm flex-shrink-0">⛔</span>
                    <p className="text-xs text-rose-800">
                      <strong>Contradicción detectada:</strong> el whey es proteína de leche — no compatible con tendencia <strong>vegana</strong>.
                      Cambia a una <strong>proteína vegana</strong> (arveja, arroz, soya, hemp) o desactiva el toggle.
                      Conversa con tu profesional para que indique la fuente vegetal adecuada.
                    </p>
                  </div>
                )}
              </div>

              {/* 3️⃣ Contexto operativo del paciente — variables obligatorias para personalización real */}
              <div className="border border-[#D6E3ED] rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-[#0C3547]">🧭 Contexto operativo</p>
                  <p className="text-xs text-[#6B7C93] mt-0.5">
                    Información práctica que afecta qué preparaciones son viables para ti — no solo qué es saludable.
                  </p>
                </div>

                {/* Comidas por día — atajo rápido cuando el profesional NO quiere
                    elegir tiempos uno por uno. Si elige tiempos manuales abajo,
                    este selector queda como info histórica. */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">🍽️ Comidas reales por día</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([3, 4, 5, 6] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          set('comidasPorDia', n)
                          // Limpiar tiemposComida manual cuando el profesional usa el atajo numérico,
                          // así el motor vuelve a derivar slots desde el numero (UX clara: una fuente
                          // de verdad a la vez).
                          set('tiemposComida', undefined as never)
                        }}
                        className={cn(
                          'py-1.5 rounded-lg border-2 text-xs font-bold transition-all',
                          (form.comidasPorDia ?? 5) === n && !form.tiemposComida?.length
                            ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector explícito de tiempos de comida — feedback Felipe:
                    el profesional puede decidir EXACTAMENTE qué tiempos
                    ejecutar (ej. desayuno + cena para paciente intermitente,
                    o desayuno + almuerzo + cena sin colaciones). Override
                    sobre `comidasPorDia` si tiene al menos 1 elemento. */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">
                    ⏰ Tiempos de comida específicos
                    <span className="ml-1.5 text-[10px] font-normal text-[#8BA5BE]">(opcional · override avanzado)</span>
                  </p>
                  <p className="text-[10px] text-[#8BA5BE] mb-2">
                    Marca SOLO los tiempos que vas a ejecutar para este paciente. Si dejas todos
                    sin marcar, se usa el atajo numérico de arriba ({form.comidasPorDia ?? 5} comidas/día).
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {([
                      { v: 'desayuno',         l: '☀️ Desayuno' },
                      { v: 'colacion_manana',  l: '☕ Colación AM' },
                      { v: 'almuerzo',         l: '🍽️ Almuerzo' },
                      { v: 'once',             l: '🍵 Once / PM' },
                      { v: 'cena',             l: '🌙 Cena' },
                      { v: 'ultra_extra',      l: '🍿 Snack extra' },
                    ] as const).map(opt => {
                      const tiempos = form.tiemposComida ?? []
                      const checked = tiempos.includes(opt.v)
                      return (
                        <button
                          key={opt.v}
                          onClick={() => {
                            const next = checked
                              ? tiempos.filter(t => t !== opt.v)
                              : [...tiempos, opt.v]
                            set('tiemposComida', next.length > 0 ? next : undefined as never)
                          }}
                          className={cn(
                            'py-1.5 px-2 rounded-lg border-2 text-[11px] font-bold transition-all text-left',
                            checked
                              ? 'bg-[#0C3547] border-[#0C3547] text-white'
                              : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                          )}
                          aria-pressed={checked}
                        >
                          {checked && <span className="mr-1">✓</span>}{opt.l}
                        </button>
                      )
                    })}
                  </div>
                  {form.tiemposComida && form.tiemposComida.length > 0 && (
                    <div className="mt-2 flex gap-2 items-start bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-lg p-2">
                      <span className="text-base flex-shrink-0">ℹ️</span>
                      <p className="text-[10px] text-[#0C3547]">
                        <strong>Override activo:</strong> {form.tiemposComida.length} tiempo{form.tiemposComida.length !== 1 ? 's' : ''} de comida.
                        El motor ignora el atajo numérico mientras tengas al menos 1 marcado.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tiempo para cocinar */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">⏱️ Tiempo disponible por comida</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {([
                      { v: 'menos_15', l: '< 15 min', d: 'Rápido' },
                      { v: '15_30',    l: '15–30 min', d: 'Estándar' },
                      { v: '30_60',    l: '30–60 min', d: 'Cómodo' },
                      { v: 'mas_60',   l: '> 60 min',  d: 'Elaborado' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => set('tiempoCocinar', opt.v)}
                        className={cn(
                          'py-1.5 px-1.5 rounded-lg border-2 transition-all',
                          (form.tiempoCocinar ?? '15_30') === opt.v
                            ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        <div className="text-[11px] font-bold">{opt.l}</div>
                        <div className="text-[9px] opacity-70">{opt.d}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Habilidad culinaria */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">👨‍🍳 Habilidad culinaria</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { v: 'principiante', l: '🌱 Principiante' },
                      { v: 'intermedio',   l: '🌿 Intermedio' },
                      { v: 'avanzado',     l: '🍳 Avanzado' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => set('habilidadCulinaria', opt.v)}
                        className={cn(
                          'py-1.5 rounded-lg border-2 text-xs font-bold transition-all',
                          (form.habilidadCulinaria ?? 'intermedio') === opt.v
                            ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presupuesto */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">💰 Presupuesto semanal</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { v: 'bajo',  l: '$ Bajo',   d: 'Esenciales' },
                      { v: 'medio', l: '$$ Medio', d: 'Equilibrado' },
                      { v: 'alto',  l: '$$$ Alto', d: 'Premium' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => set('presupuestoSemanal', opt.v)}
                        className={cn(
                          'py-1.5 rounded-lg border-2 transition-all',
                          (form.presupuestoSemanal ?? 'medio') === opt.v
                            ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        <div className="text-[11px] font-bold">{opt.l}</div>
                        <div className="text-[9px] opacity-70">{opt.d}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lugar de almuerzo */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">📍 Dónde almuerzas habitualmente</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {([
                      { v: 'casa',       l: '🏠 Casa' },
                      { v: 'oficina',    l: '💼 Oficina' },
                      { v: 'restaurant', l: '🍴 Restaurant' },
                      { v: 'colegio',    l: '🎓 Colegio' },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => set('lugarAlmuerzo', opt.v)}
                        className={cn(
                          'py-1.5 rounded-lg border-2 text-xs font-bold transition-all',
                          (form.lugarAlmuerzo ?? 'casa') === opt.v
                            ? 'bg-[#EAF4FB] border-[#29ABE2] text-[#0C3547]'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aviso si tendencia + intolerancias están aplicando filtros */}
              {((tendenciaActual && tendenciaActual !== 'omnivoro') || (form.digIntolerancias ?? []).length > 0) && (
                <div className="flex gap-2 bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                  <span className="text-sm flex-shrink-0">🔎</span>
                  <p className="text-xs text-indigo-800">
                    <strong>Filtros activos:</strong>
                    {tendenciaActual && tendenciaActual !== 'omnivoro' && <> {tendenciaActual === 'vegetariano' ? 'Vegetariano' : 'Vegano'} ·</>}
                    {(form.digIntolerancias ?? []).length > 0 && <> Intolerancias: {(form.digIntolerancias ?? []).join(', ')}</>}
                    . Los catálogos de yogur, snack y barra ocultan opciones incompatibles automáticamente.
                  </p>
                </div>
              )}

              {/* 3️⃣ Selector tipo yogur — filtrado por tendencia + intolerancias */}
              <YogurtTypePicker
                value={(form.yogurtTipo ?? 'griego') as YogurTipo}
                onChange={t => set('yogurtTipo', t)}
                tendencia={tendenciaActual}
                intolerancias={form.digIntolerancias ?? []}
              />

              {/* 3️⃣B Selector tipo pan — aplica a sándwiches, tostadas, sopa con pan */}
              <PanTypePicker
                value={(form.panTipo ?? 'integral') as PanTipo}
                onChange={t => set('panTipo', t)}
                intolerancias={form.digIntolerancias ?? []}
              />

              {/* 3️⃣C Selector tipo queso — aplica a sándwiches con queso, marraqueta jamón queso */}
              <QuesoTypePicker
                value={(form.quesoTipo ?? 'gauda') as QuesoTipo}
                onChange={t => set('quesoTipo', t)}
              />

              {/* 4️⃣ Selector snack saludable Nutrevo — opt-in al plan */}
              <CatalogPicker<SnackNutrevoTipo>
                title="🍫 Snack saludable favorito (Nutrevo)"
                catalog={SNACK_NUTREVO_TIPOS}
                value={(form.snackNutrevoTipo ?? 'alfajor_activa2') as SnackNutrevoTipo}
                onChange={t => set('snackNutrevoTipo', t)}
                tendencia={tendenciaActual}
                intolerancias={form.digIntolerancias ?? []}
                includeInPlan={form.incluirSnackEnPlan ?? false}
                onIncludeChange={v => set('incluirSnackEnPlan', v)}
                includeLabel="Incluir en mi plan"
                headerColor="text-rose-800"
                bgColor="bg-rose-50"
                borderColor="border-rose-200"
                selectedBg="bg-rose-500"
                selectedBorder="border-rose-500"
              />
              {/* Slot picker — solo aparece cuando 'incluir en plan' está activo */}
              {form.incluirSnackEnPlan && (
                <SlotPicker
                  label="¿En qué colación quieres el snack?"
                  value={(form.snackSlot ?? 'ambas') as 'am' | 'pm' | 'ambas'}
                  onChange={v => set('snackSlot', v)}
                  accent="rose"
                />
              )}

              {/* 5️⃣ Selector barra de proteína — opt-in al plan */}
              <CatalogPicker<BarraProteinaTipo>
                title="💪 Barra de proteína favorita"
                catalog={BARRA_PROTEINA_TIPOS}
                value={(form.barraProteinaTipo ?? 'wild_protein') as BarraProteinaTipo}
                onChange={t => set('barraProteinaTipo', t)}
                tendencia={tendenciaActual}
                intolerancias={form.digIntolerancias ?? []}
                includeInPlan={form.incluirBarraEnPlan ?? false}
                onIncludeChange={v => set('incluirBarraEnPlan', v)}
                includeLabel="Incluir en mi plan"
                headerColor="text-violet-800"
                bgColor="bg-violet-50"
                borderColor="border-violet-200"
                selectedBg="bg-violet-500"
                selectedBorder="border-violet-500"
              />
              {form.incluirBarraEnPlan && (
                <SlotPicker
                  label="¿En qué colación quieres la barra?"
                  value={(form.barraSlot ?? 'ambas') as 'am' | 'pm' | 'ambas'}
                  onChange={v => set('barraSlot', v)}
                  accent="violet"
                />
              )}

              {(() => {
                // Reglas clínicas a propagar a todos los MealChips
                const intol = form.digIntolerancias ?? []
                const sibo = form.digDiag === 'si_sibo' || form.digDiag === 'si_sii' || form.digHinchazon === 'diaria'
                const refluxFrec = form.digReflujo === 'frecuente'
                return (
                  <>
                    {/* Desayunos */}
                    <div>
                      <MealChips
                        label="🌅 Desayunos"
                        pool={filteredDesayunos}
                        selected={form.desayunos ?? []}
                        onChange={v => set('desayunos', v)}
                        intolerancias={intol}
                        bloquearSIBO={sibo}
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
                        intolerancias={intol}
                        bloquearSIBO={sibo}
                      />
                    </div>

                    {/* Almuerzos */}
                    <div>
                      <MealChips
                        label="🍽️ Almuerzos"
                        pool={filteredAlmuerzos}
                        selected={form.almuerzos ?? []}
                        onChange={v => set('almuerzos', v)}
                        intolerancias={intol}
                        bloquearSIBO={sibo}
                      />
                      {(form.almuerzos ?? []).some(k => almuerzosOpts[k]?.tieneHuevo) && (
                        <EggsQtyPicker
                          value={form.eggsQty ?? 2}
                          onChange={n => set('eggsQty', n)}
                        />
                      )}
                      {(form.almuerzos ?? []).some(k => almuerzosOpts[k]?.tieneCarne) && (
                        <CarneQtyPicker
                          label="Gramos de carne / pescado en almuerzo"
                          value={form.carneGramosAlmuerzo ?? 150}
                          onChange={n => set('carneGramosAlmuerzo', n)}
                        />
                      )}
                      {(form.almuerzos ?? []).some(k => almuerzosOpts[k]?.tieneCarboPrincipal) && (
                        <CarboQtyPicker
                          label="Gramos de carbohidrato principal en almuerzo"
                          value={form.carboGramosAlmuerzo ?? 150}
                          onChange={n => set('carboGramosAlmuerzo', n)}
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
                        intolerancias={intol}
                        bloquearSIBO={sibo}
                      />
                    </div>

                    {/* Cenas — además filtra alta grasa si reflujo frecuente */}
                    <div>
                      <MealChips
                        label="🌙 Cenas"
                        pool={filteredCenas}
                        selected={form.cenas ?? []}
                        onChange={v => set('cenas', v)}
                        intolerancias={intol}
                        bloquearSIBO={sibo}
                        bloquearAltaGrasa={refluxFrec}
                      />
                      {(form.cenas ?? []).some(k => cenasOpts[k]?.tieneHuevo) && (
                        <EggsQtyPicker
                          value={form.eggsQtyCena ?? 3}
                          onChange={n => set('eggsQtyCena', n)}
                        />
                      )}
                      {(form.cenas ?? []).some(k => cenasOpts[k]?.tieneCarne) && (
                        <CarneQtyPicker
                          label="Gramos de carne / pescado en cena"
                          value={form.carneGramosCena ?? 150}
                          onChange={n => set('carneGramosCena', n)}
                        />
                      )}
                      {(form.cenas ?? []).some(k => cenasOpts[k]?.tieneCarboPrincipal) && (
                        <>
                          <CarboQtyPicker
                            label="Gramos de carbohidrato principal en cena"
                            value={form.carboGramosCena ?? 150}
                            onChange={n => set('carboGramosCena', n)}
                          />
                          {/* Nota clinica Centro Metabolico: NO reducimos carbos en cena por
                              objetivo. El mito "carbos de noche engordan" no tiene sustento:
                              el carbo nocturno favorece sintesis de glucogeno post-entreno,
                              precursor de serotonina (calidad de sueno) y NO impacta el
                              deficit total del dia si la ingesta diaria esta calculada.
                              Por eso default de cena = default de almuerzo (150g). */}
                          <div className="mt-2 flex gap-2 items-start bg-[#E5F4FB] border border-[#29ABE2]/30 rounded-lg p-2.5">
                            <span className="text-base flex-shrink-0 leading-none mt-0.5">🌙</span>
                            <p className="text-[11px] text-[#0C3547] leading-relaxed">
                              <strong>No reducimos carbohidratos en la cena</strong> — sin importar el objetivo.
                              El carbo nocturno favorece la recuperación, la síntesis de glucógeno y la calidad
                              del sueño, sin impactar el déficit total si la ingesta diaria está calculada.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )
              })()}

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

              {/* Disclaimers de barras/snacks: ahora se muestran dentro de los CatalogPicker */}

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

              {/* Cirugía bariátrica: dispara escalado de volúmenes según fase post-op.
                  Referencias clínicas en src/lib/bariatrica.ts (Mechanick 2019, ASMBS 2016). */}
              <RadioChips
                label="🏥 ¿Cirugía bariátrica previa?"
                value={(form.digCirugiaBariatrica ?? 'ninguna') as CirugiaBariatricaTipo}
                onChange={v => {
                  set('digCirugiaBariatrica', v as CirugiaBariatricaTipo)
                  // Si eligió "ninguna", también resetear la fase
                  if (v === 'ninguna') set('digFasePostBariatrica', 'no_aplica' as FasePostBariatrica)
                }}
                options={(Object.entries(CIRUGIA_BARIATRICA_LABELS) as [CirugiaBariatricaTipo, string][]).map(([value, label]) => ({ value, label }))}
              />

              {/* Fase post-op solo si hay cirugía declarada */}
              {form.digCirugiaBariatrica && form.digCirugiaBariatrica !== 'ninguna' && (
                <>
                  <RadioChips
                    label="📅 Tiempo desde la cirugía / fase actual"
                    value={(form.digFasePostBariatrica ?? 'mantenimiento') as FasePostBariatrica}
                    onChange={v => set('digFasePostBariatrica', v as FasePostBariatrica)}
                    options={
                      (Object.entries(FASE_POST_LABELS) as [FasePostBariatrica, typeof FASE_POST_LABELS[FasePostBariatrica]][])
                        .filter(([k]) => k !== 'no_aplica')
                        .map(([value, meta]) => ({
                          value,
                          label: `${meta.label} · ${meta.periodo}`,
                        }))
                    }
                  />
                  {/* Fases 1-3 (líquidos/purés) = catálogo NO apto. Mostramos
                      banner rojo bloqueante con explicación. El paciente puede
                      seguir generando un plan pero queda claramente advertido. */}
                  {!faseAceptaCatalogoEstandar(form.digFasePostBariatrica) ? (
                    <div className="flex gap-2 items-start bg-rose-50 border-2 border-rose-300 rounded-xl p-3">
                      <span className="text-lg flex-shrink-0">🚨</span>
                      <div className="text-xs text-rose-900 space-y-1.5">
                        <p className="font-bold text-sm">Esta fase requiere plan especializado</p>
                        <p>
                          En <strong>{FASE_POST_LABELS[form.digFasePostBariatrica!].label.toLowerCase()}</strong> tu
                          alimentación debe ser <strong>{FASE_POST_LABELS[form.digFasePostBariatrica!].textura.toLowerCase()}</strong>.
                          El catálogo de Centro Metabólico (platos sólidos) NO es apropiado para esta fase.
                        </p>
                        <p>
                          Continúa con el plan armado por tu <strong>cirujano o nutricionista bariátrico</strong> a cargo.
                          Vuelve a esta app cuando llegues a <strong>fase de sólidos blandos</strong> (semana 7-8)
                          o <strong>mantenimiento</strong> (2+ meses post-op).
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-start bg-amber-50 border border-amber-300 rounded-xl p-3">
                      <span className="text-base flex-shrink-0">⚠️</span>
                      <div className="text-xs text-amber-900 space-y-1.5">
                        <p className="font-bold">Plan adaptado a tu fase post-bariátrica</p>
                        <p>
                          Volúmenes ajustados: <strong>máx. {VOLUMEN_MAX_POR_COMIDA_ML[form.digFasePostBariatrica!]} ml/comida</strong> ·{' '}
                          {FASE_POST_LABELS[form.digFasePostBariatrica!].textura}.
                        </p>
                        {form.digCirugiaBariatrica && (
                          <p>
                            Proteína objetivo: <strong>{PROTEINA_OBJETIVO_G_DIA[form.digCirugiaBariatrica].min}–{PROTEINA_OBJETIVO_G_DIA[form.digCirugiaBariatrica].max} g/día</strong>{' '}
                            (Mechanick 2019 · {CIRUGIA_BARIATRICA_LABELS[form.digCirugiaBariatrica].toLowerCase()}).
                          </p>
                        )}
                        <p className="text-amber-800">
                          <strong>Importante:</strong> esta adaptación es una sugerencia. Tu cirujano
                          o nutricionista a cargo siempre tiene la palabra final sobre tu evolución
                          post-operatoria.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
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
            onClick={handleBack}
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
