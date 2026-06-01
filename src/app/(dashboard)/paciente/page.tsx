'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient, getUserSafe } from '@/lib/supabase'
import { readPendingInvite, clearPendingInvite } from '@/lib/pendingInvite'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Tab } from '@/components/layout/types'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
import { CalorieDashboard } from '@/components/dashboard/CalorieDashboard'
import { ChatIA } from '@/components/chat/ChatIA'
import { PanelProfesional } from '@/components/profesional/PanelProfesional'
import { Historial } from '@/components/historial/Historial'
import { Evaluaciones } from '@/components/evaluaciones/Evaluaciones'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { FoodScanner } from '@/components/dashboard/FoodScanner'
import { NutrievoPanel } from '@/components/nutrevo/NutrievoPanel'
import { NoticiasHub } from '@/components/noticias/NoticiasHub'
import { PerfilPanel } from '@/components/perfil/PerfilPanel'
import type { Profile } from '@/types'
import { hasAccess } from '@/types'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import {
  getPatientNotifications,
  getProfessionalNotifications,
  getReadIds,
  markAllRead,
  type AppNotification,
} from '@/lib/notifications'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Bell, Lock, Star } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { OnboardingModal, ONBOARDING_KEY } from '@/components/onboarding/OnboardingModal'
import { TrialBanner } from '@/components/dashboard/TrialBanner'
import { PWAInstallBanner } from '@/components/shared/PWAInstallBanner'
import { WelcomePostRegister } from '@/components/onboarding/WelcomePostRegister'
// Lazy load: el banco hace fetch propio y no es above-the-fold inmediato.
// Sacarlo del bundle inicial ahorra ~40KB JS en el primer paint.
import dynamic from 'next/dynamic'
const EducacionHub = dynamic(
  () => import('@/components/educacion/EducacionHub').then(m => ({ default: m.EducacionHub })),
  { ssr: false, loading: () => null },
)
const BancoPaciente = dynamic(
  () => import('@/components/banco/BancoPaciente').then(m => ({ default: m.BancoPaciente })),
  { ssr: false, loading: () => null },
)

// ── Premium gate ──────────────────────────────────────────────────────────────
function PremiumGate({ feature, description }: { feature: string; description: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 rounded-3xl flex items-center justify-center mx-auto mb-5">
          <Lock size={32} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-black text-[#0C1F2C] mb-2">{feature}</h2>
        <p className="text-sm text-[#8BA5BE] mb-6 leading-relaxed">{description}</p>
        <div className="bg-white border border-[#E2ECF4] rounded-2xl p-4 mb-6 text-left space-y-2">
          {['Asistente IA nutricional 24/7', 'Escaneo de alimentos con cámara', 'Planes personalizados ilimitados'].map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <Star size={11} className="text-amber-400 flex-shrink-0" />
              <span className="text-xs text-[#4A6070]">{f}</span>
            </div>
          ))}
        </div>
        <a
          href="/upgrade"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0C3547] to-[#1a6fa0] text-white text-sm font-bold px-6 py-3 rounded-xl hover:opacity-90 transition"
        >
          <Star size={14} className="text-amber-400" />
          Ver planes de pago
        </a>
      </motion.div>
    </div>
  )
}

// ── Top header bar ────────────────────────────────────────────────────────────
interface TopBarProps {
  activeTab: Tab
  profile: Profile | null
  notifications: AppNotification[]
  readIds: Set<string>
  loadingNotifs: boolean
  notifOpen: boolean
  onBellClick: () => void
  onCloseNotifs: () => void
  onMarkAllRead: () => void
  /** Click en el avatar de la esquina → abre tab Perfil (reemplaza el tab Perfil del bottom nav) */
  onAvatarClick: () => void
}

/** Botón "Avisar a mi nutricionista" del empty state. Dispara push + email al pro.
 *  Rate limit suave 24h via localStorage (el endpoint NO bloquea — esto evita spam
 *  desde el cliente y comunica claridad: "ya avisaste, espera"). */
