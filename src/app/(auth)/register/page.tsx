'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient, getUserSafe } from '@/lib/supabase'
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

/** Decodifica payload del token firmado SIN verificar (sólo display). */
function readInvitePayloadClient(token: string): { pid: string; exp: number } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  try {
    let padded = parts[0].replace(/-/g, '+').replace(/_/g, '/')
    while (padded.length % 4) padded += '='
    const payload = JSON.parse(atob(padded))
    if (typeof payload.pid !== 'string' || typeof payload.exp !== 'number') return null
    return { pid: payload.pid, exp: payload.exp }
  } catch { return null }
}

/**
 * Redime token firmado vía /api/invites/redeem. Server hace todo:
 * verifica firma + exp, vincula paciente, otorga trial, notifica al profesional.
 * Devuelve true si quedó vinculado, false si falló.
 */
async function redeemInviteToken(token: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const { createClient } = await import('@/lib/supabase')
    const { data: { session } } = await createClient().auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    const res = await fetch('/api/invites/redeem', {
      method:      'POST',
      headers,
      credentials: 'include',
      body:        JSON.stringify({ token }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, message: data?.message ?? 'No se pudo procesar la invitación' }
    return { ok: true }
  } catch {
    return { ok: false, message: 'Error de conexión al procesar la invitación' }
  }
}

/**
 * Aviso legacy al profesional para el flujo ?pro=<base64> (sin token firmado).
 * Para tokens firmados (?invite=) usamos /api/invites/redeem que ya notifica.
 */
async function notifyProfessionalLinked(payload: {
  patientId: string
  patientName: string
  patientEmail: string
  professionalId: string
}): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase')
    const { data: { session } } = await createClient().auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    await fetch('/api/notify/patient-registered', {
      method:      'POST',
      headers,
      credentials: 'include',
      body:        JSON.stringify(payload),
    })
  } catch { /* non-fatal */ }
}

