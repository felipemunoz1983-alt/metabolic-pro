'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, CheckCircle, ArrowLeft,
  Star, Shield, Users,
  CreditCard, Loader2, User, FlaskConical,
  ChevronDown, Flame, BarChart2, Brain,
  Lock, RefreshCw, XCircle, MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const IS_INTEGRATION = process.env.NEXT_PUBLIC_TRANSBANK_MODE !== 'production'
import type { Profile, PlanType } from '@/types'
import { isOnTrial, trialDaysLeft, hasAccess, isPlanExpired } from '@/types'

// ─── Plan configs ─────────────────────────────────────────────────────────────
interface PlanConfig {
  type: PlanType
  label: string
  price: number
  sublabel: string
  icon: React.ElementType
  accentColor: string
  features: { icon: React.ElementType; text: string }[]
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
      { icon: Users,      text: 'Panel de pacientes ilimitado con alertas clínicas' },
      { icon: BarChart2,  text: 'Dashboard de adherencia y evolución por paciente' },
      { icon: Brain,      text: 'Motor clínico Harris-Benedict + PAL personalizado' },
      { icon: MessageSquare, text: 'Mensajes directos a tus pacientes desde el panel' },
      { icon: Brain,      text: 'Asistente IA nutricional ilimitado 24/7' },
      { icon: Lock,       text: 'Datos clínicos protegidos y respaldados en la nube' },
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
      { icon: CheckCircle,  text: 'Plan nutricional personalizado por tu profesional' },
      { icon: Flame,        text: 'Registro diario con racha de adherencia 🔥' },
      { icon: BarChart2,    text: 'Evolución de peso y adherencia en 30 días' },
      { icon: Brain,        text: 'Asistente IA nutricional ilimitado 24/7' },
      { icon: MessageSquare, text: 'Mensajes y seguimiento directo de tu nutricionista' },
      { icon: Lock,         text: 'Datos protegidos y respaldados en la nube' },
    ],
  },
  individual: {
    type: 'individual',
    label: 'Plan Individual',
    price: 12990,
    sublabel: 'Para mejorar tu alimentación de forma autónoma',
    icon: User,
    accentColor: '#8b5cf6',
    features: [
      { icon: CheckCircle,  text: 'Generador de plan nutricional personalizado' },
      { icon: Flame,        text: 'Registro diario con racha de adherencia 🔥' },
      { icon: BarChart2,    text: 'Evolución de peso y adherencia en 30 días' },
      { icon: Brain,        text: 'Asistente IA nutricional ilimitado 24/7' },
      { icon: CheckCircle,  text: 'Alertas clínicas inteligentes incluidas' },
      { icon: Lock,         text: 'Datos protegidos y respaldados en la nube' },
    ],
  },
}