function PingProfessionalButton() {
  const LS_KEY = 'last-pinged-professional-at'
  // Lazy initializer del useState lee directo de localStorage para no
  // necesitar un useEffect que setee 'rate-limited' (eslint react-hooks/
  // set-state-in-effect prohibe ese patrón). Más limpio y evita un render
  // extra para mostrar el estado correcto desde el primer paint.
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate-limited'>(() => {
    if (typeof window === 'undefined') return 'idle'
    try {
      const raw = window.localStorage.getItem(LS_KEY)
      if (!raw) return 'idle'
      const last = Number(raw)
      if (!Number.isFinite(last)) return 'idle'
      const elapsed = Date.now() - last
      return elapsed < 24 * 60 * 60 * 1000 ? 'rate-limited' : 'idle'
    } catch { return 'idle' }
  })
  const [errorMsg, setErrorMsg] = useState<string>('')

  async function handlePing() {
    setState('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/notify/professional/ping', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      window.localStorage.setItem(LS_KEY, String(Date.now()))
      setState('sent')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'error')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-5 py-2.5 rounded-xl">
        ✅ Tu nutricionista fue notificado
      </div>
    )
  }
  if (state === 'rate-limited') {
    return (
      <div className="bg-[#F8FBFD] border border-[#E2ECF4] text-[#8BA5BE] text-xs font-medium px-4 py-2.5 rounded-xl">
        Ya avisaste a tu nutricionista hace poco. Vuelve a intentar mañana.
      </div>
    )
  }
  return (
    <>
      <button
        onClick={handlePing}
        disabled={state === 'sending'}
        className="flex items-center gap-2 bg-[#29ABE2] hover:bg-[#1a8fc2] disabled:bg-[#B8E3F4] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow"
      >
        {state === 'sending' ? '⏳ Enviando...' : '👋 Avisar a mi nutricionista'}
      </button>
      {state === 'error' && (
        <p className="text-xs text-rose-600 mt-2">No se pudo enviar: {errorMsg}</p>
      )}
    </>
  )
}

function TopBar({
  activeTab, profile,
  notifications, readIds, loadingNotifs,
  notifOpen, onBellClick, onCloseNotifs, onMarkAllRead,
  onAvatarClick,
}: TopBarProps) {
  const TAB_LABELS: Record<Tab, { title: string; subtitle: string }> = {
    dashboard:  { title: 'Dashboard',       subtitle: 'Registro calórico y adherencia diaria' },
    plan:       { title: 'Nutrición',       subtitle: 'Generador de plan alimentario personalizado' },
    chat:       { title: 'Asistente IA',   subtitle: 'Consulta clínica inteligente' },
    historial:    { title: 'Historial',     subtitle: 'Planes y seguimiento anteriores' },
    evaluaciones: { title: 'Evaluaciones',  subtitle: 'Informes antropométricos de tu profesional' },
    educacion:    { title: 'Educación',     subtitle: 'Guías y comparadores personalizados' },
    pacientes:  { title: 'Mis Pacientes',  subtitle: 'Panel profesional — gestión y seguimiento' },
    perfil:     { title: 'Mi Perfil',      subtitle: 'Cuenta, suscripción y ajustes' },
  }
  const { title, subtitle } = TAB_LABELS[activeTab]
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length
  const hasAlert = notifications.some(n => !readIds.has(n.id) && n.level === 'alert')
  const hasWarning = notifications.some(n => !readIds.has(n.id) && n.level === 'warning')
  const dotColor = hasAlert ? 'bg-red-500' : hasWarning ? 'bg-amber-400' : 'bg-[#29ABE2]'

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white border-b border-[#E2ECF4] flex-shrink-0">
      <div>
        <h1 className="text-sm font-extrabold text-[#0C1F2C] leading-tight">{title}</h1>
        <p className="text-[10px] text-[#8BA5BE] font-medium">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-[#8BA5BE] text-[11px] font-medium bg-[#F0F6FA] px-3 py-1.5 rounded-lg">
          <Calendar size={11} />
          <span className="capitalize">{today}</span>
        </div>

        {/* Bell + panel wrapper */}
        <div className="relative">
          <button
            onClick={onBellClick}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F6FA] text-[#8BA5BE] transition"
          >
            <Bell size={15} />
            {/* Badge */}
            {unreadCount > 0 ? (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-black text-white px-1 ${dotColor}`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${dotColor} opacity-0`} />
            )}
          </button>

          <NotificationPanel
            open={notifOpen}
            onClose={onCloseNotifs}
            notifications={notifications}
            readIds={readIds}
            loading={loadingNotifs}
            onMarkAllRead={onMarkAllRead}
          />
        </div>

        {profile && (
          <button
            onClick={onAvatarClick}
            title="Mi perfil"
            aria-label="Abrir mi perfil"
            // Tap target 44x44 (Apple/Google guideline) en lugar de 32x32 anterior.
            // El avatar es la ÚNICA forma de llegar al perfil en mobile (BottomNav
            // no lo incluye); con 32px era invisible/inalcanzable para mucho paciente.
            // Avatar visual de 36px adentro de un padding-clickeable más grande.
            className={`w-11 h-11 -mr-1 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${
              activeTab === 'perfil' ? 'ring-2 ring-[#29ABE2] ring-offset-2' : ''
            }`}
          >
            <span
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] flex items-center justify-center text-white text-[12px] font-bold shadow"
            >
              {profile.nombre?.charAt(0).toUpperCase() || 'U'}
            </span>
          </button>
        )}
      </div>
    </header>
  )
}

