'use client'

/**
 * OnboardingModal — shown once to new individual users who have no plan yet.
 * 3 steps: Welcome → Perfil básico → ¡Listo!
 *
 * On completion: saves nombre to Supabase, marks done in localStorage,
 * passes pre-filled FormData partial to parent so PlanGenerator opens
 * with basic info already filled in.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import type { FormData, Objetivo, Sexo } from '@/lib/nutrition'
import {
  ChevronRight, Sparkles, User, Target, Activity,
  CheckCircle, ArrowRight,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJETIVOS: { value: Objetivo; label: string; desc: string; emoji: string }[] = [
  { value: 'perdida grasa',  label: 'Bajar de peso',    desc: 'Reducir grasa corporal y mejorar composición', emoji: '🔥' },
  { value: 'mantenimiento',  label: 'Mantenerme',       desc: 'Peso estable con buena salud metabólica',      emoji: '⚖️' },
  { value: 'hipertrofia',    label: 'Ganar músculo',    desc: 'Aumentar masa magra con nutrición de apoyo',   emoji: '💪' },
]

const ONBOARDING_KEY = (userId: string) => `onboarding_done_${userId}`

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i === step
              ? 'w-6 h-2 bg-[#29ABE2]'
              : i < step
              ? 'w-2 h-2 bg-[#29ABE2]/50'
              : 'w-2 h-2 bg-[#D6E3ED]'
          )}
        />
      ))}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-[#4A6070] uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function Input({
  type = 'text', value, onChange, placeholder, min, max,
}: {
  type?: string
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  min?: number
  max?: number
}) {
  return (
    <input
      type={type}
      value={value === 0 ? '' : value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full px-3.5 py-2.5 border border-[#D6E3ED] rounded-xl text-sm text-[#1E2D3D] bg-white
        focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20
        placeholder:text-[#C8D8E4] transition"
    />
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profile: Profile
  userId: string
  onComplete: (partial: Partial<FormData>) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingModal({ profile, userId, onComplete }: Props) {
  const supabase = createClient()

  const [step, setStep]           = useState(0)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Form fields
  const [nombre,   setNombre]   = useState(profile.nombre || '')
  const [edad,     setEdad]     = useState<number>(0)
  const [peso,     setPeso]     = useState<number>(0)
  const [talla,    setTalla]    = useState<number>(0)
  const [sexo,     setSexo]     = useState<Sexo>('masculino')
  const [objetivo, setObjetivo] = useState<Objetivo>('perdida grasa')

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    if (!nombre.trim()) { setError('Ingresa tu nombre'); return false }
    return true
  }

  function validateStep2(): boolean {
    if (!edad || edad < 10 || edad > 120)    { setError('Ingresa una edad válida (10–120)'); return false }
    if (!peso || peso < 30 || peso > 300)    { setError('Ingresa un peso válido (30–300 kg)'); return false }
    if (!talla || talla < 100 || talla > 230) { setError('Ingresa una talla válida (100–230 cm)'); return false }
    return true
  }

  // ── Step navigation ──────────────────────────────────────────────────────────

  async function handleStep0Next() {
    setError('')
    if (!validateStep1()) return
    // Save nombre to DB if changed
    if (nombre.trim() !== profile.nombre) {
      setSaving(true)
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ nombre: nombre.trim() })
        .eq('id', userId)
      setSaving(false)
      if (dbErr) { setError('Error al guardar el nombre. Intenta de nuevo.'); return }
    }
    setStep(1)
  }

  function handleStep1Next() {
    setError('')
    if (!validateStep2()) return
    setStep(2)
  }

  function handleComplete() {
    // Mark onboarding done
    try { localStorage.setItem(ONBOARDING_KEY(userId), '1') } catch { /* ignore */ }
    // Build partial FormData to pre-fill PlanGenerator
    const partial: Partial<FormData> = {
      nombre: nombre.trim(),
      edad,
      peso,
      talla,
      sexo,
      objetivo,
    }
    onComplete(partial)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* ── Top gradient accent ── */}
          <div className="h-1.5 bg-gradient-to-r from-[#29ABE2] via-[#1a6fa0] to-[#29ABE2]" />

          <div className="p-6">
            <StepDots step={step} />

            {/* ══════════════════════════════════════════════ STEP 0 — Welcome */}
            {step === 0 && (
              <div className="space-y-5">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] flex items-center justify-center shadow-lg shadow-[#29ABE2]/30">
                    <Sparkles size={36} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#0C1F2C] leading-tight">
                      ¡Bienvenido/a a<br />Centro Metabólico!
                    </h2>
                    <p className="text-sm text-[#6B8FA8] mt-2 leading-relaxed">
                      En 2 pasos rápidos tendrás tu plan nutricional personalizado.
                    </p>
                  </div>
                </div>

                {/* What you'll get */}
                <div className="bg-[#F7FBFE] border border-[#E2ECF4] rounded-2xl p-4 space-y-2.5">
                  {[
                    { icon: '🧮', text: 'Cálculo de calorías y macros exactos para ti' },
                    { icon: '📋', text: 'Plan semanal de comidas adaptado a tus gustos' },
                    { icon: '📊', text: 'Seguimiento diario de adherencia y progreso' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{icon}</span>
                      <span className="text-xs text-[#4A6070] leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>

                {/* Name field */}
                <Field label="¿Cómo te llamas?">
                  <Input
                    value={nombre}
                    onChange={setNombre}
                    placeholder="Tu nombre completo"
                  />
                </Field>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                <button
                  onClick={handleStep0Next}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0]
                    text-white font-bold py-3.5 rounded-2xl hover:opacity-90 transition disabled:opacity-60 text-sm"
                >
                  {saving ? 'Guardando...' : 'Empezar'}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════ STEP 1 — Perfil */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-[#EAF4FB] rounded-xl flex items-center justify-center">
                    <User size={18} className="text-[#29ABE2]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#0C1F2C]">Tu perfil físico</h2>
                    <p className="text-xs text-[#8BA5BE]">Para calcular tus calorías con precisión</p>
                  </div>
                </div>

                {/* Sexo */}
                <Field label="Sexo biológico">
                  <div className="grid grid-cols-2 gap-2">
                    {(['masculino', 'femenino'] as Sexo[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setSexo(s)}
                        className={cn(
                          'py-2.5 rounded-xl text-sm font-bold border-2 transition',
                          sexo === s
                            ? 'border-[#29ABE2] bg-[#EAF4FB] text-[#0C3547]'
                            : 'border-[#E2ECF4] bg-white text-[#8BA5BE] hover:border-[#29ABE2]/50'
                        )}
                      >
                        {s === 'masculino' ? '♂ Masculino' : '♀ Femenino'}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Edad + Peso */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Edad (años)">
                    <Input
                      type="number"
                      value={edad}
                      onChange={v => setEdad(Number(v))}
                      placeholder="28"
                      min={10}
                      max={120}
                    />
                  </Field>
                  <Field label="Peso (kg)">
                    <Input
                      type="number"
                      value={peso}
                      onChange={v => setPeso(Number(v))}
                      placeholder="72"
                      min={30}
                      max={300}
                    />
                  </Field>
                </div>

                {/* Talla */}
                <Field label="Talla (cm)">
                  <Input
                    type="number"
                    value={talla}
                    onChange={v => setTalla(Number(v))}
                    placeholder="170"
                    min={100}
                    max={230}
                  />
                </Field>

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setError(''); setStep(0) }}
                    className="flex-1 py-3 rounded-2xl border border-[#E2ECF4] text-sm font-bold text-[#8BA5BE] hover:bg-[#F7FBFE] transition"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleStep1Next}
                    className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0]
                      text-white font-bold py-3 rounded-2xl hover:opacity-90 transition text-sm"
                  >
                    Continuar
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════ STEP 2 — Objetivo + Done */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 bg-[#EAF4FB] rounded-xl flex items-center justify-center">
                    <Target size={18} className="text-[#29ABE2]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[#0C1F2C]">¿Cuál es tu objetivo?</h2>
                    <p className="text-xs text-[#8BA5BE]">Ajustamos los macros según tu meta</p>
                  </div>
                </div>

                {/* Objetivo selector */}
                <div className="space-y-2">
                  {OBJETIVOS.map(obj => (
                    <button
                      key={obj.value}
                      onClick={() => setObjetivo(obj.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition',
                        objetivo === obj.value
                          ? 'border-[#29ABE2] bg-[#EAF4FB]'
                          : 'border-[#E2ECF4] bg-white hover:border-[#29ABE2]/40'
                      )}
                    >
                      <span className="text-xl leading-none">{obj.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-bold',
                          objetivo === obj.value ? 'text-[#0C3547]' : 'text-[#4A6070]'
                        )}>
                          {obj.label}
                        </p>
                        <p className="text-[10px] text-[#8BA5BE] leading-tight mt-0.5">{obj.desc}</p>
                      </div>
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex-shrink-0 transition',
                        objetivo === obj.value
                          ? 'border-[#29ABE2] bg-[#29ABE2]'
                          : 'border-[#D6E3ED]'
                      )}>
                        {objetivo === obj.value && (
                          <CheckCircle size={12} className="text-white m-auto mt-[-1px]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Summary chip */}
                <div className="bg-[#F7FBFE] border border-[#E2ECF4] rounded-2xl p-3.5 flex items-center gap-3">
                  <Activity size={16} className="text-[#29ABE2] flex-shrink-0" />
                  <p className="text-xs text-[#4A6070] leading-relaxed">
                    <span className="font-bold text-[#0C3547]">{nombre}</span>
                    {' · '}{sexo === 'masculino' ? '♂' : '♀'}
                    {' · '}{edad} años
                    {' · '}{peso} kg · {talla} cm
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setError(''); setStep(1) }}
                    className="flex-1 py-3 rounded-2xl border border-[#E2ECF4] text-sm font-bold text-[#8BA5BE] hover:bg-[#F7FBFE] transition"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleComplete}
                    className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-[#29ABE2] to-[#1a8fc2]
                      text-white font-bold py-3 rounded-2xl hover:opacity-90 transition text-sm shadow-lg shadow-[#29ABE2]/30"
                  >
                    Crear mi plan
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Helper exported for the page ─────────────────────────────────────────────

export { ONBOARDING_KEY }
