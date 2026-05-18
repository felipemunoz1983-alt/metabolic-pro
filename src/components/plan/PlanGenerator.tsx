'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { calcularNutricion, OBJETIVO_LABELS, SEXO_LABELS, EJERCICIO_LABELS, usaraCunningham } from '@/lib/nutrition'
import type { FormData, NutritionResult, Objetivo, Sexo, TipoEjercicio } from '@/lib/nutrition'
import type { MealOption, UltraOption, YogurTipo, SnackNutrevoTipo, BarraProteinaTipo } from '@/lib/foods'
import { desayunosOpts, colacionesOpts, almuerzosOpts, cenasOpts, ultraProcOpts, YOGUR_TIPOS, SNACK_NUTREVO_TIPOS, BARRA_PROTEINA_TIPOS } from '@/lib/foods'
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

  if (filteredEntries.length === 0) {
    return (
      <div>
        <label className="block text-sm font-semibold text-[#0C3547] mb-2">{label}</label>
        <p className="text-xs text-[#6B7C93] italic">No hay opciones compatibles con tus restricciones. Conversa con tu profesional para alternativas personalizadas.</p>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-[#0C3547] mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {filteredEntries.map(([key, opt]) => {
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
}

export function PlanGenerator({ onResult, initialData }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Partial<FormData>>({ ...defaultForm, ...initialData })
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)

  // Mensajes humanos por campo para el toast de confirmación visual
  const TOAST_LABELS: Partial<Record<keyof FormData, (v: unknown) => string>> = {
    yogurtTipo: v => `Yogur: ${YOGUR_TIPOS[v as YogurTipo]?.label ?? v}`,
    snackNutrevoTipo: v => `Snack Nutrevo: ${SNACK_NUTREVO_TIPOS[v as SnackNutrevoTipo]?.label ?? v}`,
    barraProteinaTipo: v => `Barra: ${BARRA_PROTEINA_TIPOS[v as BarraProteinaTipo]?.label ?? v}`,
    incluirSnackEnPlan: v => v ? 'Snack incluido en tu plan ✅' : 'Snack removido del plan',
    incluirBarraEnPlan: v => v ? 'Barra incluida en tu plan ✅' : 'Barra removida del plan',
    tendencia: v => `Tendencia: ${String(v)}`,
    wheyIndicado: v => v ? 'Proteína en polvo activada' : 'Proteína en polvo desactivada',
    horarioEntrenamiento: v => `Entreno: ${String(v).toUpperCase()}`,
  }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    const labeler = TOAST_LABELS[key]
    if (labeler) {
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
    <div className="bg-white rounded-2xl border border-[#D6E3ED] shadow p-4 sm:p-6 pb-6 relative">
      {/* Toast de confirmación visual al cambiar preferencias */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0C3547] text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 max-w-[90vw]"
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
                  <div className="mt-3 flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                    <span className="text-sm flex-shrink-0">ℹ️</span>
                    <p className="text-xs text-blue-800">
                      Opciones con proteína en polvo activadas. Asegúrate de tener el producto disponible antes de incluirlas en el plan.
                    </p>
                  </div>
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

                {/* Comidas por día */}
                <div>
                  <p className="text-[11px] font-semibold text-[#4A6070] mb-1.5">🍽️ Comidas reales por día</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([3, 4, 5, 6] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => set('comidasPorDia', n)}
                        className={cn(
                          'py-1.5 rounded-lg border-2 text-xs font-bold transition-all',
                          (form.comidasPorDia ?? 5) === n
                            ? 'bg-[#29ABE2] border-[#29ABE2] text-white'
                            : 'border-[#D6E3ED] text-[#6B7C93] hover:border-[#29ABE2]'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
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
