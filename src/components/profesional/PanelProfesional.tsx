'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import type { Profile } from '@/types'
import {
  Search, Plus, ArrowLeft, User, Users,
  Target, TrendingUp, Clock,
  CheckCircle, AlertCircle, RefreshCw,
  Link2, Mail, Copy, X, UserPlus,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface PatientRow extends Profile {
  lastLog?: { fecha: string; actualKcal: number; completed: number; total: number; peso?: number }
  planCount?: number
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ patient, onClick }: { patient: PatientRow; onClick: () => void }) {
  const adherencia = patient.lastLog?.total
    ? Math.round((patient.lastLog.completed / patient.lastLog.total) * 100)
    : null

  const diasDesde = patient.lastLog?.fecha
    ? Math.floor((Date.now() - new Date(patient.lastLog.fecha + 'T12:00:00').getTime()) / 86400000)
    : null

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
        <span className={cn(
          'text-[9px] font-bold px-2 py-1 rounded-full',
          patient.plan === 'premium'
            ? 'bg-amber-50 text-amber-600 border border-amber-200'
            : 'bg-[#F0F6FA] text-[#8BA5BE] border border-[#E2ECF4]'
        )}>
          {patient.plan === 'premium' ? '⭐ Premium' : 'Gratuito'}
        </span>
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

      {/* Last activity */}
      {patient.lastLog && (
        <div className="mt-3 pt-3 border-t border-[#F0F6FA] flex items-center justify-between">
          <span className="text-[10px] text-[#8BA5BE]">
            {new Date(patient.lastLog.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
          </span>
          <span className="text-[10px] font-semibold text-[#6B7C93]">
            {patient.lastLog.actualKcal} kcal · {patient.lastLog.peso ? `${patient.lastLog.peso} kg` : 'sin peso'}
          </span>
        </div>
      )}
    </motion.button>
  )
}

// ─── Patient Detail ───────────────────────────────────────────────────────────
function PatientDetail({
  patient,
  onBack,
}: {
  patient: PatientRow
  onBack: () => void
}) {
  const supabase = createClient()
  const [logs, setLogs] = useState<PatientRow['lastLog'][]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'overview' | 'plan'>('overview')
  const [planResult, setPlanResult] = useState<NutritionResult | null>(null)
  const [planForm, setPlanForm] = useState<FormData | null>(null)

  useEffect(() => {
    async function loadLogs() {
      const desde = new Date()
      desde.setDate(desde.getDate() - 29)
      const { data } = await supabase
        .from('registros_diarios')
        .select('*')
        .eq('user_id', patient.id)
        .gte('fecha', desde.toISOString().split('T')[0])
        .order('fecha', { ascending: false })
      setLogs(data || [])
      setLoading(false)
    }
    loadLogs()
  }, [patient.id])

  const adherenciaMedia = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l!.total > 0 ? (l!.completed / l!.total) * 100 : 0), 0) / logs.length)
    : null

  const kcalMedia = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + (l!.actualKcal || 0), 0) / logs.length)
    : null

  const ultimoPeso = logs.find(l => l?.peso)?.peso

  function handlePlanResult(r: NutritionResult, f: FormData) {
    setPlanResult(r)
    setPlanForm(f)
  }

  if (view === 'plan') {
    return (
      <div className="px-8 py-6 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => { setView('overview'); setPlanResult(null); setPlanForm(null) }}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Volver a {patient.nombre}
        </button>

        {planResult && planForm ? (
          <PlanResult
            result={planResult}
            form={planForm}
            onReset={() => { setPlanResult(null); setPlanForm(null) }}
          />
        ) : (
          <>
            <div className="bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
              <User size={16} className="text-[#29ABE2] flex-shrink-0" />
              <p className="text-sm text-[#0C3547] font-medium">
                Generando plan para <span className="font-bold">{patient.nombre}</span>
              </p>
            </div>
            <PlanGenerator onResult={handlePlanResult} />
          </>
        )}
      </div>
    )
  }

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] transition-colors"
        >
          <ArrowLeft size={14} /> Todos los pacientes
        </button>
        <button
          onClick={() => setView('plan')}
          className="flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90 transition"
        >
          <Plus size={14} /> Generar plan
        </button>
      </div>

      {/* Patient header card */}
      <div className="bg-gradient-to-r from-[#060F1A] via-[#0C1F2C] to-[#0C3547] rounded-2xl p-6 text-white mb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#29ABE2]/20 border border-[#29ABE2]/30 flex items-center justify-center flex-shrink-0">
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
          <div className="text-right">
            <span className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full',
              patient.plan === 'premium' ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-[#9EC8E0]'
            )}>
              {patient.plan === 'premium' ? '⭐ Premium' : 'Gratuito'}
            </span>
            <p className="text-[10px] text-[#4A7A94] mt-1.5">
              Desde {new Date(patient.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 mt-5">
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

      {/* Registros últimos 30 días */}
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
              const adh = log.total > 0 ? Math.round((log.completed / log.total) * 100) : 0
              const isGood = adh >= 80
              return (
                <motion.div
                  key={log.fecha}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#F8FBFD] border border-[#F0F6FA]"
                >
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
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#6B7C93]">{log.actualKcal || 0} kcal</span>
                    <span className={cn(
                      'font-bold px-2 py-0.5 rounded-full',
                      isGood ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {adh}%
                    </span>
                    {log.peso && (
                      <span className="text-[#8BA5BE]">{log.peso} kg</span>
                    )}
                  </div>
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
  onClose,
  onSuccess,
}: {
  professionalId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'email' | 'link'>('email')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'already' | 'done' | 'error'>('idle')
  const [foundProfile, setFoundProfile] = useState<Profile | null>(null)
  const [copied, setCopied] = useState(false)

  // Código corto visual + link completo con ID decodificable
  const inviteCode = btoa(professionalId).slice(0, 12).toUpperCase()
  const encodedPro = typeof window !== 'undefined' ? encodeURIComponent(btoa(professionalId)) : ''
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?pro=${encodedPro}`

  async function handleSearch() {
    if (!email.trim()) return
    setStatus('loading')
    setFoundProfile(null)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (!data) { setStatus('not_found'); return }
    if (data.professional_id === professionalId) { setStatus('already'); return }
    setFoundProfile(data)
    setStatus('found')
  }

  async function handleLink() {
    if (!foundProfile) return
    setStatus('loading')
    const { error } = await supabase
      .from('profiles')
      .update({ professional_id: professionalId, role: 'patient' })
      .eq('id', foundProfile.id)

    if (error) { setStatus('error'); return }
    setStatus('done')
    setTimeout(() => { onSuccess(); onClose() }, 1200)
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
                    ⚠️ No se encontró ningún usuario con ese email. Comparte el link de invitación para que se registre.
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

              {/* Código corto */}
              <div className="bg-[#F8FBFD] border border-[#E2ECF4] rounded-xl p-4 text-center">
                <p className="text-[10px] text-[#8BA5BE] font-medium uppercase tracking-widest mb-1">Tu código profesional</p>
                <p className="text-2xl font-black text-[#0C3547] tracking-widest">{inviteCode}</p>
              </div>

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

              {/* Instrucciones */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">📋 Instrucciones para el paciente</p>
                <ol className="text-xs text-amber-600 space-y-1 list-decimal list-inside">
                  <li>Abre el link de registro</li>
                  <li>Completa nombre, email y contraseña</li>
                  <li>¡Listo! Aparece en tu panel automáticamente</li>
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
export function PanelProfesional({ professionalId }: { professionalId: string }) {
  const supabase = createClient()
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PatientRow | null>(null)
  const [filter, setFilter] = useState<'todos' | 'premium' | 'activos'>('todos')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [professionalId])

  async function loadPatients() {
    setLoading(true)

    // 1. Load patients
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('role', 'patient')
      .order('nombre', { ascending: true })

    if (!profiles) { setLoading(false); return }

    // 2. Enrich with last log + plan count for each patient
    const enriched = await Promise.all(profiles.map(async (p) => {
      const { data: lastLog } = await supabase
        .from('registros_diarios')
        .select('fecha,actualKcal,completed,total,peso')
        .eq('user_id', p.id)
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

      return {
        ...p,
        lastLog: lastLog || undefined,
        planCount: 0, // TODO: connect to plans table when available
      } as PatientRow
    }))

    setPatients(enriched)
    setLoading(false)
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
    if (filter === 'premium') list = list.filter(p => p.plan === 'premium')
    if (filter === 'activos') list = list.filter(p => {
      if (!p.lastLog?.fecha) return false
      const dias = Math.floor((Date.now() - new Date(p.lastLog.fecha + 'T12:00:00').getTime()) / 86400000)
      return dias <= 7
    })
    return list
  }, [patients, search, filter])

  if (selected) {
    return (
      <PatientDetail
        patient={selected}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="px-8 py-6">
      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalVincular
            professionalId={professionalId}
            onClose={() => setShowModal(false)}
            onSuccess={loadPatients}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-extrabold text-[#0C1F2C]">Mis Pacientes</h2>
          <p className="text-xs text-[#8BA5BE] mt-0.5">
            {loading ? 'Cargando...' : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} registrado${patients.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPatients}
            className="flex items-center gap-2 text-xs text-[#8BA5BE] border border-[#E2ECF4] px-3 py-2 rounded-xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition"
          >
            <RefreshCw size={12} /> Actualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition"
          >
            <UserPlus size={13} /> Agregar paciente
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 mb-5">
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
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
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
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Total pacientes',
              value: patients.length,
              icon: User,
              color: 'text-[#29ABE2]',
              bg: 'bg-[#EAF4FB]',
            },
            {
              label: 'Premium',
              value: patients.filter(p => p.plan === 'premium').length,
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

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-[#EAF4FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-[#29ABE2]" />
          </div>
          {patients.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-[#0C1F2C] mb-2">Sin pacientes aún</h3>
              <p className="text-sm text-[#8BA5BE] max-w-xs mx-auto">
                Los pacientes que se registren con tu código profesional aparecerán aquí.
              </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

