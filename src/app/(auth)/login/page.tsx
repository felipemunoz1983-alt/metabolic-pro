'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Forgot-password state ──────────────────────────────────────────────────
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 10-second timeout in case fetch hangs (e.g. bad env var encoding)
    const timer = setTimeout(() => {
      setError('Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.')
      setLoading(false)
    }, 10000)

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      clearTimeout(timer)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Check if profile exists before entering the app
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user!.id)
          .maybeSingle()

        if (!profile) {
          // Check for pending invite — prefer localStorage (cross-tab safe), fall back to sessionStorage
          let pendingPro: string | null = null
          let pendingRole: string = 'individual'
          let pendingNombre: string = ''
          try {
            pendingPro    = localStorage.getItem('pendingProfessionalId') ?? sessionStorage.getItem('pendingProfessionalId')
            pendingRole   = localStorage.getItem('pendingRole') ?? sessionStorage.getItem('pendingRole') ?? 'individual'
            pendingNombre = localStorage.getItem('pendingNombre') ?? sessionStorage.getItem('pendingNombre') ?? ''
            if (pendingPro) {
              localStorage.removeItem('pendingProfessionalId')
              localStorage.removeItem('pendingRole')
              localStorage.removeItem('pendingNombre')
              sessionStorage.removeItem('pendingProfessionalId')
              sessionStorage.removeItem('pendingRole')
              sessionStorage.removeItem('pendingNombre')
            }
          } catch { /* storage unavailable */ }

          // Auth exists but no profile → INSERT only, never overwrite existing role
          const { error: createErr } = await supabase.from('profiles').insert({
            id:     authData.user!.id,
            email:  authData.user!.email ?? email.trim().toLowerCase(),
            nombre: pendingNombre || authData.user!.user_metadata?.nombre || email.split('@')[0],
            role:   pendingPro ? pendingRole : 'individual',
            plan:   'gratuito',
            ...(pendingPro && { professional_id: pendingPro }),
            ...(pendingPro && {
              trial_ends_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            }),
          })
          // Ignore duplicate-key error (23505) — profile already exists, that's fine
          if (createErr && !createErr.message.includes('duplicate') && !createErr.code?.includes('23505')) {
            setError('Error al configurar tu perfil: ' + createErr.message)
            setLoading(false)
            return
          }

          // Si se vinculó con un profesional ahora (al confirmar email tras registro)
          // → avisar al profesional (email + push). Best-effort.
          if (pendingPro) {
            const patientEmail = authData.user!.email ?? email.trim().toLowerCase()
            const patientName  = pendingNombre || authData.user!.user_metadata?.nombre || patientEmail
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const headers: Record<string, string> = { 'Content-Type': 'application/json' }
              if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
              fetch('/api/notify/patient-registered', {
                method:      'POST',
                headers,
                credentials: 'include',
                body:        JSON.stringify({
                  patientId:      authData.user!.id,
                  patientName,
                  patientEmail,
                  professionalId: pendingPro,
                }),
              }).catch(() => { /* non-fatal */ })
            } catch { /* non-fatal */ }
          }
        }
        window.location.href = '/paciente'
      }
    } catch (err: unknown) {
      clearTimeout(timer)
      const msg = err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.'
      setError(msg)
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    try {
      const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
        redirectTo: `${appUrl}/reset-password`,
      })
      if (error) {
        setResetError(error.message)
      } else {
        setResetDone(true)
      }
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Error al enviar el email.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="auth-page min-h-screen bg-[#060F1A] flex">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C1F2C] via-[#0a1a28] to-[#060F1A]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#29ABE2]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#29ABE2]/8 rounded-full translate-x-1/3 translate-y-1/3 blur-2xl" />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center shadow-lg shadow-[#29ABE2]/20">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-white tracking-wider">CENTRO METABÓLICO</p>
              <p className="text-[9px] text-[#29ABE2] font-bold tracking-widest">PRO CLINICAL ENGINE</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Planes nutricionales<br />
              <span className="text-[#29ABE2]">clínicamente precisos</span>
            </h2>
            <p className="text-[#4A7A94] text-sm leading-relaxed max-w-xs">
              Motor de cálculo Harris-Benedict + PAL, alertas clínicas, generador de menú semanal y seguimiento de adherencia diaria.
            </p>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '7', label: 'Módulos clínicos' },
            { value: '13+', label: 'Alertas digestivas' },
            { value: '5★', label: 'Comidas/día' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-[#29ABE2]">{s.value}</p>
              <p className="text-[9px] text-[#4A7A94] font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
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

          <AnimatePresence mode="wait">

            {/* ── LOGIN FORM ── */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h1 className="text-2xl font-black text-[#0C1F2C] mb-1">Bienvenido</h1>
                <p className="text-sm text-[#8BA5BE] mb-8">Ingresa tus credenciales para continuar</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
                      <input
                        type="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
                        placeholder="tu@correo.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-[#0C1F2C] uppercase tracking-wide">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setResetEmail(email); setResetDone(false); setResetError('') }}
                        className="text-[11px] text-[#29ABE2] font-semibold hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
                      <input
                        type="password" value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 font-medium">
                      ⚠️ {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? 'Ingresando...' : (
                      <><span>Ingresar</span><ArrowRight size={16} /></>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-[#F0F4F8] text-center">
                  <p className="text-xs text-[#8BA5BE]">
                    ¿No tienes cuenta?{' '}
                    <a href="/register" className="text-[#29ABE2] font-bold hover:underline">
                      Regístrate gratis
                    </a>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="flex items-center gap-1.5 text-xs text-[#8BA5BE] hover:text-[#0C1F2C] mb-6 transition-colors"
                >
                  <ArrowLeft size={13} /> Volver al inicio de sesión
                </button>

                <h1 className="text-2xl font-black text-[#0C1F2C] mb-1">Recuperar contraseña</h1>
                <p className="text-sm text-[#8BA5BE] mb-8">
                  Te enviaremos un enlace para crear una nueva contraseña.
                </p>

                {resetDone ? (
                  <div className="flex flex-col items-center text-center gap-4 py-4">
                    <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center">
                      <CheckCircle size={28} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0C1F2C] mb-1">Email enviado</p>
                      <p className="text-xs text-[#8BA5BE] leading-relaxed">
                        Revisa tu bandeja de entrada en <strong>{resetEmail}</strong> y haz clic en el enlace para crear tu nueva contraseña.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs text-[#29ABE2] font-semibold hover:underline mt-2"
                    >
                      Volver al inicio de sesión
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
                        <input
                          type="email" value={resetEmail}
                          onChange={e => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
                          placeholder="tu@correo.com"
                          required
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 font-medium">
                        ⚠️ {resetError}
                      </div>
                    )}

                    <button
                      type="submit" disabled={resetLoading}
                      className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                      {resetLoading ? 'Enviando...' : (
                        <><span>Enviar enlace de recuperación</span><ArrowRight size={16} /></>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