// ─── RegisterForm (needs Suspense — uses useSearchParams) ─────────────────────
function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Soporta dos formatos de link:
  //  - NUEVO: ?invite=<token-firmado> → verificado server-side en /api/invites/redeem
  //  - LEGACY: ?pro=<base64> → decodificación directa (compat hacia atrás)
  const inviteToken   = searchParams.get('invite')
  const invitePayload = inviteToken ? readInvitePayloadClient(inviteToken) : null
  const proParam      = searchParams.get('pro')
  const professionalId = invitePayload?.pid ?? decodeProParam(proParam)
  const isLinked      = !!professionalId
  const isProfessionalRegister = searchParams.get('type') === 'pro' && !isLinked
  const noProfile     = searchParams.get('reason') === 'no_profile'
  // Email pre-llenado desde el link de invitación personalizado
  const emailParam    = searchParams.get('email') ?? ''

  const [nombre,  setNombre]  = useState('')
  const [email,   setEmail]   = useState(emailParam)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState(noProfile ? 'Tu sesión anterior no tiene cuenta registrada. Crea una nueva cuenta para continuar.' : '')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [autoLinked, setAutoLinked] = useState(false)

  // Already logged-in + invite link → auto-link and redirect
  useEffect(() => {
    if (!professionalId) return
    getUserSafe(supabase).then(async (user) => {
      if (!user) return

      // Si tenemos token firmado → server hace TODO (verify + link + notify atomic)
      if (inviteToken) {
        const result = await redeemInviteToken(inviteToken)
        if (!result.ok) {
          setError(result.message ?? 'No se pudo procesar la invitación')
          return
        }
        setAutoLinked(true)
        setTimeout(() => router.push('/paciente'), 2000)
        return
      }

      // Camino legacy ?pro=<base64> (sin verificación)
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, email, premium_until, trial_ends_at')
        .eq('id', user.id)
        .maybeSingle()
      const hasActivePremium = profile?.premium_until && new Date(profile.premium_until) > new Date()
      const hasActiveTrial   = profile?.trial_ends_at  && new Date(profile.trial_ends_at)  > new Date()
      const trialEndsAt = (!hasActivePremium && !hasActiveTrial)
        ? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()
        : undefined
      await supabase
        .from('profiles')
        .update({
          professional_id: professionalId,
          role: 'patient',
          ...(trialEndsAt && { trial_ends_at: trialEndsAt }),
        })
        .eq('id', user.id)

      notifyProfessionalLinked({
        patientId:      user.id,
        patientName:    profile?.nombre ?? user.email ?? 'Paciente',
        patientEmail:   profile?.email ?? user.email ?? '',
        professionalId: professionalId,
      }).catch(() => { /* non-fatal */ })

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

    // Handle "email already registered"
    if (authError) {
      if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already been registered')) {
        setError('Este email ya tiene una cuenta. Intenta iniciar sesión.')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) { setError('Error al crear la cuenta. Intenta nuevamente.'); setLoading(false); return }

    // If session is null, Supabase requires email confirmation.
    // Persist the invite so login page can link the user after they confirm.
    if (!authData.session) {
      if (isLinked && professionalId) {
        try {
          // Use localStorage so the invite survives across tabs (email client opens new tab)
          localStorage.setItem('pendingProfessionalId', professionalId)
          localStorage.setItem('pendingRole', 'patient')
          localStorage.setItem('pendingNombre', nombre.trim())
          // Token firmado para que /login pueda redimir vía /api/invites/redeem
          // (mejor seguridad — el token tiene exp 24h y firma verificable)
          if (inviteToken) {
            localStorage.setItem('pendingInviteToken', inviteToken)
          }
        } catch { /* storage unavailable — non-fatal */ }
      }
      setDone(true)
      // Don't redirect — user needs to confirm email first
      return
    }

    // 2. Create profile
    // - Patients from a professional invite link → 21-day trial
    // - Regular individual users                 → 7-day trial
    // - Professional accounts                    → no trial (they manage plans for others)
    const trialDaysCount = isLinked ? 21 : isProfessionalRegister ? 0 : 7
    const trialEndsAt = trialDaysCount > 0
      ? new Date(Date.now() + trialDaysCount * 24 * 60 * 60 * 1000).toISOString()
      : null

    const profilePayload: Record<string, unknown> = {
      id:     userId,
      nombre: nombre.trim(),
      email:  email.trim().toLowerCase(),
      role:   isProfessionalRegister ? 'professional' : isLinked ? 'patient' : 'individual',
      plan:   'gratuito',
      ...(isLinked && { professional_id: professionalId }),
      ...(trialEndsAt && { trial_ends_at: trialEndsAt }),
    }

    const { error: profileError } = await supabase.from('profiles').insert(profilePayload)
    if (profileError) {
      // 23505 = duplicate key → profile already exists, safe to continue
      if (!profileError.code?.includes('23505') && !profileError.message.includes('duplicate')) {
        setError('Error al guardar el perfil: ' + profileError.message)
        setLoading(false)
        return
      }
    }

    // 3a. Vinculación + notificación al profesional
    //     - Con token firmado → /api/invites/redeem (verifica firma + exp + notifica)
    //     - Sin token (legacy ?pro=) → notifyProfessionalLinked directo
    //
    // AHORA AWAIT explícito: si la vinculación falla, el paciente NO debe quedar
    // huérfano silenciosamente. El profile.insert ya puso professional_id como
    // backup, pero validamos que el endpoint redeem también lo confirmara.
    if (inviteToken) {
      const redeemResult = await redeemInviteToken(inviteToken)
      if (!redeemResult.ok) {
        // El token falló (expirado, secret cambió, etc.) pero el profile YA está
        // creado con professional_id desde el insert directo. Llamamos al notify
        // como fallback — éste valida defensivamente que el vínculo quedó en DB
        // antes de mandar email.
        if (isLinked && professionalId) {
          await notifyProfessionalLinked({
            patientId:      userId,
            patientName:    nombre.trim(),
            patientEmail:   email.trim().toLowerCase(),
            professionalId: professionalId,
          }).catch(() => { /* non-fatal */ })
        }
      }
    } else if (isLinked && professionalId) {
      await notifyProfessionalLinked({
        patientId:      userId,
        patientName:    nombre.trim(),
        patientEmail:   email.trim().toLowerCase(),
        professionalId: professionalId,
      }).catch(() => { /* non-fatal */ })
    }

    // 3. Send welcome email (non-fatal)
    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        email:  email.trim().toLowerCase(),
        trialDays: trialDaysCount,
      }),
    }).catch(() => { /* ignore — welcome email is non-fatal */ })

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
          {isLinked
            ? 'Vinculada a tu profesional. Redirigiendo...'
            : 'Revisa tu email para confirmar tu cuenta y luego inicia sesión.'}
        </p>
        <div className="mt-6">
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition"
          >
            Ir al inicio de sesión →
          </a>
        </div>
      </motion.div>
    )
  }

  // ── Form ──
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Patient invite badge — comunica explícitamente el trial 21d
          que se otorga al vincularse con un código profesional (vs 7d
          del registro libre). Antes el copy "7 días gratis" del trust
          strip generaba expectativa rota cuando recibían 21d. */}
      {isLinked && (
        <div className="mb-5 flex items-start gap-2.5 bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl px-3.5 py-3">
          <ShieldCheck size={15} className="text-[#29ABE2] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#0C3547] space-y-1">
            <p>
              Registrándote con un <span className="font-bold text-[#29ABE2]">código profesional</span> — quedarás vinculado automáticamente.
            </p>
            <p className="text-[#4a6b80]">
              <span className="font-bold">21 días de prueba premium</span> incluidos por cortesía de tu nutricionista.
            </p>
          </div>
        </div>
      )}

      {/* Professional register badge */}
      {isProfessionalRegister && (
        <div className="mb-5 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-800">
            Registro como <span className="font-bold">Profesional</span> — tendrás acceso al panel de gestión de pacientes.
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
          {loading ? 'Creando cuenta...' : <><span>Crear cuenta gratis</span><ArrowRight size={15} /></>}
        </button>

        {/* Trust strip */}
        {!isLinked && !isProfessionalRegister && (
          <div className="flex items-center justify-center gap-4 pt-1">
            <span className="flex items-center gap-1 text-[11px] text-[#8BA5BE]">
              <span className="text-green-500">✓</span> 7 días gratis
            </span>
            <span className="text-[#D6E3ED]">·</span>
            <span className="flex items-center gap-1 text-[11px] text-[#8BA5BE]">
              <span className="text-green-500">✓</span> Sin tarjeta de crédito
            </span>
            <span className="text-[#D6E3ED]">·</span>
            <span className="flex items-center gap-1 text-[11px] text-[#8BA5BE]">
              <span className="text-green-500">✓</span> Cancela cuando quieras
            </span>
          </div>
        )}
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

          <h1 className="text-2xl font-black text-[#0C1F2C] mb-1">Empieza gratis hoy</h1>
          <p className="text-sm text-[#8BA5BE] mb-2">7 días de prueba · Sin tarjeta de crédito</p>
          {/* Trial pill */}
          <div className="inline-flex items-center gap-1.5 bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#29ABE2] animate-pulse" />
            <span className="text-[11px] font-bold text-[#0C3547]">Trial activo al registrarte</span>
          </div>

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
