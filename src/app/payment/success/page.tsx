'use client'

/**
 * /payment/success — shown after a successful Transbank WebPay payment.
 *
 * Fetches the user's updated profile to personalize the celebration:
 * nombre, plan type, premium_until (expiry date).
 *
 * Sections:
 *  1. Canvas confetti (CSS-only particles via useEffect + requestAnimationFrame)
 *  2. Hero — dark gradient background with pulsing rings
 *  3. White card — check icon · plan badge · personalized greeting
 *  4. "Features unlocked" staggered list
 *  5. Primary CTA → generate plan · Secondary CTA → dashboard
 *  6. Auto-redirect progress bar (8 s)
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { CheckCircle, Star, Zap, ArrowRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { PlanType } from '@/types'

// ─── Plan metadata ────────────────────────────────────────────────────────────
const PLAN_META: Record<PlanType | string, { label: string; color: string; bg: string; border: string }> = {
  individual:   { label: 'Plan Individual',   color: 'text-[#29ABE2]', bg: 'bg-[#EAF4FB]',   border: 'border-[#29ABE2]/40' },
  patient:      { label: 'Plan Paciente',      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  professional: { label: 'Plan Profesional',  color: 'text-amber-600',  bg: 'bg-amber-50',    border: 'border-amber-200'   },
}

const FEATURES: { emoji: string; text: string }[] = [
  { emoji: '🧮', text: 'Generador de plan nutricional con IA clínica' },
  { emoji: '📊', text: 'Dashboard de adherencia y progreso de peso' },
  { emoji: '🔥', text: 'Racha de días consecutivos y gamificación' },
  { emoji: '💬', text: 'Asistente nutricional disponible 24/7' },
  { emoji: '🥗', text: 'Historial de planes y registros diarios' },
  { emoji: '📷', text: 'Escáner de alimentos con análisis IA' },
]

// ─── Confetti canvas ───────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#29ABE2','#1a6fa0','#FFD700','#FF6B6B','#6BCB77','#FFB347','#B5B9FF']
    const NUM    = 120
    const now    = Date.now()

    interface Particle {
      x: number; y: number
      w: number; h: number
      color: string
      speed: number
      drift: number
      angle: number
      spin: number
      born: number
    }

    const particles: Particle[] = Array.from({ length: NUM }, () => ({
      x:     Math.random() * canvas.width,
      y:     -20 - Math.random() * canvas.height * 0.4,
      w:     6  + Math.random() * 8,
      h:     3  + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 1.5 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 1.2,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.12,
      born:  now - Math.random() * 2000,
    }))

    let raf: number
    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      const elapsed = (Date.now() - now) / 1000

      particles.forEach(p => {
        const age = (Date.now() - p.born) / 1000
        // Fade out after 4 s
        const alpha = age < 3 ? 1 : Math.max(0, 1 - (age - 3) / 2)
        if (alpha <= 0) return

        p.y     += p.speed
        p.x     += p.drift
        p.angle += p.spin

        ctx!.save()
        ctx!.globalAlpha = alpha
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.angle)
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx!.restore()
      })

      if (elapsed < 5) {
        raf = requestAnimationFrame(draw)
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PaymentSuccessPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nombre,  setNombre]  = useState<string>('Usuario')
  const [plan,    setPlan]    = useState<string>('individual')
  const [expiry,  setExpiry]  = useState<string | null>(null)
  const [loaded,  setLoaded]  = useState(false)

  // ── Load profile ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, plan, premium_until')
        .eq('id', user.id)
        .maybeSingle()

      if (profile) {
        setNombre(profile.nombre ?? 'Usuario')
        setPlan(profile.plan ?? 'individual')
        setExpiry(profile.premium_until ?? null)
      }
      setLoaded(true)

      // Auto-redirect after 10 s
      redirectTimer = setTimeout(() => router.push('/paciente'), 10000)
    }).catch(() => {
      setLoaded(true)
      redirectTimer = setTimeout(() => router.push('/paciente'), 10000)
    })

    return () => clearTimeout(redirectTimer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const meta = PLAN_META[plan] ?? PLAN_META.individual

  const expiryFormatted = expiry
    ? new Date(expiry).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // ── Skeleton while loading ────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#060F1A] via-[#0C1F2C] to-[#0C3547] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#29ABE2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060F1A] via-[#0C1F2C] to-[#0C3547] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Confetti */}
      <Confetti />

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#29ABE2]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* ── Pulsing rings behind the check icon ── */}
        <div className="relative flex items-center justify-center mb-8">
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-[#29ABE2]/30"
              initial={{ width: 64, height: 64, opacity: 0.8 }}
              animate={{ width: 64 + i * 40, height: 64 + i * 40, opacity: 0 }}
              transition={{ duration: 1.6, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-20 h-20 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#29ABE2]/40 z-10"
          >
            <CheckCircle size={40} className="text-white" />
          </motion.div>
        </div>

        {/* ── Main card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Top accent */}
          <div className="h-1.5 bg-gradient-to-r from-[#29ABE2] via-[#FFD700] to-[#29ABE2]" />

          <div className="p-6 md:p-8">

            {/* Plan badge */}
            <div className="flex justify-center mb-5">
              <div className={`inline-flex items-center gap-2 ${meta.bg} border ${meta.border} px-4 py-1.5 rounded-full`}>
                <Star size={12} className={meta.color} />
                <span className={`text-xs font-black ${meta.color}`}>{meta.label} · Activo</span>
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-black text-[#0C1F2C] leading-tight mb-2">
                ¡Listo, {nombre.split(' ')[0]}! 🎉
              </h1>
              <p className="text-sm text-[#6B8FA8] leading-relaxed">
                Tu {meta.label.toLowerCase()} está activo y todas las funciones están desbloqueadas.
              </p>
              {expiryFormatted && (
                <p className="text-xs text-[#8BA5BE] mt-1.5">
                  Válido hasta el <span className="font-bold text-[#0C3547]">{expiryFormatted}</span>
                </p>
              )}
            </div>

            {/* Features unlocked */}
            <div className="bg-[#F7FBFE] border border-[#E2ECF4] rounded-2xl p-4 mb-6">
              <p className="text-[10px] font-black text-[#8BA5BE] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap size={10} className="text-[#29ABE2]" />
                Funciones desbloqueadas
              </p>
              <ul className="space-y-2">
                {FEATURES.map((f, i) => (
                  <motion.li
                    key={f.text}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.07, duration: 0.3 }}
                    className="flex items-center gap-2.5 text-xs text-[#0C1F2C]"
                  >
                    <span className="text-base leading-none">{f.emoji}</span>
                    <span>{f.text}</span>
                    <span className="ml-auto text-[#29ABE2] font-bold text-[10px]">✓</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Link
                href="/paciente?tab=plan"
                className="w-full py-3.5 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white font-black rounded-2xl hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg shadow-[#29ABE2]/20"
              >
                <span>Generar mi plan ahora</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/paciente"
                className="w-full py-3 border border-[#E2ECF4] text-[#8BA5BE] text-sm font-bold rounded-2xl hover:border-[#29ABE2] hover:text-[#29ABE2] transition flex items-center justify-center gap-1.5"
              >
                Ir al dashboard
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Auto-redirect */}
            <div className="mt-5 pt-4 border-t border-[#F0F4F8]">
              <p className="text-[10px] text-center text-[#B0C4D4] mb-2">
                Redirigiendo al dashboard automáticamente...
              </p>
              <div className="h-1 bg-[#E2ECF4] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-[#29ABE2] to-[#1a6fa0] rounded-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom support link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-xs text-[#4A7A94] mt-5"
        >
          ¿Algún problema? Escríbenos por{' '}
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '56900000000'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#25D366] font-bold hover:underline"
          >
            WhatsApp
          </a>
        </motion.p>
      </div>
    </div>
  )
}
