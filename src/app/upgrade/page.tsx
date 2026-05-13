'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
  Activity, CheckCircle, ArrowLeft,
  Star, Zap, Shield, Users, Bot, BarChart2,
  CreditCard, Loader2,
} from 'lucide-react'
import type { Profile } from '@/types'

const PRICE_CLP = 14990

const FEATURES = [
  { icon: BarChart2, text: 'Dashboard de registro diario de calorias y macros' },
  { icon: Bot,       text: 'Asistente IA nutricional ilimitado 24/7' },
  { icon: Star,      text: 'Historial completo de planes nutricionales' },
  { icon: Users,     text: 'Panel profesional — gestion de pacientes' },
  { icon: Zap,       text: 'Generador de plan clinico Harris-Benedict + PAL' },
  { icon: Shield,    text: 'Datos protegidos y respaldados en la nube' },
]

export default function UpgradePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const [pendingPayment, setPendingPayment] = useState<{ url: string; token: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-submit the hidden WebPay form once we have the payment data
  useEffect(() => {
    if (pendingPayment && formRef.current) {
      formRef.current.submit()
    }
  }, [pendingPayment])

  async function handlePay() {
    if (!profile) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/webpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      })

      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? 'Error al iniciar el pago')
      }

      const data = await res.json()
      // Trigger auto-submit via useEffect
      setPendingPayment(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago')
      setLoading(false)
    }
  }

  const isPremium = profile?.plan === 'premium'

  return (
    <div className="min-h-screen bg-[#F0F6FA] flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center px-4 md:px-8 bg-white border-b border-[#E2ECF4]">
        <button
          onClick={() => router.push('/paciente')}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] transition"
        >
          <ArrowLeft size={14} />
          Volver a la app
        </button>
        <div className="flex items-center gap-2 mx-auto">
          <div className="w-7 h-7 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-lg flex items-center justify-center">
            <Activity size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-[#0C1F2C]">Centro Metabolico <span className="text-[#29ABE2]">Pro</span></span>
        </div>
        <div className="w-24" /> {/* spacer */}
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Already premium */}
          {isPremium ? (
            <div className="bg-white rounded-2xl border border-[#E2ECF4] p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={28} className="text-amber-500" />
              </div>
              <h1 className="text-xl font-black text-[#0C1F2C] mb-2">Ya tienes Premium</h1>
              <p className="text-sm text-[#8BA5BE] mb-6">
                Tu plan esta activo. Disfruta de todas las funciones de Centro Metabolico Pro.
              </p>
              <button
                onClick={() => router.push('/paciente')}
                className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition"
              >
                Ir a la app
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pricing card */}
              <div className="bg-white rounded-2xl border border-[#E2ECF4] overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#060F1A] via-[#0C1F2C] to-[#0C3547] p-6 text-center">
                  <p className="text-[10px] font-bold text-[#29ABE2] uppercase tracking-widest mb-2">Plan Premium</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-white">${PRICE_CLP.toLocaleString('es-CL')}</span>
                    <span className="text-sm text-[#4A7A94] font-medium">/mes</span>
                  </div>
                  <p className="text-xs text-[#4A7A94] mt-1">30 dias de acceso completo</p>
                </div>

                {/* Features */}
                <div className="p-6 space-y-3">
                  {FEATURES.map(f => {
                    const Icon = f.icon
                    return (
                      <div key={f.text} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#EAF4FB] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle size={12} className="text-[#29ABE2]" />
                        </div>
                        <span className="text-xs text-[#4A6070] leading-relaxed">{f.text}</span>
                      </div>
                    )
                  })}
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  {error && (
                    <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 font-medium">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handlePay}
                    disabled={loading || !profile}
                    className="w-full py-3.5 bg-[#29ABE2] text-white font-bold rounded-xl hover:bg-[#1a8fc2] transition disabled:opacity-50 flex items-center justify-center gap-2.5"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Conectando con WebPay...</>
                    ) : (
                      <><CreditCard size={16} /> Pagar con WebPay</>
                    )}
                  </button>
                </div>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 text-center">
                <div>
                  <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide">Seguro</p>
                  <p className="text-[10px] text-[#B0C4D4]">Transbank SSL</p>
                </div>
                <div className="w-px h-6 bg-[#E2ECF4]" />
                <div>
                  <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide">Pago local</p>
                  <p className="text-[10px] text-[#B0C4D4]">Tarjetas chilenas</p>
                </div>
                <div className="w-px h-6 bg-[#E2ECF4]" />
                <div>
                  <p className="text-[10px] font-bold text-[#8BA5BE] uppercase tracking-wide">Sin contrato</p>
                  <p className="text-[10px] text-[#B0C4D4]">Cancela cuando quieras</p>
                </div>
              </div>

              <p className="text-center text-[10px] text-[#B0C4D4]">
                Seras redirigido a la plataforma segura de Transbank para completar el pago.
              </p>
            </div>
          )}
        </motion.div>
      </main>

      {/* Hidden WebPay form — auto-submitted after create response */}
      {pendingPayment && (
        <form
          ref={formRef}
          method="POST"
          action={pendingPayment.url}
          className="hidden"
        >
          <input name="token_ws" value={pendingPayment.token} readOnly />
        </form>
      )}
    </div>
  )
}
