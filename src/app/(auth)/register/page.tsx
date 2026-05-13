'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Activity, Mail, Lock, User, ArrowRight, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function decodeProParam(raw: string | null): string | null {
  if (!raw) return null
  try {
    return atob(decodeURIComponent(raw))
  } catch {
    return null
  }
}

// ─── RegisterForm (needs Suspense — uses useSearchParams) ─────────────────────
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const proParam      = searchParams.get('pro')
  const professionalId = decodeProParam(proParam)
  const isLinked      = !!professionalId

  const [nombre,  setNombre]  = useState('')
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [autoLinked, setAutoLinked] = useState(false)

  // Already logged-in + invite link → auto-link and redirect
  useEffect(() => {
    if (!professionalId) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      await supabase
        .from('profiles')
        .update({ professional_id: professionalId, role: 'patient' })
        .eq('id', user.id)
      setAutoLinked(true)
      setTimeout(() => router.push('/paciente'), 2000)
    })
  }, [professionalId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nombre.trim())        { setError('Ingresa tu nombre'); return }
    if (password.length < 6)   { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (password !== confirm)   { setError('Las contraseñas no coinciden'); return }

    setLoading(true)

    // 1. Auth signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError) { setError(authError.message); setLoading(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Error al crear la cuenta. Intenta nuevamente.'); setLoading(false); return }

    // 2. Create profile — role 'patient', plan 'gratuito'
    const profilePayload: Record<string, unknown> = {
      id:     userId,
      nombre: nombre.trim(),
      email:  email.trim().toLowerCase(),
      role:   'patient',
      plan:   'gratuito',
      ...(isLinked && { professional_id: professionalId }),
    }

    const { error: profileError } = await supabase.from('profiles').upsert(profilePayload)
    if (profileError) { setError('Error al guardar el perfil: ' + profileError.message); setLoading(false); return }

    setDone(true)
    setTimeout(() => router.push('/paciente'), 2500)
  }

  // ── Success: already-logged-in auto-link ──
  if (autoLinked) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
        <div className="w-14 h-14 bg-[#EAF4FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={26} className="text-[#29ABE2]" />
        </div>
        <h3 className="text-lg font-black text-[#0C1F2C] mb-1">¡Vinculado!</h3>
        <p className="text-sm text-[#8BA5BE]">Tu cuenta quedó vinculada al profesional. Redirigiendo...</p>
        <div className="mt-4 h-1 bg-[#E2ECF4] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'linear' }}
            className="h-full bg-[#29ABE2] rounded-full"
          />
        </div>
      </motion.div>
    )
  }

  // ── Success: new account created ──
  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={26} className="text-green-500" />
        </div>
        <h3 className="text-lg font-black text-[#0C1F2C] mb-1">¡Cuenta creada!</h3>
        <p className="text-sm text-[#8BA5BE]">
          {isLinked ? 'Vinculada a tu profesional. Redirigiendo...' : 'Tu cuenta está lista. Redirigiendo...'}
        </p>
        <div className="mt-4 h-1 bg-[#E2ECF4] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: '100%' }}
            transition={{ duration: 2.4, ease: 'linear' }}
            className="h-full bg-green-500 rounded-full"
          />
        </div>
      </motion.div>
    )
  }

  // ── Form ──
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Professional link badge */}
      {isLinked && (
        <div className="mb-5 flex items-center gap-2.5 bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl px-3.5 py-2.5">
          <ShieldCheck size={14} className="text-[#29ABE2] flex-shrink-0" />
          <p className="text-xs text-[#0C3547]">
            Registrándote con un <span className="font-bold text-[#29ABE2]">código profesional</span> — quedarás vinculado automáticamente.
          </p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
            Nombre completo
          </label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
            <input
              type="text" value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: María González"
              required
              className="w-full pl-10 pr-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] placeholder-[#C8D8E4] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full pl-10 pr-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] placeholder-[#C8D8E4] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
            />
          </div>
        </div>

        {/* Passwords — side by side on wider form */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mín. 6 caracteres"
                required
                className="w-full pl-10 pr-3 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] placeholder-[#C8D8E4] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
              Confirmar
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
              <input
                type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite"
                required
                className="w-full pl-10 pr-3 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] placeholder-[#C8D8E4] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5"
          >
            <AlertCircle size={13} className="flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
        >
          {loading ? 'Creando cuenta...' : <><span>Crear cuenta</span><ArrowRight size={15} /></>}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#F0F4F8] text-center">
        <p className="text-xs text-[#8BA5BE]">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-[#29ABE2] font-bold hover:underline">
            Iniciar sesión
          </a>
        </p>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  return (
    <div className="auth-page min-h-screen bg-[#060F1A] flex">
      {/* ── Left panel — branding (dark) ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C1F2C] via-[#0a1a28] to-[#060F1A]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#29ABE2]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#29ABE2]/8 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center shadow-lg shadow-[#29ABE2]/20">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-white tracking-wider">CENTRO METABÓLICO</p>
            <p className="text-[9px] text-[#29ABE2] font-bold tracking-widest">PRO CLINICAL ENGINE</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Tu salud,<br />
              <span className="text-[#29ABE2]">personalizada.</span>
            </h2>
            <p className="text-[#4A7A94] text-sm leading-relaxed max-w-xs">
              Planes nutricionales clínicos con motor Harris-Benedict + PAL, alertas digestivas, seguimiento de adherencia y panel profesional.
            </p>
          </motion.div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-3">
          {[
            { icon: '🎯', text: 'Plan alimentario personalizado con IA clínica' },
            { icon: '📊', text: 'Registro diario de calorías y adherencia' },
            { icon: '💬', text: 'Asistente nutricional disponible 24/7' },
            { icon: '👨‍⚕️', text: 'Seguimiento por tu profesional de salud' },
          ].map(f => (
            <div key={f.text} className="flex items-center gap-3">
              <span className="text-base">{f.icon}</span>
              <span className="text-xs text-[#6B8FA8]">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form (white, matches login) ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-[#0C1F2C]">Centro Metabólico <span className="text-[#29ABE2]">Pro</span></p>
              <p className="text-[10px] text-[#8BA5BE]">Motor clínico-comercial</p>
            </div>
          </div>

          <h1 className="text-2xl font-black text-[#0C1F2C] mb-1">Crear cuenta</h1>
          <p className="text-sm text-[#8BA5BE] mb-8">Comienza tu seguimiento metabólico hoy</p>

          <Suspense fallback={
            <div className="space-y-4 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-[#F0F6FA] rounded-xl" />)}
            </div>
          }>
            <RegisterForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
