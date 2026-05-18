'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Tab } from '@/components/layout/types'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
import { CalorieDashboard } from '@/components/dashboard/CalorieDashboard'
import { ChatIA } from '@/components/chat/ChatIA'
import { PanelProfesional } from '@/components/profesional/PanelProfesional'
import { Historial } from '@/components/historial/Historial'
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
}

function TopBar({
  activeTab, profile,
  notifications, readIds, loadingNotifs,
  notifOpen, onBellClick, onCloseNotifs, onMarkAllRead,
}: TopBarProps) {
  const TAB_LABELS: Record<Tab, { title: string; subtitle: string }> = {
    dashboard:  { title: 'Dashboard',       subtitle: 'Registro calórico y adherencia diaria' },
    plan:       { title: 'Nutrición',       subtitle: 'Generador de plan alimentario personalizado' },
    chat:       { title: 'Asistente IA',   subtitle: 'Consulta clínica inteligente' },
    historial:  { title: 'Historial',      subtitle: 'Planes y seguimiento anteriores' },
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] flex items-center justify-center text-white text-[11px] font-bold shadow">
            {profile.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>
    </header>
  )
}

// Valid tabs that can be deep-linked via ?tab=
const VALID_TABS: Tab[] = ['plan', 'dashboard', 'chat', 'historial', 'pacientes', 'perfil']

/** Read ?tab= from the URL without useSearchParams (avoids Suspense requirement). */
function getTabFromUrl(): Tab {
  if (typeof window === 'undefined') return 'dashboard'
  const p = new URLSearchParams(window.location.search).get('tab') as Tab | null
  return p && VALID_TABS.includes(p) ? p : 'dashboard'
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PacientePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // Initialise from ?tab= query param so deep-links (/paciente?tab=plan) work
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromUrl)
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
        const { data: { user } } = await supabase.auth.getUser()

        // No auth session → login
        if (!user) {
          clearTimeout(timeout)
          window.location.href = '/login'
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        // currentProfile is resolved after both branches — used for onboarding check below
        let currentProfile: Profile | null = null

        // Auth user exists but no profile → create minimal profile (INSERT only, never overwrite)
        if (!profileData) {
          // Check for pending invite from email-confirmation flow (set by register/page.tsx)
          let pendingPro: string | null = null
          let pendingRole = 'individual'
          let pendingNombre = ''
          try {
            // Check localStorage first (cross-tab safe), fall back to sessionStorage (legacy)
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

        // Auto-load most recent plan so patient sees it on first login
        const { data: latestPlan } = await supabase
          .from('planes_nutricionales')
          .select('plan_json')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const hasPlan = !!(latestPlan?.plan_json?.result && latestPlan?.plan_json?.form)

        if (hasPlan) {
          setResult(latestPlan!.plan_json.result)
          setFormData(latestPlan!.plan_json.form)
          // Aterrizar en dashboard (noticias + calorías) — el plan queda en tab Nutrición
          // No forzar tab específico: el URL param o default 'dashboard' rige
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

  // Block render while verifying session — prevents flash of content for invalid users
  if (checking) {
    return (
      <div className="min-h-screen bg-[#060F1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#29ABE2]/30 border-t-[#29ABE2] rounded-full animate-spin" />
          <p className="text-[#4A7A94] text-xs font-medium">Verificando sesión...</p>
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
                  {result && formData ? (
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
                      <div className="bg-white border border-[#E2ECF4] rounded-2xl p-4 text-left max-w-xs w-full space-y-2">
                        {['Plan semanal detallado', 'Lista de compras automática', 'Seguimiento de adherencia'].map(f => (
                          <div key={f} className="flex items-center gap-2.5 text-xs text-[#6B7C93]">
                            <span className="text-[#29ABE2]">✓</span> {f}
                          </div>
                        ))}
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
                </div>
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
    </div>
    </>
  )
}
