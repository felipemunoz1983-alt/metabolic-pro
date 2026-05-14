'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Activity, Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase sends the recovery token in the URL hash (#access_token=...).
  // The browser client picks it up automatically on mount via onAuthStateChange.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Also check if session already exists (page reload after token exchange)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        setError(updateErr.message)
      } else {
        setDone(true)
        setTimeout(() => router.push('/paciente'), 3000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060F1A] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#0C1F2C] px-8 py-6 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center flex-shrink-0">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#29ABE2] uppercase tracking-widest">Centro Metabólico</p>
            <p className="text-sm font-black text-white">Nueva contraseña</p>
          </div>
        </div>

        <div className="px-8 py-8">
          {done ? (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-2xl flex items-center justify-center">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0C1F2C] mb-1">¡Contraseña actualizada!</p>
                <p className="text-xs text-[#8BA5BE]">Redirigiendo a la app...</p>
              </div>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center">
                <AlertCircle size={28} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0C1F2C] mb-1">Verificando enlace...</p>
                <p className="text-xs text-[#8BA5BE]">
                  Si esta página no carga en unos segundos, verifica que el enlace del email no haya expirado.
                </p>
              </div>
              <a href="/login" className="text-xs text-[#29ABE2] font-semibold hover:underline">
                Solicitar nuevo enlace
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-black text-[#0C1F2C] mb-1">Crear nueva contraseña</h2>
              <p className="text-xs text-[#8BA5BE] mb-6">Mínimo 6 caracteres.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-[#E2ECF4] rounded-xl text-sm text-[#0C1F2C] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0C1F2C] mb-1.5 uppercase tracking-wide">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8BA5BE]" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
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
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? 'Guardando...' : (
                    <><span>Guardar nueva contraseña</span><ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060F1A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#29ABE2] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
