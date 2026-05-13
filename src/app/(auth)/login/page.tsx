'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Activity, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
          .single()

        if (!profile) {
          // Auth exists but no profile → sign out and go to register
          await supabase.auth.signOut()
          setError('No encontramos una cuenta registrada con este email. Por favor regístrate.')
          setLoading(false)
        } else {
          window.location.href = '/paciente'
        }
      }
    } catch (err: unknown) {
      clearTimeout(timer)
      const msg = err instanceof Error ? err.message : 'Error de conexión. Intenta de nuevo.'
      setError(msg)
      setLoading(false)
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

      {/* ── Right panel — login form ── */}
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
              <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
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
      </div>
    </div>
  )
}