function getPlanType(profile: Profile): PlanType {
  if (profile.role === 'professional') return 'professional'
  if (profile.role === 'patient' && profile.professional_id) return 'patient'
  return 'individual'
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: '¿Se renueva automáticamente?',
    a: 'No. Cada pago es manual. Recibirás un recordatorio por email antes de que expire para que puedas renovar sin interrupciones.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    a: 'Sí. No hay contratos, ni permanencia mínima, ni letra chica. Usas el plan hasta que vence y decides si renovar.',
  },
  {
    q: '¿Mis datos se pierden si no pago?',
    a: 'No. Tu historial, planes y registros se conservan intactos durante 90 días. Si reactivas, recuperas todo sin perder nada.',
  },
  {
    q: '¿Qué medios de pago acepta?',
    a: 'Tarjetas de débito y crédito chilenas a través de Transbank WebPay, el estándar de seguridad en Chile. Sin datos de tarjeta en nuestros servidores.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#E2ECF4] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-3 hover:text-[#29ABE2] transition-colors"
      >
        <span className="text-sm font-semibold text-[#0C1F2C]">{q}</span>
        <ChevronDown size={16} className={cn('text-[#8BA5BE] flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-[#6B7C93] leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    text: 'Llevo 3 meses con el plan individual. Lo que más valoro es tenerlo todo en un solo lugar: el plan, el registro diario y el chat con IA cuando tengo dudas.',
    name: 'Valentina R.',
    role: 'Santiago, Chile',
    initials: 'VR',
    color: 'from-purple-400 to-purple-600',
  },
  {
    text: 'Mis pacientes se enganchan mucho con el registro diario y la racha. La adherencia mejoró notablemente desde que los incorporé a la plataforma.',
    name: 'Nicolás C.',
    role: 'Nutricionista · Viña del Mar',
    initials: 'NC',
    color: 'from-[#29ABE2] to-[#1a6fa0]',
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UpgradePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ plans: 0, logs: 0, streak: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const [pendingPayment, setPendingPayment] = useState<{ url: string; token: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }

      const [profileRes, plansRes, logsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('planes_nutricionales').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('registros_diarios')
          .select('fecha, comidas_completadas')
          .eq('user_id', user.id)
          .gte('fecha', new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0])
          .order('fecha', { ascending: false }),
      ])

      setProfile(profileRes.data)

      // Compute streak from logs
      const logs = logsRes.data ?? []
      const loggedDates = new Set(logs.filter(l => l.comidas_completadas > 0).map(l => l.fecha))
      let streak = 0
      const today = new Date()
      const d = new Date(today)
      while (loggedDates.has(d.toISOString().split('T')[0])) {
        streak++
        d.setDate(d.getDate() - 1)
      }

      setStats({
        plans:  plansRes.count ?? 0,
        logs:   logs.length,
        streak,
      })
    }).catch(() => setError('Error al cargar tu perfil. Recarga la página.'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pendingPayment && formRef.current) formRef.current.submit()
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

  const isActive      = profile ? (hasAccess(profile) && !isPlanExpired(profile) && profile.plan !== 'gratuito') : false
  const planExpired   = profile ? isPlanExpired(profile) : false
  const onTrial       = profile ? isOnTrial(profile) : false
  const daysLeft      = profile ? trialDaysLeft(profile) : 0
  const trialExpired  = profile?.trial_ends_at && !onTrial && profile.plan === 'gratuito'
  const planType      = profile ? getPlanType(profile) : null
  const planConfig    = planType ? PLAN_CONFIGS[planType] : null
  const PlanIcon      = planConfig?.icon ?? Star
  const accentHex     = planConfig?.accentColor ?? '#29ABE2'

  // CTA button text
  const ctaText = planExpired
    ? 'Reactivar mi plan'
    : trialExpired
    ? 'Activar mi plan'
    : 'Activar plan ahora'

  return (
    <div className="min-h-screen bg-[#F0F6FA] flex flex-col">
      {/* Top bar */}
      <header className="h-14 flex items-center px-4 md:px-8 bg-white border-b border-[#E2ECF4] sticky top-0 z-20">
        <button
          onClick={() => router.push('/paciente')}
          className="flex items-center gap-2 text-sm text-[#8BA5BE] hover:text-[#0C1F2C] transition"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="flex items-center gap-2 mx-auto">
          <div className="w-7 h-7 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-lg flex items-center justify-center">
            <Activity size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-[#0C1F2C]">Centro Metabólico <span className="text-[#29ABE2]">Pro</span></span>
        </div>
        <div className="w-24" />
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-lg mx-auto space-y-6">

          {/* Loading */}
          {!profile && (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={28} className="animate-spin text-[#29ABE2]" />
            </div>
          )}

          {/* Already active */}
          {profile && isActive && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-[#E2ECF4] p-8 text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star size={28} className="text-amber-500" />
              </div>
              <h1 className="text-xl font-black text-[#0C1F2C] mb-2">Tu plan está activo ✅</h1>
              <p className="text-sm text-[#8BA5BE] mb-6">
                Tienes el <span className="font-bold text-[#0C1F2C]">{planConfig?.label}</span> activo. Disfruta de todas las funciones.
              </p>
              <button
                onClick={() => router.push('/paciente')}
                className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-bold rounded-xl hover:opacity-90 transition"
              >
                Ir a la app →
              </button>
            </motion.div>
          )}

          {/* Upgrade flow */}
          {profile && planConfig && !isActive && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* ── Hero / urgency ── */}
              <div className="text-center">
                {onTrial && daysLeft <= 3 && (
                  <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    ⏰ Te quedan {daysLeft} día{daysLeft !== 1 ? 's' : ''} de prueba
                  </div>
                )}
                {onTrial && daysLeft > 3 && (
                  <div className="inline-flex items-center gap-2 bg-[#EAF4FB] border border-[#29ABE2]/30 text-[#29ABE2] text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    ⏰ Tu prueba termina en {daysLeft} días
                  </div>
                )}
                {(trialExpired || planExpired) && (
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold px-3 py-1.5 rounded-full mb-3">
                    ⚠️ Tu acceso ha expirado
                  </div>
                )}
                <h1 className="text-2xl font-black text-[#0C1F2C] leading-tight">
                  {trialExpired || planExpired
                    ? 'No pierdas tu progreso'
                    : 'Sigue construyendo tu salud'}
                </h1>
                <p className="text-sm text-[#6B7C93] mt-2 leading-relaxed">
                  {trialExpired || planExpired
                    ? 'Tu historial, planes y registros te esperan. Reactiva en segundos.'
                    : 'Activa tu plan y mantén todo lo que has logrado durante la prueba.'}
                </p>
              </div>

              {/* ── "What you've built" strip ── */}
              {(stats.plans > 0 || stats.logs > 0 || stats.streak > 0) && (
                <div className="bg-gradient-to-r from-[#0C1F2C] to-[#0C3547] rounded-2xl p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A7A94] mb-3">Lo que ya construiste</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: '📋', value: stats.plans, label: stats.plans === 1 ? 'Plan generado' : 'Planes generados' },
                      { icon: '📅', value: stats.logs,  label: stats.logs  === 1 ? 'Día registrado' : 'Días registrados' },
                      { icon: '🔥', value: stats.streak, label: stats.streak === 1 ? 'Día de racha' : 'Días de racha' },
                    ].map(s => (
                      <div key={s.label} className="bg-white/8 rounded-xl p-3 text-center">
                        <div className="text-xl mb-0.5">{s.icon}</div>
                        <div className="text-xl font-black">{s.value}</div>
                        <div className="text-[9px] text-[#4A7A94] leading-tight mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#4A7A94] mt-3 text-center">
                    Todo esto se conserva si activas tu plan hoy. 🔒
                  </p>
                </div>
              )}

              {/* ── Plan card ── */}
              <div className="bg-white rounded-2xl border border-[#E2ECF4] overflow-hidden shadow-sm">
                {/* Plan header */}
                <div className="bg-gradient-to-r from-[#060F1A] via-[#0C1F2C] to-[#0C3547] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${accentHex}25` }}
                      >
                        <PlanIcon size={16} style={{ color: accentHex }} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{planConfig.label}</p>
                        <p className="text-[10px]" style={{ color: accentHex }}>{planConfig.sublabel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white leading-none">
                        ${planConfig.price.toLocaleString('es-CL')}
                      </p>
                      <p className="text-[10px] text-[#4A7A94] mt-0.5">/mes · 30 días de acceso</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="p-5 space-y-3">
                  {planConfig.features.map((f, i) => {
                    const Icon = f.icon
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${accentHex}18` }}
                        >
                          <Icon size={13} style={{ color: accentHex }} />
                        </div>
                        <span className="text-sm text-[#0C1F2C] font-medium">{f.text}</span>
                      </div>
                    )
                  })}
                </div>

                {/* CTA section */}
                <div className="px-5 pb-5 pt-2 border-t border-[#F0F6FA] space-y-3">
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
                      <XCircle size={14} className="flex-shrink-0" /> {error}
                    </div>
                  )}
                  <button
                    onClick={handlePay}
                    disabled={loading}
                    style={{ backgroundColor: accentHex }}
                    className="w-full py-3.5 text-white font-black rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2.5 text-sm"
                  >
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Conectando con WebPay...</>
                      : <><CreditCard size={16} /> {ctaText} — ${planConfig.price.toLocaleString('es-CL')}</>}
                  </button>
                  <p className="text-[10px] text-[#B0C4D4] text-center">
                    Serás redirigido a Transbank para completar el pago de forma segura.
                  </p>
                </div>
              </div>

              {/* ── Trust badges ── */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Lock,       label: 'Pago seguro',     sub: 'Transbank SSL' },
                  { icon: RefreshCw,  label: 'Sin contrato',    sub: 'Cancela cuando quieras' },
                  { icon: Shield,     label: 'Datos seguros',   sub: '90 días de respaldo' },
                ].map(t => {
                  const Icon = t.icon
                  return (
                    <div key={t.label} className="bg-white rounded-xl border border-[#E2ECF4] p-3 text-center">
                      <Icon size={16} className="text-[#29ABE2] mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-[#0C1F2C]">{t.label}</p>
                      <p className="text-[9px] text-[#B0C4D4] mt-0.5">{t.sub}</p>
                    </div>
                  )
                })}
              </div>

              {/* ── Testimonials ── */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8BA5BE] text-center">Lo que dicen nuestros usuarios</p>
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
                    <p className="text-sm text-[#0C1F2C] leading-relaxed italic mb-4">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white text-xs font-black', t.color)}>
                        {t.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#0C1F2C]">{t.name}</p>
                        <p className="text-[10px] text-[#8BA5BE]">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── FAQ ── */}
              <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 shadow-sm">
                <p className="text-sm font-black text-[#0C1F2C] mb-2">Preguntas frecuentes</p>
                {FAQS.map(faq => (
                  <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>

              {/* ── Integration test data ── */}
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

              {/* ── Sticky bottom CTA (mobile) ── */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E2ECF4] md:hidden z-10">
                <button
                  onClick={handlePay}
                  disabled={loading}
                  style={{ backgroundColor: accentHex }}
                  className="w-full py-3.5 text-white font-black rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Conectando...</>
                    : <><CreditCard size={16} /> {ctaText} — ${planConfig.price.toLocaleString('es-CL')}</>}
                </button>
              </div>
              {/* Spacer for sticky CTA */}
              <div className="h-20 md:hidden" />
            </motion.div>
          )}
        </div>
      </main>

      {/* Hidden Transbank form */}
      {pendingPayment && (
        <form ref={formRef} method="POST" action={pendingPayment.url} className="hidden">
          <input name="token_ws" value={pendingPayment.token} readOnly />
        </form>
      )}
    </div>
  )
}
