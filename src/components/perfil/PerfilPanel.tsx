'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import { isOnTrial, trialDaysLeft, hasAccess } from '@/types'
import {
  User, Mail, Shield, Calendar, Star, Clock, LogOut,
  CheckCircle, AlertCircle, ChevronRight, Edit2, Save, X, Phone,
} from 'lucide-react'

interface Props {
  profile: Profile
  userId: string
}

// ─── Plan display config ──────────────────────────────────────────────────────
const PLAN_CONFIG = {
  professional: { label: 'Plan Profesional',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500'   },
  patient:      { label: 'Plan Paciente',      color: 'text-green-600',  bg: 'bg-green-50 border-green-200', dot: 'bg-green-500'  },
  individual:   { label: 'Plan Individual',    color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500' },
  gratuito:     { label: 'Plan Gratuito',      color: 'text-[#6B7C93]',  bg: 'bg-[#F0F6FA] border-[#D6E3ED]', dot: 'bg-[#B0C4D4]' },
}

const ROLE_LABELS: Record<string, string> = {
  professional: '👨‍⚕️ Profesional de salud',
  patient:      '🧑 Paciente vinculado',
  individual:   '🏃 Usuario individual',
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = 'text-[#0C3547]' }: {
  icon: React.ElementType; label: string; value: string; color?: string
}) {
  return (
    <div className="bg-[#F8FBFD] border border-[#E2ECF4] rounded-2xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 bg-white border border-[#E2ECF4] rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-[#29ABE2]" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#8BA5BE] font-semibold uppercase tracking-wide">{label}</p>
        <p className={cn('text-sm font-bold truncate', color)}>{value}</p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PerfilPanel({ profile, userId }: Props) {
  const supabase = createClient()

  const onTrial   = isOnTrial(profile)
  const daysLeft  = trialDaysLeft(profile)
  const active    = hasAccess(profile)
  const planCfg   = PLAN_CONFIG[profile.plan] ?? PLAN_CONFIG.gratuito

  // Edit name state
  const [editingName, setEditingName] = useState(false)
  const [nombre, setNombre] = useState(profile.nombre || '')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  // Edit WhatsApp state
  const [editingWa, setEditingWa] = useState(false)
  const [whatsapp, setWhatsapp] = useState((profile as Record<string, unknown>).whatsapp as string || '')
  const [savingWa, setSavingWa] = useState(false)
  const [waError, setWaError] = useState('')
  const [waSaved, setWaSaved] = useState(false)

  async function handleSaveName() {
    if (!nombre.trim()) { setNameError('El nombre no puede estar vacío'); return }
    setSavingName(true)
    setNameError('')
    const { error } = await supabase.from('profiles').update({ nombre: nombre.trim() }).eq('id', userId)
    setSavingName(false)
    if (error) { setNameError('Error al guardar. Intenta de nuevo.'); return }
    setEditingName(false)
    // Reload to reflect change in sidebar
    window.location.reload()
  }

  async function handleSaveWhatsapp() {
    // Accept empty (to clear) or phone starting with digits
    const clean = whatsapp.trim().replace(/\D/g, '')
    setSavingWa(true)
    setWaError('')
    const { error } = await supabase.from('profiles').update({ whatsapp: clean || null }).eq('id', userId)
    setSavingWa(false)
    if (error) { setWaError('Error al guardar. Intenta de nuevo.'); return }
    setWhatsapp(clean)
    setEditingWa(false)
    setWaSaved(true)
    setTimeout(() => setWaSaved(false), 2500)
  }

  function handleSignOut() {
    supabase.auth.signOut().then(() => { window.location.href = '/login' })
  }

  // Prices by role
  const upgradePrice = profile.role === 'professional' ? '$14.990'
    : profile.professional_id ? '$7.000'
    : '$12.990'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto px-4 py-6 md:px-6 md:py-8 space-y-5"
    >
      {/* ── Header / Avatar ── */}
      <div className="bg-gradient-to-r from-[#081F2D] via-[#0C3547] to-[#0e4f6a] rounded-2xl p-6 text-white flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] flex items-center justify-center text-3xl font-black shadow-lg flex-shrink-0">
          {profile.nombre?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#9EC8E0] font-semibold">{ROLE_LABELS[profile.role] ?? profile.role}</p>
          <h2 className="text-xl font-extrabold leading-tight truncate">{profile.nombre || 'Usuario'}</h2>
          <p className="text-xs text-[#6B9BB8] truncate mt-0.5">{profile.email}</p>
        </div>
      </div>

      {/* ── Plan status ── */}
      <div className={cn('border rounded-2xl p-5 space-y-3', planCfg.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', planCfg.dot)} />
            <span className={cn('text-sm font-black', planCfg.color)}>{planCfg.label}</span>
          </div>
          {active ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <CheckCircle size={11} /> Activo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-[#8BA5BE] bg-[#F0F6FA] px-2.5 py-1 rounded-full">
              <AlertCircle size={11} /> Sin plan
            </span>
          )}
        </div>

        {/* Trial banner */}
        {profile.plan === 'gratuito' && onTrial && (
          <div className="bg-[#29ABE2]/10 border border-[#29ABE2]/30 rounded-xl px-4 py-3 flex items-center gap-2.5">
            <Clock size={14} className="text-[#29ABE2] flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#0C3547]">
                {daysLeft === 0 ? 'Tu período de prueba termina hoy' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''} de prueba restantes`}
              </p>
              <p className="text-[10px] text-[#6B7C93]">Activa tu plan para no perder el acceso</p>
            </div>
          </div>
        )}

        {/* Premium expiry */}
        {profile.plan !== 'gratuito' && profile.premium_until && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6B7C93]">Acceso activo hasta</span>
            <span className="font-bold text-[#0C3547]">{formatDate(profile.premium_until)}</span>
          </div>
        )}

        {/* Upgrade CTA */}
        {profile.plan === 'gratuito' && (
          <a
            href="/upgrade"
            className="flex items-center justify-between w-full bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white px-4 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition mt-1"
          >
            <div className="flex items-center gap-2">
              <Star size={14} className="text-amber-400" />
              Activar plan — {upgradePrice}/mes
            </div>
            <ChevronRight size={16} />
          </a>
        )}

        {/* Renew CTA for active plans */}
        {profile.plan !== 'gratuito' && (
          <a
            href="/upgrade"
            className="flex items-center justify-between w-full bg-white/60 text-[#0C3547] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-white/80 transition border border-current/10"
          >
            <span>Renovar / cambiar plan</span>
            <ChevronRight size={14} />
          </a>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Mail}     label="Email"       value={profile.email || '—'} />
        <StatCard icon={Shield}   label="Rol"         value={profile.role === 'professional' ? 'Profesional' : profile.role === 'patient' ? 'Paciente' : 'Individual'} />
        <StatCard icon={Calendar} label="Miembro desde" value={formatDate(profile.created_at)} />
        <StatCard icon={User}     label="Plan actual"   value={planCfg.label} color={planCfg.color} />
      </div>

      {/* ── Editar nombre ── */}
      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-[#0C3547]">Nombre de perfil</p>
          {!editingName ? (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#29ABE2] hover:underline"
            >
              <Edit2 size={11} /> Editar
            </button>
          ) : (
            <button
              onClick={() => { setEditingName(false); setNombre(profile.nombre || ''); setNameError('') }}
              className="text-[#8BA5BE] hover:text-red-400 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!editingName ? (
          <p className="text-sm text-[#1E2D3D]">{profile.nombre || 'Sin nombre configurado'}</p>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              placeholder="Tu nombre completo"
              className="w-full px-3 py-2.5 border border-[#D6E3ED] rounded-xl text-sm text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20"
              autoFocus
            />
            {nameError && <p className="text-xs text-red-500">{nameError}</p>}
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#29ABE2] text-white px-4 py-2 rounded-xl hover:bg-[#1a8fc2] transition disabled:opacity-50"
            >
              <Save size={12} />
              {savingName ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {/* ── WhatsApp ── */}
      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-[#25D366]" />
            <p className="text-sm font-bold text-[#0C3547]">WhatsApp</p>
          </div>
          {!editingWa ? (
            <button
              onClick={() => setEditingWa(true)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#29ABE2] hover:underline"
            >
              <Edit2 size={11} /> {whatsapp ? 'Editar' : 'Agregar'}
            </button>
          ) : (
            <button
              onClick={() => { setEditingWa(false); setWhatsapp((profile as Record<string, unknown>).whatsapp as string || ''); setWaError('') }}
              className="text-[#8BA5BE] hover:text-red-400 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!editingWa ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#1E2D3D]">
              {whatsapp ? `+${whatsapp}` : 'Sin número configurado'}
            </p>
            {waSaved && <span className="text-xs text-green-600 font-bold">✓ Guardado</span>}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 border border-[#D6E3ED] rounded-xl px-3 py-2.5 focus-within:border-[#29ABE2] focus-within:ring-2 focus-within:ring-[#29ABE2]/20 transition">
              <span className="text-sm text-[#8BA5BE] flex-shrink-0">+</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveWhatsapp()}
                placeholder="56912345678"
                className="flex-1 text-sm text-[#1E2D3D] bg-transparent outline-none placeholder:text-[#C8D8E4]"
                autoFocus
              />
            </div>
            <p className="text-[10px] text-[#8BA5BE]">Ingresa con código de país. Ej: 56912345678 (Chile)</p>
            {waError && <p className="text-xs text-red-500">{waError}</p>}
            <button
              onClick={handleSaveWhatsapp}
              disabled={savingWa}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#25D366] text-white px-4 py-2 rounded-xl hover:bg-[#1aad55] transition disabled:opacity-50"
            >
              <Save size={12} />
              {savingWa ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}

        <p className="text-[10px] text-[#B0C4D4] mt-2">
          {profile.role === 'patient'
            ? 'Tu profesional podrá contactarte por WhatsApp para seguimiento.'
            : 'Usado para compartir links de invitación con pacientes.'}
        </p>
      </div>

      {/* ── Sign out ── */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2.5 text-sm font-bold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 py-3.5 rounded-2xl transition"
      >
        <LogOut size={15} />
        Cerrar sesión
      </button>

      <p className="text-center text-[10px] text-[#B0C4D4] pb-4">
        Centro Metabólico Pro · {new Date().getFullYear()}
      </p>
    </motion.div>
  )
}
