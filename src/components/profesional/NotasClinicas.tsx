'use client'

/**
 * NotasClinicas — 4 campos de texto libre que el profesional escribe sobre
 * un paciente (feedback Maria Jose Serrano, Sprint 1-C):
 *
 *   1. Indicaciones generales      (visible al paciente)
 *   2. Suplementacion              (visible al paciente)
 *   3. Rutina de entrenamiento     (visible al paciente)
 *   4. Examenes solicitados        (interno del profesional, no visible)
 *
 * UX:
 *  - Carga inicial desde profiles (los 4 campos + notas_clinicas_updated_at)
 *  - Cada textarea autoguarda con debounce 1.2s
 *  - Indicador "Guardado · hace 5s" en la esquina superior
 *  - Errores de red no bloquean — se reintentan en el siguiente keystroke
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

interface Props {
  patientId: string
  professionalId: string
}

type CampoNota =
  | 'indicaciones_pro'
  | 'suplementacion_pro'
  | 'rutina_entrenamiento_pro'
  | 'examenes_solicitados_pro'

interface CampoConfig {
  key: CampoNota
  label: string
  emoji: string
  placeholder: string
  visibleAlPaciente: boolean
  color: string
}

const CAMPOS: CampoConfig[] = [
  {
    key:               'indicaciones_pro',
    label:             'Indicaciones generales',
    emoji:             '📋',
    placeholder:       'Ej: priorizar proteina en el desayuno · 2L de agua/dia · evitar alcohol los dias de entreno · masticar 20 veces cada bocado...',
    visibleAlPaciente: true,
    color:             'sky',
  },
  {
    key:               'suplementacion_pro',
    label:             'Suplementacion',
    emoji:             '💊',
    placeholder:       'Ej: creatina monohidrato 5g/dia en agua · whey 25g post-entreno · vitamina D3 4000UI en ayunas con grasa. Revisar tolerancia digestiva tras 2 semanas.',
    visibleAlPaciente: true,
    color:             'violet',
  },
  {
    key:               'rutina_entrenamiento_pro',
    label:             'Rutina de entrenamiento',
    emoji:             '🏋️',
    placeholder:       'Ej: lunes-miercoles-viernes fuerza completo (45-60 min) · martes-jueves cardio Z2 30 min · sabado rodaje largo · descanso domingo.',
    visibleAlPaciente: true,
    color:             'amber',
  },
  {
    key:               'examenes_solicitados_pro',
    label:             'Examenes solicitados',
    emoji:             '🩸',
    placeholder:       'Ej: perfil bioquimico, perfil lipidico, glicemia HOMA-IR, vit D, ferritina, TSH-T4L, hsCRP. Repetir en 3 meses.',
    visibleAlPaciente: false,
    color:             'rose',
  },
]

export function NotasClinicas({ patientId, professionalId }: Props) {
  const supabase = createClient()

  const [valores, setValores] = useState<Record<CampoNota, string>>({
    indicaciones_pro:         '',
    suplementacion_pro:       '',
    rutina_entrenamiento_pro: '',
    examenes_solicitados_pro: '',
  })
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [savingField, setSavingField] = useState<CampoNota | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Debounce timers per field (each field saves independently)
  const timersRef = useRef<Partial<Record<CampoNota, ReturnType<typeof setTimeout>>>>({})

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      const { data, error: loadErr } = await supabase
        .from('profiles')
        .select('indicaciones_pro, suplementacion_pro, rutina_entrenamiento_pro, examenes_solicitados_pro, notas_clinicas_updated_at')
        .eq('id', patientId)
        .maybeSingle()
      if (cancel) return
      if (loadErr) {
        setError('No pudimos cargar las notas existentes. Igual puedes escribir nuevas.')
      } else if (data) {
        setValores({
          indicaciones_pro:         data.indicaciones_pro         ?? '',
          suplementacion_pro:       data.suplementacion_pro       ?? '',
          rutina_entrenamiento_pro: data.rutina_entrenamiento_pro ?? '',
          examenes_solicitados_pro: data.examenes_solicitados_pro ?? '',
        })
        if (data.notas_clinicas_updated_at) {
          setSavedAt(new Date(data.notas_clinicas_updated_at))
        }
      }
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [patientId, supabase])

  // ── Guardado debounced por campo ──────────────────────────────────────────
  const guardarCampo = useCallback(async (campo: CampoNota, valor: string) => {
    setSavingField(campo)
    setError(null)
    try {
      const res = await fetch('/api/patients/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          professionalId,
          [campo]: valor,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      const { savedAt: savedAtStr } = await res.json()
      if (savedAtStr) setSavedAt(new Date(savedAtStr))
    } catch (err) {
      console.error('[notas-clinicas]', err)
      setError('Error al guardar. Reintenta escribiendo cualquier cosa para volver a intentar.')
    } finally {
      setSavingField(null)
    }
  }, [patientId, professionalId])

  function handleChange(campo: CampoNota, valor: string) {
    setValores(v => ({ ...v, [campo]: valor }))
    // Reset timer for this field
    const existente = timersRef.current[campo]
    if (existente) clearTimeout(existente)
    timersRef.current[campo] = setTimeout(() => {
      guardarCampo(campo, valor)
    }, 1200)
  }

  // Cleanup pendientes al desmontar
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      Object.values(timers).forEach(t => t && clearTimeout(t))
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header con indicador de guardado */}
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-black text-[#0C1F2C]">Notas clinicas</h3>
          <p className="text-[11px] text-[#6B7C93] mt-0.5">
            Todo se autoguarda al escribir. Los 3 primeros campos los ve el paciente; el ultimo es solo para ti.
          </p>
        </div>
        <SaveIndicator savingField={savingField} savedAt={savedAt} error={error} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#6B7C93] text-sm">
          <Loader2 className="animate-spin mr-2" size={16} /> Cargando notas...
        </div>
      ) : (
        <div className="space-y-3">
          {CAMPOS.map(c => (
            <CampoNotaTextarea
              key={c.key}
              cfg={c}
              valor={valores[c.key]}
              saving={savingField === c.key}
              onChange={v => handleChange(c.key, v)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Subcomponente: textarea con header de visibilidad + contador ───────────
function CampoNotaTextarea({
  cfg,
  valor,
  saving,
  onChange,
}: {
  cfg: CampoConfig
  valor: string
  saving: boolean
  onChange: (v: string) => void
}) {
  const colorClasses: Record<string, string> = {
    sky:    'border-sky-200 focus-within:border-sky-400 bg-sky-50/40',
    violet: 'border-violet-200 focus-within:border-violet-400 bg-violet-50/40',
    amber:  'border-amber-200 focus-within:border-amber-400 bg-amber-50/40',
    rose:   'border-rose-200 focus-within:border-rose-400 bg-rose-50/40',
  }
  const badgeClasses: Record<string, string> = {
    sky:    'bg-sky-100 text-sky-800',
    violet: 'bg-violet-100 text-violet-800',
    amber:  'bg-amber-100 text-amber-800',
    rose:   'bg-rose-100 text-rose-800',
  }

  return (
    <div className={`rounded-2xl border-2 ${colorClasses[cfg.color]} transition`}>
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <p className="text-sm font-black text-[#0C1F2C] flex items-center gap-2">
          <span className="text-lg">{cfg.emoji}</span> {cfg.label}
        </p>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="animate-spin text-[#6B7C93]" size={12} />}
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeClasses[cfg.color]}`}>
            {cfg.visibleAlPaciente ? '👁 visible al paciente' : '🔒 solo para ti'}
          </span>
        </div>
      </div>
      <textarea
        value={valor}
        onChange={e => onChange(e.target.value)}
        placeholder={cfg.placeholder}
        rows={4}
        className="w-full px-4 pb-3 pt-1 bg-transparent border-0 text-sm text-[#0C1F2C] placeholder:text-[#A8B5C0] focus:outline-none resize-y min-h-[80px]"
      />
      <div className="px-4 pb-2 text-right">
        <span className="text-[10px] text-[#8BA5BE]">{valor.length} caracteres</span>
      </div>
    </div>
  )
}

// ─── Subcomponente: indicador de guardado (top-right) ──────────────────────
function SaveIndicator({
  savingField,
  savedAt,
  error,
}: {
  savingField: CampoNota | null
  savedAt: Date | null
  error: string | null
}) {
  // nowMs en state — evita leer Date.now() durante el render (regla react-hooks/purity).
  // Solo lo seteamos dentro del interval (no sincronicamente en el effect),
  // lo que cumple la regla react-hooks/set-state-in-effect. Trade-off: el primer
  // render muestra "Guardado" sin "hace Xs"; tras 15s aparece el relativo.
  const [nowMs, setNowMs] = useState<number>(0)
  useEffect(() => {
    const i = setInterval(() => setNowMs(Date.now()), 15_000)
    return () => clearInterval(i)
  }, [])

  if (error) {
    return <span className="text-[11px] text-rose-700 font-semibold">⚠ {error.length > 50 ? 'Error al guardar' : error}</span>
  }
  if (savingField) {
    return (
      <span className="text-[11px] text-[#6B7C93] font-semibold flex items-center gap-1">
        <Loader2 className="animate-spin" size={12} /> Guardando...
      </span>
    )
  }
  if (savedAt) {
    if (!nowMs) return <span className="text-[11px] text-emerald-700 font-semibold">✓ Guardado</span>
    const secs = Math.max(0, Math.floor((nowMs - savedAt.getTime()) / 1000))
    const txt = secs < 5    ? 'recien'      :
                secs < 60   ? `hace ${secs}s` :
                secs < 3600 ? `hace ${Math.floor(secs/60)} min` :
                              savedAt.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
    return <span className="text-[11px] text-emerald-700 font-semibold">✓ Guardado {txt}</span>
  }
  return <span className="text-[11px] text-[#8BA5BE]">Sin cambios</span>
}
