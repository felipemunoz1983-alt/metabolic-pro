'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { getDateCLDaysAgo, formatDateCL } from '@/lib/date-cl'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
// Lazy load: ambos componentes hacen fetch propio y no son above-the-fold.
// Sacarlos del bundle inicial del panel ahorra ~70KB JS en el primer paint.
import dynamic from 'next/dynamic'
const BancoOpciones = dynamic(
  () => import('@/components/profesional/BancoOpciones').then(m => ({ default: m.BancoOpciones })),
  { ssr: false, loading: () => null },
)
const AdherenciaPaciente = dynamic(
  () => import('@/components/profesional/AdherenciaPaciente').then(m => ({ default: m.AdherenciaPaciente })),
  { ssr: false, loading: () => null },
)
import { derivarComidasDePlan } from '@/lib/banco-adapter'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import type { Profile } from '@/types'
import {
  Search, Plus, ArrowLeft, User, Users,
  Target, TrendingUp, Clock,
  CheckCircle, AlertCircle, RefreshCw,
  Link2, Mail, Copy, X, UserPlus, Send, BarChart2,
  FileText, Flame, Beef, Wheat, Droplets, ChevronRight,
  MessageSquare, Smartphone, Loader2, Trash2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────
interface DailyLog {
  fecha: string
  kcal_consumida: number
  comidas_completadas: number
  comidas_total: number
  peso?: number
  hambre?: number
  energia?: number
  digestivo?: string
  animo?: string
  nota?: string
}

interface PatientRow extends Profile {
  lastLog?: DailyLog
  planCount?: number
  adherencia7d?: number | null   // avg adherence last 7 days (null = no logs)
}

interface PlanRow {
  id: string
  objetivo: string
  kcal: number
  proteina: number
  carbohidrato: number
  grasa: number
  plan_json: { form: FormData; result: NutritionResult }
  created_at: string
}

const DIGESTIVO_EMOJI: Record<string, string> = {
  sin_molestias: '✅', leve: '🟡', moderado: '🟠', severo: '🔴'
}
const ANIMO_EMOJI: Record<string, string> = {
  excelente: '😄', bueno: '🙂', regular: '😐', malo: '😔'
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ patient, onClick }: { patient: PatientRow; onClick: () => void }) {
  const adherencia = patient.lastLog?.comidas_total
    ? Math.round((patient.lastLog.comidas_completadas / patient.lastLog.comidas_total) * 100)
    : null

  // Days since last log — usar new Date() en render es impuro, pero aquí es
  // display-only (no usado en lógica). Re-renders al cambiar de día son OK.
  /* eslint-disable-next-line react-hooks/purity -- display-only Date.now() in render, intentional */
  const diasDesde = patient.lastLog?.fecha ? Math.floor((Date.now() - new Date(patient.lastLog.fecha + 'T12:00:00').getTime()) / 86400000) : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-[#E2ECF4] p-5 hover:border-[#29ABE2]/40 hover:shadow-md transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#29ABE2]/20 to-[#1a6fa0]/20 border border-[#29ABE2]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-[#29ABE2]">
              {patient.nombre?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-[#0C1F2C] group-hover:text-[#29ABE2] transition-colors">
              {patient.nombre}
            </p>
            <p className="text-[10px] text-[#8BA5BE] font-medium">{patient.email}</p>
          </div>
        </div>
        {(() => {
          const onTrial = patient.plan === 'gratuito'
            && patient.trial_ends_at
            && new Date(patient.trial_ends_at) > new Date()
          const isPaid = patient.plan !== 'gratuito'
          return (
            <span className={cn(
              'text-[9px] font-bold px-2 py-1 rounded-full',
              isPaid
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : onTrial
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-[#F0F6FA] text-[#8BA5BE] border border-[#E2ECF4]'
            )}>
              {patient.plan === 'patient'     ? '⭐ Paciente'
                : patient.plan === 'individual' ? '⭐ Individual'
                : isPaid                        ? '⭐ Premium'
                : onTrial                       ? '🔵 En prueba'
                : 'Gratuito'}
            </span>
          )
        })()}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#F8FBFD] rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-[#8BA5BE] font-medium uppercase tracking-wide mb-1">Planes</p>
          <p className="text-base font-black text-[#0C1F2C]">{patient.planCount ?? 0}</p>
        </div>
        <div className="bg-[#F8FBFD] rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-[#8BA5BE] font-medium uppercase tracking-wide mb-1">Adherencia</p>
          {adherencia !== null ? (
            <p className={cn('text-base font-black', adherencia >= 80 ? 'text-green-600' : 'text-amber-500')}>
              {adherencia}%
            </p>
          ) : (
            <p className="text-base font-black text-[#C8D8E4]">—</p>
          )}
        </div>
        <div className="bg-[#F8FBFD] rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-[#8BA5BE] font-medium uppercase tracking-wide mb-1">Último</p>
          {diasDesde !== null ? (
            <p className={cn('text-base font-black', diasDesde === 0 ? 'text-green-600' : diasDesde <= 3 ? 'text-[#29ABE2]' : 'text-amber-500')}>
              {diasDesde === 0 ? 'Hoy' : `${diasDesde}d`}
            </p>
          ) : (
            <p className="text-base font-black text-[#C8D8E4]">—</p>
          )}
        </div>
      </div>

      {/* Alert badge + last activity */}
      <div className="mt-3 pt-3 border-t border-[#F0F6FA] flex items-center justify-between gap-2">
        {/* Low-adherence alert */}
        {patient.adherencia7d !== null && patient.adherencia7d !== undefined && patient.adherencia7d < 50 ? (
          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
            <AlertCircle size={9} /> Baja adherencia 7d
          </span>
        ) : patient.lastLog ? (
          <span className="text-[10px] text-[#8BA5BE]">
            {new Date(patient.lastLog.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </span>
        ) : <span />}
        {patient.lastLog && (
          <span className="text-[10px] font-semibold text-[#6B7C93]">
            {patient.lastLog.kcal_consumida} kcal · {patient.lastLog.peso ? `${patient.lastLog.peso} kg` : 'sin peso'}
          </span>
        )}
      </div>
    </motion.button>
  )
}

// ─── Modal Mensaje al paciente ────────────────────────────────────────────────
const TIPOS_MENSAJE = [
  { id: 'motivacional', label: '💪 Motivacional' },
  { id: 'ajuste',       label: '🔧 Ajuste de plan' },
  { id: 'recordatorio', label: '📋 Recordatorio' },
  { id: 'general',      label: '📩 General' },
] as const

function ModalMensaje({
  patient,
  onClose,
}: {
  patient: PatientRow
  onClose: () => void
}) {
  const [tipo, setTipo]       = useState<string>('motivacional')
  const [mensaje, setMensaje] = useState('')
  const [status, setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSend() {
    if (!mensaje.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/email/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, tipo, mensaje }),
      })
      setStatus(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(onClose, 1800)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2ECF4]">
          <div className="flex items-center gap-2.5">
            <MessageSquare size={16} className="text-[#29ABE2]" />
            <h3 className="text-sm font-bold text-[#0C1F2C]">
              Enviar mensaje a {patient.nombre}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8BA5BE] hover:text-[#0C1F2C] transition">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <p className="text-[10px] font-bold text-[#0C1F2C] uppercase tracking-wide mb-2">Tipo de mensaje</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS_MENSAJE.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border',
                    tipo === t.id
                      ? 'bg-[#0C3547] text-white border-[#0C3547]'
                      : 'bg-[#F8FBFD] text-[#6B7C93] border-[#E2ECF4] hover:border-[#29ABE2]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <p className="text-[10px] font-bold text-[#0C1F2C] uppercase tracking-wide mb-2">Mensaje</p>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              rows={5}
              placeholder="Escribe tu mensaje aquí..."
              className="w-full px-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/10 transition resize-none"
            />
            <p className="text-[10px] text-[#8BA5BE] mt-1 text-right">{mensaje.length} caracteres</p>
          </div>

          {/* Send */}
          {status === 'sent' ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle size={14} /> Mensaje enviado a {patient.email}
            </div>
          ) : status === 'error' ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium text-center">
              Error al enviar. Intenta nuevamente.
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={!mensaje.trim() || status === 'sending'}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-sm font-bold px-4 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-40"
            >
              {status === 'sending'
                ? <><RefreshCw size={14} className="animate-spin" /> Enviando...</>
                : <><Send size={14} /> Enviar mensaje</>}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Patient Detail ───────────────────────────────────────────────────────────
function PatientDetail({
  patient,
  onBack,
  professionalId,
  professionalName,
}: {
  patient: PatientRow
  onBack: () => void
  professionalId: string
  professionalName: string
}) {
  const supabase = createClient()
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'overview' | 'plan'>('overview')
  const [planResult, setPlanResult] = useState<NutritionResult | null>(null)
  const [planForm, setPlanForm] = useState<FormData | null>(null)
  const [allPlans, setAllPlans] = useState<PlanRow[]>([])
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'save_error'>('idle')
  const [showMensaje,      setShowMensaje]      = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installCopied,    setInstallCopied]    = useState(false)
  const [showUnlink,       setShowUnlink]       = useState(false)
  const [unlinking,        setUnlinking]        = useState(false)

  /** Mensaje WhatsApp con instrucciones de instalación para el paciente */
  const installMessage = (() => {
    const nombre = patient.nombre?.split(' ')[0] ?? 'Hola'
    const appUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/paciente`
      : 'https://app.centrometabolico.cl/paciente'
    return `¡Hola ${nombre}! 👋 Te comparto la app de Centro Metabólico para registrar tus comidas fácilmente desde tu celular.

📲 *Cómo instalarla:*

*iPhone (Safari):*
1. Abre este link con Safari:
${appUrl}
2. Toca el botón 📤 (compartir, abajo al centro)
3. Selecciona "Agregar a pantalla de inicio"
4. ¡Listo! La app aparece como ícono ✅

*Android (Chrome):*
1. Abre el link en Chrome:
${appUrl}
2. Toca ⋮ (tres puntos arriba a la derecha)
3. Selecciona "Agregar a pantalla de inicio"
4. ¡Listo! ✅

Cualquier duda, escríbeme 😊`
  })()

  /** Desvincula al paciente de este profesional (no elimina su cuenta) */
  async function handleUnlink() {
    setUnlinking(true)
    try {
      const res = await fetch('/api/patients/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id, professionalId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }
      // Volver al listado — el paciente ya no aparecerá
      onBack()
    } catch (err) {
      console.error('[unlink]', err)
      setShowUnlink(false)
    } finally {
      setUnlinking(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      // TZ Chile — coincide con fechas guardadas en registros_diarios
      const desdeStr = getDateCLDaysAgo(29)

      // Load logs and ALL plans in parallel
      const [logsRes, plansRes] = await Promise.all([
        supabase
          .from('registros_diarios')
          .select('*')
          .eq('user_id', patient.id)
          .gte('fecha', desdeStr)
          .order('fecha', { ascending: false }),
        supabase
          .from('planes_nutricionales')
          .select('id, objetivo, kcal, proteina, carbohidrato, grasa, plan_json, created_at')
          .eq('user_id', patient.id)
          .order('created_at', { ascending: false }),
      ])

      setLogs(logsRes.data || [])

      const plans = (plansRes.data as PlanRow[]) || []
      setAllPlans(plans)

      // Pre-load most recent plan so professional can view/edit without regenerating
      if (plans[0]?.plan_json?.result && plans[0]?.plan_json?.form) {
        setPlanResult(plans[0].plan_json.result)
        setPlanForm(plans[0].plan_json.form)
      }

      setLoading(false)
    }
    loadData()
  }, [patient.id])

  const adherenciaMedia = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l!.comidas_total > 0 ? (l!.comidas_completadas / l!.comidas_total) * 100 : 0), 0) / logs.length)
    : null

  const kcalMedia = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l!.kcal_consumida || 0), 0) / logs.length)
    : null

  const ultimoPeso = logs.find(l => l?.peso)?.peso

  async function handlePlanResult(r: NutritionResult, f: FormData) {
    setPlanResult(r)
    setPlanForm(f)

    // Save plan to Supabase
    const { data: saved, error: saveErr } = await supabase
      .from('planes_nutricionales')
      .insert({
        user_id: patient.id,
        professional_id: professionalId,
        objetivo: f.objetivo,
        kcal: Math.round(r.kcal),
        proteina: r.macros.p,
        carbohidrato: r.macros.c,
        grasa: r.macros.g,
        plan_json: { form: f, result: r },
      })
      .select('id, objetivo, kcal, proteina, carbohidrato, grasa, plan_json, created_at')
      .maybeSingle()

    if (saveErr) {
      console.error('[PanelProfesional] plan save error — check RLS policies:', saveErr)
      setEmailStatus('save_error')
      return
    }

    // Prepend to plan history immediately (no reload needed)
    if (saved) {
      setAllPlans(prev => [saved as PlanRow, ...prev])
    }

    // Send email notification
    setEmailStatus('sending')
    try {
      const res = await fetch('/api/email/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,    // ← habilita push al paciente
          patientEmail: patient.email,
          patientName: patient.nombre,
          professionalName,
          planKcal: Math.round(r.kcal),
          planObjetivo: f.objetivo,
          macros: { p: r.macros.p, c: r.macros.c, g: r.macros.g },
          appUrl: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      })
      if (res.ok) {
        setEmailStatus('sent')
      } else {
        setEmailStatus('error')
      }
    } catch {
      setEmailStatus('error')
    }
  }

  if (view === 'plan') {
    return (
      <div className="px-4 py-4 md:px-8 md:py-6 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => { setView('overview') }}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Volver a {patient.nombre}
        </button>

        {planResult && planForm ? (
          <>
            <PlanResult
              result={planResult}
              form={planForm}
              onReset={() => { setView('overview') }}
            />
            {emailStatus === 'sending' && (
              <div className="mt-4 flex items-center gap-2 bg-[#F0F6FA] border border-[#E2ECF4] rounded-xl px-4 py-3">
                <RefreshCw size={14} className="text-[#8BA5BE] animate-spin flex-shrink-0" />
                <p className="text-xs text-[#6B7C93] font-medium">Enviando notificacion al paciente...</p>
              </div>
            )}
            {emailStatus === 'sent' && (
              <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700 font-medium">Plan guardado y email enviado a {patient.email}</p>
              </div>
            )}
            {emailStatus === 'error' && (
              <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">Plan guardado. No se pudo enviar el email de notificación.</p>
              </div>
            )}
            {emailStatus === 'save_error' && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  Error al guardar el plan en la base de datos. Verifica que hayas aplicado el SQL de RLS en Supabase (<code className="font-mono">supabase/rls-fix.sql</code>).
                </p>
              </div>
            )}

            {/* ── Banco de opciones — preparaciones culinarias para cada tiempo ──
                 BancoOpciones se auto-fetch desde GET /api/planes/[id]/banco-opciones
                 al mountar y tras cada regenerate. No requiere refrescar el parent. */}
            {allPlans[0]?.id && (
              <div className="mt-8">
                <BancoOpciones
                  planId={allPlans[0].id}
                  comidas={derivarComidasDePlan(allPlans[0].id, planForm, planResult)}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
              <User size={16} className="text-[#29ABE2] flex-shrink-0" />
              <p className="text-sm text-[#0C3547] font-medium">
                Generando plan para <span className="font-bold">{patient.nombre}</span>
              </p>
            </div>
            <PlanGenerator
              onResult={handlePlanResult}
              // Hidrata el wizard con:
              //   1. Datos del paciente (nombre, email) — para no retipearlos
              //   2. Datos antropométricos del último plan (peso/talla/edad/sexo)
              //      si los tiene — solo lo que cambia entre planes (objetivo,
              //      ejercicio, etc.) queda para el profesional ajustar
              initialData={{
                nombre: patient.nombre ?? '',
                ...(planForm ?? {}),
              }}
            />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6 max-w-4xl mx-auto">
      {/* Mensaje modal */}
      <AnimatePresence>
        {showMensaje && (
          <ModalMensaje patient={patient} onClose={() => setShowMensaje(false)} />
        )}
      </AnimatePresence>

      {/* ── Modal: confirmar desvinculación ── */}
      <AnimatePresence>
        {showUnlink && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => !unlinking && setShowUnlink(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
                <X size={22} className="text-red-500" />
              </div>
              <h3 className="text-base font-black text-[#0C1F2C] text-center mb-1">
                Eliminar de la lista
              </h3>
              <p className="text-sm text-[#6B7C93] text-center mb-6 leading-relaxed">
                ¿Quieres eliminar a <strong className="text-[#0C1F2C]">{patient.nombre}</strong> de tu lista de pacientes?
                <br />
                <span className="text-xs text-[#8BA5BE] mt-1 block">Su cuenta se mantiene. Solo se desvincula de tu panel.</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUnlink(false)}
                  disabled={unlinking}
                  className="flex-1 py-2.5 rounded-xl border border-[#E2ECF4] text-sm font-bold text-[#6B7C93] hover:bg-[#F8FBFD] transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={unlinking}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {unlinking ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: instrucciones de instalación ── */}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1DAEEC]/10 flex items-center justify-center">
                    <Smartphone size={16} className="text-[#1DAEEC]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0C1F2C]">Enviar instrucciones de instalación</p>
                    <p className="text-xs text-[#8BA5BE]">Para {patient.nombre}</p>
                  </div>
                </div>
                <button onClick={() => setShowInstallModal(false)} className="text-[#8BA5BE] hover:text-[#0C1F2C] transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Message preview */}
              <div className="bg-[#F7FBFE] rounded-2xl p-4 mb-4 text-xs text-[#4A6070] leading-relaxed whitespace-pre-line font-mono border border-[#E2ECF4] max-h-56 overflow-y-auto">
                {installMessage}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                {/* WhatsApp — si hay número */}
                {patient.whatsapp ? (
                  <a
                    href={`https://wa.me/${patient.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(installMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#1fb855] transition-colors"
                    onClick={() => setShowInstallModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar por WhatsApp ({patient.whatsapp})
                  </a>
                ) : (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      No hay número WhatsApp registrado para este paciente. Copia el mensaje y envíalo manualmente.
                    </p>
                  </div>
                )}

                {/* Copiar mensaje */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(installMessage)
                    setInstallCopied(true)
                    setTimeout(() => setInstallCopied(false), 2500)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#E2ECF4] text-[#4A6070] text-sm font-medium hover:border-[#29ABE2] hover:text-[#29ABE2] transition-colors"
                >
                  {installCopied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                  {installCopied ? '¡Copiado!' : 'Copiar mensaje'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back + header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] transition-colors"
        >
          <ArrowLeft size={14} /> Todos los pacientes
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Enviar instrucciones de instalación de la app */}
          <button
            onClick={() => setShowInstallModal(true)}
            className="flex items-center gap-2 bg-white border border-[#E2ECF4] text-[#6B7C93] text-sm font-bold px-3 py-2 rounded-xl hover:border-[#25D366] hover:text-[#25D366] transition"
            title="Enviar instrucciones para instalar la app en el celular"
          >
            <Smartphone size={14} /> <span className="hidden sm:inline">Enviar app</span>
          </button>
          {/* Enviar mensaje */}
          <button
            onClick={() => setShowMensaje(true)}
            className="flex items-center gap-2 bg-white border border-[#E2ECF4] text-[#6B7C93] text-sm font-bold px-3 py-2 rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
            title="Enviar mensaje al paciente"
          >
            <MessageSquare size={14} /> <span className="hidden sm:inline">Mensaje</span>
          </button>
          {/* Eliminar de lista */}
          <button
            onClick={() => setShowUnlink(true)}
            className="flex items-center gap-2 bg-white border border-[#E2ECF4] text-[#6B7C93] text-sm font-bold px-3 py-2 rounded-xl hover:border-red-400 hover:text-red-500 transition"
            title="Eliminar paciente de la lista"
          >
            <Trash2 size={14} /> <span className="hidden sm:inline">Eliminar</span>
          </button>
          {allPlans.length > 0 && planResult && planForm && view === 'overview' && (
            <button
              onClick={() => setView('plan')}
              className="flex items-center gap-2 bg-white border border-[#29ABE2] text-[#29ABE2] text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#F0F9FF] transition"
            >
              <Target size={14} /> <span className="hidden sm:inline">Ver último plan</span><span className="sm:hidden">Ver plan</span>
            </button>
          )}
          <button
            onClick={() => {
              // 'Nuevo plan' → entra al wizard pero MANTIENE planForm hidratado
              //   con los datos antropométricos del último plan (peso/talla/edad/sexo).
              //   El profesional ajusta solo lo que cambia entre planes.
              //   El nombre del paciente se pre-llena vía el initialData del mount.
              setPlanResult(null)
              setEmailStatus('idle')
              setView('plan')
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition"
          >
            <Plus size={14} /> {allPlans.length > 0 ? 'Nuevo plan' : 'Generar plan'}
          </button>
        </div>
      </div>

      {/* Patient header card */}
      <div className="bg-gradient-to-r from-[#060F1A] via-[#0C1F2C] to-[#0C3547] rounded-2xl p-4 sm:p-6 text-white mb-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#29ABE2]/20 border border-[#29ABE2]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-black text-[#29ABE2]">
              {patient.nombre?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-black">{patient.nombre}</h2>
            <p className="text-[#9EC8E0] text-xs mt-0.5">{patient.email}</p>
            {patient.whatsapp && (
              <p className="text-[#9EC8E0] text-xs">📱 {patient.whatsapp}</p>
            )}
          </div>
          <div className="text-right ml-auto flex-shrink-0">
            {(() => {
              const onTrial = patient.plan === 'gratuito'
                && patient.trial_ends_at
                && new Date(patient.trial_ends_at) > new Date()
              const isPaid = patient.plan !== 'gratuito'
              return (
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  isPaid ? 'bg-amber-500/20 text-amber-400'
                    : onTrial ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-white/10 text-[#9EC8E0]'
                )}>
                  {patient.plan === 'patient'     ? '⭐ Paciente'
                    : patient.plan === 'individual' ? '⭐ Individual'
                    : isPaid                        ? '⭐ Premium'
                    : onTrial                       ? '🔵 En prueba'
                    : 'Gratuito'}
                </span>
              )
            })()}
            <p className="text-[10px] text-[#4A7A94] mt-1.5">
              Desde {new Date(patient.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Planes generados', value: patient.planCount ?? 0, unit: '' },
            { label: 'Adherencia media', value: adherenciaMedia !== null ? `${adherenciaMedia}%` : '—', unit: '' },
            { label: 'Kcal media/día', value: kcalMedia?.toLocaleString() ?? '—', unit: '' },
            { label: 'Último peso', value: ultimoPeso ? `${ultimoPeso}` : '—', unit: ultimoPeso ? 'kg' : '' },
          ].map(m => (
            <div key={m.label} className="bg-white/8 rounded-xl p-3">
              <p className="text-[9px] text-[#4A7A94] font-medium uppercase tracking-wide mb-1">{m.label}</p>
              <p className="text-xl font-black text-white">
                {m.value}<span className="text-xs text-[#9EC8E0] ml-1">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alerta clínica si adherencia baja ── */}
      {(() => {
        const recientes = logs.slice(0, 7)
        const bajos = recientes.filter(l => l.comidas_total > 0 && (l.comidas_completadas / l.comidas_total) < 0.5).length
        const severos = recientes.filter(l => l.digestivo === 'severo' || l.digestivo === 'moderado').length
        if (bajos < 3 && severos < 2) return null
        return (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Intervención recomendada</p>
              <p className="text-xs text-red-600 mt-0.5">
                {bajos >= 3 && `${bajos} de los últimos 7 días con adherencia menor al 50%. `}
                {severos >= 2 && `${severos} días con molestias digestivas moderadas/severas. `}
                Considera revisar el plan o agendar una consulta.
              </p>
            </div>
          </div>
        )
      })()}

      {/* ── Adherencia y patrones (Fase 2) ── */}
      <div className="mb-5">
        <AdherenciaPaciente patientId={patient.id} />
      </div>

      {/* ── Evolución de peso ── */}
      {logs.filter(l => l.peso).length >= 2 && (
        <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm mb-5">
          <h3 className="text-sm font-bold text-[#0C1F2C] mb-4">Evolución de peso</h3>
          <div className="flex items-end gap-1.5 h-16">
            {logs.filter(l => l.peso).slice(0, 14).reverse().map((l, i, arr) => {
              const min = Math.min(...arr.map(x => x.peso!))
              const max = Math.max(...arr.map(x => x.peso!))
              const range = max - min || 1
              const pct = ((l.peso! - min) / range) * 70 + 15
              const isLast = i === arr.length - 1
              return (
                <div key={l.fecha} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-[#8BA5BE]">{l.peso}</span>
                  <div className="w-full bg-[#F0F6FA] rounded-md relative" style={{ height: 44 }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.5, delay: i * 0.03 }}
                      className={cn('absolute bottom-0 left-0 right-0 rounded-md', isLast ? 'bg-[#29ABE2]' : 'bg-[#29ABE2]/40')}
                    />
                  </div>
                  <span className="text-[8px] text-[#C8D8E4]">
                    {new Date(l.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).replace(' ', '/')}
                  </span>
                </div>
              )
            })}
          </div>
          {(() => {
            const withPeso = logs.filter(l => l.peso)
            if (withPeso.length < 2) return null
            const diff = (withPeso[0].peso! - withPeso[withPeso.length - 1].peso!).toFixed(1)
            const neg = Number(diff) < 0
            return (
              <p className={cn('text-xs font-bold mt-3', neg ? 'text-red-500' : 'text-green-600')}>
                {neg ? '▲' : '▼'} {Math.abs(Number(diff))} kg en {withPeso.length} registros
              </p>
            )
          })()}
        </div>
      )}

      {/* ── Planes del paciente ── */}
      <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#0C1F2C]">Planes generados</h3>
          <span className="text-[10px] text-[#8BA5BE] font-medium bg-[#F0F6FA] px-2 py-1 rounded-full">
            {allPlans.length} plan{allPlans.length !== 1 ? 'es' : ''}
          </span>
        </div>

        {allPlans.length === 0 ? (
          <div className="text-center py-6">
            <FileText size={24} className="text-[#D6E3ED] mx-auto mb-2" />
            <p className="text-xs text-[#8BA5BE]">Sin planes generados aún</p>
            <button
              onClick={() => {
                // Primer plan del paciente: no hay datos previos para hidratar,
                // pero el initialData del PlanGenerator pre-llena el nombre.
                setPlanResult(null)
                setView('plan')
              }}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#29ABE2] hover:underline mx-auto"
            >
              <Plus size={12} /> Generar primer plan
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {allPlans.map((plan, idx) => {
              const isLatest = idx === 0
              const dateLabel = new Date(plan.created_at).toLocaleDateString('es-CL', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
              const objLabel: Record<string, string> = {
                'perdida grasa': '🔥 Pérdida de grasa',
                'mantenimiento': '⚖️ Mantenimiento',
                'hipertrofia': '💪 Hipertrofia',
              }
              return (
                <motion.button
                  key={plan.id || plan.created_at}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => {
                    if (plan.plan_json?.result && plan.plan_json?.form) {
                      setPlanResult(plan.plan_json.result)
                      setPlanForm(plan.plan_json.form)
                      setEmailStatus('idle')
                      setView('plan')
                    }
                  }}
                  className="w-full text-left bg-[#F8FBFD] hover:bg-[#EAF4FB] border border-[#F0F6FA] hover:border-[#29ABE2]/30 rounded-xl px-4 py-3 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#EAF4FB] border border-[#29ABE2]/20 flex items-center justify-center flex-shrink-0">
                        <FileText size={13} className="text-[#29ABE2]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-[#0C1F2C]">
                            {objLabel[plan.objetivo] ?? plan.objetivo}
                          </p>
                          {isLatest && (
                            <span className="text-[9px] font-bold bg-[#29ABE2]/15 text-[#29ABE2] px-1.5 py-0.5 rounded-full">
                              Actual
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8BA5BE] mt-0.5">{dateLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Macro chips */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <span className="flex items-center gap-0.5 text-[10px] text-[#8BA5BE]">
                          <Flame size={9} className="text-orange-400" />{plan.kcal}
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-[#8BA5BE]">
                          <Beef size={9} className="text-green-500" />{plan.proteina}g
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-[#8BA5BE]">
                          <Wheat size={9} className="text-blue-400" />{plan.carbohidrato}g
                        </span>
                        <span className="flex items-center gap-0.5 text-[10px] text-[#8BA5BE]">
                          <Droplets size={9} className="text-amber-400" />{plan.grasa}g
                        </span>
                      </div>
                      <ChevronRight size={13} className="text-[#C8D8E4] group-hover:text-[#29ABE2] transition-colors" />
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Gráfico de adherencia 30d ── */}
      {!loading && logs.length >= 3 && (() => {
        // Build 30-day series usando TZ Chile para que coincida con registros guardados
        const today = new Date()
        const series = Array.from({ length: 30 }, (_, i) => {
          const d = new Date(today.getTime() - (29 - i) * 86_400_000)
          const key = formatDateCL(d)
          const log = logs.find(l => l.fecha === key)
          const adh = log && log.comidas_total > 0
            ? Math.round((log.comidas_completadas / log.comidas_total) * 100)
            : null
          return { date: key, adh, label: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', timeZone: 'America/Santiago' }) }
        })
        return (
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0C1F2C]">Adherencia — últimos 30 días</h3>
              {adherenciaMedia !== null && (
                <span className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  adherenciaMedia >= 80 ? 'bg-green-100 text-green-700' :
                  adherenciaMedia >= 50 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  Media: {adherenciaMedia}%
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <BarChart data={series} barSize={6} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 8, fill: '#8BA5BE' }}
                  interval={6}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const v = payload[0].payload as { date: string; adh: number | null; label: string }
                    return (
                      <div className="bg-[#0C1F2C] text-white text-[10px] px-2 py-1 rounded-lg shadow-lg">
                        <p className="font-semibold">{v.label}</p>
                        <p>{v.adh !== null ? `${v.adh}% adherencia` : 'Sin registro'}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="adh" radius={[3, 3, 0, 0]}>
                  {series.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.adh === null ? '#F0F6FA' :
                            entry.adh >= 80 ? '#22c55e' :
                            entry.adh >= 50 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2">
              {[
                { color: '#22c55e', label: '≥80% Buena' },
                { color: '#f59e0b', label: '50–79% Regular' },
                { color: '#ef4444', label: '<50% Baja' },
                { color: '#F0F6FA', label: 'Sin registro', border: '#E2ECF4' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: l.color, border: l.border ? `1px solid ${l.border}` : 'none' }}
                  />
                  <span className="text-[9px] text-[#8BA5BE]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── Registros últimos 30 días ── */}
      <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#0C1F2C]">Registros — últimos 30 días</h3>
          {loading && <RefreshCw size={14} className="text-[#8BA5BE] animate-spin" />}
        </div>

        {!loading && logs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-[#8BA5BE]">Sin registros diarios en los últimos 30 días</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="space-y-2">
            {logs.map((log, i) => {
              if (!log) return null
              const adh = log.comidas_total > 0 ? Math.round((log.comidas_completadas / log.comidas_total) * 100) : 0
              const isGood = adh >= 80
              const hasWellbeing = log.hambre || log.energia || log.digestivo || log.animo
              return (
                <motion.div
                  key={log.fecha}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl bg-[#F8FBFD] border border-[#F0F6FA] overflow-hidden"
                >
                  {/* Main row */}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {isGood
                        ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                        : <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                      }
                      <span className="text-xs font-semibold text-[#0C1F2C]">
                        {new Date(log.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
                          weekday: 'short', day: 'numeric', month: 'short'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#6B7C93]">{log.kcal_consumida || 0} kcal</span>
                      <span className={cn(
                        'font-bold px-2 py-0.5 rounded-full',
                        isGood ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {adh}%
                      </span>
                      {log.peso && <span className="text-[#8BA5BE]">{log.peso} kg</span>}
                    </div>
                  </div>

                  {/* Wellbeing row */}
                  {hasWellbeing && (
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 px-4 pb-2 pt-1.5 border-t border-[#EDF2F7]">
                      {log.hambre && (
                        <span className="text-[10px] text-[#8BA5BE] flex items-center gap-1">
                          🍽️ <span className="font-semibold text-[#0C1F2C]">{log.hambre}/5</span>
                        </span>
                      )}
                      {log.energia && (
                        <span className="text-[10px] text-[#8BA5BE] flex items-center gap-1">
                          ⚡ <span className="font-semibold text-[#0C1F2C]">{log.energia}/5</span>
                        </span>
                      )}
                      {log.digestivo && (
                        <span className="text-[10px] flex items-center gap-1">
                          {DIGESTIVO_EMOJI[log.digestivo] || '🫁'}
                          <span className="text-[#6B7C93]">{log.digestivo.replace('_', ' ')}</span>
                        </span>
                      )}
                      {log.animo && (
                        <span className="text-[10px] flex items-center gap-1">
                          {ANIMO_EMOJI[log.animo] || '😐'}
                          <span className="text-[#6B7C93]">{log.animo}</span>
                        </span>
                      )}
                      {log.nota && (
                        <span className="text-[10px] text-[#8BA5BE] italic truncate max-w-[160px]" title={log.nota}>
                          &ldquo;{log.nota}&rdquo;
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal Vincular Paciente ──────────────────────────────────────────────────
function ModalVincular({
  professionalId,
  professionalName,
  onClose,
  onSuccess,
}: {
  professionalId: string
  professionalName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'email' | 'link'>('email')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'already' | 'done' | 'error'>('idle')
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null)
  const [copied, setCopied] = useState(false)
  const [inviteEmailStatus, setInviteEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  // Link con token firmado (24h) generado en el server. Se obtiene cuando se
  // monta el modal. Mientras llega la respuesta, mostramos un fallback con el
  // formato legacy ?pro=<base64> para no bloquear la UI.
  const encodedProLegacy = typeof window !== 'undefined' ? encodeURIComponent(btoa(professionalId)) : ''
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const legacyLink = `${origin}/register?pro=${encodedProLegacy}`
  const [signedLink, setSignedLink] = useState<string | null>(null)
  const [signedExpires, setSignedExpires] = useState<string | null>(null)

  // Pedir token firmado al server (24h). Si falla (secret no seteado, etc.),
  // dejamos signedLink en null y el componente cae al link legacy.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
        const res = await fetch('/api/invites/create', { method: 'POST', headers, credentials: 'include' })
        if (!res.ok) return
        const data = await res.json() as { link: string; expiresAt: string }
        if (!cancelled) {
          setSignedLink(data.link)
          setSignedExpires(data.expiresAt)
        }
      } catch { /* fallback a legacy */ }
    })()
    return () => { cancelled = true }
  }, [supabase])

  // Link que se usa en la UI y para enviar: el firmado si existe, sino legacy
  const inviteLink = signedLink ?? legacyLink
  const personalizedLink = email.trim()
    ? `${inviteLink}${inviteLink.includes('?') ? '&' : '?'}email=${encodeURIComponent(email.trim().toLowerCase())}`
    : inviteLink

  async function handleSearch() {
    if (!email.trim()) return
    setStatus('loading')
    setFoundProfile(null)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (!data) { setStatus('not_found'); return }
    if (data.professional_id === professionalId) { setStatus('already'); return }
    setFoundProfile(data)
    setStatus('found')
  }

  async function handleLink() {
    if (!foundProfile) return
    setStatus('loading')
    try {
      const res = await fetch('/api/patients/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: foundProfile.id, professionalId }),
      })
      if (!res.ok) { setStatus('error'); return }
    } catch {
      setStatus('error'); return
    }
    setStatus('done')
    setTimeout(() => { onSuccess(); onClose() }, 1200)
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendInviteEmail() {
    if (!email.trim()) return
    setInviteEmailStatus('sending')
    try {
      const res = await fetch('/api/email/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientEmail: email.trim().toLowerCase(),
          professionalName,
          inviteLink: personalizedLink,   // ← link con email pre-llenado
          appUrl: origin,
        }),
      })
      setInviteEmailStatus(res.ok ? 'sent' : 'error')
    } catch {
      setInviteEmailStatus('error')
    }
  }

  function shareWhatsApp() {
    // WhatsApp usa el link genérico (sin email) — el paciente escribe el suyo al registrarse
    const text = `Hola! Te invito a registrarte en Centro Metabolico Pro para hacer seguimiento de tu alimentacion conmigo. Usa este link: ${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2ECF4]">
          <div className="flex items-center gap-2.5">
            <UserPlus size={16} className="text-[#29ABE2]" />
            <h3 className="text-sm font-bold text-[#0C1F2C]">Agregar paciente</h3>
          </div>
          <button onClick={onClose} className="text-[#8BA5BE] hover:text-[#0C1F2C] transition">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E2ECF4]">
          {[
            { id: 'email' as const, label: '📧 Por email', icon: Mail },
            { id: 'link' as const, label: '🔗 Link de invitación', icon: Link2 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 py-3 text-xs font-semibold transition-all',
                tab === t.id
                  ? 'text-[#29ABE2] border-b-2 border-[#29ABE2]'
                  : 'text-[#8BA5BE] hover:text-[#0C1F2C]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* Tab: Por email */}
          {tab === 'email' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8BA5BE]">
                Ingresa el email del paciente ya registrado en la plataforma para vincularlo a tu panel.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setStatus('idle') }}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="paciente@email.com"
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E2ECF4] rounded-xl text-sm focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/10"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={status === 'loading' || !email.trim()}
                  className="px-4 py-2.5 bg-[#0C3547] text-white text-xs font-bold rounded-xl hover:opacity-90 transition disabled:opacity-40"
                >
                  {status === 'loading' ? '...' : 'Buscar'}
                </button>
              </div>

              {/* Results */}
              <AnimatePresence mode="wait">
                {status === 'not_found' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                      Paciente no registrado aun. Enviamosle una invitacion por email.
                    </div>
                    {inviteEmailStatus === 'idle' && (
                      <button
                        onClick={sendInviteEmail}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition"
                      >
                        <Send size={12} /> Enviar invitacion a {email.trim().toLowerCase()}
                      </button>
                    )}
                    {inviteEmailStatus === 'sending' && (
                      <div className="flex items-center justify-center gap-2 text-xs text-[#8BA5BE] py-2">
                        <RefreshCw size={12} className="animate-spin" /> Enviando...
                      </div>
                    )}
                    {inviteEmailStatus === 'sent' && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 font-bold text-center">
                        Email de invitacion enviado
                      </div>
                    )}
                    {inviteEmailStatus === 'error' && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium text-center">
                        No se pudo enviar el email. Comparte el link manualmente.
                      </div>
                    )}
                  </motion.div>
                )}
                {status === 'already' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                    ✅ Este paciente ya está vinculado a tu panel.
                  </motion.div>
                )}
                {status === 'found' && foundProfile && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-[#29ABE2]/20 border border-[#29ABE2]/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-[#29ABE2]">{foundProfile.nombre?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0C1F2C]">{foundProfile.nombre}</p>
                        <p className="text-xs text-[#8BA5BE]">{foundProfile.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLink}
                      className="w-full py-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-xs font-bold rounded-xl hover:opacity-90 transition"
                    >
                      ✅ Vincular a mi panel
                    </button>
                  </motion.div>
                )}
                {status === 'done' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 font-bold text-center">
                    ✅ Paciente vinculado correctamente
                  </motion.div>
                )}
                {status === 'error' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
                    ❌ Error al vincular. Intenta nuevamente.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tab: Link de invitación */}
          {tab === 'link' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8BA5BE]">
                Comparte este link con tus pacientes. Al registrarse a través de él, quedarán vinculados automáticamente a tu panel.
              </p>

              {/* Vigencia del link */}
              {signedExpires && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-700 flex items-center gap-2">
                  <Clock size={12} className="flex-shrink-0" />
                  <span>Este link expira en 24h. Genera uno nuevo abriendo este modal otra vez.</span>
                </div>
              )}

              {/* Link completo */}
              <div>
                <p className="text-[10px] font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">Link de registro</p>
                <div className="flex gap-2 items-center bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl px-3 py-2.5">
                  <p className="flex-1 text-xs text-[#6B7C93] truncate font-mono">{inviteLink}</p>
                  <button
                    onClick={copyLink}
                    className={cn(
                      'flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all',
                      copied ? 'bg-green-500 text-white' : 'bg-[#0C3547] text-white hover:opacity-90'
                    )}
                  >
                    <Copy size={11} />
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* WhatsApp share */}
              <button
                onClick={shareWhatsApp}
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartir por WhatsApp
              </button>

              {/* Instrucciones */}
              <div className="bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl p-3">
                <p className="text-xs font-bold text-[#0C3547] mb-1">Instrucciones para el paciente</p>
                <ol className="text-xs text-[#6B7C93] space-y-1 list-decimal list-inside">
                  <li>Abre el link de registro</li>
                  <li>Completa nombre, email y contrasena</li>
                  <li>Aparece en tu panel automaticamente</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Panel Profesional ───────────────────────────────────────────────────
export function PanelProfesional({
  professionalId,
  professionalName,
}: {
  professionalId: string
  professionalName?: string
}) {
  const supabase = createClient()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PatientRow | null>(null)
  const [filter, setFilter] = useState<'todos' | 'premium' | 'activos' | 'alerta'>('todos')
  const [showModal, setShowModal] = useState(false)
  const [digestStatus, setDigestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    loadPatients()
  }, [professionalId])

  async function loadPatients() {
    setLoading(true)
    setLoadError(null)

    // 1. Load patients
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('role', 'patient')
      .order('nombre', { ascending: true })

    if (profilesError) {
      console.error('[PanelProfesional] Error loading patients:', profilesError)
      setLoadError(`Error al cargar pacientes: ${profilesError.message} (code: ${profilesError.code})`)
      setLoading(false)
      return
    }
    if (!profiles) { setLoading(false); return }

    // 2. Batch-fetch plan counts for all patients in one query
    const patientIds = profiles.map(p => p.id)
    const { data: planRows } = await supabase
      .from('planes_nutricionales')
      .select('user_id')
      .in('user_id', patientIds)

    const planCountMap: Record<string, number> = {}
    planRows?.forEach(r => {
      planCountMap[r.user_id] = (planCountMap[r.user_id] || 0) + 1
    })

    // 3. Batch-fetch last log for all patients en una query (avoids N+1)
    // TZ Chile — coincide con fechas guardadas en registros_diarios
    const thirtyDaysAgoStr = getDateCLDaysAgo(30)
    const { data: allLogs } = await supabase
      .from('registros_diarios')
      .select('user_id,fecha,kcal_consumida,comidas_completadas,comidas_total,peso')
      .in('user_id', patientIds)
      .gte('fecha', thirtyDaysAgoStr)
      .order('fecha', { ascending: false })

    // Take the most recent log per patient
    const lastLogMap: Record<string, DailyLog> = {}
    allLogs?.forEach(log => {
      if (!lastLogMap[log.user_id]) lastLogMap[log.user_id] = log as unknown as DailyLog
    })

    // Compute 7-day adherence average per patient
    const iso7d = getDateCLDaysAgo(7)
    const adherencia7dMap: Record<string, number | null> = {}
    patientIds.forEach(id => {
      const recentLogs = allLogs?.filter(l => l.user_id === id && l.fecha >= iso7d) ?? []
      if (recentLogs.length === 0) { adherencia7dMap[id] = null; return }
      const avg = recentLogs.reduce((s, l) => {
        const typed = l as unknown as DailyLog
        return s + (typed.comidas_total > 0 ? (typed.comidas_completadas / typed.comidas_total) * 100 : 0)
      }, 0) / recentLogs.length
      adherencia7dMap[id] = Math.round(avg)
    })

    const enriched = profiles.map(p => ({
      ...p,
      lastLog: lastLogMap[p.id] || undefined,
      planCount: planCountMap[p.id] || 0,
      adherencia7d: adherencia7dMap[p.id] ?? null,
    } as PatientRow))

    setPatients(enriched)
    setLoading(false)
  }

  async function sendWeeklyDigest() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return
    setDigestStatus('sending')
    try {
      const res = await fetch('/api/email/weekly-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: professionalId,
          professionalEmail: user.email,
          professionalName: professionalName ?? 'Profesional',
        }),
      })
      setDigestStatus(res.ok ? 'sent' : 'error')
      if (res.ok) setTimeout(() => setDigestStatus('idle'), 4000)
    } catch {
      setDigestStatus('error')
    }
  }

  const filtered = useMemo(() => {
    let list = patients
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.nombre?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q)
      )
    }
    if (filter === 'premium') list = list.filter(p => p.plan !== 'gratuito')
    if (filter === 'activos') list = list.filter(p => {
      if (!p.lastLog?.fecha) return false
      const dias = Math.floor((Date.now() - new Date(p.lastLog.fecha + 'T12:00:00').getTime()) / 86400000)
      return dias <= 7
    })
    if (filter === 'alerta') list = list.filter(p =>
      p.adherencia7d !== null && p.adherencia7d !== undefined && p.adherencia7d < 50
    )
    return list
  }, [patients, search, filter])

  if (selected) {
    return (
      <PatientDetail
        patient={selected}
        onBack={() => setSelected(null)}
        professionalId={professionalId}
        professionalName={professionalName ?? 'Tu profesional'}
      />
    )
  }

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalVincular
            professionalId={professionalId}
            professionalName={professionalName ?? 'Tu profesional'}
            onClose={() => setShowModal(false)}
            onSuccess={loadPatients}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold text-[#0C1F2C]">Mis Pacientes</h2>
          <p className="text-xs text-[#8BA5BE] mt-0.5">
            {loading ? 'Cargando...' : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} registrado${patients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={loadPatients}
            className="flex items-center gap-2 text-xs text-[#8BA5BE] border border-[#E2ECF4] px-3 py-2 rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
          >
            <RefreshCw size={12} /> <span className="hidden sm:inline">Actualizar</span>
          </button>
          {patients.length > 0 && (
            <button
              onClick={sendWeeklyDigest}
              disabled={digestStatus === 'sending'}
              className={cn(
                'flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl transition',
                digestStatus === 'sent'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : digestStatus === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-600'
                    : 'border border-[#E2ECF4] text-[#8BA5BE] hover:border-[#29ABE2] hover:text-[#29ABE2]'
              )}
              title="Enviar resumen semanal de pacientes a tu email"
            >
              {digestStatus === 'sending'
                ? <><RefreshCw size={12} className="animate-spin" /><span className="hidden sm:inline">Enviando...</span></>
                : digestStatus === 'sent'
                  ? <><CheckCircle size={12} /><span className="hidden sm:inline">Enviado</span></>
                  : digestStatus === 'error'
                    ? <><AlertCircle size={12} /><span className="hidden sm:inline">Error</span></>
                    : <><BarChart2 size={12} /><span className="hidden sm:inline">Resumen semanal</span></>}
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition"
          >
            <UserPlus size={13} /> Agregar
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/10 transition"
          />
        </div>
        <div className="flex gap-1 bg-white border border-[#E2ECF4] rounded-xl p-1">
          {([
            { id: 'todos', label: 'Todos' },
            { id: 'premium', label: '⭐ Premium' },
            { id: 'activos', label: '🟢 Activos' },
            { id: 'alerta', label: '🔴 Alerta' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === f.id
                  ? 'bg-[#0C3547] text-white'
                  : 'text-[#8BA5BE] hover:text-[#0C1F2C]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      {!loading && patients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Total pacientes',
              value: patients.length,
              icon: User,
              color: 'text-[#29ABE2]',
              bg: 'bg-[#EAF4FB]',
            },
            {
              label: 'Con plan activo',
              value: patients.filter(p => p.plan !== 'gratuito').length,
              icon: Target,
              color: 'text-amber-500',
              bg: 'bg-amber-50',
            },
            {
              label: 'Activos (7d)',
              value: patients.filter(p => {
                if (!p.lastLog?.fecha) return false
                return Math.floor((Date.now() - new Date(p.lastLog.fecha + 'T12:00:00').getTime()) / 86400000) <= 7
              }).length,
              icon: TrendingUp,
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              label: 'Sin actividad',
              value: patients.filter(p => !p.lastLog).length,
              icon: Clock,
              color: 'text-[#8BA5BE]',
              bg: 'bg-[#F0F6FA]',
            },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E2ECF4] p-4 flex items-center gap-3 shadow-sm">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                  <Icon size={16} className={s.color} />
                </div>
                <div>
                  <p className="text-xl font-black text-[#0C1F2C]">{s.value}</p>
                  <p className="text-[10px] text-[#8BA5BE] font-medium leading-tight">{s.label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Error banner — visible cuando Supabase devuelve error (RLS, sesión expirada, etc.) */}
      {loadError && (
        <div className="mb-4 flex gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700 mb-0.5">Error al cargar pacientes</p>
            <p className="text-xs text-red-600">{loadError}</p>
            <p className="text-xs text-red-500 mt-1">
              Posibles causas: sesión expirada, políticas RLS no aplicadas, o cuenta sin rol profesional.
              Intenta cerrar sesión y volver a entrar. Si persiste, contacta soporte.
            </p>
            <button
              onClick={loadPatients}
              className="mt-2 text-xs font-bold text-red-700 underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-[#E2ECF4] p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F0F6FA]" />
                <div className="flex-1">
                  <div className="h-3 bg-[#F0F6FA] rounded-full w-3/4 mb-1.5" />
                  <div className="h-2 bg-[#F0F6FA] rounded-full w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(j => <div key={j} className="h-12 bg-[#F0F6FA] rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#EAF4FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-[#29ABE2]" />
          </div>
          {patients.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-[#0C1F2C] mb-2">Sin pacientes aún</h3>
              <p className="text-sm text-[#8BA5BE] max-w-xs mx-auto mb-5">
                Usa el botón <strong className="text-[#0C1F2C]">Agregar</strong> para generar un link de invitación y compartirlo con tus pacientes.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition"
              >
                <UserPlus size={14} /> Agregar primer paciente
              </button>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-[#0C1F2C] mb-2">Sin resultados</h3>
              <p className="text-sm text-[#8BA5BE]">Intenta con otro término de búsqueda.</p>
            </>
          )}
        </div>
      )}

      {/* Patient grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => setSelected(patient)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

