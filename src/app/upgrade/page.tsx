'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import {
  Activity, CheckCircle, ArrowLeft,
  Star, Shield, Users,
  CreditCard, Loader2, User, FlaskConical,
} from 'lucide-react'

const IS_INTEGRATION = process.env.NEXT_PUBLIC_TRANSBANK_MODE !== 'production'
import type { Profile, PlanType } from '@/types'
import { isOnTrial, trialDaysLeft } from '@/types'

interface PlanConfig {
  type: PlanType
  label: string
  price: number
  sublabel: string
  icon: React.ElementType
  accentColor: string
  features: string[]
}

const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  professional: {
    type: 'professional',
    label: 'Plan Profesional',
    price: 14990,
    sublabel: 'Para nutricionistas y profesionales de salud',
    icon: Users,
    accentColor: '#29ABE2',
    features: [
      'Panel de gestión de pacientes ilimitado',
      'Generador de plan clínico Harris-Benedict + PAL',
      'Asistente IA nutricional ilimitado 24/7',
      'Historial completo de planes nutricionales',
      'Dashboard de registro diario por paciente',
      'Datos protegidos y respaldados en la nube',
    ],
  },
  patient: {
    type: 'patient',
    label: 'Plan Paciente',
    price: 7000,
    sublabel: 'Seguimiento guiado por tu profesional de salud',
    icon: Shield,
    accentColor: '#10b981',
    features: [
      'Plan nutricional personalizado por tu profesional',
      'Registro diario de calorías y macros',
      'Asistente IA nutricional ilimitado 24/7',
      'Historial completo de planes anteriores',
      'Alertas y seguimiento de adherencia',
      'Datos protegidos y respaldados en la nube',
    ],
  },
  individual: {
    type: 'individual',
    label: 'Plan Individual',
    price: 12990,
    sublabel: 'Para mejorar tu alimentación por tu cuenta',
    icon: User,
    accentColor: '#8b5cf6',
    features: [
      'Generador de plan nutricional personalizado',
      'Dashboard de registro diario de calorías y macros',
      'Asistente IA nutricional ilimitado 24/7',
      'Historial completo de planes nutricionales',
      'Alertas clínicas inteligentes',
      'Datos protegidos y respaldados en la nube',
    ],
  },
}

function getPlanType(profile: Profile): PlanType {
  if (profile.role === 'professional') return 'professional'
  if (profile.role === 'patient' && profile.professional_id) return 'patient'
  return 'individual'
}

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
        .maybeSingle()
      setProfile(data)
    }).catch((err) => {
      console.error('[upgrade] auth error:', err)
      setError('Error al cargar tu perfil. Recarga la página.')
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      setPendingPayment(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago')
      setLoading(false)
    }
  }

  const isActive = profile && profile.plan !== 'gratuito'
  const onTrial = profile ? isOnTrial(profile) : false
  const daysLeft = profile ? trialDaysLeft(profile) : 0
  const trialExpired = profile?.trial_ends_at && !onTrial && profile.plan === 'gratuito'
  const planType = profile ? getPlanType(profile) : null
  const planConfig = planType ? PLAN_CONFIGS[planType] : null
  const PlanIcon = planConfig?.icon ?? Star

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
        <div className="w-24" />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {!profile ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={24} className="animate-spin text-[#29ABE2]" />
            </div>
          ) : isActive ? (
            <div className="bg-white rounded-2xl border border-[#E2ECF4] p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={28} className="text-amber-500" />
              </div>
              <h1 className="text-xl font-black text-[#0C1F2C] mb-2">Tu plan está activo</h1>
              <p className="text-sm text-[#8BA5BE] mb-6">
                Tienes el <span className="font-bold text-[#0C1F2C]">{planConfig?.label}</span> activo. Disfruta de todas las funciones.
              </p>
              <button
                onClick={() => router.push('/paciente')}
                className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition"
              >
                Ir a la app
              </button>
            </div>
          ) : planConfig ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-[#E2ECF4] overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#060F1A] via-[#0C1F2C] to-[#0C3547] p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <PlanIcon size={16} style={{ color: planConfig.accentColor }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: planConfig.accentColor }}>
                      {planConfig.label}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-white">${planConfig.price.toLocaleString('es-CL')}</span>
                    <span className="text-sm text-[#4A7A94] font-medium">/mes</span>
                  </div>
                  <p className="text-xs text-[#4A7A94] mt-1">{planConfig.sublabel}</p>
                  <p className="text-[10px] text-[#4A7A94] mt-1">30 días de acceso completo</p>
                </div>

                {/* Features */}
                <div className="p-6 space-y-3">
                  {planConfig.features.map(f => (
                    <div key={f} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#EAF4FB] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle size={12} className="text-[#29ABE2]" />
                      </div>
                      <span className="text-xs text-[#4A6070] leading-relaxed">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Trial / expired notice */}
                {onTrial && (
                  <div className="mx-6 mb-0 bg-[#EAF4FB] border border-[#29ABE2]/30 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs font-bold text-[#29ABE2]">
                      ⏰ Te quedan <span className="text-base">{daysLeft}</span> día{daysLeft !== 1 ? 's' : ''} de prueba gratuita
                    </p>
                    <p className="text-[10px] text-[#4A7A94] mt-0.5">Activa tu plan antes de que expire para seguir sin interrupciones.</p>
                  </div>
                )}
                {trialExpired && (
                  <div className="mx-6 mb-0 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs font-bold text-red-600">Tu período de prueba ha finalizado</p>
                    <p className="text-[10px] text-red-400 mt-0.5">Activa tu plan para seguir usando la app.</p>
                  </div>
                )}

                {/* CTA */}
                <div className="px-6 pb-6 pt-4">
                  {error && (
                    <div className="mb-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3 font-medium">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handlePay}
                    disabled={loading}
                    className="w-full py-3.5 bg-[#29ABE2] text-white font-bold rounded-xl hover:bg-[#1a8fc2] transition disabled:opacity-50 flex items-center justify-center gap-2.5"
                  >
                    {loading ? (
                      <><Loader2 size={16} className="animate-spin" /> Conectando con WebPay...</>
                    ) : (
                      <><CreditCard size={16} /> Pagar ${planConfig.price.toLocaleString('es-CL')} con WebPay</>
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
                Serás redirigido a la plataforma segura de Transbank para completar el pago.
              </p>

              {IS_INTEGRATION && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FlaskConical size={13} className="text-amber-600" />
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Modo integración — credenciales de prueba</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-amber-800 font-mono">
                    <p>Tarjeta VISA: <strong>4051 8856 0044 6623</strong></p>
                    <p>CVV: <strong>123</strong> &nbsp; Vencimiento: <strong>12/29</strong></p>
                    <p>RUT tarjetahabiente: <strong>11.111.111-1</strong></p>
                    <p className="pt-1 border-t border-amber-200 mt-1">Banco — RUT: <strong>11.111.111-1</strong> &nbsp; Clave: <strong>123</strong></p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      </main>

      {pendingPayment && (
        <form ref={formRef} method="POST" action={pendingPayment.url} className="hidden">
          <input name="token_ws" value={pendingPayment.token} readOnly />
        </form>
      )}
    </div>
  )
}