// Valid tabs that can be deep-linked via ?tab=
const VALID_TABS: Tab[] = ['plan', 'dashboard', 'chat', 'historial', 'evaluaciones', 'educacion', 'pacientes', 'perfil']

/** Read ?tab= from the URL without useSearchParams (avoids Suspense requirement).
 *  REDIRECCIÓN: 'evaluaciones' fue migrado a widget dentro del Dashboard.
 *  Deep-links viejos (push de informe antropométrico) preservan ?informe= y
 *  el componente Evaluaciones embebido lo recoge automáticamente. */
function getTabFromUrl(): Tab {
  if (typeof window === 'undefined') return 'dashboard'
  const p = new URLSearchParams(window.location.search).get('tab') as Tab | null
  if (p === 'evaluaciones') return 'dashboard'   // redirect legacy
  return p && VALID_TABS.includes(p) ? p : 'dashboard'
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PacientePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // Initialise from ?tab= query param so deep-links (/paciente?tab=plan) work
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromUrl)
  // Sub-vista del tab "Nutrición" para pacientes — el "Historial" se movió desde
  // el bottom nav a un toggle interno dentro del tab Plan para reducir clutter
  // de navegación. Solo aplica a pacientes/individuales; profesional sigue viendo
  // historial en su sidebar como tab independiente.
  const [planSubview, setPlanSubview] = useState<'actual' | 'historial'>('actual')
  const [result, setResult] = useState<NutritionResult | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [checking, setChecking] = useState(true)   // ← blocks render until auth verified
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingInitial, setOnboardingInitial] = useState<Partial<FormData> | null>(null)

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Hard timeout — if auth check takes more than 8s, redirect to login
    const timeout = setTimeout(() => {
      window.location.href = '/login?error=timeout'
    }, 8000)

    async function load() {
      try {
        // getUserSafe maneja el caso de refresh token corrupto/vencido:
        // hace signOut automatico y devuelve null en vez de tirar excepcion.
        // Esto evita el skeleton infinito que vivimos cuando el token expira.
        const user = await getUserSafe(supabase)

        // No auth session → login
        if (!user) {
          clearTimeout(timeout)
          window.location.href = '/login'
          return
        }

        // Optimización: queries en PARALELO en vez de secuencial.
        // profile (necesario para decidir UI) y latestPlan (para precargar el plan)
        // son independientes — un solo Promise.all ahorra ~1-2s de latencia 4G.
        const [profileRes, planRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
          supabase
            .from('planes_nutricionales')
            .select('plan_json')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        const { data: profileData, error: profileError } = profileRes

        // currentProfile is resolved after both branches — used for onboarding check below
        let currentProfile: Profile | null = null

        // Auth user exists but no profile → create minimal profile (INSERT only, never overwrite)
        if (!profileData) {
          // Check for pending invite from email-confirmation flow (set by register/page.tsx)
          // Helper unificado: lee invite desde URL ?invite=... + localStorage + sessionStorage.
          // Cubre el caso cross-device: paciente abre email de invitación en celular pero
          // se registra/confirma en otro dispositivo → URL preserva el token aunque
          // localStorage no.
          const { token: pendingInviteToken, pro: pendingPro, role: pendingRole, nombre: pendingNombre } = readPendingInvite()
          if (pendingPro || pendingInviteToken) {
            clearPendingInvite()
          }

          const { data: created, error: createErr } = await supabase
            .from('profiles')
            .insert({
              id:     user.id,
              email:  user.email ?? '',
              nombre: pendingNombre || user.user_metadata?.nombre || user.email?.split('@')[0] || 'Usuario',
              role:   pendingPro ? pendingRole : 'individual',
              plan:   'gratuito',
              ...(pendingPro && { professional_id: pendingPro }),
              ...(pendingPro && {
                trial_ends_at: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
              }),
            })
            .select('*')
            .maybeSingle()

          // Ignore duplicate-key (23505) — profile created by another handler, just re-fetch
          if (createErr && !createErr.message?.includes('duplicate') && !createErr.code?.includes('23505')) {
            clearTimeout(timeout)
            await supabase.auth.signOut()
            window.location.href = '/login?error=profile'
            return
          }

          // If insert was skipped (duplicate), fetch the existing profile
          const finalProfile = created ?? (await supabase
            .from('profiles').select('*').eq('id', user.id).maybeSingle()
          ).data

          if (!finalProfile) {
            clearTimeout(timeout)
            await supabase.auth.signOut()
            window.location.href = '/login?error=profile'
            return
          }

          // Si hay un invite pendiente firmado, llamarlo al redeem para que valide
          // el token contra el secret y otorgue trial 21d. Esto cubre el caso de
          // confirmación de email cross-browser donde el localStorage SÍ tenía el
          // pendingInviteToken pero el redeem no se llegó a llamar en el register page.
          // Best-effort: si falla, el profile YA quedó con professional_id desde el
          // INSERT de arriba.
          if (pendingInviteToken) {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const headers: Record<string, string> = { 'Content-Type': 'application/json' }
              if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
              await fetch('/api/invites/redeem', {
                method:      'POST',
                headers,
                credentials: 'include',
                body:        JSON.stringify({ token: pendingInviteToken }),
              })
            } catch { /* non-fatal */ }
          }

          setUserId(user.id)
          setProfile(finalProfile)
          currentProfile = finalProfile
        } else {
          setUserId(user.id)
          setProfile(profileData)
          currentProfile = profileData
        }

        // Load read state from localStorage
        setReadIds(getReadIds(user.id))

        // Plan ya viene del Promise.all de arriba (paralelizado con el profile)
        const latestPlan = planRes.data
        const hasPlan = !!(latestPlan?.plan_json?.result && latestPlan?.plan_json?.form)

        if (hasPlan) {
          setResult(latestPlan!.plan_json.result)
          setFormData(latestPlan!.plan_json.form)
        }

        // All checks passed — allow render
        clearTimeout(timeout)
        setChecking(false)

        // Show onboarding for new individual users who haven't completed it yet.
        // Skip for: patients (waiting for pro to assign plan), professionals (own panel),
        // and anyone who's already seen it (localStorage flag).
        const alreadyOnboarded = (() => {
          try { return !!localStorage.getItem(ONBOARDING_KEY(user.id)) } catch { return false }
        })()
        if (
          !hasPlan &&
          !alreadyOnboarded &&
          currentProfile?.role === 'individual'
        ) {
          setShowOnboarding(true)
        }
      } catch {
        clearTimeout(timeout)
        window.location.href = '/login?error=unknown'
      }
    }
    load()
  }, [])

  // Load notifications once profile is available
  useEffect(() => {
    if (!profile || !userId) return
    async function loadNotifs() {
      setLoadingNotifs(true)
      try {
        const notifs = profile!.role === 'professional'
          ? await getProfessionalNotifications(supabase, userId!)
          : await getPatientNotifications(supabase, userId!)
        setNotifications(notifs)
      } finally {
        setLoadingNotifs(false)
      }
    }
    loadNotifs()
  }, [profile, userId])

  const handleBellClick = useCallback(() => {
    setNotifOpen(o => !o)
  }, [])

  const handleCloseNotifs = useCallback(() => {
    setNotifOpen(false)
  }, [])

  const handleMarkAllRead = useCallback(() => {
    if (!userId) return
    const ids = notifications.map(n => n.id)
    markAllRead(userId, ids)
    setReadIds(new Set(ids))
  }, [userId, notifications])

  function handleOnboardingComplete(partial: Partial<FormData>) {
    setShowOnboarding(false)
    setOnboardingInitial(partial)
    setActiveTab('plan')
  }

  async function handleResult(r: NutritionResult, f: FormData) {
    setResult(r)
    setFormData(f)
    // Persist plan to Supabase
    if (userId) {
      await supabase.from('planes_nutricionales').insert({
        user_id: userId,
        objetivo: f.objetivo,
        kcal: Math.round(r.kcal),
        proteina: r.macros.p,
        carbohidrato: r.macros.c,
        grasa: r.macros.g,
        plan_json: { form: f, result: r },
      })
    }
  }

  // Skeleton durante carga inicial — matches the dashboard layout para que la
  // transición a contenido real sea casi imperceptible. Reemplaza el splash
  // oscuro con spinner por una versión clara que se siente más rápida
  // (perceived performance > actual performance).
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F7FBFE] to-[#EAF4FB]">
        {/* Header con logo */}
        <header className="px-4 py-4 md:px-8 md:py-5 border-b border-[#E2ECF4] bg-white/80 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">CM</span>
            </div>
            <div className="space-y-1">
              <div className="h-3 w-32 bg-[#E2ECF4] rounded animate-pulse" />
              <div className="h-2 w-20 bg-[#E2ECF4]/60 rounded animate-pulse" />
            </div>
          </div>
        </header>

        {/* Content shimmer */}
        <main className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 space-y-3 shadow-sm">
            <div className="h-4 w-40 bg-[#E2ECF4] rounded animate-pulse" />
            <div className="h-3 w-full bg-[#E2ECF4]/60 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-[#E2ECF4]/60 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-[#E2ECF4] p-3 space-y-2 shadow-sm">
                <div className="h-3 w-16 bg-[#E2ECF4]/60 rounded animate-pulse" />
                <div className="h-6 w-12 bg-[#E2ECF4] rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-[#E2ECF4] p-5 space-y-3 shadow-sm">
            <div className="h-3 w-32 bg-[#E2ECF4] rounded animate-pulse" />
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E2ECF4] rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 bg-[#E2ECF4] rounded animate-pulse" />
                    <div className="h-2 w-1/2 bg-[#E2ECF4]/60 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Bottom nav skeleton (mobile) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2ECF4] px-2 py-2 md:hidden">
          <div className="flex justify-around">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="flex flex-col items-center gap-1 px-3 py-1">
                <div className="w-5 h-5 bg-[#E2ECF4] rounded animate-pulse" />
                <div className="h-2 w-8 bg-[#E2ECF4]/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    {/* ── Onboarding modal — shown once to new individual users ── */}
    {showOnboarding && profile && userId && (
      <OnboardingModal
        profile={profile}
        userId={userId}
        onComplete={handleOnboardingComplete}
      />
    )}
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#E8EEF4' }}>
      {/* ── Sidebar — desktop only ── */}
      <div className="hidden md:block">
        <Sidebar profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          activeTab={activeTab}
          profile={profile}
          notifications={notifications}
          readIds={readIds}
          loadingNotifs={loadingNotifs}
          notifOpen={notifOpen}
          onBellClick={handleBellClick}
          onCloseNotifs={handleCloseNotifs}
          onMarkAllRead={handleMarkAllRead}
          onAvatarClick={() => setActiveTab('perfil')}
        />

        {/* pb-20 on mobile to clear the bottom nav */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {/* Trial / expiry banner — shown for non-premium users with a trial */}
          {profile && profile.role !== 'professional' && (
            <TrialBanner profile={profile} />
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="min-h-full"
            >
            <ErrorBoundary>
              {/* ── Plan / Nutrición ── */}
              {activeTab === 'plan' && (
                <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl mx-auto">
                  {/* Toggle "Plan actual" / "Historial" — solo para pacientes/individuales.
                      El profesional sigue teniendo Historial como tab propio en su sidebar.
                      Cuando elige "Historial" mostramos el componente <Historial /> y saltamos
                      todo el contenido normal del tab Plan. */}
                  {profile?.role !== 'professional' && (
                    <div className="mb-4 inline-flex items-center gap-1 bg-[#F0F6FA] border border-[#E2ECF4] rounded-xl p-1">
                      <button
                        onClick={() => setPlanSubview('actual')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                          planSubview === 'actual'
                            ? 'bg-[#29ABE2] text-white shadow'
                            : 'text-[#4A6070] hover:text-[#0C1F2C]'
                        }`}
                      >
                        🥗 Mi plan actual
                      </button>
                      <button
                        onClick={() => setPlanSubview('historial')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                          planSubview === 'historial'
                            ? 'bg-[#29ABE2] text-white shadow'
                            : 'text-[#4A6070] hover:text-[#0C1F2C]'
                        }`}
                      >
                        📚 Historial
                      </button>
                    </div>
                  )}

                  {/* Vista "Historial" embebida dentro del tab Plan para pacientes */}
                  {profile?.role !== 'professional' && planSubview === 'historial' && userId ? (
                    <Historial userId={userId} />
                  ) : result && formData ? (
                    <>
                      {/* Botón "Nueva planificación" prominente para profesionales */}
                      {profile?.role === 'professional' && (
                        <div className="mb-4 flex items-center justify-between bg-[#EAF4FB] border border-[#C6E4F4] rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">🧑‍⚕️</span>
                            <div>
                              <p className="text-xs font-bold text-[#0C3547]">Viendo tu plan personal</p>
                              <p className="text-[10px] text-[#6B8FA8]">Para crear un plan de paciente ve a Mis Pacientes</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setResult(null); setFormData(null) }}
                            className="flex-shrink-0 text-xs font-bold bg-[#29ABE2] text-white px-4 py-2 rounded-xl hover:bg-[#1a8fc2] transition"
                          >
                            + Nueva planificación
                          </button>
                        </div>
                      )}
                      {/* Noticias personalizadas — ANTES del plan para visibilidad inmediata */}
                      <div className="mb-6">
                        <NoticiasHub form={formData} />
                      </div>
                      <PlanResult
                        result={result}
                        form={formData}
                        onReset={() => { setResult(null); setFormData(null) }}
                        userId={userId ?? undefined}
                      />

                      {/* ── Banco de opciones del paciente ──
                          Solo para pacientes (no para profesionales viendo su propio plan).
                          Aparece debajo del PlanResult tradicional. */}
                      {profile?.role === 'patient' && (
                        <div className="mt-8">
                          <BancoPaciente />
                        </div>
                      )}
                      {/* Link sutil al tab Educación — antes el comparador de yogures vivía
                          inline aquí, ahora se movió a su tab dedicado 📚 Educación para
                          centralizar contenido educativo y permitir más guías futuras. */}
                      <button
                        onClick={() => setActiveTab('educacion')}
                        className="mt-5 w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#EAF4FB] to-[#F8FBFD] border border-[#29ABE2]/20 rounded-xl hover:border-[#29ABE2]/50 transition group"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-9 h-9 rounded-xl bg-[#29ABE2] flex items-center justify-center text-white text-base">📚</div>
                          <div>
                            <p className="text-sm font-black text-[#0C3547]">Tus guías nutricionales</p>
                            <p className="text-[11px] text-[#6B8FA8]">Comparadores · recomendaciones personalizadas</p>
                          </div>
                        </div>
                        <span className="text-[#29ABE2] text-lg group-hover:translate-x-0.5 transition">→</span>
                      </button>
                    </>
                  ) : profile?.role === 'patient' ? (
                    /* Paciente vinculado sin plan aún */
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center text-center py-20 px-6"
                    >
                      <div className="w-20 h-20 bg-[#EAF4FB] rounded-3xl flex items-center justify-center mb-5 text-4xl">
                        🥗
                      </div>
                      <h2 className="text-xl font-black text-[#0C3547] mb-2">Tu plan está en camino</h2>
                      <p className="text-sm text-[#8BA5BE] max-w-xs leading-relaxed mb-6">
                        Tu nutricionista está preparando tu plan alimentario personalizado. Aparecerá aquí en cuanto esté listo.
                      </p>
                      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-4 text-left max-w-xs w-full space-y-2 mb-5">
                        {['Plan semanal detallado', 'Lista de compras automática', 'Seguimiento de adherencia'].map(f => (
                          <div key={f} className="flex items-center gap-2.5 text-xs text-[#6B7C93]">
                            <span className="text-[#29ABE2]">✓</span> {f}
                          </div>
                        ))}
                      </div>
                      {/* Botón "Avisar a mi nutricionista" — dispara push+email al profesional.
                          Detectado en auditoría como fricción ALTA: paciente quedaba en empty
                          state sin acción → abandono del trial. Rate limit 24h en localStorage
                          para evitar spam (el endpoint NO bloquea, confía en el cliente). */}
                      <PingProfessionalButton />
                      <p className="text-[10px] text-[#8BA5BE] mt-2 max-w-xs">
                        Tu nutricionista recibe una notificación + email para activar tu plan.
                      </p>
                      {/* Banco de opciones — empty-state amigable mientras espera */}
                      <div className="mt-8 w-full max-w-xl text-left space-y-5">
                        <BancoPaciente />
                        {/* Link al tab Educación — útil incluso sin plan generado.
                            El paciente puede explorar guías mientras espera. */}
                        <button
                          onClick={() => setActiveTab('educacion')}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#EAF4FB] to-[#F8FBFD] border border-[#29ABE2]/20 rounded-xl hover:border-[#29ABE2]/50 transition group"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-9 h-9 rounded-xl bg-[#29ABE2] flex items-center justify-center text-white text-base">📚</div>
                            <div>
                              <p className="text-sm font-black text-[#0C3547]">Explora las guías</p>
                              <p className="text-[11px] text-[#6B8FA8]">Comparadores de productos nutricionales</p>
                            </div>
                          </div>
                          <span className="text-[#29ABE2] text-lg group-hover:translate-x-0.5 transition">→</span>
                        </button>
                      </div>

                      {/* Noticias mientras esperan el plan */}
                      <div className="mt-8 w-full max-w-xl text-left">
                        <NoticiasHub form={{}} />
                      </div>
                    </motion.div>
                  ) : (
                    <PlanGenerator
                      onResult={handleResult}
                      initialData={{
                        nombre: profile?.nombre ?? '',
                        ...(onboardingInitial ?? {}),
                        ...(formData ?? {}),
                      }}
                    />
                  )}
                </div>
              )}

              {/* ── Dashboard ── */}
              {activeTab === 'dashboard' && userId && (
                <div className="px-3 py-4 md:px-6 md:py-6">
                  {/* "Crea tu plan" nudge — shown when no plan exists and user is individual */}
                  {!result && profile?.role !== 'patient' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 bg-gradient-to-r from-[#EAF4FB] to-[#F0F8FE] border border-[#C6E4F4] rounded-2xl p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 bg-[#29ABE2]/15 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                        🥗
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-[#0C3547]">Crea tu plan nutricional</p>
                        <p className="text-xs text-[#6B8FA8] mt-0.5">Tu dashboard se calibrará con tus calorías y macros exactos.</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('plan')}
                        className="flex-shrink-0 bg-[#29ABE2] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1a8fc2] transition"
                      >
                        Empezar
                      </button>
                    </motion.div>
                  )}
                  <CalorieDashboard
                    userId={userId}
                    targetKcal={result?.kcal ? Math.round(result.kcal) : 2000}
                    macros={result?.macros}
                    form={formData ?? undefined}
                  />

                  {/* Evaluaciones (informes antropométricos) — movido desde su
                      propio tab al Dashboard. Reduce el clutter del BottomNav
                      (5 → 4 tabs) y consolida toda la info clínica/seguimiento
                      en un solo lugar. El componente Evaluaciones internamente
                      maneja su propio empty state si el paciente no tiene
                      informes subidos por su profesional. */}
                  {profile?.role !== 'professional' && (
                    <div className="mt-5">
                      <Evaluaciones />
                    </div>
                  )}

                  {/* CTA "Tus guías nutricionales" removido del Dashboard
                      (feedback Felipe). El paciente ya tiene el tab 📚 Educación
                      en el BottomNav, el CTA era redundante. */}
                </div>
              )}

              {/* ── Educación: hub de guías y comparadores ──
                  Tab dedicada para contenido educativo personalizado por perfil.
                  Antes el comparador de yogures vivía disperso en Dashboard/Plan,
                  ahora se centraliza aquí + permite agregar guías futuras. */}
              {activeTab === 'educacion' && (
                <EducacionHub form={formData ?? {}} nombre={profile?.nombre} />
              )}

              {/* ── Chat IA ── */}
              {activeTab === 'chat' && (
                profile && hasAccess(profile) ? (
                  <div className="h-full flex flex-col px-3 py-4 md:px-6 md:py-6">
                    <ChatIA
                      userName={profile?.nombre || 'Paciente'}
                      targetKcal={result?.kcal ? Math.round(result.kcal) : undefined}
                      objetivo={formData?.objetivo}
                    />
                  </div>
                ) : (
                  <PremiumGate feature="Asistente IA" description="Consulta nutricional inteligente disponible 24/7 con tu nutricionista virtual." />
                )
              )}

              {/* ── Historial ── */}
              {activeTab === 'historial' && userId && (
                <Historial userId={userId} />
              )}

              {/* Evaluaciones ya NO es un tab independiente — se movió como
                  widget embebido dentro del Dashboard. El redirect en
                  getTabFromUrl() preserva los deep-links viejos. */}

              {/* ── Panel Profesional ── */}
              {activeTab === 'pacientes' && userId && (
                <PanelProfesional
                  professionalId={userId}
                  professionalName={profile?.nombre ?? undefined}
                />
              )}

              {/* ── Perfil ── */}
              {activeTab === 'perfil' && profile && userId && (
                <PerfilPanel profile={profile} userId={userId} />
              )}
            </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Bottom nav — mobile only ── */}
      <BottomNav profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Food Scanner — only for paid/trial users on dashboard ── */}
      {activeTab === 'dashboard' && userId && profile && hasAccess(profile) && (
        <FoodScanner userId={userId} />
      )}

      {/* ── PWA install banner — prompts patient to install app on phone ── */}
      <PWAInstallBanner />

      {/* ── Onboarding tras primer ingreso: 'instalar app' + 'activar push' ── */}
      {userId && profile && profile.role === 'patient' && (
        <WelcomePostRegister
          userId={userId}
          hasProfessional={!!profile.professional_id}
        />
      )}
    </div>
    </>
  )
}
