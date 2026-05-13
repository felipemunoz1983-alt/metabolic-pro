'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Tab } from '@/components/layout/types'
import { PlanGenerator } from '@/components/plan/PlanGenerator'
import { PlanResult } from '@/components/plan/PlanResult'
import { CalorieDashboard } from '@/components/dashboard/CalorieDashboard'
import { ChatIA } from '@/components/chat/ChatIA'
import { PanelProfesional } from '@/components/profesional/PanelProfesional'
import { Historial } from '@/components/historial/Historial'
import type { Profile } from '@/types'
import type { NutritionResult, FormData } from '@/lib/nutrition'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Bell } from 'lucide-react'

// ── Top header bar ────────────────────────────────────────────────────────────
function TopBar({ activeTab, profile }: { activeTab: Tab; profile: Profile | null }) {
  const TAB_LABELS: Record<Tab, { title: string; subtitle: string }> = {
    dashboard:  { title: 'Dashboard',       subtitle: 'Registro calórico y adherencia diaria' },
    plan:       { title: 'Nutrición',       subtitle: 'Generador de plan alimentario personalizado' },
    chat:       { title: 'Asistente IA',   subtitle: 'Consulta clínica inteligente' },
    historial:  { title: 'Historial',      subtitle: 'Planes y seguimiento anteriores' },
    pacientes:  { title: 'Mis Pacientes',  subtitle: 'Panel profesional — gestión y seguimiento' },
  }
  const { title, subtitle } = TAB_LABELS[activeTab]
  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white border-b border-[#E2ECF4] flex-shrink-0">
      <div>
        <h1 className="text-sm font-extrabold text-[#0C1F2C] leading-tight">{title}</h1>
        <p className="text-[10px] text-[#8BA5BE] font-medium">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-[#8BA5BE] text-[11px] font-medium bg-[#F0F6FA] px-3 py-1.5 rounded-lg">
          <Calendar size={11} />
          <span className="capitalize">{today}</span>
        </div>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0F6FA] text-[#8BA5BE] transition">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#29ABE2] rounded-full" />
        </button>
        {profile && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] flex items-center justify-center text-white text-[11px] font-bold shadow">
            {profile.nombre?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>
    </header>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PacientePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('plan')
  const [result, setResult] = useState<NutritionResult | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    load()
  }, [])

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

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#E8EEF4' }}>
      {/* ── Sidebar ── */}
      <Sidebar profile={profile} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar activeTab={activeTab} profile={profile} />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className="min-h-full"
            >
              {/* ── Plan / Nutrición ── */}
              {activeTab === 'plan' && (
                <div className="px-8 py-8 max-w-3xl mx-auto">
                  {result && formData ? (
                    <PlanResult
                      result={result}
                      form={formData}
                      onReset={() => { setResult(null); setFormData(null) }}
                    />
                  ) : (
                    <PlanGenerator onResult={handleResult} />
                  )}
                </div>
              )}

              {/* ── Dashboard ── */}
              {activeTab === 'dashboard' && userId && (
                <div className="px-6 py-6">
                  <CalorieDashboard
                    userId={userId}
                    targetKcal={result?.kcal ? Math.round(result.kcal) : 2000}
                    macros={result?.macros}
                  />
                </div>
              )}

              {/* ── Chat IA ── */}
              {activeTab === 'chat' && (
                <div className="h-full flex flex-col px-6 py-6">
                  <ChatIA
                    userName={profile?.nombre || 'Paciente'}
                    targetKcal={result?.kcal ? Math.round(result.kcal) : undefined}
                    objetivo={formData?.objetivo}
                  />
                </div>
              )}

              {/* ── Historial ── */}
              {activeTab === 'historial' && userId && (
                <Historial userId={userId} />
              )}

              {/* ── Panel Profesional ── */}
              {activeTab === 'pacientes' && userId && (
                <PanelProfesional professionalId={userId} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
